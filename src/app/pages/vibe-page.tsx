import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { VibeEventsHub } from '../components/vibe-events-hub';
import type {
  EventDateRangeState,
  EventsTab,
  NetworkingView,
  OfficialEventsSourceMode,
  PlansView,
  VibeEventsHubStateUpdate,
} from '../components/vibe-events-hub';
import { Noticeboard } from '../components/noticeboard';
import { useGharData } from '../components/layout';
import { HoodieHelpTrigger, useHoodieHelpTour } from '../components/hoodie-help-tour';
import { CityGuidesHub } from '../components/city-guides-hub';
import { VibeSuburbScoreTab } from '../components/vibe-suburb-score-tab';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { SetuChinaVibePage } from './setu-china-pages';
import { SetuIndiaVibePage } from './setu-india-pages';
import { JomSettleVibePage } from './jom-settle-pages';
import { WolliVibePage } from './wolli-pages';

type VibeSection = 'vibe' | 'events' | 'alerts';
type VibeNestedTab = 'my-hood' | 'suburb-score';
type GuideFeedView = 'carousel' | 'list';

function parseEventParamList(value: string | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function VibePage() {
  if (APP_VARIANT === 'setu_china') {
    return <SetuChinaVibePage />;
  }

  if (APP_VARIANT === 'ghar') {
    return <SetuIndiaVibePage />;
  }

  if (APP_VARIANT === 'jom_settle') {
    return <JomSettleVibePage />;
  }

  if (APP_VARIANT === 'wheres_wolli') {
    return <WolliVibePage />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const { bulletins, banners } = useGharData();
  const { activeMode, activeStepId } = useHoodieHelpTour();
  const showGuidesTab = APP_CONFIG.showVibeGuides;
  const guidesTabId: VibeNestedTab = 'my-hood';
  const suburbScoreTabId: VibeNestedTab = 'suburb-score';
  const shouldFreezeVibeSearchParamsRef = useRef(false);
  const shouldFreezeVibeSearchParams =
    activeMode === 'first_run' &&
    activeStepId !== null &&
    activeStepId !== 'vibe';
  const shouldSuspendVibeSurface = shouldFreezeVibeSearchParams;
  shouldFreezeVibeSearchParamsRef.current = shouldFreezeVibeSearchParams;

  const rawSection = searchParams.get('section');
  const section: VibeSection =
    rawSection === 'events' || rawSection === 'alerts' ? rawSection : 'vibe';
  const rawEventTab = searchParams.get('events_tab');
  const eventTab: EventsTab =
    rawEventTab === 'plans' || rawEventTab === 'networking'
      ? rawEventTab
      : 'whatson';
  const defaultVibeTab: VibeNestedTab = APP_CONFIG.defaultVibeTab;
  const rawVibeTab = searchParams.get('vibe_tab');
  const vibeTab: VibeNestedTab =
    rawVibeTab === suburbScoreTabId || (showGuidesTab && rawVibeTab === guidesTabId)
      ? rawVibeTab
      : defaultVibeTab;
  const cityParam = searchParams.get('city') || '';
  const guideParam = searchParams.get('guide') || '';
  const rawCouncilParam = searchParams.get('council') || '';
  const councilParam = rawCouncilParam === 'city-of-sydney' ? '' : rawCouncilParam;
  const suburbParam = searchParams.get('suburb') || '';
  const rawGuidesView = searchParams.get('guides_view');
  const guidesViewParam: GuideFeedView = rawGuidesView === 'list' ? 'list' : 'carousel';
  const networkingViewParam: NetworkingView =
    searchParams.get('networking_view') === 'cards' ? 'cards' : 'events';
  const officialEventsSourceModeParam: OfficialEventsSourceMode =
    searchParams.get('events_source_mode') === 'university' ? 'university' : 'lga';
  const rawOfficialEventStartDay = searchParams.get('events_start_day') || '';
  const rawOfficialEventEndDay = searchParams.get('events_end_day') || '';
  const officialEventWhenParam: EventDateRangeState = useMemo(
    () => ({
      startDay: rawOfficialEventStartDay,
      endDay: rawOfficialEventEndDay,
    }),
    [rawOfficialEventEndDay, rawOfficialEventStartDay],
  );
  const rawOfficialEventTypes = searchParams.get('events_types');
  const rawOfficialEventCategories = searchParams.get('events_tags');
  const officialEventTypesParam = useMemo(
    () => parseEventParamList(rawOfficialEventTypes),
    [rawOfficialEventTypes],
  );
  const officialEventCategoriesParam = useMemo(
    () => parseEventParamList(rawOfficialEventCategories),
    [rawOfficialEventCategories],
  );
  const selectedUniversityIdParam = searchParams.get('university_id') || '';
  const rawPlansView = searchParams.get('plans_view');
  const plansViewParam: PlansView =
    rawPlansView === 'my' || rawPlansView === 'itinerary' ? rawPlansView : 'public';

  const mutateSearchParams = (mutate: (nextParams: URLSearchParams) => void) => {
    if (shouldFreezeVibeSearchParamsRef.current) return;
    const nextParams = new URLSearchParams(searchParams);
    mutate(nextParams);
    setSearchParams(nextParams, { replace: true });
  };

  const updateSearchParams = (updates: Record<string, string | null | undefined>) => {
    mutateSearchParams((nextParams) => {
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });
    });
  };

  const handleSectionChange = (nextSection: VibeSection) => {
    mutateSearchParams((nextParams) => {
      nextParams.set('section', nextSection);
      if (nextSection === 'events' && !nextParams.get('events_tab')) {
        nextParams.set('events_tab', 'whatson');
      }
      if (nextSection !== 'events') {
        nextParams.delete('events_tab');
      }
      if (nextSection === 'vibe' && !nextParams.get('vibe_tab')) {
        nextParams.set('vibe_tab', defaultVibeTab);
      }
    });
  };

  const handleVibeTabChange = (nextTab: VibeNestedTab) => {
    updateSearchParams({
      section: 'vibe',
      vibe_tab: nextTab,
      guide: nextTab === guidesTabId ? guideParam : null,
      city: nextTab === guidesTabId ? cityParam : null,
      guides_view: nextTab === guidesTabId ? guidesViewParam : null,
    });
  };

  const handleEventHubStateChange = (updates: VibeEventsHubStateUpdate) => {
    mutateSearchParams((nextParams) => {
      nextParams.set('section', 'events');
      if (updates.networkingView !== undefined) {
        if (updates.networkingView === 'cards') {
          nextParams.set('networking_view', 'cards');
        } else {
          nextParams.delete('networking_view');
        }
      }
      if (updates.officialEventsSourceMode !== undefined) {
        if (updates.officialEventsSourceMode === 'university') {
          nextParams.set('events_source_mode', 'university');
        } else {
          nextParams.delete('events_source_mode');
        }
      }
      if (updates.officialEventWhen !== undefined) {
        const { startDay, endDay } = updates.officialEventWhen;
        if (startDay) nextParams.set('events_start_day', startDay);
        else nextParams.delete('events_start_day');
        if (endDay) nextParams.set('events_end_day', endDay);
        else nextParams.delete('events_end_day');
      }
      if (updates.officialEventTypes !== undefined) {
        if (updates.officialEventTypes.length) {
          nextParams.set('events_types', updates.officialEventTypes.join(','));
        } else {
          nextParams.delete('events_types');
        }
      }
      if (updates.officialEventCategories !== undefined) {
        if (updates.officialEventCategories.length) {
          nextParams.set('events_tags', updates.officialEventCategories.join(','));
        } else {
          nextParams.delete('events_tags');
        }
      }
      if (updates.selectedUniversityId !== undefined) {
        if (updates.selectedUniversityId) nextParams.set('university_id', updates.selectedUniversityId);
        else nextParams.delete('university_id');
      }
      if (updates.plansView !== undefined) {
        if (updates.plansView === 'public') nextParams.delete('plans_view');
        else nextParams.set('plans_view', updates.plansView);
      }
    });
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="px-4 pt-4 pb-4 native-safe-area-top bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">
              {section === 'vibe' ? 'Vibe' : section === 'events' ? "What's On, Networking & Plans" : 'Vibe Alerts'}
            </h1>
            <p className="text-sm text-[#64748B] font-normal">
              {section === 'vibe'
                ? 'Find the perfect lifestyle and community fit for your studies.'
                : section === 'events'
                  ? 'Browse official city events, startup networking, and live public plans without leaving Vibe.'
                  : 'Keep an eye on community bulletins, police updates, and suburb watch-outs without leaving Vibe.'}
            </p>
          </div>
          <HoodieHelpTrigger
            stepId="vibe"
            title="Open vibe onboarding video"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
          {([
            { id: 'vibe' as const, label: 'Vibe' },
            { id: 'events' as const, label: 'Events' },
            { id: 'alerts' as const, label: 'Alerts' },
          ]).map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSectionChange(item.id)}
                className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {shouldSuspendVibeSurface ? (
        <div className="min-h-0 flex-1 bg-white" />
      ) : section === 'vibe' ? (
        <>
          {showGuidesTab ? (
            <div className="px-4 pb-4 bg-white">
              <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
                {([
                  { id: guidesTabId, label: APP_CONFIG.vibeGuidesLabel },
                  { id: suburbScoreTabId, label: 'Suburb Stats' },
                ]).map((item) => {
                  const active = vibeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleVibeTabChange(item.id)}
                      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? 'bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">
            {showGuidesTab && vibeTab === guidesTabId ? (
              <CityGuidesHub
                cityParam={cityParam}
                guideParam={guideParam}
                guidesView={guidesViewParam}
                onCityChange={(nextCity) => {
                  updateSearchParams({
                    section: 'vibe',
                    vibe_tab: guidesTabId,
                    city: nextCity,
                    guide: null,
                    guides_view: guidesViewParam,
                  });
                }}
                onGuideChange={(nextGuide) => {
                  updateSearchParams({
                    section: 'vibe',
                    vibe_tab: guidesTabId,
                    city: cityParam,
                    guide: nextGuide,
                    guides_view: guidesViewParam,
                  });
                }}
                onGuidesViewChange={(nextView) => {
                  updateSearchParams({
                    section: 'vibe',
                    vibe_tab: guidesTabId,
                    city: cityParam,
                    guide: guideParam,
                    guides_view: nextView,
                  });
                }}
              />
            ) : (
              <VibeSuburbScoreTab
                selectedSuburbParam={suburbParam}
                onSuburbChange={(nextSuburb) => {
                  updateSearchParams({
                    section: 'vibe',
                    vibe_tab: suburbScoreTabId,
                    suburb: nextSuburb,
                    city: null,
                    guide: null,
                    guides_view: null,
                  });
                }}
              />
            )}
          </div>
        </>
      ) : section === 'events' ? (
        <VibeEventsHub
          eventTab={eventTab}
          councilParam={councilParam}
          networkingView={networkingViewParam}
          officialEventsSourceMode={officialEventsSourceModeParam}
          officialEventWhen={officialEventWhenParam}
          officialEventTypes={officialEventTypesParam}
          officialEventCategories={officialEventCategoriesParam}
          selectedUniversityId={selectedUniversityIdParam}
          plansView={plansViewParam}
          onEventTabChange={(nextTab) => {
            updateSearchParams({
              section: 'events',
              events_tab: nextTab,
              networking_view: nextTab === 'networking' && networkingViewParam === 'cards' ? networkingViewParam : null,
              plans_view: nextTab === 'plans' && plansViewParam !== 'public' ? plansViewParam : null,
            });
          }}
          onCouncilChange={(nextCouncil) => {
            updateSearchParams({
              section: 'events',
              events_tab: eventTab,
              council: nextCouncil,
            });
          }}
          onStateChange={handleEventHubStateChange}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <Noticeboard embedded bulletins={bulletins} banners={banners} />
        </div>
      )}
    </div>
  );
}
