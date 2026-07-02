import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Home,
  Info,
  LogOut,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import setuIndiaHero from '../../assets/setu-india-hero.png';
import setuIndiaPlane from '../../assets/setu-india-plane.png';
import { CityGuidesHub } from '../components/city-guides-hub';
import { useGharData } from '../components/layout';
import { Noticeboard } from '../components/noticeboard';
import { VibeEventsHub, type EventDateRangeState, type EventsTab, type NetworkingView, type OfficialEventsSourceMode, type PlansView, type VibeEventsHubStateUpdate } from '../components/vibe-events-hub';
import { VibeSuburbScoreTab } from '../components/vibe-suburb-score-tab';
import { deleteProfile, fetchCityGuides, fetchOfficialEvents, type CityGuide, type OfficialEvent } from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { suburbDemographics } from '../lib/demographics-data';
import { slugifyHoodieShareText } from '../lib/hoodie-share';
import { SETU_INDIA_RESOURCES_DEFAULT_ROUTE } from '../lib/resources-routes';
import {
  setuIndiaAlerts,
  setuIndiaChecklistSections,
  setuIndiaQuickActions,
  type SetuIndiaChecklistItem,
} from '../lib/setu-india-content';
import { setuIndiaShortcutIcons } from '../lib/setu-india-icons';

type VibeNestedTab = 'my-hood' | 'suburb-score';
type GuideFeedView = 'carousel' | 'list';

const OFFICIAL_EVENTS_TIMEZONE = 'Australia/Sydney';
const SETU_INDIA_CITY_STORAGE_KEY = 'setu_india_city_slug';

type SetuIndiaCity = {
  slug: 'sydney' | 'melbourne' | 'brisbane' | 'adelaide';
  label: string;
  zh: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'SA';
  bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
};

const SETU_INDIA_CITIES: SetuIndiaCity[] = [
  {
    slug: 'sydney',
    label: 'Sydney',
    zh: 'New South Wales',
    state: 'NSW',
    bounds: { minLat: -34.15, minLng: 150.52, maxLat: -33.55, maxLng: 151.35 },
  },
  {
    slug: 'melbourne',
    label: 'Melbourne',
    zh: 'Victoria',
    state: 'VIC',
    bounds: { minLat: -38.15, minLng: 144.45, maxLat: -37.45, maxLng: 145.55 },
  },
  {
    slug: 'brisbane',
    label: 'Brisbane',
    zh: 'Queensland',
    state: 'QLD',
    bounds: { minLat: -27.8, minLng: 152.7, maxLat: -27.1, maxLng: 153.3 },
  },
  {
    slug: 'adelaide',
    label: 'Adelaide',
    zh: 'South Australia',
    state: 'SA',
    bounds: { minLat: -35.1, minLng: 138.42, maxLat: -34.75, maxLng: 138.78 },
  },
];

function resolveSetuIndiaCity(slug?: string | null) {
  return SETU_INDIA_CITIES.find((city) => city.slug === slug) || SETU_INDIA_CITIES[0];
}

function readSetuIndiaCity() {
  if (typeof window === 'undefined') return SETU_INDIA_CITIES[0];
  return resolveSetuIndiaCity(window.localStorage.getItem(SETU_INDIA_CITY_STORAGE_KEY));
}

function useSetuIndiaCity() {
  const [city, setCityState] = useState<SetuIndiaCity>(() => readSetuIndiaCity());

  useEffect(() => {
    const sync = () => setCityState(readSetuIndiaCity());
    window.addEventListener('storage', sync);
    window.addEventListener('setu-india-city-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('setu-india-city-change', sync);
    };
  }, []);

  const setCity = (slug: SetuIndiaCity['slug']) => {
    const next = resolveSetuIndiaCity(slug);
    setCityState(next);
    window.localStorage.setItem(SETU_INDIA_CITY_STORAGE_KEY, next.slug);
    window.dispatchEvent(new Event('setu-india-city-change'));
  };

  return { city, setCity };
}

function formatSydneyDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getHomeEventRange() {
  return {
    startDay: formatSydneyDayKey(new Date()),
    endDay: formatSydneyDayKey(new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)),
  };
}

function parseEventParamList(value: string | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getIndianStudentCount(record: (typeof suburbDemographics)[number]) {
  return record.demographics.find((item) => /^(india|indian)$/i.test(item.name))?.students || 0;
}

function getCityGuideRoute(guide: CityGuide) {
  const city = guide.city_slug || slugifyHoodieShareText(guide.city);
  return `/vibe?section=vibe&vibe_tab=my-hood&city=${encodeURIComponent(city)}&guide=${encodeURIComponent(guide.slug)}`;
}

function BrandHeader({ title, back }: { title?: string; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {back ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0F172A]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="break-words text-[1.65rem] font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-[2rem]">{title}</h1>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IndiaHeroBackdrop({
  imageClassName = 'opacity-90',
  showPlane = false,
  planeClassName = '',
}: {
  imageClassName?: string;
  showPlane?: boolean;
  planeClassName?: string;
}) {
  return (
    <>
      <style>{`
        @keyframes setuIndiaPlaneFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(-0.45deg);
          }
          50% {
            transform: translate3d(-8px, -6px, 0) rotate(0.55deg);
          }
        }

        @keyframes setuIndiaRailScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .setu-india-plane-float,
          .setu-india-auto-rail {
            animation: none !important;
          }
        }
      `}</style>
      <img
        src={setuIndiaHero}
        alt=""
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-right ${imageClassName}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/44 to-white/0" />
      {showPlane ? (
        <img
          src={setuIndiaPlane}
          alt=""
          className={`setu-india-plane-float pointer-events-none absolute bottom-[-36px] right-[-18%] w-[72%] max-w-[440px] object-contain opacity-[0.95] drop-shadow-[0_14px_24px_rgba(180,70,36,0.14)] sm:bottom-[-44px] sm:right-[-2%] sm:w-[54%] ${planeClassName}`}
          style={{ animation: 'setuIndiaPlaneFloat 10.8s ease-in-out infinite' }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
    </>
  );
}

function getQuickActionIcon(label: string) {
  if (label === 'Find Events') return setuIndiaShortcutIcons.events;
  if (label === 'Settle Checklist') return setuIndiaShortcutIcons.arrival;
  if (label === 'Play Games') return setuIndiaShortcutIcons.games;
  if (label === 'Safety Alerts') return setuIndiaShortcutIcons.alerts;
  if (label === 'Compare Suburbs') return setuIndiaShortcutIcons.suburbs;
  return null;
}

export function SetuIndiaHomePage() {
  const { city } = useSetuIndiaCity();
  const firstName = (typeof window === 'undefined' ? '' : localStorage.getItem('ghar_first_name') || '').trim() || 'there';
  const [events, setEvents] = useState<OfficialEvent[]>([]);
  const [guides, setGuides] = useState<CityGuide[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [guidesFailed, setGuidesFailed] = useState(false);
  const suburbPreviews = useMemo(
    () => {
      const cityMatches = [...suburbDemographics]
        .map((record) => ({ record, indianStudents: getIndianStudentCount(record) }))
        .filter((item) => item.indianStudents > 0 && item.record.state === city.state)
        .sort((left, right) => right.indianStudents - left.indianStudents)
        .slice(0, 3);
      if (cityMatches.length > 0) return cityMatches;
      return [...suburbDemographics]
        .map((record) => ({ record, indianStudents: getIndianStudentCount(record) }))
        .filter((item) => item.indianStudents > 0)
        .sort((left, right) => right.indianStudents - left.indianStudents)
        .slice(0, 3);
    },
    [city.state],
  );
  const latestAlerts = setuIndiaAlerts.slice(0, 2);
  const eventRailItems = events.length > 1 ? [...events, ...events] : events;
  const guideRailItems = guides.length > 1 ? [...guides, ...guides] : guides;

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsFailed(false);
    void fetchOfficialEvents({ ...getHomeEventRange(), ...city.bounds, limit: 10, appVariant: 'ghar' })
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(data.slice(0, 10));
      })
      .catch((error) => {
        console.error('Indian Student Hub AU home events load failed:', error);
        if (cancelled) return;
        setEvents([]);
        setEventsFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city.bounds]);

  useEffect(() => {
    let cancelled = false;
    setGuidesLoading(true);
    setGuidesFailed(false);
    void fetchCityGuides({ city: city.slug, appVariant: 'ghar' })
      .then((data) => {
        if (cancelled) return;
        setGuides(data.slice(0, 5));
      })
      .catch((error) => {
        console.error('Indian Student Hub AU home guides load failed:', error);
        if (cancelled) return;
        setGuides([]);
        setGuidesFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setGuidesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city.slug]);

  return (
    <div className="size-full overflow-y-auto bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex w-full max-w-none flex-col gap-6 pb-[calc(var(--native-safe-area-bottom)+1rem)] pt-0">
        <section className="relative min-h-[250px] w-full overflow-hidden px-4 pb-10 pt-[calc(var(--native-safe-area-top)+1.25rem)] sm:min-h-[288px] sm:px-6 sm:pb-12 sm:pt-[calc(var(--native-safe-area-top)+1.5rem)]">
          <IndiaHeroBackdrop imageClassName="opacity-100" showPlane />
          <div className="relative z-10">
            <BrandHeader />
          </div>
          <div className="relative z-10 mt-7 max-w-[52%] sm:mt-9 sm:max-w-[44%]">
            <h1 className="text-[2.35rem] font-black leading-[1.04] text-[#080B12] sm:text-[2.65rem]">Hi {firstName}</h1>
            <p className="mt-2 max-w-[18rem] text-base font-medium leading-6 text-[#5B6472] sm:max-w-[22rem] sm:text-xl">Welcome to Australia. Gendu helps you settle, stay safe, and find student life around you.</p>
          </div>
        </section>

        <section className="grid grid-cols-5 gap-2 px-4 sm:gap-3 sm:px-6">
          {setuIndiaQuickActions.map(({ label, zh, route, badge }) => {
            const actionIcon = getQuickActionIcon(label);
            return (
            <Link key={label} to={route} className="group min-w-0 text-center">
              <span className="relative mx-auto flex h-[64px] w-full max-w-[76px] items-center justify-center sm:h-[82px] sm:max-w-[86px]">
                {actionIcon ? (
                  <img src={actionIcon} alt="" aria-hidden="true" className="h-16 w-16 object-contain sm:h-20 sm:w-20" loading="lazy" />
                ) : null}
                {badge ? (
                  <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F04444] px-1 text-[11px] font-bold text-white sm:right-2 sm:h-6 sm:min-w-6 sm:text-xs">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="mt-2 block min-h-[30px] text-[12px] font-semibold leading-[1.15] text-[#111827] [overflow-wrap:anywhere] sm:text-sm">{label}</span>
              <span className="mt-0.5 block text-[12px] leading-tight text-[#5B6472] [overflow-wrap:anywhere] sm:text-sm">{zh}</span>
            </Link>
          );
          })}
        </section>

        <Link
          to="/dashboard?view=map"
          className="mx-4 flex min-w-0 items-center justify-between gap-4 rounded-[20px] border border-[#F3D6D2] bg-[#FFF7F5] p-4 shadow-[0_12px_28px_rgba(240,68,68,0.07)] sm:mx-6"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0">
              <img src={setuIndiaShortcutIcons.map} alt="" aria-hidden="true" className="h-14 w-14 object-contain sm:h-16 sm:w-16" loading="lazy" />
            </span>
            <span className="min-w-0">
              <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">Explore Map</span>
              <span className="mt-1 block break-words text-sm font-semibold leading-tight text-[#64748B] [overflow-wrap:anywhere]">Check transport, rentals, campus distance, and useful places nearby</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#F04444]" />
        </Link>

        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">This Week <span className="ml-2 text-base font-semibold text-[#6B7280]">Student events</span></h2>
            <Link to="/vibe?section=events" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#F04444]">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-hidden pb-1">
            {eventsLoading ? (
              <div className="flex gap-3">
                {[0, 1, 2].map((item) => (
                <article key={item} className="w-[154px] shrink-0 rounded-[16px] border border-[#ECEFF3] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:w-[172px]">
                  <div className="h-[92px] animate-pulse rounded-[14px] bg-[#F8FAFC]" />
                  <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-[#E5E7EB]" />
                </article>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div
                className={`setu-india-auto-rail flex w-max gap-3 pr-3 ${events.length > 1 ? '' : 'animate-none'}`}
                style={events.length > 1 ? { animation: 'setuIndiaRailScroll 42s linear infinite' } : undefined}
              >
                {eventRailItems.map((event, index) => {
                  const eventImage = event.image_url || event.hero_image_url;
                  return (
                    <Link
                      key={`${event.id}-${index}`}
                      to={`/events/${event.source}/${event.slug}`}
                      className="flex w-[154px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-[#FD5546] shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:w-[172px]"
                    >
                      <div className="relative h-[92px] bg-[#FFF1EE] sm:h-[100px]">
                        {eventImage ? (
                          <img src={eventImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full place-items-center text-[#F04444]">
                            <CalendarDays className="h-10 w-10" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 items-center bg-[#FD5546] p-3">
                        <h3 className="line-clamp-2 break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-[0.95rem]">{event.title}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="min-w-full rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#64748B] [overflow-wrap:anywhere]">
                {eventsFailed ? 'Events could not load right now. Please try again shortly.' : `No live events near ${city.label} match this filter yet. New student events will appear here.`}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">Guides <span className="ml-2 text-base font-semibold text-[#6B7280]">Local life</span></h2>
            <Link to={`/vibe?section=vibe&vibe_tab=my-hood&city=${encodeURIComponent(city.slug)}`} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#F04444]">View all <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="overflow-hidden pb-1">
            {guidesLoading ? (
              <div className="flex gap-3">
                {[0, 1, 2].map((item) => (
                  <article key={item} className="w-[150px] shrink-0 rounded-[16px] border border-[#ECEFF3] bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.04)] sm:w-[166px]">
                    <div className="h-[82px] animate-pulse rounded-[14px] bg-[#F8FAFC]" />
                    <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-[#E5E7EB]" />
                  </article>
                ))}
              </div>
            ) : guides.length > 0 ? (
              <div
                className={`setu-india-auto-rail flex w-max gap-3 pr-3 ${guides.length > 1 ? '' : 'animate-none'}`}
                style={guides.length > 1 ? { animation: 'setuIndiaRailScroll 38s linear infinite' } : undefined}
              >
                {guideRailItems.map((guide, index) => (
                  <Link key={`${guide.id}-${index}`} to={getCityGuideRoute(guide)} className="flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-[#FD5546] shadow-[0_10px_22px_rgba(15,23,42,0.08)] sm:w-[166px]">
                    {guide.cover_image_url ? (
                      <img src={guide.cover_image_url} alt="" className="h-[82px] w-full object-cover sm:h-[90px]" loading="lazy" />
                    ) : (
                      <div className="grid h-[82px] place-items-center bg-[#FFF1EE] text-[#F04444] sm:h-[90px]">
                        <BookOpen className="h-9 w-9" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-1 items-center bg-[#FD5546] p-3">
                      <p className="line-clamp-2 break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-[0.95rem]">{guide.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="min-w-full rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#64748B] [overflow-wrap:anywhere]">
                {guidesFailed ? 'Guides could not load right now.' : `No live ${city.label} guides yet. New local guides will appear here.`}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 px-4 sm:px-6 md:grid-cols-2">
          <div className="space-y-3 rounded-[20px] border border-[#ECEFF3] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-black leading-tight text-[#080B12]">Alerts <span className="text-sm text-[#64748B]">Safety updates</span></h2>
              <Link to="/vibe?section=alerts" className="shrink-0 text-sm font-bold text-[#F04444]">View</Link>
            </div>
            {latestAlerts.map((alert) => (
                <article key={alert.title} className="rounded-[16px] border border-[#F5D1CB] bg-[#FFF7F5] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F04444]">{alert.level}</p>
                  <p className="mt-1 line-clamp-2 break-words text-sm font-black text-[#111827] [overflow-wrap:anywhere]">{alert.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{alert.body}</p>
                </article>
              ))}
          </div>

          <div className="space-y-3 rounded-[20px] border border-[#ECEFF3] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-black leading-tight text-[#080B12]">Student suburbs <span className="text-sm text-[#64748B]">Indian student areas</span></h2>
              <Link to="/vibe?section=vibe&vibe_tab=suburb-score" className="shrink-0 text-sm font-bold text-[#F04444]">View</Link>
            </div>
            {suburbPreviews.map(({ record, indianStudents }) => (
              <Link
                key={`${record.suburb}-${record.state}`}
                to={`/vibe?section=vibe&vibe_tab=suburb-score&suburb=${encodeURIComponent(slugifyHoodieShareText(record.suburb))}`}
                className="flex items-center justify-between gap-3 rounded-[16px] border border-[#F1F5F9] bg-[#F8FAFC] p-3"
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black text-[#111827] [overflow-wrap:anywhere]">{record.suburb}</span>
                  <span className="block break-words text-xs font-medium text-[#64748B] [overflow-wrap:anywhere]">{record.state} · {indianStudents.toLocaleString()} Indian students</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#F04444]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function SetuIndiaEventsPage({
  eventTab,
  onEventTabChange,
  councilParam,
  networkingView,
  officialEventsSourceMode,
  officialEventWhen,
  officialEventTypes,
  officialEventCategories,
  selectedUniversityId,
  plansView,
  onCouncilChange,
  onStateChange,
}: {
  eventTab: EventsTab;
  onEventTabChange: (tab: EventsTab) => void;
  councilParam: string;
  networkingView: NetworkingView;
  officialEventsSourceMode: OfficialEventsSourceMode;
  officialEventWhen: EventDateRangeState;
  officialEventTypes: string[];
  officialEventCategories: string[];
  selectedUniversityId: string;
  plansView: PlansView;
  onCouncilChange: (councilSlug: string) => void;
  onStateChange: (updates: VibeEventsHubStateUpdate) => void;
}) {
  return (
    <div className="size-full overflow-hidden bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full px-4 pb-4 pt-4 sm:px-6">
        <BrandHeader title="Events" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <VibeEventsHub
          eventTab={eventTab}
          councilParam={councilParam}
          networkingView={networkingView}
          officialEventsSourceMode={officialEventsSourceMode}
          officialEventWhen={officialEventWhen}
          officialEventTypes={officialEventTypes}
          officialEventCategories={officialEventCategories}
          selectedUniversityId={selectedUniversityId}
          plansView={plansView}
          onEventTabChange={onEventTabChange}
          onCouncilChange={onCouncilChange}
          onStateChange={onStateChange}
        />
      </div>
    </div>
  );
}

export function SetuIndiaChecklistPage({ embedded = false }: { embedded?: boolean } = {}) {
  const storageKey = 'setu_india_arrival_checklist_v1';
  const allItems = setuIndiaChecklistSections.flatMap((section) => section.items);
  const defaultCompleted = allItems.filter((item) => item.defaultCompleted).map((item) => item.id);
  const [activeGuide, setActiveGuide] = useState<SetuIndiaChecklistItem | null>(null);
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return Array.isArray(saved) ? saved : defaultCompleted;
    } catch {
      return defaultCompleted;
    }
  });
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completed));
  }, [completed]);
  const percentage = Math.round((completed.length / allItems.length) * 100);
  const toggle = (id: string) => {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const guideDrawer = activeGuide ? (
    <div className="fixed inset-0 z-[5000] flex items-end justify-center bg-[#0F172A]/35 px-3 pb-[calc(var(--app-bottom-nav-clearance)+0.75rem)] pt-[calc(var(--native-safe-area-top)+1rem)]">
      <button
        type="button"
        aria-label="Close checklist guide"
        className="absolute inset-0 cursor-default"
        onClick={() => setActiveGuide(null)}
      />
      <section className="relative z-10 max-h-[calc(100dvh_-_var(--app-bottom-nav-clearance)_-_var(--native-safe-area-top)_-_2rem)] w-full max-w-[720px] overflow-y-auto rounded-[26px] border border-[#ECEFF3] bg-white p-5 shadow-[0_-18px_44px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F04444]">Guide</p>
            <h2 className="mt-2 break-words text-xl font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">{activeGuide.title}</h2>
            <p className="mt-1 break-words text-base font-semibold leading-6 text-[#64748B] [overflow-wrap:anywhere]">{activeGuide.zh}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveGuide(null)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-[#64748B]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-5 break-words rounded-[18px] bg-[#FFF7F5] p-4 text-sm leading-6 text-[#4B5563] [overflow-wrap:anywhere]">{activeGuide.guide.summary}</p>
        <div className="mt-5 space-y-3">
          {activeGuide.guide.steps.map((step, index) => (
            <div key={step} className="flex items-start gap-3 rounded-[16px] border border-[#F1F5F9] bg-white p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F04444] text-xs font-black text-white">{index + 1}</span>
              <p className="min-w-0 break-words text-sm font-semibold leading-6 text-[#111827] [overflow-wrap:anywhere]">{step}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 break-words text-xs leading-5 text-[#64748B] [overflow-wrap:anywhere]">{activeGuide.guide.sourceLabel}</p>
        {activeGuide.guide.route ? (
          <Link
            to={activeGuide.guide.route}
            onClick={() => setActiveGuide(null)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#F04444] px-4 py-3 text-sm font-black text-white"
          >
            {activeGuide.guide.routeLabel || 'Open'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </section>
    </div>
  ) : null;

  return (
    <div className={embedded ? 'w-full bg-white' : 'size-full overflow-y-auto bg-white'} style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className={embedded ? 'flex w-full max-w-none flex-col gap-5 px-4 pb-4 pt-4 sm:px-6' : 'flex w-full max-w-none flex-col gap-5 px-4 pb-[calc(var(--app-bottom-nav-clearance)+1rem)] pt-5 native-safe-area-top sm:px-6 sm:pt-6'}>
        {!embedded ? (
          <>
            <BrandHeader title="Tasks" />

            <section className="rounded-[22px] border border-[#ECEFF3] bg-[#F8FAFC] p-1 shadow-sm">
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  className="min-h-[52px] rounded-[18px] bg-white px-2 py-2 text-center text-sm font-black leading-tight text-[#F04444] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                  aria-current="page"
                >
                  Settle Checklist
                  <span className="mt-0.5 block text-xs font-bold text-[#F04444]">First steps</span>
                </button>
                <Link
                  to="/vibe?section=vibe&vibe_tab=my-hood"
                  className="flex min-h-[52px] flex-col items-center justify-center rounded-[18px] px-2 py-2 text-center text-sm font-bold leading-tight text-[#64748B]"
                >
                  Guides
                  <span className="mt-0.5 text-xs font-semibold">Local life</span>
                </Link>
                <Link
                  to="/vibe?section=alerts"
                  className="flex min-h-[52px] flex-col items-center justify-center rounded-[18px] px-2 py-2 text-center text-sm font-bold leading-tight text-[#64748B]"
                >
                  Alerts
                  <span className="mt-0.5 text-xs font-semibold">Safety</span>
                </Link>
              </div>
            </section>
          </>
        ) : null}

        <div>
          <h1 className="break-words text-3xl font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-4xl">Settle Checklist</h1>
          <p className="mt-1 text-lg font-semibold leading-6 text-[#111827] sm:text-xl">Settle in, step by step</p>
        </div>

        <section className="relative overflow-hidden rounded-[18px] border border-[#F2D4D0] bg-white p-5 shadow-sm">
          <IndiaHeroBackdrop imageClassName="opacity-40 sm:opacity-55" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[9px] border-[#F04444] text-2xl font-black text-[#080B12] sm:h-28 sm:w-28 sm:border-[10px] sm:text-3xl">
              {completed.length}/{allItems.length}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-xl font-black leading-tight text-[#111827] [overflow-wrap:anywhere] sm:text-2xl">{completed.length} of {allItems.length} completed</h2>
              <p className="mt-1 text-base font-medium text-[#5B6472]">{completed.length} done out of {allItems.length}</p>
              <div className="mt-4 h-2.5 w-full max-w-64 overflow-hidden rounded-full bg-[#FFE2DC]">
                <div className="h-full rounded-full bg-[#F04444]" style={{ width: `${percentage}%` }} />
              </div>
              <p className="mt-3 text-sm font-medium text-[#64748B]">You&apos;re doing great. Keep going.</p>
            </div>
          </div>
        </section>

        {setuIndiaChecklistSections.map((section) => {
          const sectionCompleted = section.items.filter((item) => completed.includes(item.id)).length;
          return (
            <section key={section.id} className="overflow-hidden rounded-[18px] border border-[#ECEFF3] bg-white shadow-sm">
              <header className="flex flex-col gap-3 border-b border-[#ECEFF3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex min-w-0 items-start gap-2 text-lg font-black leading-tight text-[#111827] sm:text-xl">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#F04444]" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{section.title} <span className="text-base font-semibold text-[#6B7280]">{section.zh}</span></span>
                </h2>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold sm:text-sm ${sectionCompleted === section.items.length ? 'bg-[#E7F8EF] text-[#10A15C]' : 'bg-[#FFF1EE] text-[#F04444]'}`}>
                  {sectionCompleted}/{section.items.length} Completed
                </span>
              </header>
              <div>
                {section.items.map((item) => {
                  const { id, title, zh, icon: Icon } = item;
                  const done = completed.includes(id);
                  return (
                    <div key={id} className="flex w-full items-center gap-3 border-b border-[#F1F5F9] px-3 py-4 text-left last:border-b-0 sm:gap-4 sm:px-4">
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${done ? 'border-[#14B56A] bg-[#14B56A] text-white' : 'border-[#D1D5DB] bg-white text-transparent'}`}
                        aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${title}`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveGuide(item)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
                      >
                        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF1EE] text-[#F04444] min-[380px]:flex">
                          <Icon className="h-6 w-6" strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-base font-bold leading-snug text-[#111827] [overflow-wrap:anywhere]">{title}</span>
                          <span className="mt-0.5 block break-words text-sm font-medium leading-snug text-[#6B7280] [overflow-wrap:anywhere]">{zh}</span>
                        </span>
                        <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold min-[430px]:inline-flex ${done ? 'bg-[#E7F8EF] text-[#10A15C]' : 'bg-[#F7F7FA] text-[#6B7280]'}`}>
                          {done ? 'Completed' : 'To do'}
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {section.id === 'first-2-weeks' ? (
                <div className="m-3 flex flex-col gap-4 rounded-[16px] bg-[#FFF1EE] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Shield className="mt-1 h-9 w-9 shrink-0 text-[#F04444]" />
                    <div className="min-w-0">
                      <h3 className="break-words font-black text-[#111827] [overflow-wrap:anywhere]">Protect yourself from scams & unsafe rentals</h3>
                      <p className="mt-1 break-words text-sm leading-6 text-[#64748B] [overflow-wrap:anywhere]">Learn common warning signs, protect your bond, and keep official help channels close.</p>
                    </div>
                  </div>
                  <Link to="/vibe?section=alerts" className="inline-flex w-full shrink-0 justify-center rounded-[12px] border border-[#F04444] px-4 py-2 text-sm font-bold text-[#F04444] sm:w-auto">Learn more</Link>
                </div>
              ) : null}
            </section>
          );
        })}

        <p className="flex items-start gap-2 text-sm leading-6 text-[#64748B]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F04444]" />Tip: Tap any item to view helpful guides and resources.</p>
      </div>
      {guideDrawer ? (typeof document === 'undefined' ? guideDrawer : createPortal(guideDrawer, document.body)) : null}
    </div>
  );
}

export function SetuIndiaAlertsPage() {
  const { bulletins, banners } = useGharData();

  return (
    <div className="flex size-full min-h-0 flex-col bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full px-4 pb-4 pt-4 sm:px-6">
        <BrandHeader title="Alerts" />
      </div>
      <div className="min-h-0 flex-1">
        <Noticeboard embedded bulletins={bulletins} banners={banners} />
      </div>
    </div>
  );
}

function SetuIndiaLocalPage({
  vibeTab,
  onVibeTabChange,
  cityParam,
  guideParam,
  suburbParam,
  guidesView,
  onCityChange,
  onGuideChange,
  onGuidesViewChange,
  onSuburbChange,
}: {
  vibeTab: VibeNestedTab;
  onVibeTabChange: (tab: VibeNestedTab) => void;
  cityParam: string;
  guideParam: string;
  suburbParam: string;
  guidesView: GuideFeedView;
  onCityChange: (citySlug: string) => void;
  onGuideChange: (guideSlug: string | null) => void;
  onGuidesViewChange: (view: GuideFeedView) => void;
  onSuburbChange: (suburbSlug: string | null) => void;
}) {
  return (
    <div className="size-full min-h-0 overflow-hidden bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full pb-4 pt-4">
        <section className="relative overflow-hidden px-4 pb-6 pt-1 sm:px-6 sm:pb-8">
          <IndiaHeroBackdrop imageClassName="opacity-45 sm:opacity-60" />
          <div className="relative z-10">
            <BrandHeader />
          </div>
          <div className="relative z-10 mt-7 max-w-[calc(100%-4.75rem)] sm:mt-8 sm:max-w-[58%]">
            <h1 className="break-words text-[2.05rem] font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-[2.65rem]">Places & Safety</h1>
            <p className="break-words text-xl font-semibold leading-7 text-[#5B6472] [overflow-wrap:anywhere] sm:text-2xl">Local guides for student life</p>
            <p className="mt-3 break-words text-base leading-7 text-[#6B7280] [overflow-wrap:anywhere]">Compare suburbs before you choose where to live, study, and commute.</p>
          </div>
        </section>
        <div className="mx-4 mt-5 grid grid-cols-2 gap-2 rounded-[18px] border border-[#ECEFF3] bg-[#F8FAFC] p-1 shadow-sm sm:mx-6">
          {[
            { id: 'suburb-score' as const, label: 'Places' },
            { id: 'my-hood' as const, label: 'Guides' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onVibeTabChange(tab.id)}
              className={`min-h-[48px] rounded-[14px] px-2 py-2 text-sm font-bold leading-tight transition sm:px-4 sm:py-3 ${
                vibeTab === tab.id
                  ? 'bg-white text-[#F04444] shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="setu-india-vibe-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--app-bottom-nav-clearance)+2.5rem)]"
        style={{ WebkitOverflowScrolling: 'touch', scrollPaddingBottom: 'calc(var(--app-bottom-nav-clearance) + 2.5rem)' }}
      >
        {vibeTab === 'my-hood' ? (
          <CityGuidesHub
            cityParam={cityParam}
            guideParam={guideParam}
            guidesView={guidesView}
            onCityChange={onCityChange}
            onGuideChange={onGuideChange}
            onGuidesViewChange={onGuidesViewChange}
            embedded
          />
        ) : (
          <VibeSuburbScoreTab
            selectedSuburbParam={suburbParam}
            onSuburbChange={onSuburbChange}
            embedded
          />
        )}
      </div>
    </div>
  );
}

export function SetuIndiaVibePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { city, setCity } = useSetuIndiaCity();
  const section = searchParams.get('section') || 'vibe';
  const rawEventTab = searchParams.get('events_tab');
  const eventTab: EventsTab =
    rawEventTab === 'networking' || rawEventTab === 'plans' ? rawEventTab : 'whatson';
  const rawVibeTab = searchParams.get('vibe_tab');
  const vibeTab: VibeNestedTab = rawVibeTab === 'my-hood' ? 'my-hood' : 'suburb-score';
  const rawGuidesView = searchParams.get('guides_view');
  const guidesView: GuideFeedView = rawGuidesView === 'list' ? 'list' : 'carousel';
  const cityParam = searchParams.get('city') || (section === 'vibe' && vibeTab === 'my-hood' ? city.slug : '');
  const guideParam = searchParams.get('guide') || '';
  const suburbParam = searchParams.get('suburb') || '';
  const rawCouncilParam = searchParams.get('council') || '';
  const councilParam = rawCouncilParam === 'city-of-sydney' ? '' : rawCouncilParam;
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

  const setSection = (next: 'vibe' | 'events' | 'alerts') => {
    const params = new URLSearchParams(searchParams);
    params.set('section', next);
    if (next === 'events' && !params.get('events_tab')) params.set('events_tab', 'whatson');
    if (next !== 'events') params.delete('events_tab');
    if (next === 'vibe' && !params.get('vibe_tab')) params.set('vibe_tab', 'suburb-score');
    setSearchParams(params, { replace: true });
  };

  const updateSearchParams = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
  };

  const handleEventHubStateChange = (updates: VibeEventsHubStateUpdate) => {
    const params = new URLSearchParams(searchParams);
    params.set('section', 'events');
    if (updates.networkingView !== undefined) {
      if (updates.networkingView === 'cards') params.set('networking_view', 'cards');
      else params.delete('networking_view');
    }
    if (updates.officialEventsSourceMode !== undefined) {
      if (updates.officialEventsSourceMode === 'university') params.set('events_source_mode', 'university');
      else params.delete('events_source_mode');
    }
    if (updates.officialEventWhen !== undefined) {
      const { startDay, endDay } = updates.officialEventWhen;
      if (startDay) params.set('events_start_day', startDay);
      else params.delete('events_start_day');
      if (endDay) params.set('events_end_day', endDay);
      else params.delete('events_end_day');
    }
    if (updates.officialEventTypes !== undefined) {
      if (updates.officialEventTypes.length) params.set('events_types', updates.officialEventTypes.join(','));
      else params.delete('events_types');
    }
    if (updates.officialEventCategories !== undefined) {
      if (updates.officialEventCategories.length) params.set('events_tags', updates.officialEventCategories.join(','));
      else params.delete('events_tags');
    }
    if (updates.selectedUniversityId !== undefined) {
      if (updates.selectedUniversityId) params.set('university_id', updates.selectedUniversityId);
      else params.delete('university_id');
    }
    if (updates.plansView !== undefined) {
      if (updates.plansView === 'public') params.delete('plans_view');
      else params.set('plans_view', updates.plansView);
    }
    setSearchParams(params, { replace: true });
  };

  const content = useMemo(() => {
    if (section === 'events') {
      return (
        <SetuIndiaEventsPage
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
      );
    }
    if (section === 'alerts') return <SetuIndiaAlertsPage />;
    return (
      <SetuIndiaLocalPage
        vibeTab={vibeTab}
        cityParam={cityParam}
        guideParam={guideParam}
        suburbParam={suburbParam}
        guidesView={guidesView}
        onVibeTabChange={(nextTab) => {
          updateSearchParams({
            section: 'vibe',
            vibe_tab: nextTab,
            guide: nextTab === 'my-hood' ? guideParam : null,
            city: nextTab === 'my-hood' ? (cityParam || city.slug) : null,
            guides_view: nextTab === 'my-hood' ? guidesView : null,
            suburb: nextTab === 'suburb-score' ? suburbParam : null,
          });
        }}
        onCityChange={(nextCity) => {
          const selected = SETU_INDIA_CITIES.find((option) => option.slug === nextCity);
          if (selected) setCity(selected.slug);
          updateSearchParams({
            section: 'vibe',
            vibe_tab: 'my-hood',
            city: nextCity,
            guide: null,
            guides_view: guidesView,
            suburb: null,
          });
        }}
        onGuideChange={(nextGuide) => {
          updateSearchParams({
            section: 'vibe',
            vibe_tab: 'my-hood',
            city: cityParam,
            guide: nextGuide,
            guides_view: guidesView,
            suburb: null,
          });
        }}
        onGuidesViewChange={(nextView) => {
          updateSearchParams({
            section: 'vibe',
            vibe_tab: 'my-hood',
            city: cityParam,
            guide: guideParam,
            guides_view: nextView,
            suburb: null,
          });
        }}
        onSuburbChange={(nextSuburb) => {
          updateSearchParams({
            section: 'vibe',
            vibe_tab: 'suburb-score',
            suburb: nextSuburb,
            city: null,
            guide: null,
            guides_view: null,
          });
        }}
      />
    );
  }, [
    city.slug,
    cityParam,
    councilParam,
    eventTab,
    guideParam,
    guidesView,
    networkingViewParam,
    officialEventCategoriesParam,
    officialEventTypesParam,
    officialEventWhenParam,
    officialEventsSourceModeParam,
    plansViewParam,
    searchParams,
    section,
    selectedUniversityIdParam,
    suburbParam,
    vibeTab,
  ]);

  return (
    <div className="flex size-full min-w-0 flex-col bg-white">
      <div className="shrink-0 bg-white px-4 pb-2 pt-[calc(var(--native-safe-area-top)+0.75rem)] sm:px-6">
        <div className="grid w-full grid-cols-3 gap-1 rounded-[18px] border border-[#ECEFF3] bg-white p-1 shadow-sm sm:gap-2">
        {[
          ['vibe', 'Places'],
          ['events', 'Events'],
          ['alerts', 'Alerts'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id as 'vibe' | 'events' | 'alerts')}
            className={`min-h-[44px] rounded-[14px] px-1.5 py-2 text-sm font-bold leading-tight ${section === id ? 'bg-[#FFF1EE] text-[#F04444]' : 'text-[#64748B]'}`}
          >
            {label}
          </button>
        ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-white">{content}</div>
    </div>
  );
}

export function SetuIndiaProfilePage({ onLogout }: { onLogout: () => void }) {
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState('');
  const firstName = localStorage.getItem('ghar_first_name') || 'Lin';
  const lastName = localStorage.getItem('ghar_last_name') || '';
  const storedEmail = localStorage.getItem('ghar_email') || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Lin';

  const handleDeleteAccount = async () => {
    if (!storedEmail) {
      setAccountDeleteError('Please sign in before deleting your account. Contact support if you need help.');
      return;
    }

    const confirmed = window.confirm(
      'Delete your SETU India AU account and all linked data? This removes your profile, reminders, plans, checklist progress, and uploads. This cannot be undone in the app.',
    );
    if (!confirmed) return;

    setDeletingAccount(true);
    setAccountDeleteError('');
    try {
      const deleteResult = await deleteProfile(storedEmail);
      const successMessage = deleteResult?.demo_reset
        ? 'Demo account deleted. You can sign in again to keep testing.'
        : 'Your SETU India AU account has been deleted.';
      sessionStorage.setItem('ghar_post_logout_message', successMessage);
      onLogout();
    } catch (err) {
      console.error('Indian Student Hub AU delete account error:', err);
      setAccountDeleteError(`Account deletion failed. Contact ${APP_CONFIG.supportEmail} for help.`);
    } finally {
      setDeletingAccount(false);
    }
  };

  const quickLinks = [
    {
      title: 'Explore Map',
      zh: 'Places nearby',
      route: '/dashboard?view=map',
      image: setuIndiaShortcutIcons.map,
    },
    { title: 'Ask Gendu', zh: 'Chat', route: '/arrival', image: setuIndiaShortcutIcons.chat },
    { title: 'Settle Checklist', zh: 'First steps', route: SETU_INDIA_RESOURCES_DEFAULT_ROUTE, image: setuIndiaShortcutIcons.resources },
    { title: 'Safety Alerts', zh: 'Updates', route: '/vibe?section=alerts', image: setuIndiaShortcutIcons.alerts },
  ];

  return (
    <div className="size-full overflow-y-auto bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex w-full max-w-none flex-col gap-5 px-4 pb-[calc(var(--native-safe-area-bottom)+1rem)] pt-5 native-safe-area-top sm:px-6 sm:pt-6">
        <BrandHeader title="Profile" />

        <section className="relative overflow-hidden rounded-[22px] border border-[#F5D1CB] bg-[#FFF7F5] p-5 shadow-[0_14px_30px_rgba(240,68,68,0.07)]">
          <IndiaHeroBackdrop imageClassName="opacity-35 sm:opacity-50" />
          <div className="relative z-10 flex items-start gap-4">
            <img
              src={setuIndiaShortcutIcons.vibe}
              alt=""
              aria-hidden="true"
              className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
              loading="lazy"
            />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-3xl">👋 {displayName}</h1>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="break-words text-xl font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">Quick Access</h2>
          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            {quickLinks.map(({ title, zh, route, image }) => (
              <Link key={title} to={route} className="flex min-w-0 items-center gap-4 rounded-[18px] border border-[#ECEFF3] bg-white p-4 shadow-sm">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[#FFF1EE]">
                  <img src={image} alt="" aria-hidden="true" className="h-12 w-12 object-contain" loading="lazy" />
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">{title}</span>
                  <span className="mt-1 block break-words text-sm font-semibold leading-tight text-[#64748B] [overflow-wrap:anywhere]">{zh}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
          <h2 className="flex items-start gap-2 break-words text-lg font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#F04444]" />
            <span>Trusted Support</span>
          </h2>
          <div className="mt-3 space-y-2 break-words text-sm leading-6 text-[#4B5563] [overflow-wrap:anywhere]">
            <p>Scamwatch, Fair Work, ATO, Home Affairs, state tenancy bodies, and university international student support are important official channels.</p>
            <p>For health questions, contact a GP, your OSHC provider, or 1800MEDICARE. For emergencies, call 000.</p>
          </div>
        </section>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#F5D1CB] bg-white px-4 py-4 text-sm font-black leading-tight text-[#F04444]"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} />
          Sign Out
        </button>

        {accountDeleteError ? (
          <p className="rounded-[16px] border border-[#F5D1CB] bg-[#FFF7F5] px-4 py-3 text-center text-sm font-semibold leading-6 text-[#B91C1C]">
            {accountDeleteError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#F04444]/30 bg-[#FFF7F5] px-4 py-4 text-sm font-black leading-tight text-[#B91C1C] disabled:opacity-55"
        >
          <Trash2 className="h-5 w-5" strokeWidth={1.8} />
          {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
