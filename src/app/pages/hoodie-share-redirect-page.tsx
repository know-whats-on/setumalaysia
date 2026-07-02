import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import {
  buildFallbackDescriptorForMatch,
  buildHoodieShareDeepLinkForMatch,
  matchHoodieSharePath,
  resolveHoodieShareMatchAppRoute,
} from '../lib/hoodie-share';
import { getStoreFallbackUrl } from '../lib/public-plan-links';

export function HoodieShareRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);
  const match = useMemo(() => matchHoodieSharePath(location.pathname), [location.pathname]);
  const descriptor = useMemo(
    () => (shareEnabled && match ? buildFallbackDescriptorForMatch(match) : null),
    [shareEnabled, match],
  );
  const deepLink = useMemo(
    () => (shareEnabled && match ? buildHoodieShareDeepLinkForMatch(match) : ''),
    [shareEnabled, match],
  );
  const browserRoute = useMemo(
    () => (shareEnabled && match ? resolveHoodieShareMatchAppRoute(match) : '/'),
    [shareEnabled, match],
  );
  const storeFallback = useMemo(
    () => getStoreFallbackUrl(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    [],
  );

  useEffect(() => {
    if (!shareEnabled || !match || typeof window === 'undefined') return;

    const fallbackTimeout = window.setTimeout(() => {
      window.location.replace(storeFallback);
    }, 1600);

    window.location.href = deepLink;

    const visibilityHandler = () => {
      if (document.hidden) {
        window.clearTimeout(fallbackTimeout);
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    return () => {
      window.clearTimeout(fallbackTimeout);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [deepLink, shareEnabled, match, storeFallback]);

  if (!shareEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-6 py-10 text-white">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">{APP_CONFIG.displayName} share links are not enabled here</h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            This install does not support {APP_CONFIG.displayName} share redirects. Open the {APP_CONFIG.displayName} app or use the official web link instead.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                window.location.replace(APP_CONFIG.marketingUrl);
              }}
              className="w-full rounded-2xl bg-[#FDE68A] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#FCD34D]"
            >
              Open {APP_CONFIG.displayName} website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!match || !descriptor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-6 py-10 text-white">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Share link unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            This share link is not valid anymore. You can still open {APP_CONFIG.displayName} or get the app.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                window.location.replace(APP_CONFIG.marketingUrl);
              }}
              className="w-full rounded-2xl bg-[#FDE68A] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#FCD34D]"
            >
              Open {APP_CONFIG.displayName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const publicSafe = descriptor.privacyClass === 'public_safe';
  const shareTypeLabel =
    match.kind === 'event'
      ? 'Official event'
      : match.kind === 'public_plan'
        ? 'Public plan'
        : match.kind === 'city_guide'
          ? 'City guide'
          : match.kind === 'suburb_snapshot'
            ? 'Suburb snapshot'
            : match.kind === 'address_check_snapshot'
              ? 'Address check'
              : 'Scam check';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-center gap-4">
          <img
            src={APP_CONFIG.webIcon}
            alt={APP_CONFIG.displayName}
            className="h-16 w-16 rounded-[22px] object-cover"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#FDE68A]">
              {publicSafe ? `Shared from ${APP_CONFIG.displayName}` : `Private share from ${APP_CONFIG.displayName}`}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Opening {APP_CONFIG.displayName}…</h1>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FDE68A]">
            {shareTypeLabel}
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">{descriptor.storyCardData.title}</h2>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/80">
          {publicSafe
            ? `We can open this straight in ${APP_CONFIG.displayName}, send you to the store, or let you continue in the browser.`
            : `This is a share-safe summary only. Open ${APP_CONFIG.displayName} to see the feature, or get the app first if you need it.`}
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = deepLink;
            }}
            className="w-full rounded-2xl bg-[#FDE68A] px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#FCD34D]"
          >
            Open in {APP_CONFIG.displayName}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.replace(storeFallback);
            }}
            className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Get the app
          </button>
          {publicSafe ? (
            <button
              type="button"
              onClick={() => navigate(browserRoute, { replace: true })}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Continue in browser
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
