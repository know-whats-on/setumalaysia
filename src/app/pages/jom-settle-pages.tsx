import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  LogOut,
  MapPin,
  Shield,
  Star,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import setuMalaysiaHomeBackground from '../../assets/setu-malaysia-home-background.png';
import setuMalaysiaHomePlane from '../../assets/setu-malaysia-home-plane.png';
import { CityGuidesHub } from '../components/city-guides-hub';
import { useGharData } from '../components/layout';
import { Noticeboard } from '../components/noticeboard';
import { VibeEventsHub, type EventDateRangeState, type EventsTab, type NetworkingView, type OfficialEventsSourceMode, type PlansView, type VibeEventsHubStateUpdate } from '../components/vibe-events-hub';
import { VibeSuburbScoreTab } from '../components/vibe-suburb-score-tab';
import { deleteProfile, fetchCityGuides, fetchOfficialEvents, type CityGuide, type OfficialEvent } from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { suburbDemographics } from '../lib/demographics-data';
import { slugifyHoodieShareText } from '../lib/hoodie-share';
import {
  jomSettleAlerts,
  jomSettleChecklistSections,
  jomSettleEventHighlights,
  jomSettleQuickActions,
} from '../lib/jom-settle-content';
import { setuMalaysiaShortcutIcons } from '../lib/setu-malaysia-icons';

type VibeSection = 'vibe' | 'events' | 'alerts';
type VibeNestedTab = 'my-hood' | 'suburb-score';
type GuideFeedView = 'carousel' | 'list';
type JomSettleHighlight = (typeof jomSettleEventHighlights)[number];
type JomHomeEvent = OfficialEvent | JomSettleHighlight;

const OFFICIAL_EVENTS_TIMEZONE = 'Australia/Sydney';
const JOM_SETTLE_CITY_STORAGE_KEY = 'jom_settle_city_slug';
const JOM_SETTLE_CHECKLIST_STORAGE_KEY = 'jom_settle_arrival_checklist_v1';

type JomSettleCity = {
  slug: 'sydney' | 'melbourne' | 'brisbane' | 'adelaide';
  label: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'SA';
  bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
};

const JOM_SETTLE_CITIES: JomSettleCity[] = [
  {
    slug: 'sydney',
    label: 'Sydney',
    state: 'NSW',
    bounds: { minLat: -34.15, minLng: 150.52, maxLat: -33.55, maxLng: 151.35 },
  },
  {
    slug: 'melbourne',
    label: 'Melbourne',
    state: 'VIC',
    bounds: { minLat: -38.15, minLng: 144.45, maxLat: -37.45, maxLng: 145.55 },
  },
  {
    slug: 'brisbane',
    label: 'Brisbane',
    state: 'QLD',
    bounds: { minLat: -27.8, minLng: 152.7, maxLat: -27.1, maxLng: 153.3 },
  },
  {
    slug: 'adelaide',
    label: 'Adelaide',
    state: 'SA',
    bounds: { minLat: -35.1, minLng: 138.42, maxLat: -34.75, maxLng: 138.78 },
  },
];

function resolveJomSettleCity(slug?: string | null) {
  return JOM_SETTLE_CITIES.find((city) => city.slug === slug) || JOM_SETTLE_CITIES[0];
}

function readJomSettleCity() {
  if (typeof window === 'undefined') return JOM_SETTLE_CITIES[0];
  return resolveJomSettleCity(window.localStorage.getItem(JOM_SETTLE_CITY_STORAGE_KEY));
}

function useJomSettleCity() {
  const [city, setCityState] = useState<JomSettleCity>(() => readJomSettleCity());

  useEffect(() => {
    const sync = () => setCityState(readJomSettleCity());
    window.addEventListener('storage', sync);
    window.addEventListener('jom-settle-city-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('jom-settle-city-change', sync);
    };
  }, []);

  const setCity = (slug: JomSettleCity['slug']) => {
    const next = resolveJomSettleCity(slug);
    setCityState(next);
    window.localStorage.setItem(JOM_SETTLE_CITY_STORAGE_KEY, next.slug);
    window.dispatchEvent(new Event('jom-settle-city-change'));
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

function getMalaysianStudentCount(record: (typeof suburbDemographics)[number]) {
  return record.demographics.find((item) => /^(malaysia|malaysian)$/i.test(item.name))?.students || 0;
}

function isOfficialJomEvent(event: JomHomeEvent): event is OfficialEvent {
  return 'source' in event && 'slug' in event;
}

function getJomEventLabel(event: JomHomeEvent) {
  if (!isOfficialJomEvent(event)) return event.tag;
  return event.dates_humanized || event.upcoming_time || event.source_label || 'Event';
}

function getJomEventLocation(event: JomHomeEvent, cityLabel: string) {
  if (!isOfficialJomEvent(event)) return `${event.time} · ${event.location}`;
  return event.venue_name || event.suburb || cityLabel;
}

function readChecklistCompletions() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(JOM_SETTLE_CHECKLIST_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeChecklistCompletions(completed: Set<string>) {
  window.localStorage.setItem(JOM_SETTLE_CHECKLIST_STORAGE_KEY, JSON.stringify([...completed]));
}

function JomSectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E53935]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black leading-tight text-[#0D1B2A]">{title}</h2>
      {body ? <p className="mt-1 text-sm leading-relaxed text-[#5B6472]">{body}</p> : null}
    </div>
  );
}

function JomChecklistPreview() {
  const allItems = jomSettleChecklistSections.flatMap((section) => section.items);
  const defaultCompleted = allItems.filter((item) => item.defaultCompleted).map((item) => item.id);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const saved = readChecklistCompletions();
    return saved.size ? saved : new Set(defaultCompleted);
  });

  const toggle = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    writeChecklistCompletions(next);
  };

  const progress = Math.round((completed.size / allItems.length) * 100);

  return (
    <section className="rounded-[26px] border border-[#F5D1CB] bg-white p-4 shadow-[0_16px_40px_rgba(13,27,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <JomSectionTitle eyebrow="Senarai arrival" title="Settle satu-satu" body="Tick off basics tanpa pening." />
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black text-[#E53935]">{completed.size}/{allItems.length}</div>
          <div className="text-[11px] font-bold text-[#64748B]">{progress}% siap</div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {allItems.slice(0, 6).map((item) => {
          const done = completed.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 rounded-[18px] border border-[#FEE2E2] bg-[#FFF9F4] px-3 py-3 text-left transition hover:border-[#FF6B6B]"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[#27C18C] text-white' : 'bg-white text-[#FF9F1C] ring-1 ring-[#FFD9A8]'}`}>
                {done ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-[#0D1B2A]">{item.title}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${done ? 'bg-[#DFF8EC] text-[#14885C]' : 'bg-[#FFE9D7] text-[#D65B11]'}`}>
                {done ? 'Siap' : 'To do'}
              </span>
            </button>
          );
        })}
      </div>
      <Link
        to="/legal?section=prepare&prepare_tab=checklist"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#E53935] px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_rgba(229,57,53,0.22)]"
      >
        Buka senarai penuh <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function JomSettleChecklistPage({ embedded = false }: { embedded?: boolean } = {}) {
  const allItems = jomSettleChecklistSections.flatMap((section) => section.items);
  const defaultCompleted = allItems.filter((item) => item.defaultCompleted).map((item) => item.id);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const saved = readChecklistCompletions();
    return saved.size ? saved : new Set(defaultCompleted);
  });
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const progress = Math.round((completed.size / allItems.length) * 100);
  const activeGuideItem = activeGuideId ? allItems.find((item) => item.id === activeGuideId) : null;

  const toggle = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    writeChecklistCompletions(next);
  };

  const content = (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
      <section className="rounded-[28px] border border-[#F5D1CB] bg-[#FFF7F5] p-5 shadow-[0_18px_42px_rgba(240,68,68,0.08)]">
        <div className="flex items-start gap-4">
          <img
            src={setuMalaysiaShortcutIcons.arrival}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F04444]">Senarai Resources</p>
            <h1 className="mt-1 break-words text-2xl font-black leading-tight text-[#080B12] [overflow-wrap:anywhere]">Settle Checklist</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
              Minggu pertama untuk pelajar Malaysia: SIM, bank, TFN, OSHC, transport, campus setup, rental safety, dan bukti penting.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-[22px] bg-white px-4 py-3 text-right shadow-sm sm:block">
            <div className="text-2xl font-black text-[#F04444]">{completed.size}/{allItems.length}</div>
            <div className="text-[11px] font-bold text-[#64748B]">{progress}% siap</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F8D7D2]">
            <div className="h-full rounded-full bg-[#F04444]" style={{ width: `${progress}%` }} />
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#F04444] shadow-sm sm:hidden">
            {completed.size}/{allItems.length}
          </span>
        </div>
      </section>

      {jomSettleChecklistSections.map((section) => (
        <section key={section.id} className="rounded-[24px] border border-[#ECEFF3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 break-words text-lg font-black leading-tight text-[#080B12] [overflow-wrap:anywhere]">{section.title}</h2>
            <span className="shrink-0 rounded-full bg-[#FFF7F5] px-3 py-1 text-[11px] font-black text-[#F04444]">
              {section.items.filter((item) => completed.has(item.id)).length}/{section.items.length}
            </span>
          </div>
          <div className="mt-4 divide-y divide-[#F1F5F9]">
            {section.items.map((item) => {
              const done = completed.has(item.id);
              const Icon = item.icon;
              return (
                <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-label={done ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border transition ${
                        done
                          ? 'border-[#F04444] bg-[#F04444] text-white shadow-[0_10px_20px_rgba(240,68,68,0.16)]'
                          : 'border-[#F5D1CB] bg-[#FFF7F5] text-[#F04444]'
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideId(item.id)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">{item.title}</span>
                        <span className="mt-1 block line-clamp-2 break-words text-sm font-semibold leading-5 text-[#64748B] [overflow-wrap:anywhere]">{item.guide.summary}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#F04444]" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {activeGuideItem ? (
        <div
          className="fixed inset-0 z-[5000] flex items-end justify-center bg-[#0F172A]/24 px-3 pb-[calc(var(--app-bottom-nav-clearance)+0.75rem)] pt-[calc(var(--native-safe-area-top)+1rem)]"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close guide"
            className="absolute inset-0 cursor-default"
            onClick={() => setActiveGuideId(null)}
          />
          <section className="relative z-10 mx-auto max-h-[calc(100dvh_-_var(--app-bottom-nav-clearance)_-_var(--native-safe-area-top)_-_2rem)] w-full max-w-xl overflow-y-auto rounded-t-[30px] border border-[#F5D1CB] bg-white p-5 shadow-[0_-22px_58px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F04444]">Guide</p>
                <h3 className="mt-1 break-words text-xl font-black leading-tight text-[#080B12] [overflow-wrap:anywhere]">{activeGuideItem.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{activeGuideItem.guide.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuideId(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E2E8F0] text-[#64748B]"
                aria-label="Close guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-5 space-y-3">
              {activeGuideItem.guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-[18px] bg-[#FFF7F5] p-3 text-sm font-semibold leading-6 text-[#475569]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F04444] text-xs font-black text-white">{index + 1}</span>
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-black text-[#64748B] ring-1 ring-[#E2E8F0]">
                {activeGuideItem.guide.sourceLabel}
              </span>
              {activeGuideItem.guide.route ? (
                <Link
                  to={activeGuideItem.guide.route}
                  onClick={() => setActiveGuideId(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#F04444] px-4 py-2 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(240,68,68,0.22)]"
                >
                  {activeGuideItem.guide.routeLabel || 'Buka'} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );

  if (embedded) return content;
  return <div className="size-full overflow-y-auto bg-white text-[#0D1B2A]">{content}</div>;
}

function MalaysiaHeroBackdrop() {
  return (
    <>
      <style>{`
        @keyframes setuMalaysiaPlaneFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(-0.4deg);
          }
          50% {
            transform: translate3d(-10px, -7px, 0) rotate(0.42deg);
          }
        }

        @keyframes setuMalaysiaRailScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .setu-malaysia-plane-float,
          .setu-malaysia-auto-rail {
            animation: none !important;
          }
        }
      `}</style>
      <img
        src={setuMalaysiaHomeBackground}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/96 via-white/66 to-white/8" />
      <img
        src={setuMalaysiaHomePlane}
        alt=""
        aria-hidden="true"
        className="setu-malaysia-plane-float pointer-events-none absolute bottom-[-34px] right-[-36%] w-[92%] max-w-[580px] object-contain opacity-[0.98] drop-shadow-[0_18px_28px_rgba(180,70,36,0.14)] sm:bottom-[-52px] sm:right-[-4%] sm:w-[58%]"
        style={{ animation: 'setuMalaysiaPlaneFloat 10.8s ease-in-out infinite' }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
    </>
  );
}

function getJomCityGuideRoute(guide: CityGuide) {
  const city = guide.city_slug || slugifyHoodieShareText(guide.city);
  return `/vibe?section=vibe&vibe_tab=my-hood&city=${encodeURIComponent(city)}&guide=${encodeURIComponent(guide.slug)}`;
}

export function JomSettleHomePage() {
  const { city } = useJomSettleCity();
  const firstName = (typeof window === 'undefined' ? '' : localStorage.getItem('ghar_first_name') || '').trim() || 'there';
  const [events, setEvents] = useState<OfficialEvent[]>([]);
  const [guides, setGuides] = useState<CityGuide[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [guidesFailed, setGuidesFailed] = useState(false);

  const suburbPreviews = useMemo(() => {
    const malaysiaMatches = [...suburbDemographics]
      .map((record) => ({ record, malaysianStudents: getMalaysianStudentCount(record) }))
      .filter((item) => item.malaysianStudents > 0 && item.record.state === city.state)
      .sort((left, right) => right.malaysianStudents - left.malaysianStudents)
      .slice(0, 3);
    if (malaysiaMatches.length > 0) return malaysiaMatches;
    return [...suburbDemographics]
      .map((record) => ({ record, malaysianStudents: getMalaysianStudentCount(record) }))
      .filter((item) => item.malaysianStudents > 0)
      .sort((left, right) => right.malaysianStudents - left.malaysianStudents)
      .slice(0, 3);
  }, [city.state]);
  const eventItems: JomHomeEvent[] = events.length > 0 ? events : jomSettleEventHighlights;
  const eventRailItems = eventItems.length > 1 ? [...eventItems, ...eventItems] : eventItems;
  const guideRailItems = guides.length > 1 ? [...guides, ...guides] : guides;

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsFailed(false);
    void fetchOfficialEvents({ ...getHomeEventRange(), ...city.bounds, limit: 10, appVariant: 'jom_settle' })
      .then((response) => {
        if (cancelled) return;
        const data = Array.isArray((response as any)?.data)
          ? (response as any).data
          : Array.isArray((response as any)?.events)
            ? (response as any).events
            : [];
        setEvents(data.slice(0, 10));
      })
      .catch((err) => {
        console.error('Senang AU home events load failed:', err);
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
    void fetchCityGuides({ city: city.slug, appVariant: 'all' })
      .then((data) => {
        if (!cancelled) setGuides(data.slice(0, 5));
      })
      .catch((err) => {
        console.error('Senang AU home guides load failed:', err);
        if (!cancelled) {
          setGuides([]);
          setGuidesFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setGuidesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city.slug]);

  return (
    <div className="size-full overflow-y-auto bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex w-full max-w-none flex-col gap-6 pb-[calc(var(--native-safe-area-bottom)+1rem)] pt-0">
        <section className="relative min-h-[250px] w-full overflow-hidden px-4 pb-10 pt-[calc(var(--native-safe-area-top)+1.25rem)] sm:min-h-[288px] sm:px-6 sm:pb-12 sm:pt-[calc(var(--native-safe-area-top)+1.5rem)]">
          <MalaysiaHeroBackdrop />
          <div className="relative z-10 mt-7 max-w-[52%] sm:mt-9 sm:max-w-[44%]">
            <h1 className="text-[2.35rem] font-black leading-[1.04] text-[#080B12] sm:text-[2.65rem]">Hi {firstName}</h1>
            <p className="mt-2 max-w-[18rem] text-base font-medium leading-6 text-[#5B6472] sm:max-w-[22rem] sm:text-xl">
              Selamat datang ke Australia. Senang AU bantu anda settle, stay safe, dan cari kehidupan student sekitar anda.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-5 gap-2 px-4 sm:gap-3 sm:px-6">
          {jomSettleQuickActions.map(({ label, ms, route, icon: Icon, image }) => (
            <Link key={label} to={route} className="group min-w-0 text-center">
              <span className="relative mx-auto flex h-[64px] w-full max-w-[76px] items-center justify-center sm:h-[82px] sm:max-w-[86px]">
                {image ? (
                  <img src={image} alt="" aria-hidden="true" className="h-16 w-16 object-contain sm:h-20 sm:w-20" loading="lazy" />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#FFF1EE] text-[#F04444]">
                    <Icon className="h-7 w-7" strokeWidth={1.8} />
                  </span>
                )}
              </span>
              <span className="mt-2 block min-h-[30px] text-[12px] font-semibold leading-[1.15] text-[#111827] [overflow-wrap:anywhere] sm:text-sm">{label}</span>
              <span className="mt-0.5 block text-[12px] leading-tight text-[#5B6472] [overflow-wrap:anywhere] sm:text-sm">{ms}</span>
            </Link>
          ))}
        </section>

        <Link
          to="/dashboard?view=map"
          className="mx-4 flex min-w-0 items-center justify-between gap-4 rounded-[20px] border border-[#F3D6D2] bg-[#FFF7F5] p-4 shadow-[0_12px_28px_rgba(240,68,68,0.07)] sm:mx-6"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0">
              <img src={setuMalaysiaShortcutIcons.map} alt="" aria-hidden="true" className="h-14 w-14 object-contain sm:h-16 sm:w-16" loading="lazy" />
            </span>
            <span className="min-w-0">
              <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">Open Map</span>
              <span className="mt-1 block break-words text-sm font-semibold leading-tight text-[#64748B] [overflow-wrap:anywhere]">Buka map · Semak transport, rental, campus distance, dan tempat penting</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#F04444]" />
        </Link>

        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">This Week <span className="ml-2 text-base font-semibold text-[#6B7280]">Minggu Ini</span></h2>
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
            ) : eventItems.length > 0 ? (
              <div
                className={`setu-malaysia-auto-rail flex w-max gap-3 pr-3 ${eventItems.length > 1 ? '' : 'animate-none'}`}
                style={eventItems.length > 1 ? { animation: 'setuMalaysiaRailScroll 42s linear infinite' } : undefined}
              >
                {eventRailItems.map((event, index) => {
                  const eventImage = isOfficialJomEvent(event) ? event.image_url || event.hero_image_url : '';
                  return (
                    <Link
                      key={`${isOfficialJomEvent(event) ? event.id : event.id}-${index}`}
                      to={isOfficialJomEvent(event) ? `/events/${event.source}/${event.slug}` : '/vibe?section=events'}
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
                {eventsFailed ? 'Events belum dapat dimuatkan. Cuba lagi sebentar nanti.' : `Belum ada events dekat ${city.label} untuk filter ini.`}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">Guides <span className="ml-2 text-base font-semibold text-[#6B7280]">Panduan</span></h2>
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
                className={`setu-malaysia-auto-rail flex w-max gap-3 pr-3 ${guides.length > 1 ? '' : 'animate-none'}`}
                style={guides.length > 1 ? { animation: 'setuMalaysiaRailScroll 38s linear infinite' } : undefined}
              >
                {guideRailItems.map((guide, index) => (
                  <Link key={`${guide.id}-${index}`} to={getJomCityGuideRoute(guide)} className="flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-[#FD5546] shadow-[0_10px_22px_rgba(15,23,42,0.08)] sm:w-[166px]">
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
                {guidesFailed ? 'Guides belum dapat dimuatkan.' : `Belum ada guides untuk ${city.label}.`}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 px-4 sm:px-6 md:grid-cols-2">
          <div className="space-y-3 rounded-[20px] border border-[#ECEFF3] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-black leading-tight text-[#080B12]">Alerts <span className="text-sm text-[#64748B]">Amaran</span></h2>
              <Link to="/vibe?section=alerts" className="shrink-0 text-sm font-bold text-[#F04444]">Lihat</Link>
            </div>
            {jomSettleAlerts.slice(0, 2).map((alert) => (
              <article key={alert.id} className="rounded-[16px] border border-[#F5D1CB] bg-[#FFF7F5] p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F04444]">{alert.tag}</p>
                <p className="mt-1 line-clamp-2 break-words text-sm font-black text-[#111827] [overflow-wrap:anywhere]">{alert.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{alert.body}</p>
              </article>
            ))}
          </div>

          <div className="space-y-3 rounded-[20px] border border-[#ECEFF3] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-black leading-tight text-[#080B12]">Student suburbs <span className="text-sm text-[#64748B]">Suburb pelajar</span></h2>
              <Link to="/vibe?section=vibe&vibe_tab=suburb-score" className="shrink-0 text-sm font-bold text-[#F04444]">Lihat</Link>
            </div>
            {suburbPreviews.length ? suburbPreviews.map(({ record, malaysianStudents }) => (
              <Link
                key={`${record.suburb}-${record.state}`}
                to={`/vibe?section=vibe&vibe_tab=suburb-score&suburb=${encodeURIComponent(slugifyHoodieShareText(record.suburb))}`}
                className="flex items-center justify-between gap-3 rounded-[16px] border border-[#F1F5F9] bg-[#F8FAFC] p-3"
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black text-[#111827] [overflow-wrap:anywhere]">{record.suburb}</span>
                  <span className="block break-words text-xs font-medium text-[#64748B] [overflow-wrap:anywhere]">{record.state} · {malaysianStudents.toLocaleString()} Malaysian students</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#F04444]" />
              </Link>
            )) : (
              <div className="rounded-[16px] border border-[#F1F5F9] bg-[#F8FAFC] p-3 text-sm font-semibold leading-6 text-[#64748B]">
                Guna suburb stats dan guides untuk bandingkan area student-friendly.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function JomSettleVibePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { bulletins, banners } = useGharData();

  const rawSection = searchParams.get('section');
  const section: VibeSection =
    rawSection === 'events' || rawSection === 'alerts' ? rawSection : 'vibe';
  const rawEventTab = searchParams.get('events_tab');
  const eventTab: EventsTab =
    rawEventTab === 'plans' || rawEventTab === 'networking'
      ? rawEventTab
      : 'whatson';
  const rawVibeTab = searchParams.get('vibe_tab');
  const vibeTab: VibeNestedTab =
    rawVibeTab === 'suburb-score' || rawVibeTab === 'my-hood'
      ? rawVibeTab
      : APP_CONFIG.defaultVibeTab;
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

  const updateSearchParams = (updates: Record<string, string | null | undefined>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  const handleEventHubStateChange = (updates: VibeEventsHubStateUpdate) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', 'events');
    if (updates.networkingView !== undefined) {
      if (updates.networkingView === 'cards') nextParams.set('networking_view', 'cards');
      else nextParams.delete('networking_view');
    }
    if (updates.officialEventsSourceMode !== undefined) {
      if (updates.officialEventsSourceMode === 'university') nextParams.set('events_source_mode', 'university');
      else nextParams.delete('events_source_mode');
    }
    if (updates.officialEventWhen !== undefined) {
      const { startDay, endDay } = updates.officialEventWhen;
      if (startDay) nextParams.set('events_start_day', startDay);
      else nextParams.delete('events_start_day');
      if (endDay) nextParams.set('events_end_day', endDay);
      else nextParams.delete('events_end_day');
    }
    if (updates.officialEventTypes !== undefined) {
      if (updates.officialEventTypes.length) nextParams.set('events_types', updates.officialEventTypes.join(','));
      else nextParams.delete('events_types');
    }
    if (updates.officialEventCategories !== undefined) {
      if (updates.officialEventCategories.length) nextParams.set('events_tags', updates.officialEventCategories.join(','));
      else nextParams.delete('events_tags');
    }
    if (updates.selectedUniversityId !== undefined) {
      if (updates.selectedUniversityId) nextParams.set('university_id', updates.selectedUniversityId);
      else nextParams.delete('university_id');
    }
    if (updates.plansView !== undefined) {
      if (updates.plansView === 'public') nextParams.delete('plans_view');
      else nextParams.set('plans_view', updates.plansView);
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex size-full flex-col bg-white text-[#0D1B2A]">
      <div className="border-b border-[#F5D1CB] bg-white px-4 pb-4 pt-4 native-safe-area-top">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E53935]">Senang AU</p>
            <h1 className="mt-1 text-2xl font-black text-[#0D1B2A]">
              {section === 'events' ? 'Makan, events & plans' : section === 'alerts' ? 'Amaran safe settle' : 'Cari geng anda'}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              {section === 'events'
                ? 'Campus nights, public events, dan plans yang berbaloi keluar bilik.'
                : section === 'alerts'
                  ? 'Rental, kerja, dan community watch-outs tanpa panik.'
                  : 'Guides dan suburb stats untuk pilih tempat tinggal, makan, dan study.'}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#FFF7F5] text-[#F04444] ring-1 ring-[#F5D1CB]">
            {section === 'alerts' ? <Shield className="h-6 w-6" /> : section === 'events' ? <CalendarDays className="h-6 w-6" /> : <Users className="h-6 w-6" />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[22px] border border-[#F5D1CB] bg-[#FFF7F5] p-1">
          {([
                { id: 'vibe' as const, label: 'Geng' },
                { id: 'events' as const, label: 'Makan' },
                { id: 'alerts' as const, label: 'Safe' },
          ]).map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateSearchParams({ section: item.id, events_tab: item.id === 'events' ? eventTab : null })}
                className={`rounded-[18px] px-3 py-3 text-sm font-black transition ${active ? 'bg-white text-[#F04444] shadow-sm' : 'text-[#64748B]'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {section === 'vibe' ? (
        <>
          <div className="bg-white px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-[#F5D1CB] bg-[#FFF7F5] p-1">
              {([
                { id: 'my-hood' as const, label: 'Panduan' },
                { id: 'suburb-score' as const, label: 'Suburb Stats' },
              ]).map((item) => {
                const active = vibeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSearchParams({
                      section: 'vibe',
                      vibe_tab: item.id,
                      guide: item.id === 'my-hood' ? guideParam : null,
                      city: item.id === 'my-hood' ? cityParam : null,
                      guides_view: item.id === 'my-hood' ? guidesViewParam : null,
                    })}
                    className={`rounded-[18px] px-3 py-3 text-sm font-black transition ${active ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-[#64748B]'}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          {vibeTab === 'my-hood' ? (
            <CityGuidesHub
              cityParam={cityParam}
              guideParam={guideParam}
              guidesView={guidesViewParam}
              onCityChange={(citySlug) => updateSearchParams({ section: 'vibe', vibe_tab: 'my-hood', city: citySlug, guide: null })}
              onGuideChange={(guideSlug) => updateSearchParams({ section: 'vibe', vibe_tab: 'my-hood', guide: guideSlug })}
              onGuidesViewChange={(view) => updateSearchParams({ section: 'vibe', vibe_tab: 'my-hood', guides_view: view })}
            />
          ) : (
            <div
              className="setu-malaysia-vibe-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--app-bottom-nav-clearance)+2.5rem)]"
              style={{ WebkitOverflowScrolling: 'touch', scrollPaddingBottom: 'calc(var(--app-bottom-nav-clearance) + 2.5rem)' }}
              data-testid="jom-settle-suburb-stats-scroll-shell"
            >
              <VibeSuburbScoreTab
                selectedSuburbParam={suburbParam}
                onSuburbChange={(suburbSlug) => updateSearchParams({ section: 'vibe', vibe_tab: 'suburb-score', suburb: suburbSlug })}
                embedded
              />
            </div>
          )}
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
          onEventTabChange={(nextTab) => updateSearchParams({
            section: 'events',
            events_tab: nextTab,
            networking_view: nextTab === 'networking' && networkingViewParam === 'cards' ? networkingViewParam : null,
            plans_view: nextTab === 'plans' && plansViewParam !== 'public' ? plansViewParam : null,
          })}
          onCouncilChange={(nextCouncil) => updateSearchParams({ section: 'events', council: nextCouncil })}
          onStateChange={handleEventHubStateChange}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <Noticeboard bulletins={bulletins} banners={banners} embedded />
        </div>
      )}
    </div>
  );
}

export function JomSettleProfilePage({ onLogout }: { onLogout: () => void }) {
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState('');
  const firstName = localStorage.getItem('ghar_first_name') || 'Afiq';
  const lastName = localStorage.getItem('ghar_last_name') || '';
  const storedEmail = localStorage.getItem('ghar_email') || '';
  const email = storedEmail || 'student@example.com';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'there';
  const quickLinks = [
    { title: 'Buka Map', body: 'Semak suburbs, transport, food, dan safety.', route: '/dashboard?view=map', icon: MapPin, color: '#03B8C6' },
    { title: 'Tanya Sang Kancil', body: 'TFN, OSHC, rental safety, dan first-week steps.', route: '/arrival', icon: Bot, color: '#E53935' },
    { title: 'Senarai', body: 'SIM, bank, TFN, OSHC, campus, dan transport.', route: APP_CONFIG.resourcesRoute, icon: ClipboardList, color: '#27C18C' },
    { title: 'Cari Geng', body: 'Makan plans, events, guides, dan suburbs.', route: '/vibe', icon: Users, color: '#FFC107' },
  ];

  const handleDeleteAccount = async () => {
    if (!storedEmail) {
      setAccountDeleteError(`Sign in first before deleting your account. For help, contact ${APP_CONFIG.supportEmail}.`);
      return;
    }

    const confirmed = window.confirm(
      'Delete your Senang AU account and related data? This removes your profile, checklist progress, plans, and uploaded content. This cannot be undone in the app.',
    );
    if (!confirmed) return;

    setDeletingAccount(true);
    setAccountDeleteError('');
    try {
      const deleteResult = await deleteProfile(storedEmail);
      const successMessage = deleteResult?.demo_reset
        ? 'Demo account deleted. You can sign in again to keep testing Senang AU.'
        : 'Your Senang AU account has been deleted.';
      sessionStorage.setItem('ghar_post_logout_message', successMessage);
      onLogout();
    } catch (err) {
      console.error('Senang AU delete account error:', err);
      setAccountDeleteError(`Could not delete account. Contact ${APP_CONFIG.supportEmail} for help.`);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="size-full overflow-y-auto bg-white text-[#0D1B2A]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-4 pb-[calc(var(--native-safe-area-bottom)+6rem)] pt-4 native-safe-area-top md:px-6">
        <section className="rounded-[30px] border border-[#F5D1CB] bg-white p-5 shadow-[0_20px_48px_rgba(13,27,42,0.1)]">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-[#FFE6E6] text-[#E53935]">
              <User className="h-8 w-8" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E53935]">Profil Senang AU</p>
              <h1 className="mt-1 break-words text-3xl font-black leading-tight text-[#0D1B2A] [overflow-wrap:anywhere]">Hi {displayName}</h1>
              <p className="mt-1 break-words text-sm font-semibold text-[#64748B] [overflow-wrap:anywhere]">{email}</p>
              <p className="mt-2 text-sm font-black text-[#27C18C]">Kehidupan pelajar Malaysia di Australia, senang disusun.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#0D1B2A]">Quick Actions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ title, body, route, icon: Icon, color }) => (
              <Link key={title} to={route} className="flex min-w-0 items-center gap-4 rounded-[22px] border border-[#F5D1CB] bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-white" style={{ backgroundColor: color }}>
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-base font-black leading-tight text-[#0D1B2A] [overflow-wrap:anywhere]">{title}</span>
                  <span className="mt-1 block break-words text-sm font-semibold leading-snug text-[#64748B] [overflow-wrap:anywhere]">{body}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#F5D1CB] bg-white p-4 shadow-sm">
          <h2 className="flex items-start gap-2 text-lg font-black leading-tight text-[#0D1B2A]">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#E53935]" strokeWidth={1.8} />
            Trusted support
          </h2>
          <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#5B6472]">
            <p>Untuk official checks, guna ATO, Home Affairs, Fair Work, Scamwatch, state tenancy authorities, dan university international student team.</p>
            <p>Untuk emergency call 000. Untuk health questions, semak OSHC provider, GP, atau 1800MEDICARE.</p>
          </div>
        </section>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#F5D1CB] bg-white px-4 py-4 text-sm font-black text-[#E53935]"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} />
          Sign out
        </button>

        {accountDeleteError ? (
          <p className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-center text-sm font-semibold leading-6 text-[#B91C1C]">
            {accountDeleteError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#E53935]/25 bg-[#FFE6E6] px-4 py-4 text-sm font-black text-[#B91C1C] disabled:opacity-55"
        >
          <Trash2 className="h-5 w-5" strokeWidth={1.8} />
          {deletingAccount ? 'Deleting account...' : 'Delete account'}
        </button>
      </main>
    </div>
  );
}
