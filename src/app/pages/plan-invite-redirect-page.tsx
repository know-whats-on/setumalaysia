import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import {
  buildPublicPlanDeepLink,
  buildPublicPlanRoute,
  getStoreFallbackUrl,
} from '../lib/public-plan-links';

export function PlanInviteRedirectPage() {
  const navigate = useNavigate();
  const params = useParams();
  const source = params.source || '';
  const slug = params.slug || '';
  const planId = params.planId || '';

  const browserRoute = useMemo(
    () => buildPublicPlanRoute(source, slug, planId),
    [planId, slug, source],
  );
  const deepLink = useMemo(
    () => buildPublicPlanDeepLink(source, slug, planId),
    [planId, slug, source],
  );
  const storeFallback = useMemo(
    () => getStoreFallbackUrl(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    [],
  );

  useEffect(() => {
    if (!source || !slug || !planId || typeof window === 'undefined') return;

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
  }, [deepLink, planId, slug, source, storeFallback]);

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
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#FDE68A]">Plan invite</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Opening {APP_CONFIG.displayName}…</h1>
          </div>
        </div>
        <p className="text-sm leading-6 text-white/80">
          We&apos;re taking you straight to the event plan. If the app doesn&apos;t open, you can install it or continue in the browser.
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
          <button
            type="button"
            onClick={() => navigate(browserRoute, { replace: true })}
            className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  );
}
