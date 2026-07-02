import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  ChartPie,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Home,
  Link2,
  Loader2,
  Plus,
  Paperclip,
  PenLine,
  Receipt,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  acknowledgeHouseholdRules,
  analyzeHouseholdReceipt,
  cancelHouseholdInvite,
  completeHouseholdChore,
  confirmBillPayment,
  confirmHouseholdBillPayment,
  createHouseholdBill,
  createHouseholdChore,
  createEvidence,
  createSharedBill,
  deleteHouseholdBill,
  deleteHouseholdChore,
  deleteHousehold,
  deleteHouseholdNotification,
  fetchHouseholdInvitePreview,
  inviteHouseholdMembers,
  leaveHousehold,
  markBillPayment,
  markHouseholdBillPayment,
  removeHouseholdMember,
  resendHouseholdInvite,
  resolveHouseholdBillContact,
  respondToHouseholdInvite,
  sendHouseholdNotification,
  updateHouseholdRules,
  updateHouseholdBill,
  updateHouseholdChore,
  uploadEvidenceFile,
} from '../lib/api';
import type { RentalEntry } from '../lib/mock-data';
import {
  buildHouseholdGratitudeNotification,
  getCanonicalHouseholdBillCategory,
  formatHouseholdMoney,
  createDefaultHouseholdRulesVersion,
  getActiveHouseholdMembers,
  getHouseholdAttentionSummary,
  getHouseholdHeaderDisplay,
  getHouseholdBillParticipantDisplayName,
  getHouseholdEmailHandle,
  getLatestPendingHouseholdShareInvite,
  getHouseholdMemberDisplayName,
  getHouseholdRulesAcknowledgementStatus,
  getHouseholdNotificationSenderDisplayName,
  getPastHouseholdMembers,
  getLatestHouseholdRulesVersion,
  hasAcknowledgedLatestHouseholdRules,
  isHouseholdRulesOwnerSetupComplete,
  normalizeHouseholdSignerName,
  normalizeHouseholdRuleSections,
  normalizeHouseholdEmail,
  validateHouseholdRulesAcknowledgementDraft,
  HOUSEHOLD_BILL_CATEGORY_OPTIONS,
  type HouseholdBill,
  type HouseholdBillCategoryOption,
  type HouseholdBillContact,
  type HouseholdBillParticipantType,
  type HouseholdChore,
  type HouseholdCadence,
  type HouseholdMediaAttachment,
  type HouseholdNotification,
  type HouseholdNotificationOriginType,
  type HouseholdNotificationTemplateType,
  type HouseholdInvite,
  type HouseholdRuleSection,
  type HouseholdRulesAcknowledgement,
  type HouseholdRulesSignature,
  type HouseholdRulesVersion,
  type HouseholdRecord,
  type HouseholdSplitType,
} from '../lib/household';
import { generateSignedHouseRulesPdf } from '../lib/household-rules-pdf';
import { HOUSEHOLD_RULES_SIGNATURE_ASPECT_RATIO } from '../lib/household-rules-signature';
import { getHouseholdFocusTargetId, parseHouseholdRoute, type HouseholdRouteSource } from '../lib/household-route';
import { isNativeShell } from '../lib/platform';
import { useHoodieHelpTour } from './hoodie-help-tour';
import { SignedHouseRulesPdfViewer } from './signed-house-rules-pdf-viewer';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from './ui/drawer';
import {
  decimalFieldProps,
  getKeyboardAwareLargeSheetStyle,
  keyboardAwareInlineScrollStyle,
  keyboardAwareLargeSheetBodyStyle,
  keyboardAwareLargeSheetFooterStyle,
  keyboardAwareModalPaddingStyle,
  keyboardAwareNestedScrollStyle,
  numericFieldProps,
} from '../lib/keyboard-ui';

export type HouseholdSectionTab = 'overview' | 'rules' | 'bills' | 'chores' | 'members' | 'activity';
type HouseholdDrawerMode = 'invite' | 'notification' | 'bill' | 'chore' | 'payment' | 'complete_chore' | 'rules_accept' | 'rules_setup' | null;
type HouseholdInviteMode = 'email' | 'link';
type HouseholdInviteIntent = 'accept' | 'decline' | null;
type ActivityFilter = 'all' | 'members' | 'bills' | 'chores' | 'notifications';
type HouseholdBillCategorySelection = '' | HouseholdBillCategoryOption | 'Other';
type BillParticipantDraft = {
  email: string;
  label: string;
  participantType: HouseholdBillParticipantType;
};
type HouseholdConfirmAction =
  | { type: 'remove-member'; targetEmail: string }
  | { type: 'cancel-invite'; token: string }
  | { type: 'leave-household' }
  | { type: 'delete-household' }
  | { type: 'force-accept-invite'; token: string; currentHouseholdName?: string | null; rulesAcknowledgement?: { version_id: string; checked_item_ids: string[]; signature: HouseholdRulesSignature } }
  | { type: 'delete-bill'; billId: string; billTitle: string }
  | { type: 'delete-chore'; choreId: string; choreTitle: string }
  | { type: 'delete-notification'; notificationId: string; notificationTitle: string };

interface HouseholdPanelProps {
  email: string;
  profileFullName?: string;
  rentalHistory: RentalEntry[];
  household: HouseholdRecord | null;
  pendingInvites: HouseholdInvite[];
  sharedBills?: HouseholdBill[];
  billContacts?: HouseholdBillContact[];
  onRefresh: () => Promise<void>;
  onOpenTimeline: () => void;
  onStartCreateHousehold: () => void;
  incomingInviteToken?: string | null;
  incomingInviteIntent?: HouseholdInviteIntent;
  onClearIncomingInvite: () => void;
  initialSectionTab?: HouseholdSectionTab;
  onSectionTabChange?: (tab: HouseholdSectionTab) => void;
  focusedBillId?: string;
  focusedPaymentId?: string;
  focusedChoreId?: string;
  focusedNotificationId?: string;
  routeSource?: HouseholdRouteSource;
  onRefreshSuspendedChange?: (suspended: boolean) => void;
  onOpenRoute?: (route: string) => void;
  initialOwnerInviteLaunch?: {
    householdId: string;
    invite: HouseholdInvite | null;
    shareUrl: string;
  } | null;
  onConsumeInitialOwnerInviteLaunch?: () => void;
}

const householdSectionTabs = [
  { id: 'overview' as const, label: 'Overview', icon: Home },
  { id: 'rules' as const, label: 'House Rules', icon: FileText },
  { id: 'bills' as const, label: 'Bills', icon: Receipt },
  { id: 'chores' as const, label: 'Chores', icon: CheckSquare },
  { id: 'members' as const, label: 'Members', icon: Users },
  { id: 'activity' as const, label: 'Activity', icon: Clock3 },
];

const householdBillCategorySelectOptions: Array<HouseholdBillCategorySelection> = [
  ...HOUSEHOLD_BILL_CATEGORY_OPTIONS,
  'Other',
];

const staticNotificationTemplatePresets: Array<{
  id: HouseholdNotificationTemplateType;
  label: string;
  title: string;
  body: string;
}> = [
  {
    id: 'bill_reminder',
    label: 'Bill reminder',
    title: 'Quick household bill reminder',
    body: 'Sharing a quick reminder about an open household bill. Please take a look in Hoodie when you can.',
  },
  {
    id: 'chore_reminder',
    label: 'Chore reminder',
    title: 'Quick household chore reminder',
    body: 'Friendly reminder about an open household chore. Please update it in Hoodie when it is done.',
  },
  {
    id: 'house_update',
    label: 'House update',
    title: 'Household update',
    body: 'Sharing a quick update for everyone in the household.',
  },
  {
    id: 'need_response',
    label: 'Need response',
    title: 'Need a quick response',
    body: 'Please reply when you can so we can sort this out together.',
  },
  {
    id: 'custom',
    label: 'Custom',
    title: '',
    body: '',
  },
];

function getPrimaryNotificationRecipientEmail(recipientEmails: string[], availableRecipients: string[]) {
  return recipientEmails.find((recipientEmail) => availableRecipients.includes(recipientEmail))
    || availableRecipients[0]
    || '';
}

function getValidNotificationRecipientEmails(recipientEmails: string[], availableRecipients: string[]) {
  return Array.from(new Set(
    recipientEmails.filter((recipientEmail) => availableRecipients.includes(recipientEmail)),
  ));
}

function getNotificationThankedMemberEmail(notification: HouseholdNotification, availableRecipients: string[]) {
  const metadata = notification.metadata;
  const thankedMemberEmail = normalizeHouseholdEmail(
    typeof metadata?.['thanked_member_email'] === 'string'
      ? metadata['thanked_member_email']
      : '',
  );

  if (thankedMemberEmail) {
    return availableRecipients.includes(thankedMemberEmail) ? thankedMemberEmail : '';
  }

  return getPrimaryNotificationRecipientEmail(
    getValidNotificationRecipientEmails(
      notification.recipient_emails.map((entry) => normalizeHouseholdEmail(entry)),
      availableRecipients,
    ),
    availableRecipients,
  );
}

function formatDateLabel(value?: string) {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'EEE d MMM');
}

function formatDateTimeLabel(value?: string) {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM yyyy, h:mm a');
}

function formatHouseRulesPublishedLabel(value?: string) {
  if (!value) return 'Published on unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return `Published on ${value}`;
  const formatted = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(parsed)
    .replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());

  return `Published on ${formatted} Sydney time`;
}

function formatDateFieldDisplay(value?: string) {
  if (!value) return '';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'EEE d MMM yyyy');
}

function formatDateInputValue(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return format(parsed, 'yyyy-MM-dd');
}

function formatFileSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isMediaFile(file: File) {
  return file.type.startsWith('image/') || file.type.startsWith('video/');
}

function mergeMediaFiles(current: File[], incoming: FileList | null) {
  if (!incoming?.length) return current;
  const seen = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const next = [...current];
  Array.from(incoming).forEach((file) => {
    if (!isMediaFile(file)) return;
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(file);
  });
  return next;
}

function mergeSingleMediaFile(current: File[], incoming: File) {
  if (!isMediaFile(incoming)) return current;
  const key = `${incoming.name}:${incoming.size}:${incoming.lastModified}`;
  if (current.some((file) => `${file.name}:${file.size}:${file.lastModified}` === key)) return current;
  return [...current, incoming];
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read receipt image.'));
    reader.readAsDataURL(file);
  });
}

function getBase64FromDataUrl(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.split(',').pop() || '' : dataUrl;
}

const RECEIPT_SCAN_MAX_LONG_EDGE = 1100;
const RECEIPT_SCAN_JPEG_QUALITY = 0.68;
const RECEIPT_SCAN_SKIP_COMPRESSION_BYTES = 450 * 1024;

async function prepareReceiptImagePayload(file: File) {
  const originalDataUrl = await fileToDataUrl(file);
  const fallbackPayload = {
    base64Data: getBase64FromDataUrl(originalDataUrl),
    mimeType: file.type || 'image/jpeg',
    fileName: file.name,
  };

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return fallbackPayload;
  }
  if (
    file.size <= RECEIPT_SCAN_SKIP_COMPRESSION_BYTES
    && /^image\/(?:jpeg|jpg|png|webp)$/i.test(file.type || '')
  ) {
    return fallbackPayload;
  }

  return new Promise<typeof fallbackPayload>((resolve) => {
    const image = new Image();
    const decodeTimeout = window.setTimeout(() => resolve(fallbackPayload), 5000);
    image.onload = () => {
      try {
        window.clearTimeout(decodeTimeout);
        const longestEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
        const scale = longestEdge > RECEIPT_SCAN_MAX_LONG_EDGE ? RECEIPT_SCAN_MAX_LONG_EDGE / longestEdge : 1;
        if (scale >= 1 && file.size <= RECEIPT_SCAN_SKIP_COMPRESSION_BYTES) {
          resolve(fallbackPayload);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(fallbackPayload);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', RECEIPT_SCAN_JPEG_QUALITY);
        const compressedPayload = {
          base64Data: getBase64FromDataUrl(compressedDataUrl),
          mimeType: 'image/jpeg',
          fileName: file.name.replace(/\.[^.]+$/, '') ? `${file.name.replace(/\.[^.]+$/, '')}.jpg` : file.name,
        };
        resolve(compressedPayload.base64Data.length < fallbackPayload.base64Data.length ? compressedPayload : fallbackPayload);
      } catch {
        resolve(fallbackPayload);
      }
    };
    image.onerror = () => {
      window.clearTimeout(decodeTimeout);
      resolve(fallbackPayload);
    };
    image.src = originalDataUrl;
  });
}

function isFatalReceiptScanError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || '');
  return /only active household members|household not found|actor email is required/i.test(message);
}

function getReceiptScanManualEntryMessage(err?: unknown) {
  const message = err instanceof Error ? err.message : String(err || '');
  if (/timeout|timed out|abort|network/i.test(message)) {
    return 'Receipt attached. Hoodie could not finish reading it in time, so please keep entering the bill manually or try a clearer photo.';
  }
  return 'Receipt attached. Hoodie could not confidently read it this time, so please fill in the fields manually or try another photo.';
}

function getShareInputValue(value?: string) {
  if (value === undefined) return '1';
  return value;
}

function parseShareInputValue(value?: string) {
  if (value === undefined) return 1;
  if (value === '') return 0;
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function sanitizeHouseholdAttachment(attachment: HouseholdMediaAttachment): HouseholdMediaAttachment {
  return {
    storage_path: String(attachment.storage_path || ''),
    file_url: String(attachment.file_url || ''),
    file_type: String(attachment.file_type || ''),
    file_size: Number(attachment.file_size || 0),
    original_name: String(attachment.original_name || ''),
  };
}

function renderAttachmentIconLabel(value: { file_type?: string; original_name?: string }) {
  if (String(value.file_type || '').startsWith('video/')) return `Video • ${value.original_name || 'Attachment'}`;
  if (String(value.file_type || '').startsWith('image/')) return `Photo • ${value.original_name || 'Attachment'}`;
  return value.original_name || 'Attachment';
}

async function openHouseholdAttachmentUrl(fileUrl?: string) {
  const target = String(fileUrl || '').trim();
  if (!target) return;
  if (isNativeShell()) {
    try {
      await Browser.open({ url: target });
      return;
    } catch (error) {
      console.warn('GHAR household attachment native open failed, using browser fallback:', error);
    }
  }
  window.open(target, '_blank', 'noopener,noreferrer');
}

interface HouseholdAttachmentPreviewListProps {
  attachments: HouseholdMediaAttachment[];
  title?: string;
  onOpenAttachment?: (attachments: HouseholdMediaAttachment[], index: number, title: string) => void;
}

function isImageAttachment(attachment?: HouseholdMediaAttachment | null) {
  return String(attachment?.file_type || '').startsWith('image/');
}

function isVideoAttachment(attachment?: HouseholdMediaAttachment | null) {
  return String(attachment?.file_type || '').startsWith('video/');
}

function getInviteSenderLabel(invite: HouseholdInvite) {
  return String(invite.sender_display_name || '').trim() || getHouseholdEmailHandle(invite.sender_email);
}

function getInviteRecipientLabel(invite: HouseholdInvite) {
  return String(invite.recipient_label || '').trim()
    || (invite.recipient_email ? getHouseholdEmailHandle(invite.recipient_email) : 'Anyone with the link');
}

function parseInviteEmailsInput(value: string) {
  return Array.from(new Set(
    value
      .split(/[\n,;]+/)
      .map((entry) => normalizeHouseholdEmail(entry))
      .filter(Boolean),
  ));
}

function isStandardHouseholdBillCategory(value: string): value is HouseholdBillCategoryOption {
  return HOUSEHOLD_BILL_CATEGORY_OPTIONS.includes(value as HouseholdBillCategoryOption);
}

function getBillCategoryDraftState(value?: string | null): {
  selection: HouseholdBillCategorySelection;
  customValue: string;
} {
  const canonicalCategory = getCanonicalHouseholdBillCategory(value);
  if (!canonicalCategory) {
    return {
      selection: '',
      customValue: '',
    };
  }
  if (isStandardHouseholdBillCategory(canonicalCategory)) {
    return {
      selection: canonicalCategory,
      customValue: '',
    };
  }
  return {
    selection: 'Other',
    customValue: canonicalCategory,
  };
}

function resolveBillCategoryValue(
  selection: HouseholdBillCategorySelection,
  customValue: string,
): {
  category: string;
  error: string;
} {
  if (!selection) {
    return {
      category: '',
      error: 'Choose a bill category.',
    };
  }
  if (selection === 'Other') {
    const canonicalCategory = getCanonicalHouseholdBillCategory(customValue);
    return canonicalCategory
      ? {
          category: canonicalCategory,
          error: '',
        }
      : {
          category: '',
          error: 'Enter a custom bill category.',
        };
  }
  return {
    category: getCanonicalHouseholdBillCategory(selection),
    error: '',
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatHouseholdVisibleCopy(household: HouseholdRecord | null, text: string) {
  if (!text) return '';

  const replacements = new Map<string, string>();
  (household?.members || []).forEach((member) => {
    const normalized = normalizeHouseholdEmail(member.email_normalized);
    if (!normalized) return;
    replacements.set(normalized, getHouseholdMemberDisplayName(household, normalized));
  });
  (household?.invites || []).forEach((invite) => {
    const senderEmail = normalizeHouseholdEmail(invite.sender_email);
    if (senderEmail) {
      replacements.set(senderEmail, getInviteSenderLabel(invite));
    }
    const recipientEmail = normalizeHouseholdEmail(invite.recipient_email || '');
    if (recipientEmail) {
      replacements.set(recipientEmail, getHouseholdEmailHandle(recipientEmail));
    }
  });

  return [...replacements.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((current, [emailValue, displayName]) => {
      if (!emailValue || !displayName) return current;
      return current.replace(new RegExp(escapeRegExp(emailValue), 'gi'), displayName);
    }, text);
}

function HouseholdAttachmentPreviewList({
  attachments,
  title = 'Attachments',
  onOpenAttachment,
}: HouseholdAttachmentPreviewListProps) {
  if (!attachments.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <button
            key={`${attachment.file_url || attachment.storage_path || attachment.original_name}-${index}`}
            type="button"
            onClick={() => {
              if (onOpenAttachment) {
                onOpenAttachment(attachments, index, title);
                return;
              }
              if (attachment.file_url) {
                void openHouseholdAttachmentUrl(attachment.file_url);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-white px-3 py-1.5 text-[11px] font-medium text-[#1E40AF]"
          >
            <Paperclip className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="max-w-[14rem] truncate">{renderAttachmentIconLabel(attachment)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface HouseholdMediaViewerState {
  attachments: HouseholdMediaAttachment[];
  index: number;
  title: string;
}

interface HouseholdMediaViewerProps {
  viewer: HouseholdMediaViewerState | null;
  onClose: () => void;
  onSelect: (index: number) => void;
}

function HouseholdMediaViewer({ viewer, onClose, onSelect }: HouseholdMediaViewerProps) {
  if (!viewer || !viewer.attachments.length) return null;

  const currentAttachment = viewer.attachments[viewer.index] || viewer.attachments[0];
  const canGoPrev = viewer.index > 0;
  const canGoNext = viewer.index < viewer.attachments.length - 1;
  const fileUrl = currentAttachment?.file_url || '';

  return (
    <div
      className="fixed inset-0 z-[10030] flex items-center justify-center bg-[#020617]/90 px-4 py-4"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[min(92dvh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0F172A] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">{viewer.title}</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{currentAttachment?.original_name || 'Attachment'}</p>
          </div>
          <div className="flex items-center gap-2">
            {fileUrl ? (
              <button
                type="button"
                onClick={() => void openHouseholdAttachmentUrl(fileUrl)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/90"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                Open Outside
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close media viewer"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#020617] px-5 py-5">
          {isImageAttachment(currentAttachment) && fileUrl ? (
            <img
              src={fileUrl}
              alt={currentAttachment.original_name || 'Household attachment'}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          ) : isVideoAttachment(currentAttachment) && fileUrl ? (
            <video
              src={fileUrl}
              controls
              playsInline
              className="max-h-full max-w-full rounded-2xl bg-black"
            />
          ) : (
            <div className="max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center text-white/80">
              <p className="text-base font-semibold text-white">Preview unavailable in Hoodie</p>
              <p className="mt-2 text-sm leading-relaxed">
                This attachment type cannot be previewed inline yet. You can still open it outside the app.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => canGoPrev && onSelect(viewer.index - 1)}
                disabled={!canGoPrev}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous attachment"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => canGoNext && onSelect(viewer.index + 1)}
                disabled={!canGoNext}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next attachment"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
              {viewer.index + 1} of {viewer.attachments.length}
            </p>
          </div>
          {viewer.attachments.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {viewer.attachments.map((attachment, index) => (
                <button
                  key={`${attachment.file_url || attachment.storage_path || attachment.original_name}-${index}`}
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                    index === viewer.index
                      ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                      : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5" strokeWidth={1.8} />
                  <span className="max-w-[14rem] truncate">{renderAttachmentIconLabel(attachment)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface HouseholdAttachmentPickerProps {
  files: File[];
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  busy?: boolean;
  label?: string;
  helperText?: string;
}

interface HouseholdDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function HouseholdDateField({ value, onChange, placeholder, ariaLabel }: HouseholdDateFieldProps) {
  const displayValue = formatDateFieldDisplay(value);

  return (
    <label className="relative block">
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm transition peer-focus:border-[#93C5FD] peer-focus:ring-4 peer-focus:ring-[#DBEAFE]">
        <span className={displayValue ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
          {displayValue || placeholder}
        </span>
        <Clock3 className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.8} />
      </div>
    </label>
  );
}

function getHouseholdNotificationFeedback(notification?: {
  delivery_status?: string;
  delivered_device_count?: number;
  targeted_recipient_count?: number;
  delivery_error?: string;
}) {
  const deliveryStatus = String(notification?.delivery_status || 'queued');
  const deliveredDeviceCount = Number(notification?.delivered_device_count || 0);
  const targetedRecipientCount = Number(notification?.targeted_recipient_count || 0);

  if (deliveryStatus === 'no_devices' || deliveredDeviceCount <= 0) {
    return {
      tone: 'warning' as const,
      message:
        targetedRecipientCount > 0
          ? 'No selected devices could receive this push yet. Ask the member to open Hoodie on their phone and enable notifications for this app.'
          : 'No eligible household devices were selected for this push.',
    };
  }

  if (deliveryStatus === 'partial') {
    return {
      tone: 'warning' as const,
      message:
        deliveredDeviceCount > 0
          ? `Push sent to ${deliveredDeviceCount} device${deliveredDeviceCount === 1 ? '' : 's'}, but some selected devices could not be reached.`
          : notification?.delivery_error || 'This push could not be delivered to the selected devices.',
    };
  }

  return {
    tone: 'success' as const,
    message: `Push sent to ${deliveredDeviceCount} device${deliveredDeviceCount === 1 ? '' : 's'}.`,
  };
}

function HouseholdAttachmentPicker({
  files,
  onFilesSelected,
  onRemoveFile,
  busy = false,
  label = 'Photos or videos',
  helperText = 'Attach photos or videos for extra context.',
}: HouseholdAttachmentPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F172A]">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{helperText}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            onFilesSelected(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
          {busy ? 'Uploading...' : 'Add Media'}
        </button>
      </div>

      {files.length ? (
        <div className="mt-3 grid gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}:${file.size}:${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0F172A]">
                  {renderAttachmentIconLabel({ file_type: file.type, original_name: file.name })}
                </p>
                <p className="mt-0.5 text-[11px] text-[#64748B]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#B91C1C]"
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface HouseholdInviteCardProps {
  invite: HouseholdInvite;
  highlighted?: boolean;
  busyKey: string | null;
  onRespond: (token: string, action: 'accept' | 'decline') => void;
}

function HouseholdInviteCard({ invite, highlighted = false, busyKey, onRespond }: HouseholdInviteCardProps) {
  const acceptBusy = busyKey === `invite:${invite.token}:accept`;
  const declineBusy = busyKey === `invite:${invite.token}:decline`;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlighted
          ? 'border-[#BFDBFE] bg-[#EFF6FF] shadow-sm ring-2 ring-[#DBEAFE]'
          : 'border-[#E2E8F0] bg-[#F8FAFC]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F172A]">Accept Invite</p>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Address</p>
              <p className="mt-1 break-words text-sm text-[#0F172A]">
                {invite.household_address_label || invite.household_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Invited By</p>
              <p className="mt-1 break-words text-sm text-[#0F172A]">
                {getInviteSenderLabel(invite)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#64748B]">Expires {formatDateTimeLabel(invite.expires_at)}</p>
        </div>
        {highlighted ? (
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1E40AF]">
            Opened
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onRespond(invite.token, 'accept')}
          disabled={acceptBusy}
          className="flex-1 rounded-xl bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {acceptBusy ? 'Moving in...' : 'Move In'}
        </button>
        <button
          type="button"
          onClick={() => onRespond(invite.token, 'decline')}
          disabled={declineBusy}
          className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {declineBusy ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

function createHouseholdRuleDraftFromVersion(version?: HouseholdRulesVersion | null) {
  const fallback = createDefaultHouseholdRulesVersion();
  const source = version || fallback;
  return {
    title: source.title,
    description: source.description,
    change_note: '',
    sections: normalizeHouseholdRuleSections(source.sections),
  };
}

function getEditableHouseholdRuleSections(sections: HouseholdRuleSection[]) {
  return (sections || [])
    .map((section, sectionIndex) => {
      const sectionId = String(section.id || `section-${sectionIndex + 1}`).trim() || `section-${sectionIndex + 1}`;
      return {
        ...section,
        id: sectionId,
        title: String(section.title ?? ''),
        description: String(section.description ?? ''),
        order: Number.isFinite(Number(section.order)) ? Number(section.order) : sectionIndex,
        items: (section.items || [])
          .map((item, itemIndex) => ({
            ...item,
            id: String(item.id || `${sectionId}-item-${itemIndex + 1}`).trim() || `${sectionId}-item-${itemIndex + 1}`,
            text: String(item.text ?? ''),
            enabled: item.enabled !== false,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : itemIndex,
          }))
          .sort((left, right) => left.order - right.order)
          .map((item, itemIndex) => ({ ...item, order: itemIndex })),
      };
    })
    .sort((left, right) => left.order - right.order)
    .map((section, sectionIndex) => ({ ...section, order: sectionIndex }));
}

function createHouseholdRuleId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getEnabledRuleItemIdsFromSections(sections: HouseholdRuleSection[]) {
  return normalizeHouseholdRuleSections(sections)
    .flatMap((section) => section.items)
    .filter((item) => item.enabled)
    .map((item) => item.id);
}

function getHouseholdRulesSetupSectionError(section?: HouseholdRuleSection | null) {
  if (!section) return '';
  if (!String(section.title || '').trim()) return 'Add a title for this house rules section.';
  const blankEnabledItem = (section.items || []).find((item) => item.enabled !== false && !String(item.text || '').trim());
  if (blankEnabledItem) return 'Fill in every active checklist item before continuing, or turn blank items off.';
  return '';
}

function getHouseholdRulesSetupDraftError(sections: HouseholdRuleSection[]) {
  const editableSections = getEditableHouseholdRuleSections(sections);
  const sectionWithError = editableSections.find((section) => getHouseholdRulesSetupSectionError(section));
  if (sectionWithError) return getHouseholdRulesSetupSectionError(sectionWithError);
  const enabledTextCount = editableSections.reduce((count, section) => (
    count + (section.items || []).filter((item) => item.enabled !== false && String(item.text || '').trim()).length
  ), 0);
  if (enabledTextCount === 0) return 'Keep at least one active checklist item.';
  return '';
}

function getPreviousHouseRulesVersion(
  household: HouseholdRecord | null | undefined,
  currentVersion: HouseholdRulesVersion | null | undefined,
) {
  if (!currentVersion || currentVersion.version_number <= 1) return null;
  const versions = household?.house_rules?.versions || [];
  return [...versions]
    .filter((version) => version.version_number < currentVersion.version_number)
    .sort((left, right) => right.version_number - left.version_number)[0] || null;
}

function normalizeRuleComparisonText(value?: string) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getHouseRulesChangeHighlights(
  currentVersion: HouseholdRulesVersion | null | undefined,
  previousVersion: HouseholdRulesVersion | null | undefined,
) {
  const highlights = {
    sectionTitleIds: new Set<string>(),
    sectionDescriptionIds: new Set<string>(),
    itemTextIds: new Set<string>(),
  };

  if (!currentVersion || !previousVersion || currentVersion.version_number <= 1) return highlights;

  const previousSections = normalizeHouseholdRuleSections(previousVersion.sections);
  const previousSectionById = new Map(previousSections.map((section) => [section.id, section]));
  const previousItemById = new Map(
    previousSections.flatMap((section) => section.items.map((item) => [item.id, item] as const)),
  );

  normalizeHouseholdRuleSections(currentVersion.sections).forEach((section) => {
    const previousSection = previousSectionById.get(section.id);
    const sectionIsNew = !previousSection;
    if (sectionIsNew || normalizeRuleComparisonText(section.title) !== normalizeRuleComparisonText(previousSection?.title)) {
      highlights.sectionTitleIds.add(section.id);
    }
    if (section.description && (
      sectionIsNew
      || normalizeRuleComparisonText(section.description) !== normalizeRuleComparisonText(previousSection?.description)
    )) {
      highlights.sectionDescriptionIds.add(section.id);
    }

    section.items
      .filter((item) => item.enabled)
      .forEach((item) => {
        const previousItem = previousItemById.get(item.id);
        if (sectionIsNew || !previousItem || normalizeRuleComparisonText(item.text) !== normalizeRuleComparisonText(previousItem.text)) {
          highlights.itemTextIds.add(item.id);
        }
      });
  });

  return highlights;
}

function getSignatureSummary(signature?: HouseholdRulesSignature) {
  if (!signature) return 'No signature';
  if (signature.method === 'drawn_signature') {
    const strokeCount = signature.strokes?.length || 0;
    const typedName = String(signature.typed_value || '').trim();
    const drawnLabel = strokeCount > 0 ? `drawn signature (${strokeCount} stroke${strokeCount === 1 ? '' : 's'})` : 'drawn signature';
    return typedName ? `Typed name: ${typedName}; ${drawnLabel}` : `No typed name; ${drawnLabel}`;
  }
  return signature.typed_value ? `Typed initials: ${signature.typed_value}` : 'Typed initials';
}

function getHouseholdRulesSignatureError(signature: HouseholdRulesSignature, expectedSignerName: string) {
  const expectedName = normalizeHouseholdSignerName(expectedSignerName);
  const typedValue = normalizeHouseholdSignerName(signature.typed_value || '');
  const hasDrawnSignature = (signature.strokes || []).some((stroke) => (stroke.points || []).length >= 2);
  if (!expectedName) return 'Update your profile full name first before signing house rules.';
  if (!typedValue) return 'Type your profile full name before continuing.';
  if (typedValue !== expectedName) return 'Typed name must match your profile full name.';
  if (!hasDrawnSignature) return 'Draw your signature before continuing.';
  return '';
}

function isHouseholdRulesSignatureComplete(signature: HouseholdRulesSignature, expectedSignerName: string) {
  return !getHouseholdRulesSignatureError(signature, expectedSignerName);
}

function stopHouseRulesSetupFieldKeydown(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  event.stopPropagation();
}

function HouseRulesSignaturePad({
  strokes,
  onChange,
}: {
  strokes: NonNullable<HouseholdRulesSignature['strokes']>;
  onChange: (strokes: NonNullable<HouseholdRulesSignature['strokes']>) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);

  const getPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const addPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = getPoint(event);
    if (!point) return;
    onChange([
      ...strokes.slice(0, -1),
      {
        points: [
          ...(strokes.at(-1)?.points || []),
          point,
        ],
      },
    ]);
  };

  const paths = strokes
    .map((stroke) => stroke.points)
    .filter((points) => points.length > 0)
    .map((points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 100} ${point.y * 100}`).join(' '));

  return (
    <div className="space-y-2 select-none">
      <p className="select-none text-xs leading-relaxed text-[#64748B]">
        Draw your signature in the box with your finger, mouse, or trackpad.
      </p>
      <div
        ref={padRef}
        role="application"
        aria-label="Draw signature"
        data-testid="house-rules-signature-pad"
        draggable={false}
        className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-2xl border-2 border-dashed border-[#93C5FD] bg-white"
        style={{
          aspectRatio: String(HOUSEHOLD_RULES_SIGNATURE_ASPECT_RATIO),
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
          drawingRef.current = true;
          if (typeof event.currentTarget.setPointerCapture === 'function' && event.pointerId != null) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          const point = getPoint(event);
          if (!point) return;
          onChange([...strokes, { points: [point] }]);
        }}
        onPointerMove={(event) => {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
          if (!drawingRef.current) return;
          addPoint(event);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
          drawingRef.current = false;
          if (
            typeof event.currentTarget.hasPointerCapture === 'function'
            && event.pointerId != null
            && event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
          drawingRef.current = false;
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full select-none">
          {paths.map((path, index) => (
            <path key={`${path}-${index}`} d={path} fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {paths.length === 0 ? (
          <div className="pointer-events-none flex h-full select-none items-center justify-center px-6 text-center text-sm font-semibold text-[#94A3B8]">
            Scribble your signature here
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-8 bottom-10 select-none border-b border-[#CBD5E1]" />
      </div>
      <button
        type="button"
        onClick={() => onChange([])}
        disabled={strokes.length === 0}
        className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear signature
      </button>
    </div>
  );
}

function buildEvenSplits(total: number, memberEmails: string[]) {
  if (!memberEmails.length) return [];
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / memberEmails.length);
  let remainder = totalCents - baseCents * memberEmails.length;

  return memberEmails.map((memberEmail) => {
    const nextCents = baseCents + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return {
      member_email: memberEmail,
      amount_owed: nextCents / 100,
      shares: 1,
    };
  });
}

function buildShareSplits(
  total: number,
  memberEmails: string[],
  sharesByMember: Record<string, number>,
) {
  if (!memberEmails.length) return [];
  const totalCents = Math.round(total * 100);
  const totalShares = memberEmails.reduce((sum, memberEmail) => sum + Math.max(0, Math.round(sharesByMember[memberEmail] || 0)), 0);

  if (totalShares <= 0) {
    return memberEmails.map((memberEmail) => ({
      member_email: memberEmail,
      amount_owed: 0,
      shares: Math.max(0, Math.round(sharesByMember[memberEmail] || 0)),
    }));
  }

  let remainingCents = totalCents;
  let remainingShares = totalShares;

  return memberEmails.map((memberEmail, index) => {
    const shares = Math.max(0, Math.round(sharesByMember[memberEmail] || 0));
    const isLast = index === memberEmails.length - 1;
    const cents = isLast
      ? remainingCents
      : remainingShares > 0 ? Math.round((remainingCents * shares) / remainingShares) : 0;
    remainingCents -= cents;
    remainingShares -= shares;
    return {
      member_email: memberEmail,
      amount_owed: cents / 100,
      shares,
    };
  });
}

function getActivityFilterMatch(filter: ActivityFilter, eventType: string) {
  if (filter === 'all') return true;
  if (filter === 'members') return eventType.includes('member') || eventType.includes('invite');
  if (filter === 'bills') return eventType.includes('bill') || eventType.includes('payment');
  if (filter === 'chores') return eventType.includes('chore');
  if (filter === 'notifications') return eventType.includes('notification') || eventType.includes('email');
  return true;
}

function getActivityLabel(eventType: string) {
  switch (eventType) {
    case 'household_created':
      return 'Household created';
    case 'invite_sent':
      return 'Invite sent';
    case 'invite_resent':
      return 'Invite resent';
    case 'invite_cancelled':
      return 'Invite cancelled';
    case 'invite_accepted':
      return 'Invite accepted';
    case 'invite_declined':
      return 'Invite declined';
    case 'house_rules_published':
      return 'House rules published';
    case 'house_rules_acknowledged':
      return 'House rules signed';
    case 'member_joined':
      return 'Member joined';
    case 'member_removed':
      return 'Member removed';
    case 'member_left':
      return 'Member left';
    case 'bill_created':
      return 'Bill created';
    case 'payment_marked_paid':
      return 'Payment marked paid';
    case 'payment_confirmed':
      return 'Payment confirmed';
    case 'chore_created':
      return 'Chore created';
    case 'chore_completed':
      return 'Chore completed';
    case 'notification_sent':
      return 'Push sent';
    case 'email_sent':
      return 'Notification sent';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

function getNotificationOrigin(notification: HouseholdNotification): HouseholdNotificationOriginType | 'system' {
  if (notification.origin_type) return notification.origin_type;
  if (notification.entity_type === 'house_rules') return 'house_rules_changed';
  if (notification.entity_type === 'household_notification') return 'manual';
  return 'system';
}

function isManualHouseholdNotification(notification: HouseholdNotification) {
  return getNotificationOrigin(notification) === 'manual';
}

function getNotificationDestinationLabel(deepLink?: string) {
  const normalized = String(deepLink || '');
  if (!normalized) return 'Household overview';
  if (normalized.includes('invite=')) return 'Invite review';
  if (normalized.includes('notification_id=')) return 'Activity';
  if (normalized.includes('household_tab=bills')) return 'Bills';
  if (normalized.includes('household_tab=chores')) return 'Chores';
  if (normalized.includes('household_tab=members')) return 'Members';
  if (normalized.includes('household_tab=rules')) return 'House Rules';
  if (normalized.includes('household_tab=activity')) return 'Activity';
  return 'Household overview';
}

function getFocusContainerClass(isFocused: boolean) {
  if (!isFocused) return '';
  return 'ring-2 ring-[#93C5FD] ring-offset-2 ring-offset-white shadow-[0_18px_45px_rgba(30,64,175,0.12)]';
}

function scrollToFocusedElement(focusTargetId: string) {
  if (typeof document === 'undefined' || !focusTargetId) return;
  window.setTimeout(() => {
    document.getElementById(`household-focus-${focusTargetId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 180);
}

function getNotificationDeliveryLabel(notification: HouseholdNotification) {
  const deliveredDevices = Number(notification.delivered_device_count || 0);
  const targetedRecipients = Number(notification.targeted_recipient_count || notification.recipient_emails.length || 0);
  const deliveredRecipients = Number(notification.delivered_recipient_count || 0);

  if (notification.delivery_status === 'no_devices') {
    return targetedRecipients > 0
      ? `No devices reached for ${targetedRecipients} selected recipient${targetedRecipients === 1 ? '' : 's'}`
      : 'No eligible devices';
  }
  if (notification.delivery_status === 'partial') {
    return `Delivered to ${deliveredDevices} device${deliveredDevices === 1 ? '' : 's'} across ${deliveredRecipients} recipient${deliveredRecipients === 1 ? '' : 's'}`;
  }
  if (notification.delivery_status === 'dispatched') {
    return `Delivered to ${deliveredDevices} device${deliveredDevices === 1 ? '' : 's'}`;
  }
  return deliveredDevices > 0
    ? `Delivered to ${deliveredDevices} device${deliveredDevices === 1 ? '' : 's'}`
    : 'Queued for delivery';
}

interface HouseholdCompactModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  dismissible?: boolean;
}

function HouseholdCompactModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = 'max-w-md',
  dismissible = true,
}: HouseholdCompactModalProps) {
  if (!open) return null;

  const handleClose = () => {
    if (dismissible) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/40 px-4 py-4 sm:p-6"
      style={{
        ...keyboardAwareModalPaddingStyle,
        paddingTop: 'max(calc(var(--native-safe-area-top) + 1rem), 1rem)',
        paddingBottom: 'max(calc(var(--app-bottom-nav-clearance) + 1rem), calc(var(--app-keyboard-inset) + 1rem))',
      }}
      onClick={handleClose}
    >
      <div
        className={`flex max-h-full min-h-0 w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-2xl`}
        style={{
          maxHeight:
            'calc(100dvh - max(calc(var(--native-safe-area-top) + 2rem), calc(var(--app-bottom-nav-clearance) + 2rem), calc(var(--app-keyboard-inset) + 2rem)))',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-5 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#0F172A]">{title}</p>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{description}</p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              aria-label={`Close ${title}`}
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>

        <div
          className="min-h-0 overflow-y-auto px-5 py-4"
          data-keyboard-aware-scroll
          style={keyboardAwareNestedScrollStyle}
        >
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 border-t border-[#E2E8F0] bg-white px-5 py-4"
            style={{ paddingBottom: 'max(1rem, calc(var(--app-keyboard-inset) + 0.75rem))' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HouseholdPanel({
  email,
  profileFullName = '',
  rentalHistory,
  household,
  pendingInvites,
  sharedBills = [],
  billContacts = [],
  onRefresh,
  onOpenTimeline,
  onStartCreateHousehold,
  incomingInviteToken,
  incomingInviteIntent = null,
  onClearIncomingInvite,
  initialSectionTab = 'overview',
  onSectionTabChange,
  focusedBillId = '',
  focusedPaymentId = '',
  focusedChoreId = '',
  focusedNotificationId = '',
  routeSource = null,
  onRefreshSuspendedChange,
  onOpenRoute,
  initialOwnerInviteLaunch,
  onConsumeInitialOwnerInviteLaunch,
}: HouseholdPanelProps) {
  const { activeMode, activeStepId } = useHoodieHelpTour();
  const isHouseholdOnboardingStep = activeMode === 'first_run' && activeStepId === 'household';
  const normalizedEmail = normalizeHouseholdEmail(email);
  const activeMembers = useMemo(() => getActiveHouseholdMembers(household), [household]);
  const pastMembers = useMemo(() => getPastHouseholdMembers(household), [household]);
  const allBills = useMemo(() => {
    const householdBills = household?.bills || [];
    const knownBillIds = new Set(householdBills.map((bill) => bill.id));
    return [
      ...householdBills,
      ...sharedBills.filter((bill) => !knownBillIds.has(bill.id)),
    ].sort((a, b) => new Date(b.created_at || b.due_at || 0).getTime() - new Date(a.created_at || a.due_at || 0).getTime());
  }, [household?.bills, sharedBills]);
  const householdAttention = useMemo(
    () => getHouseholdAttentionSummary(household, email, pendingInvites, sharedBills),
    [email, household, pendingInvites, sharedBills],
  );
  const householdHeaderDisplay = useMemo(
    () => getHouseholdHeaderDisplay(household?.name, household?.address_snapshot),
    [household?.address_snapshot, household?.name],
  );
  const eligibleTimelineEntries = useMemo(
    () => rentalHistory.filter((entry) => entry.id),
    [rentalHistory],
  );
  const activeMemberEmails = useMemo(
    () => activeMembers.map((member) => member.email_normalized),
    [activeMembers],
  );
  const recipientDefaultEmails = useMemo(
    () => activeMemberEmails.filter((memberEmail) => memberEmail !== normalizedEmail),
    [activeMemberEmails, normalizedEmail],
  );
  const currentUserBillParticipant = useMemo<BillParticipantDraft>(() => {
    const member = activeMembers.find((entry) => entry.email_normalized === normalizedEmail);
    return {
      email: normalizedEmail,
      label: member?.display_name || getHouseholdEmailHandle(normalizedEmail),
      participantType: member ? 'household_member' : 'hoodie_friend',
    };
  }, [activeMembers, normalizedEmail]);
  const householdBillParticipantOptions = useMemo<BillParticipantDraft[]>(
    () => activeMembers.map((member) => ({
      email: member.email_normalized,
      label: getHouseholdMemberDisplayName(household, member.email_normalized),
      participantType: 'household_member',
    })),
    [activeMembers, household],
  );
  const savedBillContactOptions = useMemo<BillParticipantDraft[]>(() => {
    const activeEmails = new Set(activeMemberEmails.map((entry) => normalizeHouseholdEmail(entry)));
    return billContacts
      .map((contact) => ({
        email: normalizeHouseholdEmail(contact.email_normalized),
        label: String(contact.display_name || '').trim() || getHouseholdEmailHandle(contact.email_normalized),
        participantType: 'hoodie_friend' as HouseholdBillParticipantType,
      }))
      .filter((contact) => contact.email && !activeEmails.has(contact.email));
  }, [activeMemberEmails, billContacts]);
  const defaultBillParticipants = useMemo<BillParticipantDraft[]>(
    () => (householdBillParticipantOptions.length ? householdBillParticipantOptions : [currentUserBillParticipant]),
    [currentUserBillParticipant, householdBillParticipantOptions],
  );
  const storedProfileName = useMemo(
    () => ({
      firstName: typeof window === 'undefined' ? '' : String(window.localStorage.getItem('ghar_first_name') || ''),
      lastName: typeof window === 'undefined' ? '' : String(window.localStorage.getItem('ghar_last_name') || ''),
    }),
    [],
  );
  const notificationSenderName = useMemo(
    () => getHouseholdNotificationSenderDisplayName(household, normalizedEmail, storedProfileName),
    [household, normalizedEmail, storedProfileName],
  );
  const profileSignerName = useMemo(() => {
    const providedName = String(profileFullName || '').replace(/\s+/g, ' ').trim();
    if (providedName) return providedName;
    return [storedProfileName.firstName, storedProfileName.lastName]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [profileFullName, storedProfileName]);

  const [sectionTab, setSectionTab] = useState<HouseholdSectionTab>(initialSectionTab);
  const [drawerMode, setDrawerMode] = useState<HouseholdDrawerMode>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionSuccessTone, setActionSuccessTone] = useState<'success' | 'warning'>('success');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showSectionDrawer, setShowSectionDrawer] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [confirmAction, setConfirmAction] = useState<HouseholdConfirmAction | null>(null);
  const [activeFocusTargetId, setActiveFocusTargetId] = useState('');
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [billExistingAttachments, setBillExistingAttachments] = useState<HouseholdMediaAttachment[]>([]);
  const [choreExistingAttachments, setChoreExistingAttachments] = useState<HouseholdMediaAttachment[]>([]);
  const [mediaViewer, setMediaViewer] = useState<HouseholdMediaViewerState | null>(null);
  const [invitePreview, setInvitePreview] = useState<HouseholdInvite | null>(null);
  const [invitePreviewMissing, setInvitePreviewMissing] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<HouseholdInvite | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [inviteMode, setInviteMode] = useState<HouseholdInviteMode>('email');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [rulesInvite, setRulesInvite] = useState<HouseholdInvite | null>(null);
  const [rulesCheckedItemIds, setRulesCheckedItemIds] = useState<string[]>([]);
  const [rulesAcceptanceStepIndex, setRulesAcceptanceStepIndex] = useState(0);
  const [rulesTypedSignature, setRulesTypedSignature] = useState('');
  const [rulesSignatureStrokes, setRulesSignatureStrokes] = useState<NonNullable<HouseholdRulesSignature['strokes']>>([]);
  const [rulesDraftTitle, setRulesDraftTitle] = useState('');
  const [rulesDraftDescription, setRulesDraftDescription] = useState('');
  const [rulesDraftChangeNote, setRulesDraftChangeNote] = useState('');
  const [rulesDraftSections, setRulesDraftSections] = useState<HouseholdRuleSection[]>([]);
  const [rulesSetupStepIndex, setRulesSetupStepIndex] = useState(0);
  const [rulesPublishSignature, setRulesPublishSignature] = useState('');
  const [rulesPublishSignatureStrokes, setRulesPublishSignatureStrokes] = useState<NonNullable<HouseholdRulesSignature['strokes']>>([]);
  const [rulesPdfWarning, setRulesPdfWarning] = useState('');
  const [rulesPdfBusy, setRulesPdfBusy] = useState(false);

  const [emailTemplateType, setEmailTemplateType] = useState<HouseholdNotificationTemplateType>('custom');
  const [emailRecipientEmails, setEmailRecipientEmails] = useState<string[]>(recipientDefaultEmails);
  const [emailGratitudeThankedMemberEmail, setEmailGratitudeThankedMemberEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSubjectManuallyEdited, setEmailSubjectManuallyEdited] = useState(false);

  const [billTitle, setBillTitle] = useState('');
  const [billCategorySelection, setBillCategorySelection] = useState<HouseholdBillCategorySelection>('');
  const [billCategoryCustomValue, setBillCategoryCustomValue] = useState('');
  const [billAmountTotal, setBillAmountTotal] = useState('');
  const [billDueAt, setBillDueAt] = useState('');
  const [billPaidByEmail, setBillPaidByEmail] = useState(normalizedEmail);
  const [billSplitType, setBillSplitType] = useState<HouseholdSplitType>('equal');
  const [billNotes, setBillNotes] = useState('');
  const [billEmailMembers, setBillEmailMembers] = useState(true);
  const [isPersonalBillMode, setIsPersonalBillMode] = useState(false);
  const [billParticipantDrafts, setBillParticipantDrafts] = useState<BillParticipantDraft[]>([currentUserBillParticipant]);
  const [billFriendEmailInput, setBillFriendEmailInput] = useState('');
  const [billCustomAmounts, setBillCustomAmounts] = useState<Record<string, string>>({});
  const [billShares, setBillShares] = useState<Record<string, string>>({});
  const [billMediaFiles, setBillMediaFiles] = useState<File[]>([]);
  const [paymentDraftBillId, setPaymentDraftBillId] = useState<string | null>(null);
  const [paymentDraftSplitId, setPaymentDraftSplitId] = useState<string | null>(null);
  const [paymentDraftSplitMemberEmail, setPaymentDraftSplitMemberEmail] = useState<string | null>(null);
  const [paymentDraftAmount, setPaymentDraftAmount] = useState('');
  const [paymentDraftNote, setPaymentDraftNote] = useState('');
  const [paymentMediaFiles, setPaymentMediaFiles] = useState<File[]>([]);

  const [choreTitle, setChoreTitle] = useState('');
  const [choreCadence, setChoreCadence] = useState<HouseholdCadence>('weekly');
  const [choreAssignmentMode, setChoreAssignmentMode] = useState<'assigned' | 'rotation' | 'claimable'>('assigned');
  const [choreDueAt, setChoreDueAt] = useState('');
  const [choreAssignedToEmail, setChoreAssignedToEmail] = useState(normalizedEmail);
  const [choreEmailMembers, setChoreEmailMembers] = useState(true);
  const [choreNotes, setChoreNotes] = useState('');
  const [choreMediaFiles, setChoreMediaFiles] = useState<File[]>([]);
  const [completeChoreId, setCompleteChoreId] = useState<string | null>(null);
  const [completeChoreNote, setCompleteChoreNote] = useState('');
  const [completeChoreMediaFiles, setCompleteChoreMediaFiles] = useState<File[]>([]);
  const householdDrawerStyle = getKeyboardAwareLargeSheetStyle(760);
  const shareInviteBootstrapKeyRef = useRef<string | null>(null);
  const autoOpenedInviteTokenRef = useRef<string | null>(null);
  const pendingRulesDraftItemFocusIdRef = useRef<string | null>(null);
  const lastNonPersonalBillParticipantsRef = useRef<BillParticipantDraft[]>([]);
  const billParticipantEmails = useMemo(
    () => billParticipantDrafts.map((participant) => normalizeHouseholdEmail(participant.email)).filter(Boolean),
    [billParticipantDrafts],
  );
  const isSelfOnlyBillDraft = useMemo(() => {
    const uniqueParticipantEmails = Array.from(new Set(billParticipantEmails));
    return uniqueParticipantEmails.length === 1 && uniqueParticipantEmails[0] === normalizedEmail;
  }, [billParticipantEmails, normalizedEmail]);
  const isPersonalBillDraft = isPersonalBillMode || isSelfOnlyBillDraft;

  const orderedPendingInvites = useMemo(() => {
    const inviteMap = new Map<string, HouseholdInvite>();
    pendingInvites.forEach((invite) => {
      inviteMap.set(invite.token, invite);
    });
    if (invitePreview) {
      inviteMap.set(invitePreview.token, invitePreview);
    }
    const mergedInvites = Array.from(inviteMap.values());
    if (!incomingInviteToken) return mergedInvites;
    const highlightedInvite = mergedInvites.find((invite) => invite.token === incomingInviteToken);
    if (!highlightedInvite) return mergedInvites;
    return [highlightedInvite, ...mergedInvites.filter((invite) => invite.token !== incomingInviteToken)];
  }, [incomingInviteToken, invitePreview, pendingInvites]);

  const highlightedPendingInvite = useMemo(
    () =>
      incomingInviteToken
        ? orderedPendingInvites.find((invite) => invite.token === incomingInviteToken) || null
        : null,
    [incomingInviteToken, orderedPendingInvites],
  );

  const incomingInviteUnavailable = Boolean(incomingInviteToken && invitePreviewMissing && !highlightedPendingInvite);
  const sharedPendingInvites = useMemo(
    () => (household?.invites || []).filter((invite) => invite.status === 'pending'),
    [household],
  );
  const latestShareInvite = useMemo(
    () => getLatestPendingHouseholdShareInvite(household),
    [household],
  );
  const activeShareInvite = generatedInvite?.transport === 'share_link' ? generatedInvite : latestShareInvite;
  const activeShareInviteUrl = generatedInviteUrl || activeShareInvite?.share_url || '';
  const latestHouseRulesVersion = useMemo(
    () => getLatestHouseholdRulesVersion(household),
    [household],
  );
  const householdOwnerMember = useMemo(
    () => activeMembers.find((member) => member.role === 'owner')
      || household?.members?.find((member) => member.role === 'owner')
      || null,
    [activeMembers, household?.members],
  );
  const isCurrentUserHouseholdOwner = normalizeHouseholdEmail(householdOwnerMember?.email_normalized || household?.created_by_email || '') === normalizedEmail;
  const ownerRulesSetupComplete = useMemo(
    () => isHouseholdRulesOwnerSetupComplete(household),
    [household],
  );
  const needsOwnerRulesSetup = Boolean(
    household
    && latestHouseRulesVersion
    && isCurrentUserHouseholdOwner
    && !ownerRulesSetupComplete,
  );
  const rulesAcceptanceVersion = rulesInvite?.house_rules_version || latestHouseRulesVersion;
  const needsLatestRulesAcknowledgement = Boolean(
    household
    && latestHouseRulesVersion
    && ownerRulesSetupComplete
    && !needsOwnerRulesSetup
    && !hasAcknowledgedLatestHouseholdRules(household, normalizedEmail, profileSignerName),
  );
  const rulesAcknowledgementStatus = useMemo(
    () => getHouseholdRulesAcknowledgementStatus(household),
    [household],
  );
  const rulesSignature: HouseholdRulesSignature = useMemo(() => ({
    method: 'drawn_signature',
    typed_value: rulesTypedSignature.trim(),
    strokes: rulesSignatureStrokes,
  }), [rulesSignatureStrokes, rulesTypedSignature]);
  const rulesPublishSignaturePayload: HouseholdRulesSignature = useMemo(() => ({
    method: 'drawn_signature',
    typed_value: rulesPublishSignature.trim(),
    strokes: rulesPublishSignatureStrokes,
  }), [rulesPublishSignature, rulesPublishSignatureStrokes]);
  const rulesValidation = useMemo(
    () => validateHouseholdRulesAcknowledgementDraft({
      version: rulesAcceptanceVersion,
      checkedItemIds: rulesCheckedItemIds,
      signature: rulesSignature,
      expectedSignerName: profileSignerName,
    }),
    [profileSignerName, rulesAcceptanceVersion, rulesCheckedItemIds, rulesSignature],
  );
  const rulesAcceptanceSections = useMemo(
    () => normalizeHouseholdRuleSections(rulesAcceptanceVersion?.sections || [])
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.enabled),
      }))
      .filter((section) => section.items.length > 0),
    [rulesAcceptanceVersion?.sections],
  );
  const previousRulesAcceptanceVersion = useMemo(
    () => getPreviousHouseRulesVersion(household, rulesAcceptanceVersion),
    [household, rulesAcceptanceVersion],
  );
  const rulesAcceptanceChangeHighlights = useMemo(
    () => getHouseRulesChangeHighlights(rulesAcceptanceVersion, previousRulesAcceptanceVersion),
    [previousRulesAcceptanceVersion, rulesAcceptanceVersion],
  );
  const rulesAcceptanceStepCount = rulesAcceptanceSections.length + 1;
  const rulesAcceptanceIsSignatureStep = rulesAcceptanceStepIndex >= rulesAcceptanceSections.length;
  const currentRulesAcceptanceSection = rulesAcceptanceIsSignatureStep ? null : rulesAcceptanceSections[rulesAcceptanceStepIndex] || null;
  const rulesSetupSections = useMemo(
    () => getEditableHouseholdRuleSections(rulesDraftSections),
    [rulesDraftSections],
  );
  const rulesSetupStepCount = rulesSetupSections.length + 1;
  const rulesSetupIsSignatureStep = rulesSetupStepIndex >= rulesSetupSections.length;
  const currentRulesSetupSection = rulesSetupIsSignatureStep ? null : rulesSetupSections[rulesSetupStepIndex] || null;
  useEffect(() => {
    if (drawerMode !== 'rules_setup') return;
    const targetItemId = pendingRulesDraftItemFocusIdRef.current;
    if (!targetItemId) return;
    const escapedItemId = targetItemId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const textarea = document.querySelector(`[data-house-rule-item-id="${escapedItemId}"]`) as HTMLTextAreaElement | null;
    if (!textarea) return;
    pendingRulesDraftItemFocusIdRef.current = null;
    textarea.focus();
  }, [drawerMode, rulesDraftSections, rulesSetupStepIndex]);
  const ownerInviteShareText = useMemo(() => {
    if (!household || !activeShareInviteUrl) return '';
    const ownerLabel =
      String(activeShareInvite?.sender_display_name || '').trim()
      || getHouseholdMemberDisplayName(household, household.created_by_email)
      || getHouseholdEmailHandle(household.created_by_email);
    return `${ownerLabel} invited you to their Hoodie household: ${activeShareInviteUrl}`;
  }, [activeShareInvite?.sender_display_name, activeShareInviteUrl, household]);
  const gratitudeNotificationDraft = useMemo(
    () => buildHouseholdGratitudeNotification(
      notificationSenderName,
      emailGratitudeThankedMemberEmail
        ? getHouseholdMemberDisplayName(household, emailGratitudeThankedMemberEmail)
        : '',
    ),
    [emailGratitudeThankedMemberEmail, household, notificationSenderName],
  );
  const notificationTemplatePresets = useMemo(
    () => [
      staticNotificationTemplatePresets[0],
      staticNotificationTemplatePresets[1],
      staticNotificationTemplatePresets[2],
      {
        id: 'gratitude' as HouseholdNotificationTemplateType,
        label: 'Thank & celebrate',
        title: gratitudeNotificationDraft.title,
        body: gratitudeNotificationDraft.body,
      },
      staticNotificationTemplatePresets[3],
      staticNotificationTemplatePresets[4],
    ],
    [gratitudeNotificationDraft.body, gratitudeNotificationDraft.title],
  );
  const isGratitudeTemplate = emailTemplateType === 'gratitude';

  useEffect(() => {
    if (!profileSignerName) return;
    if (drawerMode === 'rules_accept' && !rulesTypedSignature) {
      setRulesTypedSignature(profileSignerName);
    }
    if (drawerMode === 'rules_setup' && !rulesPublishSignature) {
      setRulesPublishSignature(profileSignerName);
    }
  }, [drawerMode, profileSignerName, rulesPublishSignature, rulesTypedSignature]);

  useEffect(() => {
    setRulesAcceptanceStepIndex((current) => Math.min(current, Math.max(0, rulesAcceptanceStepCount - 1)));
  }, [rulesAcceptanceStepCount]);

  useEffect(() => {
    setRulesSetupStepIndex((current) => Math.min(current, Math.max(0, rulesSetupStepCount - 1)));
  }, [rulesSetupStepCount]);

  useEffect(() => {
    setEmailRecipientEmails(recipientDefaultEmails);
  }, [recipientDefaultEmails]);

  useEffect(() => {
    if (emailTemplateType !== 'gratitude' || emailSubjectManuallyEdited) return;
    setEmailSubject((current) => (current === gratitudeNotificationDraft.title ? current : gratitudeNotificationDraft.title));
  }, [emailSubjectManuallyEdited, emailTemplateType, gratitudeNotificationDraft.title]);

  useEffect(() => {
    setSectionTab((current) => (current === initialSectionTab ? current : initialSectionTab));
  }, [initialSectionTab]);

  useEffect(() => {
    setBillPaidByEmail((current) => (
      billParticipantEmails.includes(current)
        ? current
        : billParticipantEmails.includes(normalizedEmail)
          ? normalizedEmail
          : billParticipantEmails[0] || normalizedEmail
    ));
    setChoreAssignedToEmail((current) => (activeMemberEmails.includes(current) ? current : normalizedEmail));
  }, [activeMemberEmails, billParticipantEmails, normalizedEmail]);

  useEffect(() => {
    if (!incomingInviteToken || !incomingInviteIntent) return;
    if (!household) {
      setSectionTab('overview');
    }
  }, [household, incomingInviteIntent, incomingInviteToken]);

  useEffect(() => {
    let cancelled = false;

    if (!incomingInviteToken) {
      setInvitePreview(null);
      setInvitePreviewMissing(false);
      return;
    }

    const existingInvite = pendingInvites.find((invite) => invite.token === incomingInviteToken) || null;
    if (existingInvite) {
      setInvitePreview(existingInvite);
      setInvitePreviewMissing(false);
      return;
    }

    setInvitePreviewMissing(false);
    void fetchHouseholdInvitePreview({ token: incomingInviteToken, email })
      .then((nextInvite) => {
        if (cancelled) return;
        setInvitePreview(nextInvite);
        setInvitePreviewMissing(false);
      })
      .catch(() => {
        if (cancelled) return;
        setInvitePreview(null);
        setInvitePreviewMissing(true);
      });

    return () => {
      cancelled = true;
    };
  }, [email, incomingInviteToken, pendingInvites]);

  useEffect(() => {
    onRefreshSuspendedChange?.(Boolean(drawerMode));
    return () => {
      onRefreshSuspendedChange?.(false);
    };
  }, [drawerMode, onRefreshSuspendedChange]);

  useEffect(() => {
    const focusTargetId = getHouseholdFocusTargetId({
      billId: focusedBillId,
      paymentId: focusedPaymentId,
      choreId: focusedChoreId,
      notificationId: focusedNotificationId,
    });
    if (!focusTargetId) return;

    const nextTab = focusedNotificationId
      ? 'activity'
      : (focusedBillId || focusedPaymentId)
        ? 'bills'
        : focusedChoreId
          ? 'chores'
          : initialSectionTab;
    handleSectionTabChange(nextTab);
    if (focusedNotificationId) {
      setActivityFilter('notifications');
    }
    setActiveFocusTargetId(focusTargetId);
    scrollToFocusedElement(focusTargetId);

    const timeout = window.setTimeout(() => {
      setActiveFocusTargetId((current) => (current === focusTargetId ? '' : current));
    }, routeSource === 'imessage' ? 8000 : 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    focusedBillId,
    focusedPaymentId,
    focusedChoreId,
    focusedNotificationId,
    initialSectionTab,
    routeSource,
  ]);

  const handleSectionTabChange = (nextTab: HouseholdSectionTab) => {
    setShowSectionDrawer(false);
    setSectionTab((current) => (current === nextTab ? current : nextTab));
    onSectionTabChange?.(nextTab);
  };

  const handleOpenExpenseTracker = () => {
    setShowSectionDrawer(false);
    if (onOpenRoute) {
      onOpenRoute('/household/expenses');
      return;
    }
    window.dispatchEvent(new CustomEvent('ghar-open-route', { detail: { route: '/household/expenses' } }));
  };

  const handleOpenNotificationDestination = (notification: HouseholdNotification) => {
    const deepLink = String(notification.deep_link || '');
    if (onOpenRoute && deepLink) {
      onOpenRoute(deepLink);
      if (deepLink.includes('household_tab=rules') && needsLatestRulesAcknowledgement) {
        window.setTimeout(() => openRulesAcceptanceDraft(), 0);
      }
      return;
    }
    const parsedRoute = parseHouseholdRoute(deepLink);
    if (parsedRoute.notificationId) {
      setActivityFilter('notifications');
      setActiveFocusTargetId(`notification:${parsedRoute.notificationId}`);
      scrollToFocusedElement(`notification:${parsedRoute.notificationId}`);
    }
    if (deepLink.includes('household_tab=bills')) {
      handleSectionTabChange('bills');
      return;
    }
    if (deepLink.includes('household_tab=chores')) {
      handleSectionTabChange('chores');
      return;
    }
    if (deepLink.includes('household_tab=members')) {
      handleSectionTabChange('members');
      return;
    }
    if (deepLink.includes('household_tab=rules')) {
      handleSectionTabChange('rules');
      if (needsLatestRulesAcknowledgement) {
        window.setTimeout(() => openRulesAcceptanceDraft(), 0);
      }
      return;
    }
    if (deepLink.includes('household_tab=activity')) {
      handleSectionTabChange('activity');
      return;
    }
    handleSectionTabChange('overview');
  };

  const resetDrawerState = () => {
    setGeneratedInvite(null);
    setGeneratedInviteUrl('');
    setInviteMode('email');
    setInviteEmailInput('');
    setRulesInvite(null);
    setRulesCheckedItemIds([]);
    setRulesAcceptanceStepIndex(0);
    setRulesTypedSignature('');
    setRulesSignatureStrokes([]);
    setRulesDraftTitle('');
    setRulesDraftDescription('');
    setRulesDraftChangeNote('');
    setRulesDraftSections([]);
    setRulesSetupStepIndex(0);
    setRulesPublishSignature('');
    setRulesPublishSignatureStrokes([]);
    setRulesPdfWarning('');
    setEmailTemplateType('custom');
    setEmailSubject('');
    setEmailBody('');
    setEmailRecipientEmails(recipientDefaultEmails);
    setEmailGratitudeThankedMemberEmail('');
    setEmailSubjectManuallyEdited(false);
    setEditingNotificationId(null);
    setBillTitle('');
    setBillCategorySelection('');
    setBillCategoryCustomValue('');
    setBillAmountTotal('');
    setBillDueAt('');
    setBillPaidByEmail(normalizedEmail);
    setBillSplitType('equal');
    setBillNotes('');
    setBillEmailMembers(true);
    setIsPersonalBillMode(false);
    setBillParticipantDrafts(defaultBillParticipants);
    lastNonPersonalBillParticipantsRef.current = defaultBillParticipants;
    setBillFriendEmailInput('');
    setBillCustomAmounts({});
    setBillShares({});
    setBillMediaFiles([]);
    setBillExistingAttachments([]);
    setEditingBillId(null);
    setPaymentDraftBillId(null);
    setPaymentDraftSplitId(null);
    setPaymentDraftSplitMemberEmail(null);
    setPaymentDraftAmount('');
    setPaymentDraftNote('');
    setPaymentMediaFiles([]);
    setChoreTitle('');
    setChoreCadence('weekly');
    setChoreAssignmentMode('assigned');
    setChoreDueAt('');
    setChoreAssignedToEmail(normalizedEmail);
    setChoreEmailMembers(true);
    setChoreNotes('');
    setChoreMediaFiles([]);
    setChoreExistingAttachments([]);
    setEditingChoreId(null);
    setCompleteChoreId(null);
    setCompleteChoreNote('');
    setCompleteChoreMediaFiles([]);
    setActionError('');
    setActionSuccess('');
    setActionSuccessTone('success');
  };

  useEffect(() => {
    if (!initialOwnerInviteLaunch || !household || household.id !== initialOwnerInviteLaunch.householdId) return;
    if (!ownerRulesSetupComplete) return;

    resetDrawerState();
    setGeneratedInvite(initialOwnerInviteLaunch.invite || latestShareInvite);
    setGeneratedInviteUrl(
      initialOwnerInviteLaunch.shareUrl
      || initialOwnerInviteLaunch.invite?.share_url
      || latestShareInvite?.share_url
      || '',
    );
    setInviteMode('link');
    setDrawerMode('invite');
    onConsumeInitialOwnerInviteLaunch?.();
  }, [
    household,
    initialOwnerInviteLaunch,
    latestShareInvite,
    onConsumeInitialOwnerInviteLaunch,
    ownerRulesSetupComplete,
  ]);

  const openDrawer = (mode: HouseholdDrawerMode) => {
    resetDrawerState();
    setDrawerMode(mode);
  };

  const openRulesAcceptanceDraft = (invite?: HouseholdInvite | null) => {
    const version = invite?.house_rules_version || latestHouseRulesVersion;
    if (!version) {
      setActionError('House rules are not ready for this household yet.');
      return;
    }
    resetDrawerState();
    setRulesInvite(invite || null);
    setRulesCheckedItemIds([]);
    setRulesAcceptanceStepIndex(0);
    setRulesTypedSignature(profileSignerName);
    setRulesSignatureStrokes([]);
    setDrawerMode('rules_accept');
  };

  useEffect(() => {
    if (!incomingInviteToken) {
      autoOpenedInviteTokenRef.current = null;
      return;
    }
    if (incomingInviteIntent !== 'accept' || !highlightedPendingInvite) return;
    if (autoOpenedInviteTokenRef.current === highlightedPendingInvite.token) return;

    autoOpenedInviteTokenRef.current = highlightedPendingInvite.token;
    openRulesAcceptanceDraft(highlightedPendingInvite);
  }, [highlightedPendingInvite, incomingInviteIntent, incomingInviteToken]);

  useEffect(() => {
    if (!household || !needsOwnerRulesSetup || !latestHouseRulesVersion) return;
    if (drawerMode === 'rules_setup') return;
    handleSectionTabChange('rules');
    openRulesEditor();
  }, [drawerMode, household, latestHouseRulesVersion, needsOwnerRulesSetup]);

  useEffect(() => {
    if (!household || !needsLatestRulesAcknowledgement || !latestHouseRulesVersion) return;
    if (drawerMode === 'rules_accept') return;
    openRulesAcceptanceDraft();
  }, [drawerMode, household, latestHouseRulesVersion, needsLatestRulesAcknowledgement]);

  const openRulesEditor = () => {
    const draft = createHouseholdRuleDraftFromVersion(latestHouseRulesVersion);
    resetDrawerState();
    setRulesDraftTitle(draft.title);
    setRulesDraftDescription(draft.description);
    setRulesDraftChangeNote('');
    setRulesDraftSections(draft.sections);
    setRulesSetupStepIndex(0);
    setRulesPublishSignature(profileSignerName);
    setRulesPublishSignatureStrokes([]);
    setDrawerMode('rules_setup');
  };

  const updateRulesDraftSection = (sectionId: string, patch: Partial<HouseholdRuleSection>) => {
    setRulesDraftSections((current) => current.map((section) => (
      section.id === sectionId ? { ...section, ...patch } : section
    )));
  };

  const updateRulesDraftItem = (sectionId: string, itemId: string, patch: Partial<HouseholdRuleSection['items'][number]>) => {
    setRulesDraftSections((current) => current.map((section) => (
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          }
        : section
    )));
  };

  const moveRulesDraftItem = (sectionId: string, itemId: string, direction: -1 | 1) => {
    setRulesDraftSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const index = section.items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= section.items.length) return section;
      const nextItems = [...section.items];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return {
        ...section,
        items: nextItems.map((nextItem, itemIndex) => ({ ...nextItem, order: itemIndex })),
      };
    }));
  };

  const addRulesDraftItem = (sectionId: string) => {
    const newItemId = createHouseholdRuleId(`${sectionId}-item`);
    pendingRulesDraftItemFocusIdRef.current = newItemId;
    setRulesDraftSections((current) => current.map((section) => (
      section.id === sectionId
        ? {
            ...section,
            items: [
              ...section.items,
              {
                id: newItemId,
                text: '',
                enabled: true,
                order: section.items.length,
              },
            ],
          }
        : section
    )));
  };

  const addRulesDraftSection = () => {
    const newSectionId = createHouseholdRuleId('rules-section');
    const newItemId = createHouseholdRuleId(`${newSectionId}-item`);
    const insertIndex = Math.min(Math.max(rulesSetupStepIndex + 1, 0), rulesDraftSections.length);
    pendingRulesDraftItemFocusIdRef.current = newItemId;
    setRulesDraftSections((current) => {
      const next = [...getEditableHouseholdRuleSections(current)];
      next.splice(insertIndex, 0, {
        id: newSectionId,
        title: 'New section',
        description: '',
        order: insertIndex,
        items: [{
          id: newItemId,
          text: '',
          enabled: true,
          order: 0,
        }],
      });
      return next.map((section, sectionIndex) => ({ ...section, order: sectionIndex }));
    });
    setRulesSetupStepIndex(insertIndex);
    setActionError('');
  };

  const handleAgreeCurrentRulesSection = () => {
    if (!currentRulesAcceptanceSection) return;
    const sectionItemIds = currentRulesAcceptanceSection.items.map((item) => item.id);
    setRulesCheckedItemIds((current) => Array.from(new Set([...current, ...sectionItemIds])));
    setRulesAcceptanceStepIndex((current) => Math.min(current + 1, Math.max(0, rulesAcceptanceStepCount - 1)));
    setActionError('');
  };

  const handlePreviousRulesAcceptanceStep = () => {
    setRulesAcceptanceStepIndex((current) => Math.max(0, current - 1));
    setActionError('');
  };

  const handleNextRulesSetupStep = () => {
    const sectionError = getHouseholdRulesSetupSectionError(currentRulesSetupSection);
    if (sectionError) {
      setActionError(sectionError);
      return;
    }
    setRulesDraftSections((current) => getEditableHouseholdRuleSections(current));
    setRulesSetupStepIndex((current) => Math.min(current + 1, Math.max(0, rulesSetupStepCount - 1)));
    setActionError('');
  };

  const handlePreviousRulesSetupStep = () => {
    setRulesSetupStepIndex((current) => Math.max(0, current - 1));
    setActionError('');
  };

  const saveSignedHouseRulesPdfEvidence = async ({
    signedHousehold,
    version,
    acknowledgement,
  }: {
    signedHousehold: HouseholdRecord | null | undefined;
    version: HouseholdRulesVersion | null | undefined;
    acknowledgement: HouseholdRulesAcknowledgement | null | undefined;
  }) => {
    if (!signedHousehold || !version || !acknowledgement) return;

    setRulesPdfBusy(true);
    setRulesPdfWarning('');
    try {
      const { blob, fileName } = await generateSignedHouseRulesPdf({
        household: signedHousehold,
        version,
        acknowledgement,
      });
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
      const warnings: string[] = [];

      try {
        const uploaded = await uploadEvidenceFile(pdfFile);
        await createEvidence({
          email,
          listing_id: signedHousehold.address_snapshot?.timeline_entry_id || 'unlinked',
          filename: uploaded.original_name || fileName,
          file_url: uploaded.file_url || '',
          file_type: uploaded.file_type || 'application/pdf',
          file_size: uploaded.file_size || blob.size,
          storage_path: uploaded.storage_path || '',
          associated_address: signedHousehold.address_snapshot?.timeline_entry_id || '',
          associated_address_label: signedHousehold.address_snapshot?.display_address || signedHousehold.address_snapshot?.address || signedHousehold.name,
          external_link: '',
          notes: `Signed House Rules Declaration for ${signedHousehold.name}, version ${version.version_number}, signed by ${acknowledgement.member_display_name} on ${formatHouseRulesPublishedLabel(acknowledgement.signed_at).replace(/^Published on /, '')}.`,
        });
      } catch (error) {
        console.error('GHAR signed house rules evidence save failed:', error);
        warnings.push('Signed PDF could not be saved to Evidence. You can still preview and download it from House Rules.');
      }

      if (warnings.length) {
        const warning = warnings.join(' ');
        setRulesPdfWarning(warning);
        setActionSuccess(warning);
        setActionSuccessTone('warning');
      }
    } catch (error) {
      console.error('GHAR signed house rules PDF generation failed:', error);
      const warning = error instanceof Error ? error.message : 'Signed PDF could not be created.';
      setRulesPdfWarning(warning);
      setActionSuccess(`House rules were signed, but ${warning}`);
      setActionSuccessTone('warning');
    } finally {
      setRulesPdfBusy(false);
    }
  };

  const submitRulesAcceptance = async () => {
    if (!rulesAcceptanceVersion) {
      setActionError('House rules are not ready yet.');
      return;
    }
    if (!rulesInvite && latestHouseRulesVersion && rulesAcceptanceVersion.id !== latestHouseRulesVersion.id) {
      openRulesAcceptanceDraft();
      setActionError('House rules changed while you were reviewing. Please review and sign the latest version.');
      return;
    }
    if (!rulesValidation.valid) {
      setActionError(rulesValidation.missingItemIds.length ? 'Check every active house rule before signing.' : rulesValidation.signatureError);
      return;
    }

    const acknowledgement = {
      version_id: rulesAcceptanceVersion.id,
      checked_item_ids: rulesCheckedItemIds,
      signature: rulesSignature,
    };

    setBusyKey(rulesInvite ? `invite:${rulesInvite.token}:accept` : 'rules-ack');
    setActionError('');
    setActionSuccess('');
    try {
      if (rulesInvite) {
        const accepted = await handleInviteResponse(rulesInvite.token, 'accept', false, acknowledgement);
        if (accepted) {
          closeDrawer();
          handleSectionTabChange('overview');
          if (accepted.household && accepted.acknowledgement) {
            await saveSignedHouseRulesPdfEvidence({
              signedHousehold: accepted.household,
              version: rulesAcceptanceVersion,
              acknowledgement: accepted.acknowledgement,
            });
          }
        }
        return;
      }
      if (!household) return;
      const result = await acknowledgeHouseholdRules({
        householdId: household.id,
        actorEmail: email,
        versionId: rulesAcceptanceVersion.id,
        acknowledgement,
      });
      closeDrawer();
      await handleRefresh('House rules signed.');
      handleSectionTabChange('overview');
      await saveSignedHouseRulesPdfEvidence({
        signedHousehold: result.household || household,
        version: rulesAcceptanceVersion,
        acknowledgement: result.acknowledgement,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to sign house rules.');
    } finally {
      setBusyKey(null);
    }
  };

  const submitRulesUpdate = async () => {
    if (!household) return;
    const setupDraftError = getHouseholdRulesSetupDraftError(rulesDraftSections);
    if (setupDraftError) {
      setActionError(setupDraftError);
      return;
    }
    const normalizedDraftSections = normalizeHouseholdRuleSections(rulesDraftSections);
    const enabledItemIds = getEnabledRuleItemIdsFromSections(normalizedDraftSections);
    if (!rulesDraftTitle.trim()) {
      setActionError('Add a title for the house rules.');
      return;
    }
    if (enabledItemIds.length === 0) {
      setActionError('Keep at least one active checklist item.');
      return;
    }
    const signatureError = getHouseholdRulesSignatureError(rulesPublishSignaturePayload, profileSignerName);
    if (signatureError || !isHouseholdRulesSignatureComplete(rulesPublishSignaturePayload, profileSignerName)) {
      setActionError(signatureError || 'Type your profile full name and draw your signature before publishing.');
      return;
    }

    setBusyKey('rules-update');
    setActionError('');
    setActionSuccess('');
    try {
      const result = await updateHouseholdRules({
        householdId: household.id,
        actorEmail: email,
        rulesDraft: {
          title: rulesDraftTitle.trim(),
          description: rulesDraftDescription.trim(),
          change_note: rulesDraftChangeNote.trim(),
          sections: normalizedDraftSections,
        },
        acknowledgement: {
          checked_item_ids: enabledItemIds,
          signature: rulesPublishSignaturePayload,
        },
      });
      closeDrawer();
      await handleRefresh('House rules updated. Members were notified to review and sign.');
      handleSectionTabChange('rules');
      await saveSignedHouseRulesPdfEvidence({
        signedHousehold: result.household || household,
        version: result.version || getLatestHouseholdRulesVersion(result.household) || latestHouseRulesVersion,
        acknowledgement: result.acknowledgement,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update house rules.');
    } finally {
      setBusyKey(null);
    }
  };

  const openBillDraft = (bill?: HouseholdBill | null) => {
    resetDrawerState();
    if (bill) {
      const billCategoryDraft = getBillCategoryDraftState(bill.category);
      setEditingBillId(bill.id);
      setBillTitle(bill.title);
      setBillCategorySelection(billCategoryDraft.selection);
      setBillCategoryCustomValue(billCategoryDraft.customValue);
      setBillAmountTotal(String(bill.amount_total || ''));
      setBillDueAt(formatDateInputValue(bill.due_at));
      setBillPaidByEmail(normalizeHouseholdEmail(bill.paid_by_email));
      setBillSplitType(bill.split_type);
      setBillNotes(bill.notes || '');
      const nextBillParticipantDrafts = bill.splits.map((split) => {
        const splitEmail = normalizeHouseholdEmail(split.member_email);
        const matchingMember = activeMembers.find((member) => member.email_normalized === splitEmail);
        return {
          email: splitEmail,
          label: split.participant_display_name || matchingMember?.display_name || getHouseholdEmailHandle(splitEmail),
          participantType: split.participant_type || (matchingMember ? 'household_member' : 'hoodie_friend'),
        };
      });
      const editedBillIsPersonal = bill.bill_scope === 'personal'
        || (
          nextBillParticipantDrafts.length === 1
          && normalizeHouseholdEmail(nextBillParticipantDrafts[0]?.email) === normalizedEmail
        );
      setIsPersonalBillMode(editedBillIsPersonal);
      setBillEmailMembers(editedBillIsPersonal ? false : Boolean(bill.email_members));
      setBillParticipantDrafts(nextBillParticipantDrafts);
      if (!editedBillIsPersonal) {
        lastNonPersonalBillParticipantsRef.current = nextBillParticipantDrafts;
      }
      setBillCustomAmounts(
        Object.fromEntries(
          bill.splits.map((split) => [normalizeHouseholdEmail(split.member_email), String(split.amount_owed ?? '')]),
        ),
      );
      setBillShares(
        Object.fromEntries(
          bill.splits.map((split) => [normalizeHouseholdEmail(split.member_email), String(split.shares ?? 0)]),
        ),
      );
      setBillExistingAttachments((bill.attachments || []).map((attachment) => sanitizeHouseholdAttachment(attachment)));
    }
    setDrawerMode('bill');
  };

  const openChoreDraft = (chore?: HouseholdChore | null) => {
    resetDrawerState();
    if (chore) {
      setEditingChoreId(chore.id);
      setChoreTitle(chore.title);
      setChoreCadence(chore.cadence);
      setChoreAssignmentMode(chore.assignment_mode);
      setChoreDueAt(formatDateInputValue(chore.due_at));
      setChoreAssignedToEmail(normalizeHouseholdEmail(chore.assigned_to_email || normalizedEmail));
      setChoreEmailMembers(false);
      setChoreNotes(chore.notes || '');
      setChoreExistingAttachments((chore.attachments || []).map((attachment) => sanitizeHouseholdAttachment(attachment)));
    }
    setDrawerMode('chore');
  };

  const openNotificationEditDraft = (notification: HouseholdNotification) => {
    resetDrawerState();
    const nextRecipientEmails = getValidNotificationRecipientEmails(
      notification.recipient_emails.map((entry) => normalizeHouseholdEmail(entry)),
      recipientDefaultEmails,
    );
    setEditingNotificationId(notification.id);
    setEmailTemplateType(notification.template_type || 'custom');
    setEmailRecipientEmails(nextRecipientEmails);
    setEmailGratitudeThankedMemberEmail(
      notification.template_type === 'gratitude'
        ? getNotificationThankedMemberEmail(notification, recipientDefaultEmails)
        : '',
    );
    setEmailSubject(notification.title || '');
    setEmailBody(notification.body || '');
    setEmailSubjectManuallyEdited(notification.template_type === 'gratitude');
    setDrawerMode('notification');
  };

  const applyNotificationTemplate = (template: {
    id: HouseholdNotificationTemplateType;
    title: string;
    body: string;
  }) => {
    if (template.id === 'gratitude') {
      const nextThankedMemberEmail = getPrimaryNotificationRecipientEmail(emailRecipientEmails, recipientDefaultEmails);
      const nextRecipientEmails = getValidNotificationRecipientEmails(emailRecipientEmails, recipientDefaultEmails);
      const gratitudeDraft = buildHouseholdGratitudeNotification(
        notificationSenderName,
        nextThankedMemberEmail
          ? getHouseholdMemberDisplayName(household, nextThankedMemberEmail)
          : '',
      );
      setEmailTemplateType('gratitude');
      setEmailGratitudeThankedMemberEmail(nextThankedMemberEmail);
      setEmailRecipientEmails(
        nextRecipientEmails.length
          ? nextRecipientEmails
          : nextThankedMemberEmail
            ? [nextThankedMemberEmail]
            : [],
      );
      setEmailSubject(gratitudeDraft.title);
      setEmailBody(gratitudeDraft.body);
      setEmailSubjectManuallyEdited(false);
      return;
    }

    setEmailTemplateType(template.id);
    setEmailGratitudeThankedMemberEmail('');
    setEmailSubject(template.title);
    setEmailBody(template.body);
    setEmailSubjectManuallyEdited(false);
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    resetDrawerState();
  };

  const openAttachmentViewer = (attachments: HouseholdMediaAttachment[], index: number, title: string) => {
    if (!attachments.length) return;
    setMediaViewer({
      attachments,
      index,
      title,
    });
  };

  const handleCopyInviteLink = async (shareUrl = activeShareInviteUrl) => {
    if (!shareUrl) {
      setActionError('Create an invite link first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setActionError('');
      setActionSuccess('Invite link copied.');
      setActionSuccessTone('success');
    } catch (err) {
      console.error('GHAR household invite copy error:', err);
      setActionError('Could not copy the invite link. Please try again.');
    }
  };

  const handleShareInviteLink = async (shareUrl = activeShareInviteUrl) => {
    if (!shareUrl || !household) {
      setActionError('Create an invite link first.');
      return;
    }
    const shareText = ownerInviteShareText || `${getHouseholdMemberDisplayName(household, household.created_by_email)} invited you to their Hoodie household: ${shareUrl}`;

    try {
      if (isNativeShell()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          text: shareText,
          dialogTitle: 'Share invite link',
        });
      } else if (navigator.share) {
        await navigator.share({
          text: shareText,
        });
      } else {
        await handleCopyInviteLink(shareUrl);
        return;
      }
      setActionError('');
      setActionSuccess('Household invite link shared.');
      setActionSuccessTone('success');
    } catch (err) {
      console.error('GHAR household invite share error:', err);
      await handleCopyInviteLink(shareUrl);
    }
  };

  const createInviteShareLink = async (tokenToResend?: string, options?: { silent?: boolean }) => {
    if (!household) return null;
    if (!ownerRulesSetupComplete) {
      setActionError('Set up and sign house rules before inviting members.');
      return null;
    }
    const busyValue = tokenToResend ? `resend:${tokenToResend}` : 'send-invites';
    setBusyKey(busyValue);
    setActionError('');
    if (!options?.silent) {
      setActionSuccess('');
    }
    try {
      const result = tokenToResend
        ? await resendHouseholdInvite({
            householdId: household.id,
            token: tokenToResend,
            senderEmail: email,
          })
        : await inviteHouseholdMembers({
            householdId: household.id,
            senderEmail: email,
            recipientEmails: [],
          });
      const nextInvite = result.invite;
      const nextShareUrl = result.share_url || nextInvite?.share_url || '';
      if (!nextInvite) {
        throw new Error('Invite could not be created right now.');
      }
      if (nextInvite.transport !== 'hoodie_account' && !nextShareUrl) {
        throw new Error('Invite link was created, but no share URL was returned.');
      }
      setGeneratedInvite(nextInvite.transport === 'hoodie_account' ? null : nextInvite);
      setGeneratedInviteUrl(nextInvite.transport === 'hoodie_account' ? '' : nextShareUrl);
      await onRefresh();
      if (!options?.silent) {
        setActionSuccess(
          nextInvite.transport === 'hoodie_account'
            ? 'Household invite resent.'
            : 'Invite link ready to share.',
        );
        setActionSuccessTone('success');
      }
      return { invite: nextInvite, shareUrl: nextShareUrl };
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create household invite link.');
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    if (drawerMode !== 'invite' || inviteMode !== 'link' || !household) {
      shareInviteBootstrapKeyRef.current = null;
      return;
    }

    if (activeShareInviteUrl) {
      if (activeShareInvite && generatedInvite?.token !== activeShareInvite.token) {
        setGeneratedInvite(activeShareInvite);
      }
      if (generatedInviteUrl !== activeShareInviteUrl) {
        setGeneratedInviteUrl(activeShareInviteUrl);
      }
      shareInviteBootstrapKeyRef.current = null;
      return;
    }

    if (busyKey === 'send-invites') return;

    const bootstrapKey = `${household.id}:share-link`;
    if (shareInviteBootstrapKeyRef.current === bootstrapKey) return;
    shareInviteBootstrapKeyRef.current = bootstrapKey;
    void createInviteShareLink(undefined, { silent: true });
  }, [
    activeShareInvite,
    activeShareInviteUrl,
    busyKey,
    drawerMode,
    generatedInvite?.token,
    generatedInviteUrl,
    household,
    inviteMode,
    ownerRulesSetupComplete,
  ]);

  const handleSendAccountInvites = async () => {
    if (!household) return;
    if (!ownerRulesSetupComplete) {
      setActionError('Set up and sign house rules before inviting members.');
      return;
    }
    const recipientEmails = parseInviteEmailsInput(inviteEmailInput);
    if (!recipientEmails.length) {
      setActionError('Add at least one Hoodie account email.');
      return;
    }

    setBusyKey('send-invites');
    setActionError('');
    setActionSuccess('');
    try {
      const result = await inviteHouseholdMembers({
        householdId: household.id,
        senderEmail: email,
        recipientEmails,
      });
      const sentCount = Number(result.invites?.length || 0);
      const invalidRecipients = (result.invalid_recipient_emails || []).map((entry) => getHouseholdEmailHandle(entry));
      const existingRecipients = (result.existing_recipient_emails || []).map((entry) => getHouseholdEmailHandle(entry));

      await onRefresh();
      setInviteEmailInput('');

      const feedbackMessages: string[] = [];
      if (invalidRecipients.length > 0) {
        feedbackMessages.push(
          invalidRecipients.length === 1
            ? 'This user is not on Hoodie — send them a link instead.'
            : 'Some users are not on Hoodie — send them a link instead.',
        );
      }
      if (existingRecipients.length > 0) {
        feedbackMessages.push(
          existingRecipients.length === 1
            ? `${existingRecipients[0]} is already in this household or already invited.`
            : `${existingRecipients.join(', ')} are already in this household or already invited.`,
        );
      }

      if (sentCount > 0 && feedbackMessages.length === 0) {
        closeDrawer();
        await handleRefresh(sentCount === 1 ? 'Household invite sent.' : `${sentCount} household invites sent.`);
        return;
      }

      if (sentCount > 0) {
        setActionSuccess(sentCount === 1 ? '1 invite sent.' : `${sentCount} invites sent.`);
        setActionSuccessTone(feedbackMessages.length > 0 ? 'warning' : 'success');
      }
      setActionError(feedbackMessages.join(' '));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to invite household members.');
    } finally {
      setBusyKey(null);
    }
  };

  const getRestoredSharedBillParticipants = () => {
    const restored = lastNonPersonalBillParticipantsRef.current
      .map((participant) => ({
        ...participant,
        email: normalizeHouseholdEmail(participant.email),
      }))
      .filter((participant) => participant.email);

    if (restored.length > 0) return restored;
    return defaultBillParticipants;
  };

  const setPersonalBillMode = (checked: boolean) => {
    setActionError('');
    if (checked) {
      if (!isSelfOnlyBillDraft) {
        lastNonPersonalBillParticipantsRef.current = billParticipantDrafts;
      }
      setIsPersonalBillMode(true);
      setBillParticipantDrafts([currentUserBillParticipant]);
      setBillPaidByEmail(currentUserBillParticipant.email);
      setBillSplitType('equal');
      setBillEmailMembers(false);
      setBillCustomAmounts({});
      setBillShares({ [currentUserBillParticipant.email]: '1' });
      return;
    }

    const restoredParticipants = getRestoredSharedBillParticipants();
    setIsPersonalBillMode(false);
    setBillParticipantDrafts(restoredParticipants);
    setBillPaidByEmail(
      restoredParticipants.some((participant) => normalizeHouseholdEmail(participant.email) === normalizedEmail)
        ? normalizedEmail
        : restoredParticipants[0]?.email || normalizedEmail,
    );
    setBillEmailMembers(true);
  };

  const addBillParticipantDraft = (participant: BillParticipantDraft) => {
    const nextParticipant = {
      ...participant,
      email: normalizeHouseholdEmail(participant.email),
      label: participant.label || getHouseholdEmailHandle(participant.email),
    };
    if (!nextParticipant.email) return;
    setIsPersonalBillMode(false);
    setBillParticipantDrafts((current) => {
      if (current.some((entry) => normalizeHouseholdEmail(entry.email) === nextParticipant.email)) {
        return current;
      }
      return [...current, nextParticipant];
    });
    setBillShares((current) => ({
      ...current,
      [nextParticipant.email]: current[nextParticipant.email] || '1',
    }));
    setActionError('');
  };

  const removeBillParticipantDraft = (participantEmail: string) => {
    const normalizedParticipantEmail = normalizeHouseholdEmail(participantEmail);
    const nextParticipants = billParticipantDrafts.filter((entry) => normalizeHouseholdEmail(entry.email) !== normalizedParticipantEmail);
    if (!nextParticipants.length) {
      setActionError('Keep at least one person on the bill.');
      return;
    }
    const nextUniqueEmails = Array.from(new Set(nextParticipants.map((participant) => normalizeHouseholdEmail(participant.email)).filter(Boolean)));
    if (nextUniqueEmails.length === 1 && nextUniqueEmails[0] === normalizedEmail && !isSelfOnlyBillDraft) {
      lastNonPersonalBillParticipantsRef.current = billParticipantDrafts;
    }
    setBillParticipantDrafts(nextParticipants);
    if (normalizeHouseholdEmail(billPaidByEmail) === normalizedParticipantEmail) {
      setBillPaidByEmail(nextParticipants[0].email);
    }
  };

  const handleAddBillFriendByEmail = async (sourceEmail?: string) => {
    const cleanEmail = normalizeHouseholdEmail(sourceEmail || billFriendEmailInput);
    if (!cleanEmail) {
      setActionError('Enter a Hoodie email for this bill.');
      return;
    }
    if (billParticipantDrafts.some((participant) => normalizeHouseholdEmail(participant.email) === cleanEmail)) {
      setActionError('That person is already on this bill.');
      return;
    }

    setBusyKey(`resolve-bill-contact:${cleanEmail}`);
    setActionError('');
    try {
      const contact = await resolveHouseholdBillContact({
        actorEmail: email,
        email: cleanEmail,
      });
      addBillParticipantDraft({
        email: normalizeHouseholdEmail(contact.email_normalized || cleanEmail),
        label: String(contact.display_name || '').trim() || getHouseholdEmailHandle(cleanEmail),
        participantType: 'hoodie_friend',
      });
      setBillFriendEmailInput('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That email has not logged into Hoodie yet.');
    } finally {
      setBusyKey(null);
    }
  };

  const billSplitPreview = useMemo(() => {
    const total = Number(billAmountTotal);
    if (!Number.isFinite(total) || total <= 0 || !billParticipantEmails.length) {
      return {
        splits: [] as Array<{ member_email: string; amount_owed: number; shares?: number }>,
        total: 0,
      };
    }

    if (billSplitType === 'equal') {
      const splits = buildEvenSplits(total, billParticipantEmails);
      return {
        splits,
        total: splits.reduce((sum, split) => sum + split.amount_owed, 0),
      };
    }

    if (billSplitType === 'shares') {
      const numericShares = billParticipantEmails.reduce<Record<string, number>>((acc, memberEmail) => {
        acc[memberEmail] = parseShareInputValue(billShares[memberEmail]);
        return acc;
      }, {});
      const splits = buildShareSplits(total, billParticipantEmails, numericShares);
      return {
        splits,
        total: splits.reduce((sum, split) => sum + split.amount_owed, 0),
      };
    }

    const splits = billParticipantEmails.map((memberEmail) => ({
      member_email: memberEmail,
      amount_owed: Math.max(0, Number(billCustomAmounts[memberEmail] || 0)),
      shares: 1,
    }));
    return {
      splits,
      total: splits.reduce((sum, split) => sum + split.amount_owed, 0),
    };
  }, [billAmountTotal, billCustomAmounts, billParticipantEmails, billShares, billSplitType]);

  const billShareTotal = useMemo(
    () => billParticipantEmails.reduce((sum, memberEmail) => sum + parseShareInputValue(billShares[memberEmail]), 0),
    [billParticipantEmails, billShares],
  );

  const billSplitValidationMessage = useMemo(() => {
    const billTotal = Number(Number(billAmountTotal || 0).toFixed(2));
    const previewTotal = Number(billSplitPreview.total.toFixed(2));
    if (billAmountTotal && billParticipantEmails.length === 0) {
      return 'Add at least one person to this bill.';
    }
    if (billSplitType === 'shares' && billAmountTotal && billShareTotal <= 0) {
      return 'Add at least one share greater than zero before creating this bill.';
    }
    if (billTotal > 0 && Math.abs(previewTotal - billTotal) > 0.01) {
      return 'Split values must add up to the total bill amount.';
    }
    return '';
  }, [billAmountTotal, billParticipantEmails.length, billShareTotal, billSplitPreview.total, billSplitType]);

  const uploadHouseholdMediaFiles = async (files: File[]) => {
    if (!files.length) return [];
    const uploaded = await Promise.all(files.map((file) => uploadEvidenceFile(file)));
    return uploaded.map((attachment) => sanitizeHouseholdAttachment(attachment));
  };

  const handleScanBillPhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Choose a receipt photo or bill image to scan.');
      return;
    }
    if (!household?.id) {
      setActionError('Receipt scanning is available for household bills. You can still attach the image manually.');
      setBillMediaFiles((current) => mergeSingleMediaFile(current, file));
      return;
    }

    setBillMediaFiles((current) => mergeSingleMediaFile(current, file));
    setBusyKey('scan-bill-receipt');
    setActionError('');
    setActionSuccess('');
    try {
      const imagePayload = await prepareReceiptImagePayload(file);
      const receipt = await analyzeHouseholdReceipt({
        householdId: household.id,
        actorEmail: email,
        image: imagePayload,
      });
      const extractedTitle = String(receipt.title || receipt.merchant || '').trim();
      const extractedAmount = Number(receipt.amount_total || 0);
      const extractedDate = String(receipt.transaction_date || '').trim();
      const extractedCategory = getBillCategoryDraftState(receipt.category);
      const extractedNotes = String(receipt.notes || '').trim();

      if (extractedTitle) {
        setBillTitle(extractedTitle);
      }
      if (Number.isFinite(extractedAmount) && extractedAmount > 0) {
        setBillAmountTotal(extractedAmount.toFixed(2));
      }
      if (extractedCategory.selection) {
        setBillCategorySelection(extractedCategory.selection);
        setBillCategoryCustomValue(extractedCategory.customValue);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(extractedDate)) {
        setBillDueAt(extractedDate);
      }
      if (extractedNotes) {
        setBillNotes((current) => current || extractedNotes);
      }

      if (receipt.fallback || Number(receipt.confidence || 0) < 0.35) {
        setActionSuccess('Receipt attached. Hoodie could not confidently read it, so please fill in or verify the fields manually.');
        setActionSuccessTone('warning');
        return;
      }

      setActionSuccess('Receipt scanned. Review the draft before saving.');
      setActionSuccessTone('success');
    } catch (err) {
      if (isFatalReceiptScanError(err)) {
        setActionError(err instanceof Error ? err.message : 'Receipt scanning is not available for this household bill.');
        return;
      }
      setActionError('');
      setActionSuccess(getReceiptScanManualEntryMessage(err));
      setActionSuccessTone('warning');
    } finally {
      setBusyKey(null);
    }
  };

  const openPaymentDraft = (billId: string, splitId?: string | null, splitMemberEmail?: string | null) => {
    resetDrawerState();
    const sourceBill = allBills.find((bill) => bill.id === billId) || null;
    const sourceSplit = splitId
      ? sourceBill?.splits?.find((split) => split.id === splitId) || null
      : sourceBill?.splits?.find((split) => normalizeHouseholdEmail(split.member_email) === normalizedEmail) || null;
    const splitRemaining = sourceSplit
      ? Math.max(
          0,
          normalizeHouseholdEmail(sourceSplit.member_email) === normalizeHouseholdEmail(sourceBill?.paid_by_email || '')
            ? 0
            : Number(sourceSplit.amount_owed || 0) - Number(sourceSplit.amount_paid || 0),
        )
      : 0;

    setPaymentDraftBillId(billId);
    setPaymentDraftSplitId(sourceSplit?.id || splitId || null);
    setPaymentDraftSplitMemberEmail(splitMemberEmail || sourceSplit?.member_email || normalizedEmail);
    setPaymentDraftAmount(splitRemaining > 0 ? splitRemaining.toFixed(2) : '');
    setDrawerMode('payment');
  };

  const openCompleteChoreDraft = (choreId: string) => {
    resetDrawerState();
    setCompleteChoreId(choreId);
    setDrawerMode('complete_chore');
  };

  const handleRefresh = async (successMessage?: string, successTone: 'success' | 'warning' = 'success') => {
    await onRefresh();
    if (successMessage) {
      setActionSuccess(successMessage);
      setActionSuccessTone(successTone);
    }
  };

  const handleInviteResponse = async (
    token: string,
    action: 'accept' | 'decline',
    forceLeaveCurrent = false,
    rulesAcknowledgement?: { version_id: string; checked_item_ids: string[]; signature: HouseholdRulesSignature },
  ) => {
    setBusyKey(`invite:${token}:${action}`);
    setActionError('');
    setActionSuccess('');
    try {
      const result = await respondToHouseholdInvite({
        token,
        email,
        action,
        forceLeaveCurrent,
        rulesAcknowledgement,
      });
      if (incomingInviteToken === token) {
        onClearIncomingInvite();
      }
      setConfirmAction(null);
      await handleRefresh(action === 'accept' ? 'Household invitation accepted.' : 'Household invitation declined.');
      return result;
    } catch (err) {
      const error = err as Error & { status?: number; currentHouseholdName?: string };
      const message = error.message || 'Failed to respond to household invite.';
      if (action === 'accept' && (error.status === 409 || message.toLowerCase().includes('another household'))) {
        setActionError('');
        setConfirmAction({
          type: 'force-accept-invite',
          token,
          currentHouseholdName: error.currentHouseholdName || null,
          rulesAcknowledgement,
        });
      } else {
        setActionError(message);
      }
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  const handleSendInvites = async () => {
    if (inviteMode === 'email') {
      await handleSendAccountInvites();
      return;
    }
    const nextInvite = generatedInvite?.transport === 'share_link' ? generatedInvite : latestShareInvite;
    const nextShareUrl = generatedInviteUrl || nextInvite?.share_url || '';
    if (nextShareUrl) {
      await handleCopyInviteLink(nextShareUrl);
      return;
    }
    await createInviteShareLink(nextInvite?.token);
  };

  const handleSendManualNotification = async () => {
    if (!household) return;
    if (!emailRecipientEmails.length) {
      setActionError('Select at least one household member.');
      return;
    }
    if (emailTemplateType === 'gratitude' && !emailGratitudeThankedMemberEmail) {
      setActionError('Choose who you are thanking.');
      return;
    }
    if (!emailSubject.trim()) {
      setActionError('Add a push title before sending.');
      return;
    }
    if (!emailBody.trim()) {
      setActionError('Add a message before sending.');
      return;
    }

    setBusyKey('send-email');
    setActionError('');
    setActionSuccess('');
    try {
      const result = await sendHouseholdNotification({
        householdId: household.id,
        senderEmail: email,
        recipientEmails: emailRecipientEmails,
        title: emailSubject.trim(),
        body: emailBody.trim(),
        templateType: emailTemplateType,
        metadata: emailTemplateType === 'gratitude' && emailGratitudeThankedMemberEmail
          ? { thanked_member_email: emailGratitudeThankedMemberEmail }
          : undefined,
      });
      const feedback = getHouseholdNotificationFeedback(result.notification);
      closeDrawer();
      await handleRefresh(
        editingNotificationId
          ? `Notification resent. ${feedback.message}`
          : feedback.message,
        feedback.tone,
      );
      handleSectionTabChange('activity');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send household notification.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateBill = async () => {
    if (!billTitle.trim()) {
      setActionError('Add a bill title.');
      return;
    }
    const resolvedBillCategory = resolveBillCategoryValue(billCategorySelection, billCategoryCustomValue);
    if (resolvedBillCategory.error) {
      setActionError(resolvedBillCategory.error);
      return;
    }
    if (!billDueAt) {
      setActionError('Choose a due date.');
      return;
    }
    if (!billPaidByEmail) {
      setActionError('Choose who paid the bill.');
      return;
    }
    if (!billParticipantEmails.includes(normalizeHouseholdEmail(billPaidByEmail))) {
      setActionError('Paid by must be one of the people on this bill.');
      return;
    }
    if (!Number(billAmountTotal) || Number(billAmountTotal) <= 0) {
      setActionError('Enter a bill total greater than zero.');
      return;
    }
    if (billSplitValidationMessage) {
      setActionError(billSplitValidationMessage);
      return;
    }
    const billTotal = Number(Number(billAmountTotal).toFixed(2));

    setBusyKey('create-bill');
    setActionError('');
    setActionSuccess('');
    try {
      const uploadedAttachments = await uploadHouseholdMediaFiles(billMediaFiles);
      const attachments = [...billExistingAttachments, ...uploadedAttachments];
      const splitParticipantsByEmail = new Map(
        billParticipantDrafts.map((participant) => [normalizeHouseholdEmail(participant.email), participant]),
      );
      const editingBill = editingBillId
        ? allBills.find((bill) => bill.id === editingBillId) || null
        : null;
      const payload = {
        actorEmail: email,
        title: billTitle.trim(),
        category: resolvedBillCategory.category,
        amountTotal: billTotal,
        dueAt: new Date(`${billDueAt}T12:00:00`).toISOString(),
        paidByEmail: billPaidByEmail,
        splitType: billSplitType,
        notes: billNotes.trim(),
        notifyMembers: isPersonalBillDraft ? false : billEmailMembers,
        attachments,
        splits: billSplitPreview.splits.map((split) => ({
          member_email: split.member_email,
          amount_owed: Number(split.amount_owed.toFixed(2)),
          shares: split.shares,
          participant_type: splitParticipantsByEmail.get(normalizeHouseholdEmail(split.member_email))?.participantType || 'hoodie_friend',
          participant_display_name: splitParticipantsByEmail.get(normalizeHouseholdEmail(split.member_email))?.label || getHouseholdEmailHandle(split.member_email),
        })),
      };
      if (editingBillId) {
        const householdId = editingBill?.household_id || household?.id || '';
        if (!householdId) {
          throw new Error('Friend-only bills can be paid and confirmed here; editing them is not available yet.');
        }
        await updateHouseholdBill({
          ...payload,
          householdId,
          billId: editingBillId,
        });
      } else if (isPersonalBillDraft) {
        await createSharedBill({
          ...payload,
          billScope: 'personal',
        });
      } else if (household) {
        await createHouseholdBill({
          ...payload,
          householdId: household.id,
        });
      } else {
        await createSharedBill(payload);
      }
      closeDrawer();
      await handleRefresh(editingBillId ? 'Bill updated.' : isPersonalBillDraft ? 'Personal bill saved to your expense tracker.' : household ? 'Bill added to the household.' : 'Friend bill created.');
      handleSectionTabChange('bills');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${editingBillId ? 'update' : 'create'} bill.`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleMarkPayment = async (billId: string) => {
    if (!paymentDraftAmount) return;
    if (!paymentDraftSplit) {
      setActionError('Choose an open split before recording a payment.');
      return;
    }
    if (paymentDraftRemaining <= 0) {
      setActionError('This split is already fully paid.');
      return;
    }
    setBusyKey(`payment:${billId}`);
    setActionError('');
    setActionSuccess('');
    try {
      const attachments = await uploadHouseholdMediaFiles(paymentMediaFiles);
      const householdId = paymentDraftBill?.household_id || household?.id || '';
      const paymentPayload = {
        billId,
        actorEmail: email,
        amount: Number(paymentDraftAmount),
        note: paymentDraftNote.trim(),
        targetSplitId: paymentDraftSplit.id,
        targetMemberEmail: paymentDraftSplitMemberEmail || undefined,
        attachments,
      };
      if (householdId && household) {
        await markHouseholdBillPayment({
          ...paymentPayload,
          householdId,
        });
      } else {
        await markBillPayment(paymentPayload);
      }
      closeDrawer();
      await handleRefresh('Payment recorded.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark bill payment.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmPayment = async (billId: string, paymentId: string) => {
    setBusyKey(`confirm:${paymentId}`);
    setActionError('');
    setActionSuccess('');
    try {
      const bill = allBills.find((entry) => entry.id === billId) || null;
      const householdId = bill?.household_id || household?.id || '';
      if (householdId && household) {
        await confirmHouseholdBillPayment({
          householdId,
          billId,
          paymentId,
          actorEmail: email,
        });
      } else {
        await confirmBillPayment({
          billId,
          paymentId,
          actorEmail: email,
        });
      }
      await handleRefresh('Payment confirmed.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm bill payment.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateChore = async () => {
    if (!household) return;
    if (!choreTitle.trim()) {
      setActionError('Add a chore title.');
      return;
    }
    if (!choreDueAt) {
      setActionError('Choose when this chore is due.');
      return;
    }
    if (choreAssignmentMode !== 'claimable' && !choreAssignedToEmail) {
      setActionError('Choose a household member for this chore.');
      return;
    }

    setBusyKey('create-chore');
    setActionError('');
    setActionSuccess('');
    try {
      const uploadedAttachments = await uploadHouseholdMediaFiles(choreMediaFiles);
      const attachments = [...choreExistingAttachments, ...uploadedAttachments];
      const payload = {
        householdId: household.id,
        actorEmail: email,
        title: choreTitle.trim(),
        cadence: choreCadence,
        assignmentMode: choreAssignmentMode,
        dueAt: new Date(`${choreDueAt}T12:00:00`).toISOString(),
        assignedToEmail: choreAssignmentMode === 'claimable' ? '' : choreAssignedToEmail,
        notes: choreNotes.trim(),
        notifyMembers: choreEmailMembers,
        rotationOrder: choreAssignmentMode === 'rotation' ? activeMemberEmails : [],
        attachments,
      };
      if (editingChoreId) {
        await updateHouseholdChore({
          ...payload,
          choreId: editingChoreId,
        });
      } else {
        await createHouseholdChore(payload);
      }
      closeDrawer();
      await handleRefresh(editingChoreId ? 'Chore updated.' : 'Chore added to the household.');
      handleSectionTabChange('chores');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${editingChoreId ? 'update' : 'create'} household chore.`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    openCompleteChoreDraft(choreId);
  };

  const submitCompleteChore = async () => {
    if (!household || !completeChoreId) return;
    setBusyKey(`complete-chore:${completeChoreId}`);
    setActionError('');
    setActionSuccess('');
    try {
      const attachments = await uploadHouseholdMediaFiles(completeChoreMediaFiles);
      await completeHouseholdChore({
        householdId: household.id,
        choreId: completeChoreId,
        actorEmail: email,
        note: completeChoreNote.trim(),
        attachments,
      });
      closeDrawer();
      await handleRefresh('Chore completed.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete chore.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemoveMember = async (targetEmail: string) => {
    setActionError('');
    setConfirmAction({ type: 'remove-member', targetEmail });
  };

  const executeRemoveMember = async (targetEmail: string) => {
    if (!household) return;
    setBusyKey(`remove-member:${targetEmail}`);
    setActionError('');
    setActionSuccess('');
    try {
      await removeHouseholdMember({
        householdId: household.id,
        actorEmail: email,
        targetEmail,
      });
      setConfirmAction(null);
      await handleRefresh('Household member removed.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove household member.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleLeaveHousehold = async () => {
    setActionError('');
    setConfirmAction({ type: 'leave-household' });
  };

  const executeLeaveHousehold = async () => {
    if (!household) return;
    setBusyKey('leave-household');
    setActionError('');
    setActionSuccess('');
    try {
      await leaveHousehold({
        householdId: household.id,
        email,
      });
      setConfirmAction(null);
      await handleRefresh('You left the household.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to leave household.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteHousehold = async () => {
    setActionError('');
    setConfirmAction({ type: 'delete-household' });
  };

  const executeDeleteHousehold = async () => {
    if (!household) return;
    setBusyKey('delete-household');
    setActionError('');
    setActionSuccess('');
    try {
      await deleteHousehold({
        householdId: household.id,
        email,
      });
      setConfirmAction(null);
      await handleRefresh('Household deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete household.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleResendInvite = async (token: string) => {
    const result = await createInviteShareLink(token);
    if (!result) return;
    if (result.invite.transport === 'share_link') {
      setDrawerMode('invite');
      setInviteMode('link');
      await handleShareInviteLink(result.shareUrl);
      return;
    }
    await handleRefresh('Household invite resent.');
  };

  const handleCancelInvite = async (token: string) => {
    setActionError('');
    setConfirmAction({ type: 'cancel-invite', token });
  };

  const handleDeleteBill = (billId: string, billTitle: string) => {
    setActionError('');
    setConfirmAction({ type: 'delete-bill', billId, billTitle });
  };

  const executeDeleteBill = async (billId: string) => {
    if (!household) return;
    setBusyKey(`delete-bill:${billId}`);
    setActionError('');
    setActionSuccess('');
    try {
      await deleteHouseholdBill({
        householdId: household.id,
        billId,
        actorEmail: email,
      });
      setConfirmAction(null);
      await handleRefresh('Bill deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete household bill.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteChore = (choreId: string, choreTitle: string) => {
    setActionError('');
    setConfirmAction({ type: 'delete-chore', choreId, choreTitle });
  };

  const executeDeleteChore = async (choreId: string) => {
    if (!household) return;
    setBusyKey(`delete-chore:${choreId}`);
    setActionError('');
    setActionSuccess('');
    try {
      await deleteHouseholdChore({
        householdId: household.id,
        choreId,
        actorEmail: email,
      });
      setConfirmAction(null);
      await handleRefresh('Chore deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete household chore.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteNotification = (notificationId: string, notificationTitle: string) => {
    setActionError('');
    setConfirmAction({ type: 'delete-notification', notificationId, notificationTitle });
  };

  const executeDeleteNotification = async (notificationId: string) => {
    if (!household) return;
    setBusyKey(`delete-notification:${notificationId}`);
    setActionError('');
    setActionSuccess('');
    try {
      await deleteHouseholdNotification({
        householdId: household.id,
        notificationId,
        actorEmail: email,
      });
      setConfirmAction(null);
      await handleRefresh('Notification deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete household notification.');
    } finally {
      setBusyKey(null);
    }
  };

  const executeCancelInvite = async (token: string) => {
    if (!household) return;
    setBusyKey(`cancel:${token}`);
    setActionError('');
    setActionSuccess('');
    try {
      await cancelHouseholdInvite({
        householdId: household.id,
        token,
        actorEmail: email,
      });
      setConfirmAction(null);
      await handleRefresh('Invite cancelled.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel invite.');
    } finally {
      setBusyKey(null);
    }
  };

  const executeForceAcceptInvite = async (
    token: string,
    rulesAcknowledgement?: { version_id: string; checked_item_ids: string[]; signature: HouseholdRulesSignature },
  ) => {
    const didJoin = await handleInviteResponse(token, 'accept', true, rulesAcknowledgement);
    if (didJoin) {
      closeDrawer();
      handleSectionTabChange('overview');
    }
  };

  const householdOwner = householdOwnerMember;
  const canDeleteHousehold = Boolean(household && activeMembers.length === 1 && householdOwner?.email_normalized === normalizedEmail);
  const canInviteMembers = householdOwner?.email_normalized === normalizedEmail && ownerRulesSetupComplete;
  const canManageMembers = householdOwner?.email_normalized === normalizedEmail;
  const canManageHouseholdItem = (createdByEmail?: string) =>
    normalizeHouseholdEmail(createdByEmail || '') === normalizedEmail ||
    householdOwner?.email_normalized === normalizedEmail;
  const canManageNotification = (notification: HouseholdNotification) =>
    householdOwner?.email_normalized === normalizedEmail ||
    normalizeHouseholdEmail(notification.sender_email) === normalizedEmail;
  const recentActivity = (household?.activity || []).filter((event) => getActivityFilterMatch(activityFilter, event.event_type));
  const householdSectionCounts: Partial<Record<HouseholdSectionTab, number>> = {
    rules: needsOwnerRulesSetup || needsLatestRulesAcknowledgement ? 1 : 0,
    bills: allBills.length,
    chores: (household?.chores || []).length,
    members: (household?.members || []).length,
    activity: (household?.activity || []).length,
  };
  const activeHouseholdSection = householdSectionTabs.find((tab) => tab.id === sectionTab) || householdSectionTabs[0];
  const activeHouseholdSectionCount = householdSectionCounts[activeHouseholdSection.id];
  const ActiveHouseholdSectionIcon = activeHouseholdSection.icon;
  const householdSectionPicker = household ? (
    <>
      <button
        type="button"
        onClick={() => setShowSectionDrawer(true)}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-left shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#1E40AF]">
            <ActiveHouseholdSectionIcon className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Household section</p>
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-[#0F172A]">{activeHouseholdSection.label}</p>
              {activeHouseholdSectionCount !== undefined ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1E40AF]">
                  {activeHouseholdSectionCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" strokeWidth={1.8} />
      </button>

      <Drawer open={showSectionDrawer} onOpenChange={setShowSectionDrawer}>
        <DrawerContent className="overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white data-[vaul-drawer-direction=bottom]:mt-2 data-[vaul-drawer-direction=bottom]:h-[min(94dvh,820px)] data-[vaul-drawer-direction=bottom]:max-h-[95dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base font-bold text-[#0F172A]">Household sections</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--native-safe-area-bottom)+1.25rem)]">
            <div className="grid grid-cols-2 gap-3 pb-2">
              {householdSectionTabs.map((tab) => {
                const Icon = tab.icon;
                const active = sectionTab === tab.id;
                const count = householdSectionCounts[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSectionTabChange(tab.id)}
                    className={`rounded-[20px] border px-4 py-3.5 text-left transition ${
                      active
                        ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </div>
                      {count !== undefined ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active ? 'bg-white text-[#1E40AF]' : 'bg-white text-[#64748B]'
                        }`}>
                          {count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[13px] font-bold">{tab.label}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleOpenExpenseTracker}
                className="rounded-[20px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3.5 text-left text-[#15803D] transition hover:bg-[#DCFCE7]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white">
                    <ChartPie className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="mt-3 text-[13px] font-bold">Expense Tracker</p>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  ) : null;
  const householdNotifications = [...(household?.notifications || [])].sort(
    (a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime(),
  );
  const paymentDraftBill = paymentDraftBillId
    ? allBills.find((bill) => bill.id === paymentDraftBillId) || null
    : null;
  const paymentDraftSplit = paymentDraftSplitId
    ? paymentDraftBill?.splits?.find((split) => split.id === paymentDraftSplitId) || null
    : null;
  const paymentDraftTargetLabel = paymentDraftSplitMemberEmail
    ? getHouseholdBillParticipantDisplayName(household, paymentDraftBill, paymentDraftSplitMemberEmail)
    : '';
  const paymentDraftRemaining = paymentDraftSplit
    ? Math.max(
        0,
        normalizeHouseholdEmail(paymentDraftSplit.member_email) === normalizeHouseholdEmail(paymentDraftBill?.paid_by_email || '')
          ? 0
          : Number(paymentDraftSplit.amount_owed || 0) - Number(paymentDraftSplit.amount_paid || 0),
      )
    : 0;
  const completeChoreDraft = completeChoreId
    ? household?.chores?.find((chore) => chore.id === completeChoreId) || null
    : null;

  const renderConfirmDescription = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'remove-member':
        return `Remove ${confirmAction.targetEmail} from this household? Their past activity will remain in the audit trail.`;
      case 'cancel-invite':
        return 'Cancel this pending invite? The invited person will need a fresh invite to join later.';
      case 'leave-household':
        return 'Leave this household? Your history will remain visible in the audit log.';
      case 'delete-household':
        return 'Delete this household permanently? Bills, chores, invitations, and household activity will be removed. Your Timeline home will stay untouched.';
      case 'force-accept-invite':
        return confirmAction.currentHouseholdName
          ? `You already belong to ${confirmAction.currentHouseholdName}. Continue to leave it and join the new household?`
          : 'You already belong to another household. Continue to leave it and join this one?';
      case 'delete-bill':
        return `Delete ${confirmAction.billTitle}? This removes it from the household while keeping a deletion event in the activity history.`;
      case 'delete-chore':
        return `Delete ${confirmAction.choreTitle}? This removes it from the household while keeping a deletion event in the activity history.`;
      case 'delete-notification':
        return `Delete ${confirmAction.notificationTitle}? This removes the notification from Household history.`;
      default:
        return '';
    }
  };

  const renderConfirmTitle = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'remove-member':
        return 'Remove household member';
      case 'cancel-invite':
        return 'Cancel pending invite';
      case 'leave-household':
        return 'Leave household';
      case 'delete-household':
        return 'Delete household';
      case 'force-accept-invite':
        return 'Leave current household and join';
      case 'delete-bill':
        return 'Delete bill';
      case 'delete-chore':
        return 'Delete chore';
      case 'delete-notification':
        return 'Delete notification';
      default:
        return '';
    }
  };

  const confirmBusyKey = confirmAction
    ? confirmAction.type === 'remove-member'
      ? `remove-member:${confirmAction.targetEmail}`
      : confirmAction.type === 'cancel-invite'
        ? `cancel:${confirmAction.token}`
        : confirmAction.type === 'leave-household'
          ? 'leave-household'
        : confirmAction.type === 'delete-household'
          ? 'delete-household'
          : confirmAction.type === 'delete-bill'
            ? `delete-bill:${confirmAction.billId}`
            : confirmAction.type === 'delete-chore'
              ? `delete-chore:${confirmAction.choreId}`
              : confirmAction.type === 'delete-notification'
                ? `delete-notification:${confirmAction.notificationId}`
            : `invite:${confirmAction.token}:accept`
    : null;

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'remove-member':
        await executeRemoveMember(confirmAction.targetEmail);
        break;
      case 'cancel-invite':
        await executeCancelInvite(confirmAction.token);
        break;
      case 'leave-household':
        await executeLeaveHousehold();
        break;
      case 'delete-household':
        await executeDeleteHousehold();
        break;
      case 'force-accept-invite':
        await executeForceAcceptInvite(confirmAction.token, confirmAction.rulesAcknowledgement);
        break;
      case 'delete-bill':
        await executeDeleteBill(confirmAction.billId);
        break;
      case 'delete-chore':
        await executeDeleteChore(confirmAction.choreId);
        break;
      case 'delete-notification':
        await executeDeleteNotification(confirmAction.notificationId);
        break;
    }
  };

  const isBillScanBusy = busyKey === 'scan-bill-receipt';
  const isBillSaveBusy = busyKey === 'create-bill';
  const isBillDrawerBlocked = drawerMode === 'bill' && (isBillScanBusy || isBillSaveBusy);
  const isRulesAcceptanceBusy = busyKey === 'rules-ack' || Boolean(rulesInvite && busyKey === `invite:${rulesInvite.token}:accept`);
  const isRulesAcceptanceRequired = drawerMode === 'rules_accept' && Boolean(rulesInvite || needsLatestRulesAcknowledgement);
  const isRulesSetupRequired = drawerMode === 'rules_setup' && needsOwnerRulesSetup;
  const isRulesSetupBusy = busyKey === 'rules-update' || rulesPdfBusy;
  const billDrawerBlockingTitle = isBillScanBusy
    ? 'Scanning receipt...'
    : editingBillId
      ? 'Saving bill...'
      : 'Creating bill...';
  const billDrawerBlockingCopy = isBillScanBusy
    ? 'Hoodie is reading the merchant, total, category, and date. Keep Hoodie open while this finishes.'
    : 'Please keep Hoodie open while this bill is saved.';
  const renderHouseholdStats = (stats: Array<'youOwe' | 'youreOwed' | 'billsDue' | 'choresDue'>) => {
    const statConfig: Record<typeof stats[number], { label: string; value: string | number }> = {
      youOwe: { label: 'You owe', value: formatHouseholdMoney(householdAttention.youOwe) },
      youreOwed: { label: "You're owed", value: formatHouseholdMoney(householdAttention.youreOwed) },
      billsDue: { label: 'Bills due', value: householdAttention.billsDue },
      choresDue: { label: 'Chores due', value: householdAttention.choresDue },
    };

    return (
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">{statConfig[stat].label}</p>
            <p className="mt-2 text-xl font-bold text-[#0F172A]">{statConfig[stat].value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E2E8F0] bg-white px-4 py-4">
        {householdSectionPicker ? (
          <div className="mb-4">
            {householdSectionPicker}
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1E40AF]">
            <Users className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold text-[#0F172A]">
                {householdHeaderDisplay.title}
              </p>
            </div>
            {householdHeaderDisplay.subtitle ? (
              <p className="mt-0.5 text-sm text-[#64748B]">
                {householdHeaderDisplay.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {household ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openDrawer('notification')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1E40AF] transition hover:bg-[#DBEAFE]"
            >
              <Bell className="h-3.5 w-3.5" strokeWidth={1.8} />
              Notify Household
            </button>
            <button
              type="button"
              onClick={() => openDrawer('invite')}
              disabled={!canInviteMembers}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#D1FAE5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Invite Member
            </button>
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
            {actionError}
          </div>
        ) : null}
        {actionSuccess ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              actionSuccessTone === 'warning'
                ? 'border border-[#FCD34D] bg-[#FFFBEB] text-[#B45309]'
                : 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
            }`}
          >
            {actionSuccess}
          </div>
        ) : null}
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4"
        data-keyboard-aware-scroll
        style={keyboardAwareInlineScrollStyle}
      >
        {incomingInviteUnavailable ? (
          <div className="mb-4 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#B45309] shadow-sm">
                <AlertTriangle className="h-4.5 w-4.5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#92400E]">This invite is no longer available</p>
                <p className="mt-1 text-xs leading-relaxed text-[#92400E]">
                  It may have expired, already been used, or been replaced by a newer invite. You can still review any active invites here.
                </p>
              </div>
              <button
                type="button"
                onClick={onClearIncomingInvite}
                className="rounded-full p-1 text-[#B45309] transition hover:bg-white hover:text-[#92400E]"
                aria-label="Clear household invite"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        ) : null}

        {household && needsLatestRulesAcknowledgement && latestHouseRulesVersion ? (
          <div className="mb-4 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#B45309] shadow-sm">
                <FileText className="h-4.5 w-4.5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#92400E]">House rules need your signature</p>
                <p className="mt-1 text-xs leading-relaxed text-[#92400E]">
                  Review and sign version {latestHouseRulesVersion.version_number} so the household has a clear acknowledgement record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openRulesAcceptanceDraft()}
                className="shrink-0 rounded-xl bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white"
              >
                Review
              </button>
            </div>
          </div>
        ) : null}

        {!household ? (
          <div className="space-y-4">
            {orderedPendingInvites.length > 0 ? (
              <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1E40AF] shadow-sm">
                    <Link2 className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-[#0F172A]">Household invitation</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                      Review the household invite below, then choose Move In or Reject.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {orderedPendingInvites.map((invite) => (
                    <HouseholdInviteCard
                      key={invite.token}
                      invite={invite}
                      highlighted={invite.token === incomingInviteToken}
                      busyKey={busyKey}
                      onRespond={(token, action) => {
                        if (action === 'accept') {
                          openRulesAcceptanceDraft(orderedPendingInvites.find((entry) => entry.token === token) || invite);
                          return;
                        }
                        void handleInviteResponse(token, action);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1E40AF] shadow-sm">
                    <Home className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-[#0F172A]">Run your share house together</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                      Create a household from one of your Timeline homes to split bills, assign chores, and keep a clean activity trail.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-[#0F172A]">
                    <Receipt className="h-4 w-4 text-[#1E40AF]" strokeWidth={1.8} />
                    Split bills without chasing screenshots
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#0F172A]">
                    <CheckSquare className="h-4 w-4 text-[#0F766E]" strokeWidth={1.8} />
                    Share chores and see who completed what
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#0F172A]">
                    <Clock3 className="h-4 w-4 text-[#EA580C]" strokeWidth={1.8} />
                    Keep a neutral history of every household action
                  </div>
                </div>
                <div className="mt-4">
                  {eligibleTimelineEntries.length > 0 ? (
                    <button
                      type="button"
                      onClick={onStartCreateHousehold}
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
                        isHouseholdOnboardingStep ? 'bg-[#1D4ED8] shadow-xl shadow-[#1D4ED8]/20 ring-4 ring-[#DBEAFE]' : 'bg-[#1E40AF]'
                      }`}
                    >
                      Create Household
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenTimeline}
                      className="w-full rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white"
                    >
                      Add A Home To Timeline
                    </button>
                  )}
                </div>
                {eligibleTimelineEntries.length === 0 ? (
                  <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                    Add a current or past home to Timeline first. Household addresses are selected only from saved Timeline entries.
                  </p>
                ) : null}
              </div>
            )}
            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-[#0F172A]">Personal and friend bills</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                    Track private bills for yourself, or split one-off costs with Hoodie friends by email.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDrawer('bill')}
                  className="shrink-0 rounded-2xl bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white"
                >
                  Add Bill
                </button>
              </div>
              {allBills.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                  No personal or friend bills yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {allBills.map((bill) => {
                    const viewerIsPayee = normalizeHouseholdEmail(bill.paid_by_email) === normalizedEmail;
                    const yourSplit = bill.splits.find((split) => normalizeHouseholdEmail(split.member_email) === normalizedEmail);
                    const remaining = viewerIsPayee || !yourSplit
                      ? 0
                      : Math.max(0, Number(yourSplit.amount_owed || 0) - Number(yourSplit.amount_paid || 0));
                    const pendingConfirmationPayments = bill.payments.filter(
                      (payment) => normalizeHouseholdEmail(payment.payee_email) === normalizedEmail && payment.status === 'pending_confirmation',
                    );
                    return (
                      <div key={bill.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0F172A]">{bill.title}</p>
                            <p className="mt-1 text-xs text-[#64748B]">
                              {formatHouseholdMoney(bill.amount_total)} • Due {formatDateLabel(bill.due_at)}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1E40AF]">
                            {bill.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {remaining > 0 && yourSplit ? (
                          <button
                            type="button"
                            onClick={() => openPaymentDraft(bill.id, yourSplit.id, yourSplit.member_email)}
                            className="mt-3 w-full rounded-xl bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white"
                          >
                            Mark {formatHouseholdMoney(remaining)} Paid
                          </button>
                        ) : null}
                        {pendingConfirmationPayments.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {pendingConfirmationPayments.map((payment) => (
                              <button
                                key={payment.id}
                                type="button"
                                onClick={() => void handleConfirmPayment(bill.id, payment.id)}
                                disabled={busyKey === `confirm:${payment.id}`}
                                className="w-full rounded-xl border border-[#BBF7D0] bg-white px-3 py-2 text-xs font-semibold text-[#0F766E] disabled:opacity-60"
                              >
                                {busyKey === `confirm:${payment.id}` ? 'Confirming...' : `Confirm ${getHouseholdBillParticipantDisplayName(household, bill, payment.payer_email)}`}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedPendingInvites.length > 0 ? (
              <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4.5 w-4.5 text-[#1E40AF]" strokeWidth={1.8} />
                  <p className="text-sm font-bold text-[#0F172A]">Pending invites</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                  Track open member invites and join links here.
                </p>
                <div className="mt-4 space-y-3">
                  {orderedPendingInvites.map((invite) => (
                    <HouseholdInviteCard
                      key={invite.token}
                      invite={invite}
                      highlighted={invite.token === incomingInviteToken}
                      busyKey={busyKey}
                      onRespond={(token, action) => {
                        if (action === 'accept') {
                          openRulesAcceptanceDraft(orderedPendingInvites.find((entry) => entry.token === token) || invite);
                          return;
                        }
                        void handleInviteResponse(token, action);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
	            {sectionTab === 'overview' ? (
	              <div className="space-y-4">
                {renderHouseholdStats(['youOwe', 'youreOwed', 'billsDue', 'choresDue'])}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openDrawer('bill')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                  >
                    <Receipt className="h-4 w-4" strokeWidth={1.8} />
                    Add Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer('chore')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#0F766E]"
                  >
                    <CheckSquare className="h-4 w-4" strokeWidth={1.8} />
                    Add Chore
                  </button>
                  <button
                    type="button"
                    onClick={() => canInviteMembers && openDrawer('invite')}
                    disabled={!canInviteMembers}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#334155] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={1.8} />
                    Invite Member
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer('notification')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#334155]"
                  >
                    <Bell className="h-4 w-4" strokeWidth={1.8} />
                    Notify Household
                  </button>
                </div>

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#0F172A]">Members</p>
                    <button
                      type="button"
                      onClick={() => handleSectionTabChange('members')}
                      className="text-[11px] font-semibold text-[#1E40AF]"
                    >
                      Open members
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeMembers.map((member) => (
                      <div key={member.id} className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[11px] text-[#334155]">
                        {getHouseholdMemberDisplayName(household, member.email_normalized)}
                        {member.role === 'owner' ? ' • Owner' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#0F172A]">Recent activity</p>
                    <button
                      type="button"
                      onClick={() => handleSectionTabChange('activity')}
                      className="text-[11px] font-semibold text-[#1E40AF]"
                    >
                      Open activity
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(household.activity || []).slice(0, 4).map((event) => (
                      <div key={event.id} className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] px-3 py-3">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {getHouseholdMemberDisplayName(household, event.actor_email)} • {getActivityLabel(event.event_type)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">{formatDateTimeLabel(event.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {sectionTab === 'rules' ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A]">House Rules</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                        A signed, dated household record of shared expectations. It can support accountability and may be used as evidence if an issue is discussed, mediated, or raised with a tenancy body or tribunal.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {needsLatestRulesAcknowledgement ? (
                        <button
                          type="button"
                          onClick={() => openRulesAcceptanceDraft()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white"
                        >
                          <PenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Review & Sign
                        </button>
                      ) : null}
                      {canManageMembers ? (
                        <button
                          type="button"
                          onClick={openRulesEditor}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1E40AF]"
                        >
                          <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {needsOwnerRulesSetup ? 'Set Up Rules' : 'Edit Rules'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {latestHouseRulesVersion ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#F8FAFC] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Version</p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]">v{latestHouseRulesVersion.version_number}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8FAFC] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Published</p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]">{formatDateTimeLabel(latestHouseRulesVersion.created_at)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F8FAFC] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Hash</p>
                        <p className="mt-1 break-all text-sm font-bold text-[#0F172A]">{latestHouseRulesVersion.rules_hash}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {!ownerRulesSetupComplete && !isCurrentUserHouseholdOwner ? (
                  <div className="rounded-[24px] border border-[#FEF3C7] bg-[#FFFBEB] p-4">
                    <p className="text-sm font-bold text-[#92400E]">Owner setup pending</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#92400E]">
                      The household owner needs to review, edit, publish, and sign the house rules before members can sign the current version.
                    </p>
                  </div>
                ) : null}

                {latestHouseRulesVersion ? (
                  <div className="space-y-3">
                    {normalizeHouseholdRuleSections(latestHouseRulesVersion.sections).map((section) => (
                      <div key={section.id} className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                        <p className="text-sm font-bold text-[#0F172A]">{section.title}</p>
                        {section.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{section.description}</p>
                        ) : null}
                        <div className="mt-3 space-y-2">
                          {section.items.filter((item) => item.enabled).map((item) => (
                            <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={2} />
                              <p className="text-sm leading-relaxed text-[#334155]">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <p className="text-sm font-bold text-[#0F172A]">Acknowledgements</p>
                  <div className="mt-3 space-y-3">
                    {rulesAcknowledgementStatus.map(({ member, acknowledgement, acknowledged }) => {
                      const canViewSignature = canManageMembers || member.email_normalized === normalizedEmail;
                      return (
                        <div key={member.id} className="rounded-2xl bg-[#F8FAFC] px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#0F172A]">{getHouseholdMemberDisplayName(household, member.email_normalized)}</p>
                              <p className="mt-1 text-[11px] text-[#64748B]">
                                {acknowledged && acknowledgement
                                  ? `Signed ${formatDateTimeLabel(acknowledgement.signed_at)}`
                                  : 'Waiting for latest version signature'}
                              </p>
                              {acknowledgement && canViewSignature ? (
                                <p className="mt-1 text-[11px] text-[#64748B]">{getSignatureSummary(acknowledgement.signature)}</p>
                              ) : null}
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              acknowledged ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                            }`}>
                              {acknowledged ? 'Signed' : 'Pending'}
                            </span>
                          </div>
                          {acknowledged && acknowledgement && canViewSignature && latestHouseRulesVersion && household ? (
                            <SignedHouseRulesPdfViewer
                              household={household}
                              version={latestHouseRulesVersion}
                              acknowledgement={acknowledgement}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <p className="text-sm font-bold text-[#0F172A]">Version history</p>
                  <div className="mt-3 space-y-2">
                    {(household.house_rules?.versions || []).map((version) => (
                      <div key={version.id} className="rounded-2xl bg-[#F8FAFC] px-3 py-3">
                        <p className="text-sm font-semibold text-[#0F172A]">Version {version.version_number}</p>
                        <p className="mt-1 text-[11px] text-[#64748B]">{formatDateTimeLabel(version.created_at)} • {version.rules_hash}</p>
                        {version.change_note ? (
                          <p className="mt-1 text-xs text-[#334155]">{version.change_note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {sectionTab === 'bills' ? (
              <div className="space-y-4">
                {renderHouseholdStats(['youOwe', 'youreOwed', 'billsDue'])}

                <button
                  type="button"
                  onClick={() => openDrawer('bill')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                >
                  <Receipt className="h-4 w-4" strokeWidth={1.8} />
                  Add Bill
                </button>
                {allBills.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#0F172A]">No bills yet</p>
                    <p className="mt-1 text-xs text-[#64748B]">Add the first shared expense to get everyone aligned.</p>
                  </div>
                ) : (
	                  allBills.map((bill) => {
	                    const viewerIsPayee = normalizeHouseholdEmail(bill.paid_by_email) === normalizedEmail;
	                    const yourSplit = bill.splits.find((split) => normalizeHouseholdEmail(split.member_email) === normalizedEmail);
                    const billHouseholdId = bill.household_id || '';
                    const canEditThisBill = Boolean(household && billHouseholdId === household.id && canManageHouseholdItem(bill.created_by_email));
                    const pendingConfirmationPayments = bill.payments.filter(
                      (payment) => payment.payee_email === normalizedEmail && payment.status === 'pending_confirmation',
                    );
                    const remaining = viewerIsPayee || !yourSplit
                      ? 0
                      : Math.max(0, Number(yourSplit.amount_owed || 0) - Number(yourSplit.amount_paid || 0));

                    return (
                      <div
                        key={bill.id}
                        id={`household-focus-bill:${bill.id}`}
                        className={`rounded-[24px] border border-[#E2E8F0] bg-white p-4 ${getFocusContainerClass(activeFocusTargetId === `bill:${bill.id}`)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
	                            <p className="text-base font-bold text-[#0F172A]">{bill.title}</p>
	                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
	                              <span>{getCanonicalHouseholdBillCategory(bill.category) || bill.category}</span>
	                              <span>•</span>
	                              <span>{formatHouseholdMoney(bill.amount_total)}</span>
                              <span>•</span>
                              <span>Due {formatDateLabel(bill.due_at)}</span>
                              {bill.bill_scope === 'personal' ? (
                                <>
                                  <span>•</span>
                                  <span>Personal bill</span>
                                </>
                              ) : bill.bill_scope === 'shared' || (bill.household_id && bill.household_id !== household?.id) ? (
                                <>
                                  <span>•</span>
                                  <span>Friend bill</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              bill.status === 'overdue'
                                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                                : bill.status === 'settled'
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : 'bg-[#EFF6FF] text-[#1E40AF]'
                            }`}>
                              {bill.status.replace(/_/g, ' ')}
                            </span>
                            {canEditThisBill ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openBillDraft(bill)}
                                  className="rounded-xl border border-[#DBEAFE] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1E40AF]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBill(bill.id, bill.title)}
                                  className="rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#B91C1C]"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {bill.notes || (bill.attachments || []).length ? (
                          <div className="mt-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm text-[#334155]">
                            {bill.notes ? <p>{bill.notes}</p> : null}
                            <HouseholdAttachmentPreviewList
                              attachments={bill.attachments || []}
                              title="Bill attachments"
                              onOpenAttachment={openAttachmentViewer}
                            />
                          </div>
                        ) : null}

	                        <div className="mt-4 grid gap-2">
	                          {bill.splits.map((split) => {
	                            const splitIsPayer = normalizeHouseholdEmail(split.member_email) === normalizeHouseholdEmail(bill.paid_by_email);
	                            const splitRemaining = splitIsPayer
	                              ? 0
	                              : Math.max(0, Number(split.amount_owed || 0) - Number(split.amount_paid || 0));
	                            const splitIsViewer = normalizeHouseholdEmail(split.member_email) === normalizedEmail;
	                            const canRecordDebtorPayment = viewerIsPayee && !splitIsViewer && splitRemaining > 0;
	                            const displayAmountPaid = splitIsPayer ? Number(split.amount_owed || 0) : Number(split.amount_paid || 0);
	                            const displayStatus = splitIsPayer ? 'settled' : split.status;

	                            return (
	                              <div key={split.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm">
	                                <div className="min-w-0 flex-1">
	                                  <p className="font-medium text-[#0F172A]">
	                                    {getHouseholdBillParticipantDisplayName(household, bill, split.member_email)}
	                                  </p>
	                                  <p className="mt-0.5 text-[11px] text-[#64748B]">
	                                    Paid {formatHouseholdMoney(displayAmountPaid)} of {formatHouseholdMoney(split.amount_owed)}
	                                  </p>
	                                </div>
	                                <div className="flex shrink-0 flex-col items-end gap-2 text-right">
	                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
	                                    {displayStatus.replace(/_/g, ' ')}
	                                  </span>
	                                  {canRecordDebtorPayment ? (
                                    <button
                                      type="button"
                                      onClick={() => openPaymentDraft(bill.id, split.id, split.member_email)}
                                      className="rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1E40AF]"
                                    >
                                      Record Paid
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {yourSplit && remaining > 0 ? (
                          <div className="mt-4 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#0F172A]">Your remaining share</p>
                                <p className="text-xs text-[#64748B]">{formatHouseholdMoney(remaining)} still open</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openPaymentDraft(bill.id, yourSplit.id, yourSplit.member_email)}
                                className="rounded-xl bg-[#1E40AF] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white"
                              >
                                Mark Paid
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {bill.payments.length > 0 ? (
                          <div className="mt-4 space-y-2 rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] p-3">
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {pendingConfirmationPayments.length > 0 ? 'Payments waiting for your confirmation' : 'Payment activity'}
                            </p>
                            {bill.payments.map((payment) => {
                              const paymentNeedsConfirmation =
                                payment.payee_email === normalizedEmail && payment.status === 'pending_confirmation';
                              return (
                                <div
                                  key={payment.id}
                                  id={`household-focus-payment:${payment.id}`}
                                  className={`flex flex-col gap-2 rounded-2xl bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${getFocusContainerClass(activeFocusTargetId === `payment:${payment.id}`)}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[#0F172A]">
                                      {getHouseholdBillParticipantDisplayName(household, bill, payment.payer_email)} sent {formatHouseholdMoney(payment.amount)}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#64748B]">{payment.note || 'No note added'}</p>
                                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                                      {payment.status.replace(/_/g, ' ')}
                                    </p>
                                    <HouseholdAttachmentPreviewList
                                      attachments={payment.attachments || []}
                                      title="Payment attachments"
                                      onOpenAttachment={openAttachmentViewer}
                                    />
                                  </div>
                                  {paymentNeedsConfirmation ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleConfirmPayment(bill.id, payment.id)}
                                      disabled={busyKey === `confirm:${payment.id}`}
                                      className="rounded-xl bg-[#0F766E] px-3 py-2 text-xs font-semibold text-white"
                                    >
                                      {busyKey === `confirm:${payment.id}` ? 'Confirming...' : 'Confirm Payment'}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {sectionTab === 'chores' ? (
              <div className="space-y-4">
                {renderHouseholdStats(['choresDue'])}

                <button
                  type="button"
                  onClick={() => openDrawer('chore')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#A7F3D0] bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#0F766E]"
                >
                  <CheckSquare className="h-4 w-4" strokeWidth={1.8} />
                  Add Household Chore
                </button>
                {(household.chores || []).length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#0F172A]">No chores yet</p>
                    <p className="mt-1 text-xs text-[#64748B]">Start with one recurring task to keep the house fair.</p>
                  </div>
                ) : (
                  household.chores.map((chore) => {
                    const canComplete =
                      chore.status !== 'completed' && (
                        chore.assignment_mode === 'claimable' ||
                        !chore.assigned_to_email ||
                        normalizeHouseholdEmail(chore.assigned_to_email) === normalizedEmail
                      );

                    return (
                      <div
                        key={chore.id}
                        id={`household-focus-chore:${chore.id}`}
                        className={`rounded-[24px] border border-[#E2E8F0] bg-white p-4 ${getFocusContainerClass(activeFocusTargetId === `chore:${chore.id}`)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-[#0F172A]">{chore.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                              <span>{chore.assignment_mode.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>{chore.cadence.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>Due {formatDateLabel(chore.due_at)}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              chore.status === 'overdue'
                                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                                : chore.status === 'completed'
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : 'bg-[#EFF6FF] text-[#1E40AF]'
                            }`}>
                              {chore.status.replace(/_/g, ' ')}
                            </span>
                            {canManageHouseholdItem(chore.created_by_email) ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openChoreDraft(chore)}
                                  className="rounded-xl border border-[#A7F3D0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F766E]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChore(chore.id, chore.title)}
                                  className="rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#B91C1C]"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm text-[#334155]">
                          {chore.assignment_mode === 'claimable'
                            ? 'Open for any active household member to complete'
                            : `Assigned to ${getHouseholdMemberDisplayName(household, chore.assigned_to_email)}`}
                        </div>

                        {chore.notes || (chore.attachments || []).length ? (
                          <div className="mt-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm text-[#334155]">
                            {chore.notes ? <p>{chore.notes}</p> : null}
                            <HouseholdAttachmentPreviewList
                              attachments={chore.attachments || []}
                              title="Chore attachments"
                              onOpenAttachment={openAttachmentViewer}
                            />
                          </div>
                        ) : null}

                        {chore.last_completed_at ? (
                          <div className="mt-3 text-[11px] text-[#64748B]">
                            <p>
                              Last completed by {getHouseholdMemberDisplayName(household, chore.last_completed_by_email || '')} on {formatDateTimeLabel(chore.last_completed_at)}
                            </p>
                            {chore.completion_note ? <p className="mt-1">{chore.completion_note}</p> : null}
                            <HouseholdAttachmentPreviewList
                              attachments={chore.completion_attachments || []}
                              title="Completion attachments"
                              onOpenAttachment={openAttachmentViewer}
                            />
                          </div>
                        ) : null}

                        <div className="mt-4 flex gap-2">
                          {canComplete ? (
                            <button
                              type="button"
                              onClick={() => void handleCompleteChore(chore.id)}
                              disabled={busyKey === `complete-chore:${chore.id}`}
                              className="flex-1 rounded-xl bg-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white"
                            >
                              {busyKey === `complete-chore:${chore.id}` ? 'Saving...' : 'Complete Chore'}
                            </button>
                          ) : chore.status === 'completed' ? (
                            <div className="flex flex-1 items-center justify-center rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#166534]">
                              Completed
                            </div>
                          ) : (
                            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
                              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Assigned to another household member
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {sectionTab === 'members' ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openDrawer('invite')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#0F766E]"
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={1.8} />
                    Invite Member
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer('notification')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                  >
                    <Send className="h-4 w-4" strokeWidth={1.8} />
                    Notify Household
                  </button>
                </div>

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <p className="text-sm font-bold text-[#0F172A]">Active members</p>
                  <div className="mt-3 space-y-3">
                    {activeMembers.map((member) => (
                      <div key={member.id} className="flex flex-col gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0F172A]">
                            {getHouseholdMemberDisplayName(household, member.email_normalized)}
                          </p>
                          <p className="mt-1 text-[11px] text-[#64748B]">
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canManageMembers && member.email_normalized !== normalizedEmail ? (
                            <button
                              type="button"
                              onClick={() => void handleRemoveMember(member.email_normalized)}
                              disabled={busyKey === `remove-member:${member.email_normalized}`}
                              className="rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C]"
                            >
                              {busyKey === `remove-member:${member.email_normalized}` ? 'Removing...' : 'Remove'}
                            </button>
                          ) : null}
                          {member.email_normalized === normalizedEmail && !canDeleteHousehold ? (
                            <button
                              type="button"
                              onClick={() => void handleLeaveHousehold()}
                              disabled={busyKey === 'leave-household'}
                              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
                            >
                              {busyKey === 'leave-household' ? 'Leaving...' : 'Leave Household'}
                            </button>
                          ) : null}
                          {member.email_normalized === normalizedEmail && canDeleteHousehold ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteHousehold()}
                              disabled={busyKey === 'delete-household'}
                              className="rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C]"
                            >
                              {busyKey === 'delete-household' ? 'Deleting...' : 'Delete Household'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                  <p className="text-sm font-bold text-[#0F172A]">Pending invites</p>
                  {sharedPendingInvites.length === 0 ? (
                    <p className="mt-3 text-xs text-[#64748B]">No pending invites right now.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {sharedPendingInvites.map((invite) => {
                        const inviteToken = invite.token;
                        return (
                          <div key={invite.token} className="flex flex-col gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#0F172A]">{invite.household_address_label || invite.household_name}</p>
                              <p className="mt-1 text-[11px] text-[#64748B]">
                                {invite.transport === 'hoodie_account'
                                  ? `Invited ${getInviteRecipientLabel(invite)} • Expires ${formatDateTimeLabel(invite.expires_at)}`
                                  : `Join link • Expires ${formatDateTimeLabel(invite.expires_at)}`}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleResendInvite(inviteToken)}
                                disabled={busyKey === `resend:${inviteToken}`}
                                className="rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-xs font-semibold text-[#1E40AF]"
                              >
                                {busyKey === `resend:${inviteToken}`
                                  ? (invite.transport === 'hoodie_account' ? 'Resending...' : 'Creating...')
                                  : (invite.transport === 'hoodie_account' ? 'Resend' : 'Share Again')}
                              </button>
                              {canManageMembers ? (
                                <button
                                  type="button"
                                  onClick={() => void handleCancelInvite(inviteToken)}
                                  disabled={busyKey === `cancel:${inviteToken}`}
                                  className="rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C]"
                                >
                                  {busyKey === `cancel:${inviteToken}` ? 'Cancelling...' : 'Cancel'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {pastMembers.length > 0 ? (
                  <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                    <p className="text-sm font-bold text-[#0F172A]">Past members</p>
                    <div className="mt-3 space-y-3">
                      {pastMembers.map((member) => (
                        <div key={member.id} className="rounded-2xl bg-[#F8FAFC] px-3 py-3">
                          <p className="text-sm font-medium text-[#0F172A]">{getHouseholdMemberDisplayName(household, member.email_normalized)}</p>
                          <p className="mt-1 text-[11px] text-[#64748B]">
                            {member.status.replace(/_/g, ' ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pendingInvites.length > 0 ? (
                  <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                    <p className="text-sm font-bold text-[#0F172A]">Other invitations for you</p>
                    <div className="mt-3 space-y-3">
                      {pendingInvites.map((invite) => (
                        <HouseholdInviteCard
                          key={invite.token}
                          invite={invite}
                          busyKey={busyKey}
                          onRespond={(token, action) => {
                            if (action === 'accept') {
                              openRulesAcceptanceDraft(pendingInvites.find((entry) => entry.token === token) || invite);
                              return;
                            }
                            void handleInviteResponse(token, action);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {sectionTab === 'activity' ? (
              <div className="space-y-4">
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max gap-2">
                    {([
                      ['all', 'All'],
                      ['members', 'Members'],
                      ['bills', 'Bills'],
                      ['chores', 'Chores'],
                      ['notifications', 'Notifications'],
                    ] as Array<[ActivityFilter, string]>).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActivityFilter(value)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                          activityFilter === value
                            ? 'bg-[#1E40AF] text-white'
                            : 'border border-[#E2E8F0] bg-white text-[#64748B]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activityFilter === 'notifications' ? (
                  householdNotifications.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
                      <p className="text-sm font-medium text-[#0F172A]">No notifications yet</p>
                      <p className="mt-1 text-xs text-[#64748B]">Manual and system household notifications will appear here.</p>
                    </div>
                  ) : (
                    householdNotifications.map((notification) => {
                      const manualNotification = isManualHouseholdNotification(notification);
                      const canManageThisNotification = canManageNotification(notification);
                      const visibleNotificationTitle = formatHouseholdVisibleCopy(household, notification.title);
                      const visibleNotificationBody = formatHouseholdVisibleCopy(household, notification.body);
                      return (
                        <div
                          key={notification.id}
                          id={`household-focus-notification:${notification.id}`}
                          className={`rounded-[24px] border border-[#E2E8F0] bg-white p-4 ${getFocusContainerClass(activeFocusTargetId === `notification:${notification.id}`)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-[#0F172A]">{visibleNotificationTitle}</p>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                  manualNotification ? 'bg-[#EFF6FF] text-[#1E40AF]' : 'bg-[#F8FAFC] text-[#475569]'
                                }`}>
                                  {manualNotification ? 'Manual alert' : getNotificationOrigin(notification).replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-[#334155]">{visibleNotificationBody}</p>
                              <div className="mt-3 space-y-1 text-[11px] text-[#64748B]">
                                <p>{formatDateTimeLabel(notification.sent_at)}</p>
                                <p>{getNotificationDeliveryLabel(notification)}</p>
                                <p>
                                  {Number(notification.targeted_recipient_count || notification.recipient_emails.length || 0)} recipients • opens {getNotificationDestinationLabel(notification.deep_link)}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={1.8} />
                          </div>
                          {notification.delivery_error ? (
                            <p className="mt-3 text-xs text-[#B45309]">{notification.delivery_error}</p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenNotificationDestination(notification)}
                              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#475569]"
                            >
                              Open {getNotificationDestinationLabel(notification.deep_link)}
                            </button>
                            {manualNotification && canManageThisNotification ? (
                              <button
                                type="button"
                                onClick={() => openNotificationEditDraft(notification)}
                                className="rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1E40AF]"
                              >
                                Edit / Resend
                              </button>
                            ) : null}
                            {canManageThisNotification ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteNotification(notification.id, notification.title)}
                                className="rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#B91C1C]"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )
                ) : recentActivity.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#0F172A]">No activity yet</p>
                    <p className="mt-1 text-xs text-[#64748B]">Activity will appear here as your household gets going.</p>
                  </div>
                ) : (
                  recentActivity.map((event) => (
                    <div key={event.id} className="rounded-[24px] border border-[#E2E8F0] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#0F172A]">
                            {getHouseholdMemberDisplayName(household, event.actor_email)} • {getActivityLabel(event.event_type)}
                          </p>
                          <p className="mt-1 text-[11px] text-[#64748B]">{formatDateTimeLabel(event.created_at)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={1.8} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {(drawerMode === 'bill' || drawerMode === 'chore') ? (
        <Drawer
          open
          onOpenChange={(open) => (!open && !isBillDrawerBlocked ? closeDrawer() : undefined)}
          fixed
          repositionInputs={false}
        >
          <DrawerContent
            overlayClassName="z-[10020]"
            className="z-[10021] overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white data-[vaul-drawer-direction=bottom]:mt-2 data-[vaul-drawer-direction=bottom]:h-auto data-[vaul-drawer-direction=bottom]:max-h-none"
            style={householdDrawerStyle}
            aria-busy={isBillDrawerBlocked}
          >
            <DrawerHeader className="border-b border-[#E2E8F0] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-base font-bold text-[#0F172A]">
                    {drawerMode === 'bill' && (editingBillId ? 'Edit bill' : household ? 'Add bill' : 'Add friend bill')}
                    {drawerMode === 'chore' && (editingChoreId ? 'Edit household chore' : 'Add household chore')}
                  </DrawerTitle>
                  <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                    {drawerMode === 'bill'
                      ? editingBillId
                        ? 'Update the shared expense, adjust who paid it, and review how the split works before saving.'
                        : 'Add the shared expense, confirm who paid it, and preview how the split works before saving.'
                      : editingChoreId
                        ? 'Update the chore, adjust how it is assigned, and decide whether the household should be notified.'
                        : 'Create the chore, choose how it is assigned, and decide whether the household should be notified.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isBillDrawerBlocked}
                  className="shrink-0 rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close household form"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </DrawerHeader>
            <DrawerBody
              className="pb-0"
              data-keyboard-aware-scroll
              style={keyboardAwareLargeSheetBodyStyle}
            >
              {drawerMode === 'bill' ? (
                <fieldset disabled={isBillDrawerBlocked} className="space-y-4 border-0 p-0 disabled:opacity-75">
                  <div className="rounded-[24px] border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0F172A]">Scan bill photo</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#166534]">
                          Upload or take a receipt photo and Hoodie will suggest the merchant, total, category, and date for review.
                        </p>
                      </div>
                      <label className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-[#15803D] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm shadow-[#15803D]/20 ${busyKey === 'scan-bill-receipt' ? 'pointer-events-none opacity-70' : ''}`}>
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {busyKey === 'scan-bill-receipt' ? 'Scanning...' : 'Choose photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busyKey === 'scan-bill-receipt'}
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            event.target.value = '';
                            void handleScanBillPhoto(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
	                    <input
	                      value={billTitle}
	                      onChange={(event) => setBillTitle(event.target.value)}
	                      placeholder="Bill title"
	                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
	                      enterKeyHint="next"
	                    />
	                    <div className="grid gap-3">
	                      <select
	                        value={billCategorySelection}
	                        onChange={(event) => {
	                          const nextSelection = event.target.value as HouseholdBillCategorySelection;
	                          setBillCategorySelection(nextSelection);
	                          if (nextSelection !== 'Other') {
	                            setBillCategoryCustomValue('');
	                          }
	                        }}
	                        aria-label="Bill category"
	                        className={`rounded-2xl border px-4 py-3 text-sm ${
	                          billCategorySelection
	                            ? 'border-[#D1D5DB] bg-[#F8FAFC] text-[#0F172A]'
	                            : 'border-[#D1D5DB] bg-[#F8FAFC] text-[#94A3B8]'
	                        }`}
	                      >
	                        <option value="">Select category</option>
	                        {householdBillCategorySelectOptions.map((category) => (
	                          <option key={category} value={category}>
	                            {category}
	                          </option>
	                        ))}
	                      </select>
	                      {billCategorySelection === 'Other' ? (
	                        <input
	                          value={billCategoryCustomValue}
	                          onChange={(event) => setBillCategoryCustomValue(event.target.value)}
	                          placeholder="Custom category"
	                          aria-label="Custom bill category"
	                          className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
	                          enterKeyHint="next"
	                        />
	                      ) : null}
	                    </div>
	                    <input
	                      type="number"
	                      min="0"
	                      step="0.01"
                      value={billAmountTotal}
                      onChange={(event) => setBillAmountTotal(event.target.value)}
                      placeholder="Total amount"
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                      enterKeyHint="next"
                      {...decimalFieldProps}
                    />
                    <HouseholdDateField
                      value={billDueAt}
                      onChange={setBillDueAt}
                      placeholder="Select due date"
                      ariaLabel="Select bill due date"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-[24px] border border-[#D7E2F1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                    <input
                      type="checkbox"
                      aria-label="Personal bill"
                      checked={isPersonalBillDraft}
                      onChange={(event) => setPersonalBillMode(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1]"
                    />
                    <span>
                      <span className="block font-bold text-[#0F172A]">Personal bill</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#64748B]">
                        Only you can see this bill. It stays out of household bills and notifications.
                      </span>
                    </span>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={billPaidByEmail}
                      onChange={(event) => setBillPaidByEmail(event.target.value)}
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    >
                      {billParticipantDrafts.map((participant) => (
                        <option key={participant.email} value={participant.email}>
                          Paid by {participant.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={billSplitType}
                      onChange={(event) => setBillSplitType(event.target.value as HouseholdSplitType)}
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    >
                      <option value="equal">Equal split</option>
                      <option value="custom">Custom amount</option>
                      <option value="shares">Shares</option>
                    </select>
                  </div>

                  <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-sm font-bold text-[#0F172A]">People on this bill</p>
                    {isPersonalBillDraft ? (
                      <div className="mt-3 rounded-2xl border border-[#DBEAFE] bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-[#1E40AF]">
                          Private to {currentUserBillParticipant.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                          Turn Personal bill off to add housemates or Hoodie friends.
                        </p>
                      </div>
                    ) : householdBillParticipantOptions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {householdBillParticipantOptions.map((participant) => {
                          const checked = billParticipantEmails.includes(participant.email);
                          return (
                            <button
                              key={participant.email}
                              type="button"
                              onClick={() => {
                                if (checked) {
                                  removeBillParticipantDraft(participant.email);
                                  return;
                                }
                                addBillParticipantDraft(participant);
                              }}
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                checked
                                  ? 'bg-[#1E40AF] text-white'
                                  : 'border border-[#CBD5E1] bg-white text-[#475569]'
                              }`}
                            >
                              {participant.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {!isPersonalBillDraft && savedBillContactOptions.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Recent Hoodie friends</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {savedBillContactOptions.slice(0, 8).map((contact) => (
                            <button
                              key={contact.email}
                              type="button"
                              onClick={() => addBillParticipantDraft(contact)}
                              disabled={billParticipantEmails.includes(contact.email)}
                              className="rounded-full border border-[#DBEAFE] bg-white px-3 py-2 text-xs font-semibold text-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {contact.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!isPersonalBillDraft ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={billFriendEmailInput}
                        onChange={(event) => setBillFriendEmailInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleAddBillFriendByEmail();
                          }
                        }}
                        placeholder="friend@hoodie.app"
                        className="min-w-0 flex-1 rounded-2xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm text-[#0F172A]"
                        enterKeyHint="done"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAddBillFriendByEmail()}
                        disabled={Boolean(busyKey?.startsWith('resolve-bill-contact:'))}
                        className="rounded-2xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1E40AF] disabled:opacity-60"
                      >
                        {busyKey?.startsWith('resolve-bill-contact:') ? 'Checking...' : 'Add Friend'}
                      </button>
                    </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {billParticipantDrafts.map((participant) => (
                        <span key={participant.email} className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] text-[#334155]">
                          {participant.label}
                          {!isPersonalBillDraft ? (
                            <button
                              type="button"
                              onClick={() => removeBillParticipantDraft(participant.email)}
                              className="rounded-full p-0.5 text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                              aria-label={`Remove ${participant.label}`}
                            >
                              <X className="h-3 w-3" strokeWidth={2} />
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={billNotes}
                    onChange={(event) => setBillNotes(event.target.value)}
                    rows={3}
                    placeholder="Notes (optional)"
                    className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                  />

                  <HouseholdAttachmentPreviewList
                    attachments={billExistingAttachments}
                    title="Existing bill attachments"
                    onOpenAttachment={openAttachmentViewer}
                  />

                  <HouseholdAttachmentPicker
                    files={billMediaFiles}
                    onFilesSelected={(files) => {
                      const nextFiles = mergeMediaFiles(billMediaFiles, files);
                      if (files?.length && nextFiles.length === billMediaFiles.length) {
                        setActionError('Only image and video files can be attached here.');
                        return;
                      }
                      setActionError('');
                      setBillMediaFiles(nextFiles);
                    }}
                    onRemoveFile={(index) => {
                      setBillMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                    }}
                    busy={isBillDrawerBlocked}
                    label="Bill attachments"
                    helperText="Add photos or videos for the bill, receipt, or shared expense."
                  />

                  <div className="rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-sm font-bold text-[#0F172A]">Split preview</p>
                    <div className="mt-3 space-y-3">
                      {billParticipantDrafts.map((participant) => (
                        <div key={participant.email} className="rounded-2xl bg-white px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#0F172A]">
                              {participant.label}
                            </p>
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {formatHouseholdMoney(
                                billSplitPreview.splits.find((split) => split.member_email === participant.email)?.amount_owed || 0,
                              )}
                            </p>
                          </div>
                          {billSplitType === 'custom' ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={billCustomAmounts[participant.email] || ''}
                              onChange={(event) =>
                                setBillCustomAmounts((current) => ({
                                  ...current,
                                  [participant.email]: event.target.value,
                                }))
                              }
                              placeholder="Custom amount"
                              className="mt-3 w-full rounded-xl border border-[#D1D5DB] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A]"
                              enterKeyHint="next"
                              {...decimalFieldProps}
                            />
                          ) : null}
                          {billSplitType === 'shares' ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={getShareInputValue(billShares[participant.email])}
                              onChange={(event) =>
                                setBillShares((current) => ({
                                  ...current,
                                  [participant.email]: event.target.value,
                                }))
                              }
                              placeholder="Shares"
                              className="mt-3 w-full rounded-xl border border-[#D1D5DB] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A]"
                              enterKeyHint="next"
                              {...numericFieldProps}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-[#64748B]">
                      Split total: {formatHouseholdMoney(billSplitPreview.total)} • Bill total: {formatHouseholdMoney(Number(billAmountTotal) || 0)}
                    </p>
                    {billSplitValidationMessage ? (
                      <p className="mt-2 text-xs text-[#B91C1C]">{billSplitValidationMessage}</p>
                    ) : null}
                  </div>

                  {!isPersonalBillDraft ? (
                    <label className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                      <input
                        type="checkbox"
                        checked={billEmailMembers}
                        onChange={(event) => setBillEmailMembers(event.target.checked)}
                        className="h-4 w-4 rounded border-[#CBD5E1]"
                      />
                      Notify everyone on this bill
                    </label>
                  ) : null}
                </fieldset>
              ) : null}

              {drawerMode === 'chore' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={choreTitle}
                      onChange={(event) => setChoreTitle(event.target.value)}
                      placeholder="Chore title"
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                      enterKeyHint="next"
                    />
                    <HouseholdDateField
                      value={choreDueAt}
                      onChange={setChoreDueAt}
                      placeholder="Select due date"
                      ariaLabel="Select chore due date"
                    />
                    <select
                      value={choreCadence}
                      onChange={(event) => setChoreCadence(event.target.value as HouseholdCadence)}
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    >
                      <option value="one_off">One off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <select
                      value={choreAssignmentMode}
                      onChange={(event) => setChoreAssignmentMode(event.target.value as 'assigned' | 'rotation' | 'claimable')}
                      className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    >
                      <option value="assigned">Assigned</option>
                      <option value="rotation">Rotation</option>
                      <option value="claimable">Claimable</option>
                    </select>
                  </div>

                  {choreAssignmentMode !== 'claimable' ? (
                    <select
                      value={choreAssignedToEmail}
                      onChange={(event) => setChoreAssignedToEmail(event.target.value)}
                      className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    >
                      {activeMembers.map((member) => (
                        <option key={member.id} value={member.email_normalized}>
                          {choreAssignmentMode === 'rotation'
                            ? `Rotation starts with ${getHouseholdMemberDisplayName(household, member.email_normalized)}`
                            : getHouseholdMemberDisplayName(household, member.email_normalized)}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <textarea
                    value={choreNotes}
                    onChange={(event) => setChoreNotes(event.target.value)}
                    rows={3}
                    placeholder="Notes (optional)"
                    className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                  />

                  <HouseholdAttachmentPreviewList
                    attachments={choreExistingAttachments}
                    title="Existing chore attachments"
                    onOpenAttachment={openAttachmentViewer}
                  />

                  <HouseholdAttachmentPicker
                    files={choreMediaFiles}
                    onFilesSelected={(files) => {
                      const nextFiles = mergeMediaFiles(choreMediaFiles, files);
                      if (files?.length && nextFiles.length === choreMediaFiles.length) {
                        setActionError('Only image and video files can be attached here.');
                        return;
                      }
                      setActionError('');
                      setChoreMediaFiles(nextFiles);
                    }}
                    onRemoveFile={(index) => {
                      setChoreMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                    }}
                    busy={busyKey === 'create-chore'}
                    label="Chore attachments"
                    helperText="Add photos or videos for the task, setup, or expected outcome."
                  />

                  <label className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                    <input
                      type="checkbox"
                      checked={choreEmailMembers}
                      onChange={(event) => setChoreEmailMembers(event.target.checked)}
                      className="h-4 w-4 rounded border-[#CBD5E1]"
                    />
                    Notify members about this chore
                  </label>
                </div>
              ) : null}
              {actionError ? <p className="mt-4 text-sm text-[#B91C1C]">{actionError}</p> : null}
              {actionSuccess ? (
                <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  actionSuccessTone === 'warning'
                    ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]'
                    : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                }`}>
                  {actionSuccess}
                </p>
              ) : null}
              <div aria-hidden="true" className="h-2 shrink-0" />
            </DrawerBody>
            <DrawerFooter
              className="border-t border-[#E2E8F0] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90"
              style={keyboardAwareLargeSheetFooterStyle}
            >
              {drawerMode === 'bill' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    disabled={isBillDrawerBlocked}
                    className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateBill()}
                    disabled={isBillDrawerBlocked}
                    className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBillScanBusy ? 'Scanning receipt...' : isBillSaveBusy ? (editingBillId ? 'Saving bill...' : 'Creating bill...') : editingBillId ? 'Save Bill' : 'Create Bill'}
                  </button>
                </div>
              ) : null}

              {drawerMode === 'chore' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    disabled={busyKey === 'create-chore'}
                    className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateChore()}
                    disabled={busyKey === 'create-chore'}
                    className="flex-1 rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === 'create-chore' ? (editingChoreId ? 'Saving chore...' : 'Creating chore...') : editingChoreId ? 'Save Chore' : 'Create Chore'}
                  </button>
                </div>
              ) : null}
            </DrawerFooter>
            {isBillDrawerBlocked ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/78 px-6 text-center backdrop-blur-sm">
                <div
                  role="status"
                  aria-live="polite"
                  className="w-full max-w-xs rounded-[28px] border border-[#DDE8D5] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#DCFCE7] text-[#15803D]">
                    <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 text-lg font-black text-[#0F172A]">{billDrawerBlockingTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{billDrawerBlockingCopy}</p>
                </div>
              </div>
            ) : null}
          </DrawerContent>
        </Drawer>
      ) : null}

      <HouseholdCompactModal
        open={drawerMode === 'invite'}
        onClose={closeDrawer}
        title="Invite to household"
        description="Invite by email or share a join link."
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={busyKey === 'send-invites'}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (inviteMode === 'email') {
                  void handleSendInvites();
                  return;
                }
                if (activeShareInviteUrl) {
                  closeDrawer();
                  return;
                }
                void handleSendInvites();
              }}
              disabled={busyKey === 'send-invites'}
              className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inviteMode === 'email'
                ? (busyKey === 'send-invites' ? 'Sending...' : 'Send Invites')
                : (busyKey === 'send-invites'
                    ? 'Creating...'
                    : activeShareInviteUrl
                      ? 'Done'
                      : 'Create Link')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInviteMode('email');
                setActionError('');
                setActionSuccess('');
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                inviteMode === 'email'
                  ? 'bg-[#EFF6FF] text-[#1E40AF] ring-1 ring-[#BFDBFE]'
                  : 'border border-[#E2E8F0] bg-white text-[#64748B]'
              }`}
            >
              By email
            </button>
            <button
              type="button"
              onClick={() => {
                setInviteMode('link');
                setActionError('');
                setActionSuccess('');
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                inviteMode === 'link'
                  ? 'bg-[#EFF6FF] text-[#1E40AF] ring-1 ring-[#BFDBFE]'
                  : 'border border-[#E2E8F0] bg-white text-[#64748B]'
              }`}
            >
              Share link
            </button>
          </div>

          {inviteMode === 'email' ? (
            <div className="space-y-2">
              <textarea
                value={inviteEmailInput}
                onChange={(event) => setInviteEmailInput(event.target.value)}
                rows={3}
                placeholder="name@hoodie.app, housemate@hoodie.app"
                className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
              />
              <p className="text-xs text-[#64748B]">Existing Hoodie accounts only.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeShareInviteUrl ? (
                <>
                  <div className="rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm text-[#0F172A]">
                    <p className="break-all">{activeShareInviteUrl}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void handleShareInviteLink()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                    >
                      <Send className="h-4 w-4" strokeWidth={1.8} />
                      Share Link
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyInviteLink()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1E40AF]"
                    >
                      <Copy className="h-4 w-4" strokeWidth={1.8} />
                      Copy Link
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#64748B]">Preparing your join link...</p>
              )}
            </div>
          )}
          {actionSuccess ? (
            <p className={`text-sm ${actionSuccessTone === 'warning' ? 'text-[#B45309]' : 'text-[#166534]'}`}>
              {actionSuccess}
            </p>
          ) : null}
          {actionError ? <p className="text-sm text-[#B91C1C]">{actionError}</p> : null}
        </div>
      </HouseholdCompactModal>

      {drawerMode === 'rules_accept' ? (
        <div
          className="fixed inset-0 z-[10030] flex flex-col bg-[#F8FAFC]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="house-rules-flow-title"
        >
          <div
            className="shrink-0 border-b border-[#E2E8F0] bg-white px-5 pb-4"
            style={{ paddingTop: 'max(calc(var(--native-safe-area-top) + 1rem), 1rem)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p id="house-rules-flow-title" className="text-lg font-black text-[#0F172A]">
                  {rulesInvite ? 'Accept house rules' : 'Review house rules'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                  {rulesAcceptanceVersion
                    ? `${rulesAcceptanceVersion.title} - Version ${rulesAcceptanceVersion.version_number}`
                    : 'House rules are not ready yet.'}
                </p>
              </div>
              {!isRulesAcceptanceRequired ? (
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isRulesAcceptanceBusy}
                  className="rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
                  aria-label="Close house rules"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              ) : null}
            </div>

            {rulesAcceptanceVersion ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
                  <span>Step {Math.min(rulesAcceptanceStepIndex + 1, rulesAcceptanceStepCount)} of {rulesAcceptanceStepCount}</span>
                  <span>{rulesAcceptanceIsSignatureStep ? 'Signature' : currentRulesAcceptanceSection?.title}</span>
                </div>
                <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${rulesAcceptanceStepCount}, minmax(0, 1fr))` }}>
                  {Array.from({ length: rulesAcceptanceStepCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full ${index <= rulesAcceptanceStepIndex ? 'bg-[#1E40AF]' : 'bg-[#DBEAFE]'}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
            data-keyboard-aware-scroll
            style={{
              ...keyboardAwareNestedScrollStyle,
              paddingBottom: 'max(calc(var(--native-safe-area-bottom) + 8.5rem), calc(var(--app-keyboard-inset) + 8rem), 8.5rem)',
              scrollPaddingBottom: 'max(calc(var(--native-safe-area-bottom) + 10rem), calc(var(--app-keyboard-inset) + 10rem), 10rem)',
            }}
          >
            {rulesAcceptanceVersion ? (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                <div className="rounded-[24px] border border-[#DBEAFE] bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1E40AF]">Signed household record</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#475569]">{rulesAcceptanceVersion.description}</p>
                  <p className="mt-3 text-xs font-semibold text-[#64748B]">{formatHouseRulesPublishedLabel(rulesAcceptanceVersion.created_at)}</p>
                </div>

                {currentRulesAcceptanceSection ? (
                  <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-[#64748B]">
                      Section {rulesAcceptanceStepIndex + 1} of {rulesAcceptanceSections.length}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">
                      <span
                        data-testid={rulesAcceptanceChangeHighlights.sectionTitleIds.has(currentRulesAcceptanceSection.id) ? 'house-rules-change-highlight' : undefined}
                        className={rulesAcceptanceChangeHighlights.sectionTitleIds.has(currentRulesAcceptanceSection.id) ? 'box-decoration-clone rounded bg-[#FEF08A] px-1' : undefined}
                      >
                        {currentRulesAcceptanceSection.title}
                      </span>
                    </h2>
                    {currentRulesAcceptanceSection.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                        <span
                          data-testid={rulesAcceptanceChangeHighlights.sectionDescriptionIds.has(currentRulesAcceptanceSection.id) ? 'house-rules-change-highlight' : undefined}
                          className={rulesAcceptanceChangeHighlights.sectionDescriptionIds.has(currentRulesAcceptanceSection.id) ? 'box-decoration-clone rounded bg-[#FEF08A] px-1' : undefined}
                        >
                          {currentRulesAcceptanceSection.description}
                        </span>
                      </p>
                    ) : null}
                    <div className="mt-5 space-y-3">
                      {currentRulesAcceptanceSection.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1E40AF]">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </span>
                          <p className="text-sm leading-relaxed text-[#0F172A]">
                            <span
                              data-testid={rulesAcceptanceChangeHighlights.itemTextIds.has(item.id) ? 'house-rules-change-highlight' : undefined}
                              className={rulesAcceptanceChangeHighlights.itemTextIds.has(item.id) ? 'box-decoration-clone rounded bg-[#FEF08A] px-1' : undefined}
                            >
                              {item.text}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-[#64748B]">Final step</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Sign with your profile name</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                      Your agreed sections, typed profile name, drawn signature, account email, rule version, and timestamp will be stored as the household acknowledgement record.
                    </p>
                    <div className="mt-5 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1E40AF]">Profile full name</p>
                      <p className="mt-1 text-sm font-bold text-[#0F172A]">{profileSignerName || 'Missing from profile'}</p>
                    </div>
                    <label className="mt-4 block">
                      <span className="text-xs font-bold text-[#475569]">Typed name</span>
                      <input
                        value={rulesTypedSignature}
                        onChange={(event) => setRulesTypedSignature(event.target.value)}
                        placeholder="Type your profile full name"
                        className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                        enterKeyHint="done"
                      />
                    </label>
                    <div className="mt-4">
                      <HouseRulesSignaturePad strokes={rulesSignatureStrokes} onChange={setRulesSignatureStrokes} />
                    </div>
                    {rulesValidation.signatureError ? (
                      <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{rulesValidation.signatureError}</p>
                    ) : null}
                  </section>
                )}

                {isRulesAcceptanceRequired ? (
                  <p className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-xs font-semibold leading-relaxed text-[#1E40AF]">
                    This acknowledgement is required to keep a signed household record. Review each section, agree to continue, then type your profile name and draw your signature.
                  </p>
                ) : null}
                {actionError ? <p className="text-sm font-semibold text-[#B91C1C]">{actionError}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">House rules are not ready yet.</p>
            )}
          </div>

          <div
            data-testid="house-rules-accept-footer"
            className="shrink-0 border-t border-[#E2E8F0] bg-white px-5 pt-3"
            style={{ paddingBottom: 'max(calc(var(--native-safe-area-bottom) + 0.85rem), calc(var(--app-keyboard-inset) + 0.75rem), 0.85rem)' }}
          >
            <div className="mx-auto flex w-full max-w-2xl gap-2">
              {rulesAcceptanceStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePreviousRulesAcceptanceStep}
                  disabled={isRulesAcceptanceBusy}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                >
                  Back
                </button>
              ) : !isRulesAcceptanceRequired ? (
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isRulesAcceptanceBusy}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}

              {currentRulesAcceptanceSection ? (
                <button
                  type="button"
                  onClick={handleAgreeCurrentRulesSection}
                  disabled={isRulesAcceptanceBusy}
                  className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Agree & Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submitRulesAcceptance()}
                  disabled={!rulesValidation.valid || isRulesAcceptanceBusy}
                  className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRulesAcceptanceBusy
                    ? 'Saving...'
                    : rulesInvite
                      ? 'Sign & Join'
                      : 'Sign Rules'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {drawerMode === 'rules_setup' ? (
        <div
          className="fixed inset-0 z-[10035] flex flex-col bg-[#F8FAFC]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="house-rules-setup-title"
        >
          <div
            className="shrink-0 border-b border-[#E2E8F0] bg-white px-5 pb-4"
            style={{ paddingTop: 'max(calc(var(--native-safe-area-top) + 1rem), 1rem)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p id="house-rules-setup-title" className="text-lg font-black text-[#0F172A]">
                  {needsOwnerRulesSetup ? 'Set up house rules' : 'Edit house rules'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                  Review each section, make the wording specific to the household, then publish and sign the immutable version.
                </p>
              </div>
              {!isRulesSetupRequired ? (
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isRulesSetupBusy}
                  className="rounded-full p-2 text-[#94A3B8] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
                  aria-label="Close house rules setup"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              ) : null}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
                <span>Step {Math.min(rulesSetupStepIndex + 1, rulesSetupStepCount)} of {rulesSetupStepCount}</span>
                <span>{rulesSetupIsSignatureStep ? 'Publish & sign' : currentRulesSetupSection?.title || 'Untitled section'}</span>
              </div>
              <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${rulesSetupStepCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: rulesSetupStepCount }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full ${index <= rulesSetupStepIndex ? 'bg-[#1E40AF]' : 'bg-[#DBEAFE]'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
            data-keyboard-aware-scroll
            style={{
              ...keyboardAwareNestedScrollStyle,
              paddingBottom: 'max(calc(var(--native-safe-area-bottom) + 8.5rem), calc(var(--app-keyboard-inset) + 8rem), 8.5rem)',
              scrollPaddingBottom: 'max(calc(var(--native-safe-area-bottom) + 10rem), calc(var(--app-keyboard-inset) + 10rem), 10rem)',
            }}
          >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {currentRulesSetupSection ? (
                <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#64748B]">
                    Section {rulesSetupStepIndex + 1} of {rulesSetupSections.length}
                  </p>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Section title</span>
                    <input
                      value={currentRulesSetupSection.title}
                      onChange={(event) => updateRulesDraftSection(currentRulesSetupSection.id, { title: event.target.value })}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-lg font-black text-[#0F172A]"
                      aria-label={`Rule section ${rulesSetupStepIndex + 1} title`}
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Section description</span>
                    <textarea
                      value={currentRulesSetupSection.description}
                      onChange={(event) => updateRulesDraftSection(currentRulesSetupSection.id, { description: event.target.value })}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      rows={2}
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                      aria-label={`Rule section ${rulesSetupStepIndex + 1} description`}
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRulesDraftSections((current) => {
                        if (rulesSetupStepIndex <= 0) return current;
                        const next = [...current];
                        const [entry] = next.splice(rulesSetupStepIndex, 1);
                        next.splice(rulesSetupStepIndex - 1, 0, entry);
                        setRulesSetupStepIndex((index) => Math.max(0, index - 1));
                        return next.map((item, index) => ({ ...item, order: index }));
                      })}
                      className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
                    >
                      Move section up
                    </button>
                    <button
                      type="button"
                      onClick={() => setRulesDraftSections((current) => {
                        if (rulesSetupStepIndex >= current.length - 1) return current;
                        const next = [...current];
                        const [entry] = next.splice(rulesSetupStepIndex, 1);
                        next.splice(rulesSetupStepIndex + 1, 0, entry);
                        setRulesSetupStepIndex((index) => Math.min(next.length - 1, index + 1));
                        return next.map((item, index) => ({ ...item, order: index }));
                      })}
                      className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
                    >
                      Move section down
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const draft = createHouseholdRuleDraftFromVersion(createDefaultHouseholdRulesVersion());
                        setRulesDraftTitle(draft.title);
                        setRulesDraftDescription(draft.description);
                        setRulesDraftSections(draft.sections);
                        setRulesSetupStepIndex(0);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Restore presets
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {currentRulesSetupSection.items.map((item, itemIndex) => (
                      <div key={item.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <div className="flex items-start gap-3">
                          <label className="mt-3 flex shrink-0 items-center gap-2 text-xs font-semibold text-[#475569]">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(event) => updateRulesDraftItem(currentRulesSetupSection.id, item.id, { enabled: event.target.checked })}
                              className="h-4 w-4 rounded border-[#CBD5E1]"
                            />
                            On
                          </label>
                          <textarea
                            value={item.text}
                            onChange={(event) => updateRulesDraftItem(currentRulesSetupSection.id, item.id, { text: event.target.value })}
                            onKeyDown={stopHouseRulesSetupFieldKeydown}
                            rows={3}
                            data-house-rule-item-id={item.id}
                            className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-sm leading-relaxed text-[#0F172A]"
                            aria-label={`Rule item ${itemIndex + 1} text`}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveRulesDraftItem(currentRulesSetupSection.id, item.id, -1)}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs text-[#475569]"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRulesDraftItem(currentRulesSetupSection.id, item.id, 1)}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs text-[#475569]"
                          >
                            Move down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addRulesDraftItem(currentRulesSetupSection.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1E40AF]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Add checklist item
                  </button>
                  <button
                    type="button"
                    onClick={addRulesDraftSection}
                    className="ml-2 mt-4 inline-flex items-center gap-2 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1E40AF]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Add section
                  </button>
                </section>
              ) : (
                <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#64748B]">Final step</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Publish and sign</h2>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Rules title</span>
                    <input
                      value={rulesDraftTitle}
                      onChange={(event) => setRulesDraftTitle(event.target.value)}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      placeholder="Rules title"
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Declaration intro</span>
                    <textarea
                      value={rulesDraftDescription}
                      onChange={(event) => setRulesDraftDescription(event.target.value)}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      rows={3}
                      placeholder="Short declaration intro"
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Change note</span>
                    <input
                      value={rulesDraftChangeNote}
                      onChange={(event) => setRulesDraftChangeNote(event.target.value)}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      placeholder="Change note (optional)"
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    />
                  </label>
                  <div className="mt-5 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1E40AF]">Profile full name</p>
                    <p className="mt-1 text-sm font-bold text-[#0F172A]">{profileSignerName || 'Missing from profile'}</p>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-[#475569]">Typed name</span>
                    <input
                      value={rulesPublishSignature}
                      onChange={(event) => setRulesPublishSignature(event.target.value)}
                      onKeyDown={stopHouseRulesSetupFieldKeydown}
                      placeholder="Type your profile full name"
                      className="mt-2 w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
                    />
                  </label>
                  <div className="mt-4">
                    <HouseRulesSignaturePad strokes={rulesPublishSignatureStrokes} onChange={setRulesPublishSignatureStrokes} />
                  </div>
                </section>
              )}

              {isRulesSetupRequired ? (
                <p className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-xs font-semibold leading-relaxed text-[#1E40AF]">
                  The owner must publish and sign house rules before the household can continue.
                </p>
              ) : null}
              {actionError ? <p className="text-sm font-semibold text-[#B91C1C]">{actionError}</p> : null}
              {rulesPdfWarning ? <p className="text-sm font-semibold text-[#B45309]">{rulesPdfWarning}</p> : null}
            </div>
          </div>

          <div
            className="shrink-0 border-t border-[#E2E8F0] bg-white px-5 pt-3"
            style={{ paddingBottom: 'max(calc(var(--native-safe-area-bottom) + 0.85rem), calc(var(--app-keyboard-inset) + 0.75rem), 0.85rem)' }}
          >
            <div className="mx-auto flex w-full max-w-2xl gap-2">
              {rulesSetupStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePreviousRulesSetupStep}
                  disabled={isRulesSetupBusy}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                >
                  Back
                </button>
              ) : !isRulesSetupRequired ? (
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isRulesSetupBusy}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}

              {currentRulesSetupSection ? (
                <button
                  type="button"
                  onClick={handleNextRulesSetupStep}
                  disabled={isRulesSetupBusy}
                  className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save & Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submitRulesUpdate()}
                  disabled={isRulesSetupBusy}
                  className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyKey === 'rules-update' ? 'Publishing...' : rulesPdfBusy ? 'Preparing PDF...' : 'Publish & Sign'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <HouseholdCompactModal
        open={drawerMode === 'notification'}
        onClose={closeDrawer}
        title={editingNotificationId ? 'Edit household alert' : 'Notify household'}
        description="Choose which active members should get the push notification and customise the message before sending."
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={busyKey === 'send-email'}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSendManualNotification()}
              disabled={busyKey === 'send-email' || recipientDefaultEmails.length === 0}
              className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === 'send-email' ? 'Sending push...' : editingNotificationId ? 'Resend Push' : 'Send Push'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2">
            {recipientDefaultEmails.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                Add another active household member before sending a push notification.
              </div>
            ) : (
              recipientDefaultEmails.map((recipientEmail) => {
                const checked = emailRecipientEmails.includes(recipientEmail);
                return (
                  <label key={recipientEmail} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setEmailRecipientEmails((current) => (
                          event.target.checked
                            ? [...current, recipientEmail]
                            : current.filter((value) => value !== recipientEmail)
                        ));
                      }}
                      className="h-4 w-4 rounded border-[#CBD5E1]"
                    />
                    <span className="text-sm text-[#0F172A]">
                      {getHouseholdMemberDisplayName(household, recipientEmail)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {isGratitudeTemplate && recipientDefaultEmails.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Who are you thanking?</p>
              <div className="grid gap-2">
                {recipientDefaultEmails.map((recipientEmail) => (
                  <label key={`gratitude-thanked-${recipientEmail}`} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="gratitude-household-thanked-member"
                      checked={emailGratitudeThankedMemberEmail === recipientEmail}
                      onChange={(event) => {
                        if (!event.target.checked) return;
                        setEmailGratitudeThankedMemberEmail(recipientEmail);
                      }}
                      className="h-4 w-4 rounded border-[#CBD5E1]"
                    />
                    <span className="text-sm text-[#0F172A]">
                      {getHouseholdMemberDisplayName(household, recipientEmail)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {notificationTemplatePresets.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyNotificationTemplate(template)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                    emailTemplateType === template.id
                      ? 'bg-[#1E40AF] text-white'
                      : 'border border-[#E2E8F0] bg-white text-[#64748B]'
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <input
            value={emailSubject}
            onChange={(event) => {
              if (emailTemplateType === 'gratitude') {
                setEmailSubjectManuallyEdited(true);
              }
              setEmailSubject(event.target.value);
            }}
            placeholder="Push title"
            className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
            enterKeyHint="next"
          />
          <textarea
            value={emailBody}
            onChange={(event) => setEmailBody(event.target.value)}
            rows={5}
            placeholder="Write your push message to the household..."
            className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
          />
          <p className="text-xs text-[#64748B]">
            Selected active household members with push enabled will receive this on their phone.
          </p>
          {actionError ? <p className="text-sm text-[#B91C1C]">{actionError}</p> : null}
        </div>
      </HouseholdCompactModal>

      <HouseholdCompactModal
        open={drawerMode === 'payment' && Boolean(paymentDraftBill)}
        onClose={closeDrawer}
        title="Mark bill payment"
        description={
          paymentDraftBill
            ? normalizeHouseholdEmail(paymentDraftBill.paid_by_email) === normalizedEmail && paymentDraftTargetLabel
              ? `Record that ${paymentDraftTargetLabel} paid you for ${paymentDraftBill.title}.`
              : `Record your payment for ${paymentDraftBill.title}. The payer will still need to confirm it.`
            : undefined
        }
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={paymentDraftBillId ? busyKey === `payment:${paymentDraftBillId}` : false}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => paymentDraftBillId ? void handleMarkPayment(paymentDraftBillId) : undefined}
              disabled={
                paymentDraftBillId
                  ? busyKey === `payment:${paymentDraftBillId}` || !paymentDraftSplit || paymentDraftRemaining <= 0
                  : true
              }
              className="flex-1 rounded-2xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentDraftBillId && busyKey === `payment:${paymentDraftBillId}` ? 'Saving...' : 'Mark Paid'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentDraftAmount}
              onChange={(event) => setPaymentDraftAmount(event.target.value)}
              className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
              placeholder="Amount"
              {...decimalFieldProps}
            />
            <input
              value={paymentDraftNote}
              onChange={(event) => setPaymentDraftNote(event.target.value)}
              className="rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
              placeholder="Optional note"
              enterKeyHint="done"
            />
          </div>
          <HouseholdAttachmentPicker
            files={paymentMediaFiles}
            onFilesSelected={(files) => {
              const nextFiles = mergeMediaFiles(paymentMediaFiles, files);
              if (files?.length && nextFiles.length === paymentMediaFiles.length) {
                setActionError('Only image and video files can be attached here.');
                return;
              }
              setActionError('');
              setPaymentMediaFiles(nextFiles);
            }}
            onRemoveFile={(index) => {
              setPaymentMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
            }}
            busy={Boolean(paymentDraftBillId && busyKey === `payment:${paymentDraftBillId}`)}
            label="Payment attachments"
            helperText="Add screenshots, photos, or videos for the payment note if needed."
          />
          {paymentDraftSplit && paymentDraftRemaining <= 0 ? (
            <p className="text-sm text-[#B91C1C]">This split is already fully paid.</p>
          ) : null}
          {actionError ? <p className="text-sm text-[#B91C1C]">{actionError}</p> : null}
        </div>
      </HouseholdCompactModal>

      <HouseholdCompactModal
        open={drawerMode === 'complete_chore' && Boolean(completeChoreDraft)}
        onClose={closeDrawer}
        title="Complete chore"
        description={completeChoreDraft ? `Add an optional note for ${completeChoreDraft.title} before marking it complete.` : undefined}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={completeChoreId ? busyKey === `complete-chore:${completeChoreId}` : false}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitCompleteChore()}
              disabled={completeChoreId ? busyKey === `complete-chore:${completeChoreId}` : true}
              className="flex-1 rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completeChoreId && busyKey === `complete-chore:${completeChoreId}` ? 'Saving...' : 'Complete Chore'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <textarea
            value={completeChoreNote}
            onChange={(event) => setCompleteChoreNote(event.target.value)}
            rows={4}
            placeholder="Add a quick completion note (optional)"
            className="w-full rounded-2xl border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A]"
          />
          <HouseholdAttachmentPicker
            files={completeChoreMediaFiles}
            onFilesSelected={(files) => {
              const nextFiles = mergeMediaFiles(completeChoreMediaFiles, files);
              if (files?.length && nextFiles.length === completeChoreMediaFiles.length) {
                setActionError('Only image and video files can be attached here.');
                return;
              }
              setActionError('');
              setCompleteChoreMediaFiles(nextFiles);
            }}
            onRemoveFile={(index) => {
              setCompleteChoreMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
            }}
            busy={Boolean(completeChoreId && busyKey === `complete-chore:${completeChoreId}`)}
            label="Completion attachments"
            helperText="Add photos or videos with your completion note if you want extra context."
          />
          {actionError ? <p className="text-sm text-[#B91C1C]">{actionError}</p> : null}
        </div>
      </HouseholdCompactModal>

      <HouseholdMediaViewer
        viewer={mediaViewer}
        onClose={() => setMediaViewer(null)}
        onSelect={(index) => {
          setMediaViewer((current) => (current ? { ...current, index } : current));
        }}
      />

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => (!open ? setConfirmAction(null) : undefined)}>
        <AlertDialogContent
          overlayClassName="z-[10020]"
          className="z-[10021] max-w-[calc(100%-2rem)] rounded-[28px] border-[#E2E8F0] p-0 sm:max-w-md"
        >
          <div className="space-y-4 px-5 py-5">
            <AlertDialogHeader className="gap-1 text-left">
              <AlertDialogTitle className="text-base font-bold text-[#0F172A]">
                {renderConfirmTitle()}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-[#64748B]">
                {renderConfirmDescription()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {actionError ? <p className="text-sm text-[#B91C1C]">{actionError}</p> : null}
          </div>
          <AlertDialogFooter className="border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:justify-stretch">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              disabled={Boolean(confirmBusyKey && busyKey === confirmBusyKey)}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#475569] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmAction()}
              disabled={Boolean(confirmBusyKey && busyKey === confirmBusyKey)}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                confirmAction?.type === 'delete-household' ||
                confirmAction?.type === 'remove-member' ||
                confirmAction?.type === 'cancel-invite' ||
                confirmAction?.type === 'delete-bill' ||
                confirmAction?.type === 'delete-chore' ||
                confirmAction?.type === 'delete-notification'
                  ? 'bg-[#B91C1C]'
                  : 'bg-[#1E40AF]'
              }`}
            >
              {confirmAction?.type === 'remove-member' && busyKey === confirmBusyKey
                ? 'Removing...'
                : confirmAction?.type === 'cancel-invite' && busyKey === confirmBusyKey
                  ? 'Cancelling...'
                  : confirmAction?.type === 'leave-household' && busyKey === confirmBusyKey
                    ? 'Leaving...'
                    : confirmAction?.type === 'delete-household' && busyKey === confirmBusyKey
                      ? 'Deleting...'
                      : confirmAction?.type === 'force-accept-invite' && busyKey === confirmBusyKey
                        ? 'Joining...'
                        : confirmAction?.type === 'delete-bill' && busyKey === confirmBusyKey
                          ? 'Deleting...'
                          : confirmAction?.type === 'delete-chore' && busyKey === confirmBusyKey
                            ? 'Deleting...'
                            : confirmAction?.type === 'delete-notification' && busyKey === confirmBusyKey
                              ? 'Deleting...'
                        : confirmAction?.type === 'remove-member'
                          ? 'Remove Member'
                          : confirmAction?.type === 'cancel-invite'
                            ? 'Cancel Invite'
                            : confirmAction?.type === 'leave-household'
                              ? 'Leave Household'
                              : confirmAction?.type === 'delete-household'
                                ? 'Delete Household'
                                : confirmAction?.type === 'delete-bill'
                                  ? 'Delete Bill'
                                  : confirmAction?.type === 'delete-chore'
                                    ? 'Delete Chore'
                                    : confirmAction?.type === 'delete-notification'
                                      ? 'Delete Notification'
                                : 'Leave And Join'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
