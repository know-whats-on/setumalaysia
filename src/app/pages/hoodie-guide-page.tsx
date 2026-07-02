import { useEffect, useMemo, useState } from 'react';
import { BookOpen, LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { fetchCityGuides } from '../lib/api';
import { APP_VARIANT } from '../lib/app-variant';
import {
  type HoodieGuideRouteResolutionStatus,
  resolveHoodieGuideRoute,
} from '../lib/hoodie-guide-routing';
import {
  humanizeHoodieShareSlug,
  resolveHoodieGuidePathToVibeRoute,
} from '../lib/hoodie-share';

export function HoodieGuidePage() {
  const navigate = useNavigate();
  const { citySlug = '', guideSlug = '' } = useParams();
  const [resolutionStatus, setResolutionStatus] = useState<HoodieGuideRouteResolutionStatus>('resolving');

  const cityLabel = useMemo(() => humanizeHoodieShareSlug(citySlug), [citySlug]);
  const guideLabel = useMemo(() => humanizeHoodieShareSlug(guideSlug), [guideSlug]);

  useEffect(() => {
    let cancelled = false;
    const cleanCitySlug = String(citySlug || '').trim();
    const cleanGuideSlug = String(guideSlug || '').trim();

    if (!cleanCitySlug) {
      navigate(resolveHoodieGuidePathToVibeRoute('', null), { replace: true });
      return undefined;
    }

    setResolutionStatus('resolving');

    void fetchCityGuides({ city: cleanCitySlug, appVariant: APP_VARIANT })
      .then((guides) => {
        if (cancelled) return;
        const resolution = resolveHoodieGuideRoute({
          citySlug: cleanCitySlug,
          guideSlug: cleanGuideSlug,
          guides,
          isLoading: false,
        });
        if (resolution.status === 'resolving') return;
        setResolutionStatus(resolution.status);
        navigate(resolution.route, { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('Hoodie guide route resolution failed, falling back to the city guide list.', error);
        setResolutionStatus('fallback');
        navigate(resolveHoodieGuidePathToVibeRoute(cleanCitySlug, null), { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [citySlug, guideSlug, navigate]);

  return (
    <div className="flex h-full items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1E40AF]">
            <BookOpen className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0F172A]">
              {resolutionStatus === 'fallback' ? `Opening ${cityLabel || 'city'} guides` : `Opening ${guideLabel || 'guide'}`}
            </p>
            <p className="text-xs text-[#64748B]">
              {resolutionStatus === 'fallback'
                ? 'This guide could not be found, so Hoodie is taking you to the city guide list instead.'
                : `Checking the latest ${cityLabel || 'city'} guide list before Hoodie opens the full guide.`}
            </p>
          </div>
          <LoaderCircle className="h-5 w-5 animate-spin text-[#1E40AF]" />
        </div>
      </div>
    </div>
  );
}
