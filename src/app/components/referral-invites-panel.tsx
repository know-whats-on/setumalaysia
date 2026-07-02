import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock3, MailPlus, RefreshCw, Share2, Trash2, Trophy, UserCheck, XCircle } from 'lucide-react';
import {
  createReferralInvite,
  deleteReferralInvite,
  fetchMyReferralInvites,
  type ReferralInvite,
  type ReferralInviteStatus,
  type ReferralInviteSummary,
} from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { emailFieldProps } from '../lib/keyboard-ui';
import { isNativeShell } from '../lib/platform';

interface ReferralInvitesPanelProps {
  email: string;
}

const EMPTY_SUMMARY: ReferralInviteSummary = {
  total: 0,
  invited: 0,
  joined: 0,
  joined_no_credit: 0,
  already_joined: 0,
  points: 0,
};

function normalizeEmailInput(value: string) {
  return value.trim().toLowerCase();
}

function isValidInviteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getStatusMeta(status: ReferralInviteStatus) {
  switch (status) {
    case 'joined':
      return {
        label: 'Joined',
        detail: '1 point earned',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: UserCheck,
      };
    case 'joined_no_credit':
      return {
        label: 'Joined',
        detail: 'They joined, but the first referrer earned the point',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Trophy,
      };
    case 'already_joined':
      return {
        label: 'Already joined',
        detail: 'Existing accounts do not count for points',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        icon: XCircle,
      };
    default:
      return {
        label: 'Waiting to Join',
        detail: 'Share the landing page link to help them join',
        className: 'border-blue-200 bg-blue-50 text-blue-700',
        icon: Clock3,
      };
  }
}

function formatInviteDate(value?: string | null) {
  if (!value) return 'Not yet';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Not yet';
  return format(parsed, 'd MMM yyyy');
}

function getReferralShareUrl() {
  return String(APP_CONFIG.inviteBaseUrl || APP_CONFIG.shareBaseUrl || '').trim();
}

function buildReferralShareText() {
  if (APP_CONFIG.variant === 'burb_mate') {
    return `Come join me on ${APP_CONFIG.displayName}. Explore suburbs, local updates, and more.`;
  }
  return `Come join me on ${APP_CONFIG.displayName}. Find housing safety and local guidance in Australia.`;
}

function buildReferralShareMessage() {
  const inviteUrl = getReferralShareUrl();
  const shareText = buildReferralShareText();
  return inviteUrl ? `${shareText} ${inviteUrl}` : shareText;
}

function getReferralShareImagePath() {
  return String(APP_CONFIG.referralShareImagePath || '').trim();
}

function getReferralShareImageFilename(assetPath: string, mimeType = 'image/png') {
  const pathMatch = assetPath.match(/([^/]+\.[A-Za-z0-9]+)(?:[?#].*)?$/);
  if (pathMatch?.[1]) return pathMatch[1];
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (normalizedMimeType.includes('jpeg') || normalizedMimeType.includes('jpg')) {
    return `referral-share-${APP_CONFIG.variant}.jpg`;
  }
  if (normalizedMimeType.includes('webp')) {
    return `referral-share-${APP_CONFIG.variant}.webp`;
  }
  return `referral-share-${APP_CONFIG.variant}.png`;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read banner image.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, base64 = ''] = result.split(',', 2);
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

async function loadReferralShareImage() {
  const assetPath = getReferralShareImagePath();
  if (!assetPath || typeof fetch !== 'function') return null;
  const assetBaseUrl = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'http://localhost';
  const assetUrl = new URL(assetPath, assetBaseUrl).toString();
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error('Failed to load the referral banner image.');
  }
  const blob = await response.blob();
  return {
    assetPath,
    blob,
    fileName: getReferralShareImageFilename(assetPath, blob.type),
  };
}

async function buildWebReferralShareFiles() {
  if (typeof File === 'undefined') return [];
  const image = await loadReferralShareImage();
  if (!image) return [];
  return [
    new File([image.blob], image.fileName, {
      type: image.blob.type || 'image/png',
    }),
  ];
}

async function buildNativeReferralShareFiles() {
  const image = await loadReferralShareImage();
  if (!image) return [];
  const [{ Filesystem, Directory }, base64Data] = await Promise.all([
    import('@capacitor/filesystem'),
    blobToBase64(image.blob),
  ]);
  const timestamp = Date.now();
  const result = await Filesystem.writeFile({
    path: `share/referral-${APP_CONFIG.variant}-${timestamp}-${image.fileName}`,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true,
  });
  return [result.uri];
}

export function ReferralInvitesPanel({ email }: ReferralInvitesPanelProps) {
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const [summary, setSummary] = useState<ReferralInviteSummary>(EMPTY_SUMMARY);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalizedInviteEmail = useMemo(() => normalizeEmailInput(inviteEmail), [inviteEmail]);
  const pointsCount = summary.points || 0;
  const waitingCount = summary.invited || 0;

  const loadInvites = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyReferralInvites(email);
      setInvites(result.invites);
      setSummary(result.summary);
    } catch (err) {
      console.error('GHAR referral invite load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvites();
  }, [email]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!isValidInviteEmail(normalizedInviteEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (normalizedInviteEmail === email.trim().toLowerCase()) {
      setError('You cannot track your own account email.');
      return;
    }

    setSaving(true);
    try {
      const created = await createReferralInvite({
        inviterEmail: email,
        invitedEmail: normalizedInviteEmail,
        sourceAppVariant: APP_VARIANT,
      });
      setInviteEmail('');
      setSuccess(
        created.status === 'already_joined'
          ? 'Referral saved, but this person already has an account.'
          : 'Referral saved. Share the landing page link from the row below.',
      );
      await loadInvites();
    } catch (err) {
      console.error('GHAR referral invite save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to record invite.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareInvite = async (invite: ReferralInvite) => {
    if (invite.status !== 'invited') return;
    const shareText = buildReferralShareMessage();
    const shareBody = buildReferralShareText();
    const shareUrl = getReferralShareUrl();
    const shareTitle = `Share ${APP_CONFIG.displayName}`;
    setError('');
    setSuccess('');
    setSharingId(invite.id);

    try {
      if (isNativeShell()) {
        const { Share } = await import('@capacitor/share');
        let files: string[] = [];
        try {
          files = await buildNativeReferralShareFiles();
        } catch (fileError) {
          console.error('GHAR referral invite native share attachment error:', fileError);
        }
        await Share.share({
          title: shareTitle,
          text: shareText,
          ...(files.length ? { files } : {}),
          dialogTitle: 'Share referral link',
        });
        setSuccess('Referral message shared.');
        return;
      }

      if (navigator.share) {
        let files: File[] = [];
        try {
          files = await buildWebReferralShareFiles();
        } catch (fileError) {
          console.error('GHAR referral invite web share attachment error:', fileError);
        }

        if (files.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files,
          });
        } else {
          await navigator.share({
            title: shareTitle,
            text: shareBody,
            ...(shareUrl ? { url: shareUrl } : {}),
          });
        }
        setSuccess('Referral message shared.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setSuccess('Referral message copied.');
        return;
      }

      throw new Error('Sharing is not available on this device.');
    } catch (err) {
      console.error('GHAR referral invite share error:', err);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareText);
          setSuccess('Referral message copied.');
          return;
        } catch (clipboardError) {
          console.error('GHAR referral invite copy fallback error:', clipboardError);
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to share the referral message.');
    } finally {
      setSharingId(null);
    }
  };

  const handleDeleteInvite = async (invite: ReferralInvite) => {
    if (invite.status !== 'invited') return;
    const confirmed = window.confirm(
      'Delete this waiting referral? This removes the tracking entry and any future point eligibility for it.',
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setDeletingId(invite.id);

    try {
      await deleteReferralInvite(invite.id, email);
      setSuccess('Waiting referral deleted.');
      await loadInvites();
    } catch (err) {
      console.error('GHAR referral invite delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete referral.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="rounded-[28px] border border-[#D9E7FF] bg-gradient-to-br from-[#F8FBFF] via-white to-[#EFF6FF] p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1E40AF] text-white shadow-lg shadow-blue-900/15">
            <MailPlus className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748B]">Referrals</p>
            <h2 className="mt-1 text-lg font-black text-[#0F172A]">Track referrals to {APP_CONFIG.displayName}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Add the email of someone you told about the app. Share the landing page link yourself. If they later create a
              unique account, the first referrer gets 1 point.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-2xl font-light text-[#1E40AF]">{summary.total}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Total</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-2xl font-light text-emerald-600">{pointsCount}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Points</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/85 p-3 text-center shadow-sm">
            <p className="text-2xl font-light text-blue-600">{waitingCount}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]">Waiting</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
          Referral email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => {
              setInviteEmail(event.target.value);
              setError('');
              setSuccess('');
            }}
            placeholder="friend@example.com"
            className="min-w-0 flex-1 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10"
            {...emailFieldProps}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#1E40AF] px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-900/10 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving' : 'Add'}
          </button>
        </div>
        {error ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        ) : null}
        {success ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{success}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#0F172A]">Your referrals</p>
            <p className="text-[11px] text-[#64748B]">Only you and admins can see these email addresses.</p>
          </div>
          <button
            type="button"
            onClick={loadInvites}
            disabled={loading}
            className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] transition hover:bg-[#F8FAFC] disabled:opacity-50"
            aria-label="Refresh referrals"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E40AF] border-t-transparent" />
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
            <p className="text-sm font-bold text-[#0F172A]">No referrals yet</p>
            <p className="mt-1 text-xs text-[#64748B]">Add someone’s email above to start tracking referrals.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => {
              const meta = getStatusMeta(invite.status);
              const StatusIcon = meta.icon;
              const isWaiting = invite.status === 'invited';
              const isSharing = sharingId === invite.id;
              const isDeleting = deletingId === invite.id;
              const actionsDisabled = isSharing || isDeleting;
              return (
                <div key={invite.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p
                        data-testid={`referral-email-${invite.id}`}
                        className="text-sm font-bold leading-tight text-[#0F172A] [overflow-wrap:anywhere]"
                      >
                        {invite.invited_email}
                      </p>
                      <p className="mt-1 text-[11px] text-[#64748B]">Added {formatInviteDate(invite.created_at)}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#64748B]">{meta.detail}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                        {meta.label}
                      </div>
                      {isWaiting ? (
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => void handleShareInvite(invite)}
                            disabled={actionsDisabled}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {isSharing ? 'Sharing...' : 'Share'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteInvite(invite)}
                            disabled={actionsDisabled}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
