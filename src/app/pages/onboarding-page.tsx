import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Onboarding } from '../components/onboarding';
import {
  fetchHouseholdInvitePreview,
  sendOtp,
  verifyOtp,
  createProfile,
  fetchProfile,
  updateProfile,
  isReviewerBypassEmail,
} from '../lib/api';
import type { ProfilePayload } from '../lib/api';
import type { HouseholdInvite } from '../lib/household';
import { resolveAuthenticatedDefaultLandingRoute } from '../lib/default-landing-route';
import { syncHouseholdSharedSession } from '../lib/household-native-sync';
import {
  buildCompletedMigratedProfileUpdates,
  needsMigratedProfileCompletion,
  type MigratedProfile,
} from '../lib/profile-migration';

function getPostLoginRoute() {
  return sessionStorage.getItem('ghar_post_login_route') || '';
}

async function consumePostLoginRoute(email?: string) {
  const nextRoute = getPostLoginRoute();
  if (nextRoute) {
    sessionStorage.removeItem('ghar_post_login_route');
    return nextRoute;
  }
  return resolveAuthenticatedDefaultLandingRoute(email || localStorage.getItem('ghar_email') || '');
}

function extractInviteTokenFromRoute(route: string) {
  if (!route) return '';
  try {
    const parsed = new URL(route, 'https://hoodie.local');
    return parsed.searchParams.get('invite') || '';
  } catch {
    return '';
  }
}

function formatInviteExpiry(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getInviteSenderLabel(invite: HouseholdInvite) {
  if (String(invite.sender_display_name || '').trim()) return String(invite.sender_display_name).trim();
  const emailHandle = String(invite.sender_email || '').split('@')[0]?.trim();
  return emailHandle || 'A household member';
}

export function OnboardingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [postLogoutMessage, setPostLogoutMessage] = useState('');
  const [invitePreview, setInvitePreview] = useState<HouseholdInvite | null>(null);
  const [profileCompletionDraft, setProfileCompletionDraft] = useState<MigratedProfile | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('ghar_onboarded') === 'true') {
      let cancelled = false;
      void consumePostLoginRoute().then((route) => {
        if (!cancelled) {
          navigate(route, { replace: true });
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [navigate]);

  useEffect(() => {
    const nextMessage = sessionStorage.getItem('ghar_post_logout_message') || '';
    if (!nextMessage) return;
    setPostLogoutMessage(nextMessage);
    sessionStorage.removeItem('ghar_post_logout_message');
  }, []);

  useEffect(() => {
    const inviteToken = extractInviteTokenFromRoute(getPostLoginRoute());
    if (!inviteToken) {
      setInvitePreview(null);
      return;
    }

    let cancelled = false;
    void fetchHouseholdInvitePreview({ token: inviteToken })
      .then((invite) => {
        if (cancelled) return;
        setInvitePreview(invite);
      })
      .catch((err) => {
        console.error('GHAR onboarding invite preview error:', err);
        if (cancelled) return;
        setInvitePreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search]);

  const handleSendOtp = async (email: string) => {
    await sendOtp(email);
  };

  const persistSession = async (profile: Partial<ProfilePayload> & { email?: string }, fallbackEmail: string) => {
    const sessionEmail = profile.email || fallbackEmail;
    localStorage.setItem('ghar_onboarded', 'true');
    localStorage.setItem('ghar_email', sessionEmail);
    localStorage.setItem('ghar_first_name', profile.first_name || '');
    localStorage.setItem('ghar_last_name', profile.last_name || '');
    localStorage.setItem('ghar_au_state', profile.australian_state || '');
    localStorage.setItem('ghar_audience_mode', profile.audience_mode || 'student');
    if (profile.university) localStorage.setItem('ghar_university', profile.university);
    else localStorage.removeItem('ghar_university');
    await syncHouseholdSharedSession(sessionEmail);
    return sessionEmail;
  };

  const handleVerifyOtp = async (email: string, code: string) => {
    await verifyOtp(email, code);
    // Check if user already has a profile — if so, log them in directly
    try {
      const profile = await fetchProfile(email) as MigratedProfile | null;
      if (profile) {
        if (needsMigratedProfileCompletion(profile)) {
          setProfileCompletionDraft({ ...profile, email: profile.email || email });
          return;
        }

        const sessionEmail = await persistSession(profile, email);
        navigate(await consumePostLoginRoute(sessionEmail), { replace: true });
        return;
      }
    } catch (err) {
      console.error('GHAR profile check error (non-fatal):', err);
    }

    if (isReviewerBypassEmail(email)) {
      localStorage.setItem('ghar_onboarded', 'true');
      localStorage.setItem('ghar_email', email);
      localStorage.setItem('ghar_first_name', 'App');
      localStorage.setItem('ghar_last_name', 'Reviewer');
      await syncHouseholdSharedSession(email);
      navigate(await consumePostLoginRoute(email), { replace: true });
    }
  };

  const handleComplete = async (profile: ProfilePayload) => {
    try {
      if (profileCompletionDraft?.email?.toLowerCase() === profile.email.toLowerCase()) {
        await updateProfile(profile.email, buildCompletedMigratedProfileUpdates(profile));
      } else {
        await createProfile(profile);
      }
    } catch (err) {
      console.error('GHAR profile creation error (non-fatal):', err);
    }
    setProfileCompletionDraft(null);
    const sessionEmail = await persistSession(profile, profile.email);
    navigate(await consumePostLoginRoute(sessionEmail), { replace: true });
  };

  return (
    <div className="relative size-full">
      {postLogoutMessage && (
        <div
          className="absolute inset-x-4 z-20 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm font-medium text-[#166534] shadow-lg"
          style={{ top: 'calc(var(--native-safe-area-top) + 12px)' }}
        >
          {postLogoutMessage}
        </div>
      )}
      {invitePreview && (
        <div
          className="absolute inset-x-4 z-20 rounded-[28px] border border-[#DBEAFE] bg-white/95 px-5 py-5 shadow-2xl backdrop-blur"
          style={{
            top: postLogoutMessage
              ? 'calc(var(--native-safe-area-top) + 76px)'
              : 'calc(var(--native-safe-area-top) + 12px)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#64748B]">Household Invite</p>
          <p className="mt-2 text-xl font-bold text-[#0F172A]">
            Move into {invitePreview.household_address_label || invitePreview.household_name}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">
            Shared by {getInviteSenderLabel(invitePreview)}. Sign in to review the invite inside Household and choose Move In or Reject.
          </p>
          <p className="mt-3 text-xs font-medium text-[#64748B]">
            Expires {formatInviteExpiry(invitePreview.expires_at)}
          </p>
        </div>
      )}
      <Onboarding
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        onComplete={handleComplete}
        initialProfile={profileCompletionDraft}
      />
    </div>
  );
}
