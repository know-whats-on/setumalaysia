import { Browser } from '@capacitor/browser';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CityGuidesHub } from '../components/city-guides-hub';
import { useGharData } from '../components/layout';
import { NoticeboardBannerCarousel } from '../components/noticeboard';
import {
  VibeEventsHub,
  type EventDateRangeState,
  type EventsTab,
  type NetworkingView,
  type OfficialEventsSourceMode,
  type PlansView,
  type VibeEventsHubStateUpdate,
} from '../components/vibe-events-hub';
import {
  fetchCityGuides,
  createRentalEntry,
  deleteRentalEntry,
  fetchOfficialEvents,
  fetchOfficialNews,
  fetchRentalHistory,
  updateRentalEntry,
  type CityGuide,
  type OfficialEvent,
  type OfficialNewsItem,
} from '../lib/api';
import type { RentalEntry } from '../lib/mock-data';
import { APP_CONFIG } from '../lib/app-config';
import {
  BAYSIDE_CONTACT_URL,
  BAYSIDE_EVENTS_URL,
  BAYSIDE_HOME_URL,
  BAYSIDE_NEWS_URL,
  BAYSIDE_WARD_BOUNDARY_URL,
  wolliNewResidentChecklist,
  wolliQuickActions,
  wolliServices,
  type WolliServiceLink,
} from '../lib/wolli-content';
import { wolliShortcutIcons } from '../lib/wolli-icons';
import {
  WOLLI_SUBURB_STATS,
  WOLLI_SUBURB_STATS_MODES,
  formatWolliStatsNumber,
  getWolliCountryDisplayName,
  getWolliSuburbStatsBySlug,
  getWolliSuburbStatsMode,
  type WolliSuburbStatsMode,
} from '../lib/wolli-suburb-stats';

type WolliSection = 'events' | 'guides' | 'alerts';
type GuideFeedView = 'carousel' | 'list';

const OFFICIAL_EVENTS_TIMEZONE = 'Australia/Sydney';
const WOLLI_GUIDES_CITY_SLUG = 'sydney';
const WOLLI_DEFAULT_COUNCIL_SLUG = APP_CONFIG.defaultCouncilSlug || 'bayside-council';
const WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG = 'city-of-sydney';
const WOLLI_HOME_EVENT_DAYS = 89;

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

function getHomeEventRange(daySpan = WOLLI_HOME_EVENT_DAYS) {
  return {
    startDay: formatSydneyDayKey(new Date()),
    endDay: formatSydneyDayKey(new Date(Date.now() + daySpan * 24 * 60 * 60 * 1000)),
  };
}

function parseParamList(value: string | null) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWolliGuideRoute(guide: CityGuide) {
  const city = guide.city_slug || WOLLI_GUIDES_CITY_SLUG;
  return `/vibe?section=guides&city=${encodeURIComponent(city)}&guide=${encodeURIComponent(guide.slug)}`;
}

function formatShortDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).format(parsed);
}

function readName() {
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem('ghar_first_name') || '').trim();
}

function readEmail() {
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem('ghar_email') || '').trim();
}

function openWolliExternalUrl(url?: string) {
  const target = String(url || '').trim();
  if (!target) return;
  void Browser.open({ url: target }).catch(() => {
    if (typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  });
}

function getOfficialEventSortValue(event: OfficialEvent) {
  const firstDate = Array.isArray(event.dates) ? event.dates.find(Boolean) : '';
  const timestamp = Date.parse(String(event.upcoming_date || firstDate || ''));
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function dedupeOfficialEvents(events: OfficialEvent[], limit: number) {
  const deduped = new Map<string, OfficialEvent>();
  events.forEach((event) => {
    const key = [
      event.source || '',
      event.slug || '',
      event.source_url || '',
      event.title || '',
    ].join('|');
    if (!deduped.has(key)) deduped.set(key, event);
  });
  return Array.from(deduped.values())
    .sort((left, right) => {
      const dateDelta = getOfficialEventSortValue(left) - getOfficialEventSortValue(right);
      if (dateDelta !== 0) return dateDelta;
      return String(left.title || '').localeCompare(String(right.title || ''));
    })
    .slice(0, limit);
}

function useWolliFeeds(options: { newsLimit: number; eventLimit: number }) {
  const [news, setNews] = useState<OfficialNewsItem[]>([]);
  const [events, setEvents] = useState<OfficialEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const range = getHomeEventRange();
    setLoading(true);
    void Promise.allSettled([
      fetchOfficialNews({ source: 'bayside', limit: options.newsLimit }),
      fetchOfficialEvents({
        appVariant: 'wheres_wolli',
        councilSlug: WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG,
        startDay: range.startDay,
        endDay: range.endDay,
        limit: options.eventLimit,
      }),
      fetchOfficialEvents({
        appVariant: 'wheres_wolli',
        councilSlug: APP_CONFIG.defaultCouncilSlug || 'bayside-council',
        startDay: range.startDay,
        endDay: range.endDay,
        limit: options.eventLimit,
      }),
    ]).then(([newsResult, cityEventsResult, baysideEventsResult]) => {
      if (cancelled) return;
      if (newsResult.status === 'fulfilled') {
        setNews(newsResult.value.data);
      }
      const nextEvents = [
        ...(cityEventsResult.status === 'fulfilled' ? cityEventsResult.value.data : []),
        ...(baysideEventsResult.status === 'fulfilled' ? baysideEventsResult.value.data : []),
      ];
      setEvents(dedupeOfficialEvents(nextEvents, options.eventLimit));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [options.eventLimit, options.newsLimit]);

  return { news, events, loading };
}

function useWolliGuides(limit = 5) {
  const [guides, setGuides] = useState<CityGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchCityGuides({ city: WOLLI_GUIDES_CITY_SLUG, appVariant: 'all' })
      .then((items) => {
        if (cancelled) return;
        setGuides(items.slice(0, limit));
      })
      .catch((error) => {
        console.error("Where's Wolli Sydney guides load failed:", error);
        if (cancelled) return;
        setGuides([]);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { guides, loading, failed };
}

function WolliStyles() {
  return (
    <style>{`
      @keyframes wolliHeroFloat {
        0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
        50% { transform: translate3d(0, -10px, 0) rotate(2deg); }
      }

      @keyframes wolliRailScroll {
        0% { transform: translate3d(0, 0, 0); }
        100% { transform: translate3d(-50%, 0, 0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .wolli-float,
        .wolli-auto-rail {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function WolliPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="h-full overflow-y-auto bg-white text-[#17221F]">
      <WolliStyles />
      <div className="mx-auto min-h-full w-full max-w-none pb-[calc(var(--native-safe-area-bottom)+1rem)]">
        {children}
      </div>
    </main>
  );
}

function WolliHero({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative isolate min-h-[360px] overflow-hidden px-5 pb-8 pt-6 sm:min-h-[420px] sm:px-8">
      <img
        src={APP_CONFIG.launchArt?.headerBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#F9FBF8]/96 via-[#F9FBF8]/70 to-[#F9FBF8]/16" />
      <div className="relative z-10 grid min-h-[320px] items-center gap-5 sm:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#006C72] shadow-sm backdrop-blur">
            <img src={wolliShortcutIcons.info} alt="" className="h-6 w-6 object-contain" />
            {eyebrow}
          </div>
          <h1 className="mt-4 max-w-[12ch] text-[2.75rem] font-black leading-[0.98] text-[#062D4F] sm:text-[4.25rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-[#364A45] sm:text-lg">
            {body}
          </p>
          {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="relative hidden min-h-[260px] sm:block">
          <img
            src={APP_CONFIG.launchArt?.mascot}
            alt=""
            aria-hidden="true"
            className="wolli-float absolute right-0 top-6 w-[min(42vw,430px)] object-contain drop-shadow-[0_24px_48px_rgba(12,35,34,0.24)]"
            style={{ animation: 'wolliHeroFloat 3.4s ease-in-out infinite' }}
          />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#008A8C]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black leading-tight text-[#17221F]">{title}</h2>
      {body ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#58706A]">{body}</p> : null}
    </div>
  );
}

function ActionButton({ to, href, children, primary = false }: { to?: string; href?: string; children: ReactNode; primary?: boolean }) {
  const className = `inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${
    primary
      ? 'bg-[#008A8C] text-white shadow-[0_12px_24px_rgba(0,138,140,0.22)]'
      : 'border border-[#DDE8E3] bg-white text-[#173A37] shadow-sm'
  }`;

  if (href) {
    return (
      <button type="button" className={className} onClick={() => openWolliExternalUrl(href)}>
        {children}
      </button>
    );
  }
  return (
    <Link className={className} to={to || '/dashboard'}>
      {children}
    </Link>
  );
}

type WolliTimelineFormState = {
  address: string;
  suburb: string;
  postcode: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  notes: string;
};

const emptyTimelineForm: WolliTimelineFormState = {
  address: '',
  suburb: '',
  postcode: '',
  start_date: '',
  end_date: '',
  is_current: true,
  notes: '',
};

function sortWolliTimelineEntries(entries: RentalEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.is_current !== right.is_current) return left.is_current ? -1 : 1;
    const leftTime = Date.parse(left.start_date || left.created_at || '');
    const rightTime = Date.parse(right.start_date || right.created_at || '');
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

function buildTimelineFormFromEntry(entry: RentalEntry): WolliTimelineFormState {
  return {
    address: entry.display_address || entry.address || '',
    suburb: entry.suburb || '',
    postcode: entry.postcode || '',
    start_date: entry.start_date || '',
    end_date: entry.end_date || '',
    is_current: Boolean(entry.is_current),
    notes: entry.review_text || '',
  };
}

function buildTimelinePayload(email: string, form: WolliTimelineFormState) {
  return {
    email,
    address: form.address.trim(),
    display_address: form.address.trim(),
    suburb: form.suburb.trim(),
    postcode: form.postcode.trim(),
    state: 'NSW',
    start_date: form.start_date,
    end_date: form.is_current ? '' : form.end_date,
    is_current: form.is_current,
    landlord_name: '',
    landlord_contact: '',
    monthly_rent: null,
    review_category: null,
    review_text: form.notes.trim(),
    review_rating: null,
  };
}

function formatTimelineRange(entry: RentalEntry) {
  const start = formatShortDate(entry.start_date) || 'Start date not set';
  if (entry.is_current) return `${start} - now`;
  return `${start} - ${formatShortDate(entry.end_date) || 'Move-out date not set'}`;
}

function WolliTimelineForm({
  mode,
  form,
  saving,
  onCancel,
  onChange,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: WolliTimelineFormState;
  saving: boolean;
  onCancel: () => void;
  onChange: (updates: Partial<WolliTimelineFormState>) => void;
  onSubmit: () => void;
}) {
  const canSubmit = form.address.trim().length > 2 && form.start_date.length > 0;
  return (
    <div className="rounded-[18px] border border-[#CFE9E5] bg-[#F8FCFA] p-4 shadow-[0_10px_24px_rgba(20,40,37,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#008A8C]">
            {mode === 'edit' ? 'Edit timeline' : 'Add home'}
          </p>
          <h3 className="mt-1 text-lg font-black text-[#17221F]">
            {mode === 'edit' ? 'Update this home' : 'Add a current or past home'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DCEBE5] bg-white text-[#64748B]"
          aria-label="Close timeline form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Address</span>
          <input
            value={form.address}
            onChange={(event) => onChange({ address: event.target.value })}
            placeholder="Apartment, street, or home address"
            className="mt-1 min-h-11 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C]"
          />
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Suburb</span>
          <input
            value={form.suburb}
            onChange={(event) => onChange({ suburb: event.target.value })}
            placeholder="Wolli Creek"
            className="mt-1 min-h-11 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C]"
          />
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Postcode</span>
          <input
            value={form.postcode}
            onChange={(event) => onChange({ postcode: event.target.value })}
            placeholder="2205"
            inputMode="numeric"
            className="mt-1 min-h-11 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C]"
          />
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Move-in</span>
          <input
            type="date"
            value={form.start_date}
            onChange={(event) => onChange({ start_date: event.target.value })}
            className="mt-1 min-h-11 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C]"
          />
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Move-out</span>
          <input
            type="date"
            value={form.end_date}
            onChange={(event) => onChange({ end_date: event.target.value, is_current: false })}
            disabled={form.is_current}
            className="mt-1 min-h-11 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C] disabled:bg-[#EEF5F3] disabled:text-[#94A3B8]"
          />
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-[#DCEBE5] bg-white px-3 py-3 text-sm font-black text-[#17221F]">
          <input
            type="checkbox"
            checked={form.is_current}
            onChange={(event) => onChange({ is_current: event.target.checked, end_date: event.target.checked ? '' : form.end_date })}
            className="h-5 w-5 rounded border-[#97D7CF] text-[#008A8C]"
          />
          This is my current home
        </label>
        <label className="sm:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Local notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Add useful notes like building entry, transport, bins, or local reminders."
            rows={3}
            className="mt-1 w-full rounded-xl border border-[#DCEBE5] bg-white px-3 py-3 text-sm font-semibold text-[#17221F] outline-none focus:border-[#008A8C]"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#008A8C] px-4 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,138,140,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add to timeline'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-xl border border-[#DCEBE5] bg-white px-4 py-2 text-sm font-black text-[#173A37]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function WolliTimelineEntryCard({
  entry,
  deleting,
  onEdit,
  onDelete,
}: {
  entry: RentalEntry;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const address = entry.display_address || entry.address || 'Saved home';
  const suburbLine = [entry.suburb, entry.postcode].filter(Boolean).join(' ');
  return (
    <article className="rounded-[18px] border border-[#DCEBE5] bg-white p-4 shadow-[0_8px_22px_rgba(20,40,37,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F7F4]">
          <Home className="h-5 w-5 text-[#008A8C]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">{address}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
              entry.is_current ? 'bg-[#E8F7F4] text-[#008A8C]' : 'bg-[#F1F5F9] text-[#64748B]'
            }`}>
              {entry.is_current ? 'Current' : 'Past'}
            </span>
          </div>
          {suburbLine ? <p className="mt-1 text-sm font-semibold text-[#58706A]">{suburbLine}</p> : null}
          <p className="mt-2 text-sm font-black text-[#0D3B66]">{formatTimelineRange(entry)}</p>
          {entry.review_text ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#58706A]">{entry.review_text}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCEBE5] bg-white px-3 py-2 text-sm font-black text-[#173A37]"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F2C3B6] bg-[#FFF7F3] px-3 py-2 text-sm font-black text-[#A33A1D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

function WolliTimelineSection({ email }: { email: string }) {
  const [entries, setEntries] = useState<RentalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingEntry, setEditingEntry] = useState<RentalEntry | null>(null);
  const [form, setForm] = useState<WolliTimelineFormState>(emptyTimelineForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const loadTimeline = useCallback(async () => {
    if (!email) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchRentalHistory(email);
      setEntries(sortWolliTimelineEntries(data as RentalEntry[]));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Timeline could not load.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const updateForm = (updates: Partial<WolliTimelineFormState>) => {
    setForm((current) => ({ ...current, ...updates }));
  };

  const startCreate = () => {
    setEditingEntry(null);
    setForm({ ...emptyTimelineForm, is_current: entries.length === 0 });
    setFormMode('create');
    setError('');
  };

  const startEdit = (entry: RentalEntry) => {
    setEditingEntry(entry);
    setForm(buildTimelineFormFromEntry(entry));
    setFormMode('edit');
    setError('');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingEntry(null);
    setForm(emptyTimelineForm);
  };

  const submitForm = async () => {
    if (!email) {
      setError('Sign in with an email to save your Wolli timeline.');
      return;
    }
    const payload = buildTimelinePayload(email, form);
    if (!payload.address || !payload.start_date) return;
    setSaving(true);
    setError('');
    try {
      if (formMode === 'edit' && editingEntry) {
        await updateRentalEntry(editingEntry.id, payload);
      } else {
        await createRentalEntry(payload);
      }
      closeForm();
      await loadTimeline();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Timeline could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: RentalEntry) => {
    if (!email) {
      setError('Sign in with an email to update your Wolli timeline.');
      return;
    }
    const confirmed = typeof window === 'undefined' || window.confirm(`Delete ${entry.display_address || entry.address || 'this home'} from your timeline?`);
    if (!confirmed) return;
    setDeletingId(entry.id);
    setError('');
    try {
      await deleteRentalEntry(email, entry.id);
      await loadTimeline();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Timeline entry could not be deleted.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[22px] border border-[#DCEBE5] bg-white p-4 shadow-[0_10px_26px_rgba(20,40,37,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            eyebrow="My timeline"
            title="Homes and local notes"
            body="Save current and past Bayside or Sydney homes so Wolli can keep your local context in one place."
          />
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#008A8C] px-4 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(0,138,140,0.2)]"
          >
            <Plus className="h-4 w-4" />
            Add home
          </button>
        </div>
        {!email ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm font-semibold leading-6 text-[#64748B]">
            Sign in with an email to save and sync your Wolli timeline.
          </div>
        ) : null}
      </div>

      {formMode ? (
        <WolliTimelineForm
          mode={formMode}
          form={form}
          saving={saving}
          onCancel={closeForm}
          onChange={updateForm}
          onSubmit={submitForm}
        />
      ) : null}

      {error ? (
        <div className="rounded-[18px] border border-[#F2C3B6] bg-[#FFF7F3] p-4 text-sm font-black text-[#A33A1D]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="min-h-[150px] animate-pulse rounded-[18px] border border-[#DCEBE5] bg-white p-4">
              <div className="h-5 w-2/3 rounded bg-[#E5E7EB]" />
              <div className="mt-4 h-4 w-1/2 rounded bg-[#E5E7EB]" />
              <div className="mt-6 h-10 w-full rounded bg-[#EEF5F3]" />
            </div>
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <WolliTimelineEntryCard
              key={entry.id}
              entry={entry}
              deleting={deletingId === entry.id}
              onEdit={() => startEdit(entry)}
              onDelete={() => void deleteEntry(entry)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#CFE9E5] bg-[#F3FAF7] p-5">
          <div className="flex gap-3">
            <img src={wolliShortcutIcons.profile} alt="" className="h-16 w-16 shrink-0 object-contain" />
            <div>
              <h3 className="text-lg font-black text-[#17221F]">Start your local timeline</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#58706A]">
                Add your current home, past homes, or useful local notes so Me feels personal instead of a list of random links.
              </p>
              <button
                type="button"
                onClick={startCreate}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#008A8C] px-3 py-2 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" />
                Add current home
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function QuickActionGrid() {
  return (
    <section className="grid grid-cols-5 gap-2 px-4 sm:gap-3 sm:px-6">
      {wolliQuickActions.map((action) => {
        const content = (
          <>
            <span className="relative mx-auto flex h-[64px] w-full max-w-[76px] items-center justify-center sm:h-[82px] sm:max-w-[86px]">
              <img src={action.icon} alt="" aria-hidden="true" className="h-16 w-16 object-contain sm:h-20 sm:w-20" loading="lazy" />
            </span>
            <span className="mt-2 block min-h-[30px] break-words text-[12px] font-semibold leading-[1.15] text-[#111827] [overflow-wrap:anywhere] sm:text-sm">
              {action.title}
            </span>
            <span className="mt-0.5 hidden break-words text-[12px] leading-tight text-[#5B6472] [overflow-wrap:anywhere] sm:block sm:text-sm">
              {action.body}
            </span>
          </>
        );

        const className = "group min-w-0 text-center";
        if (action.url) {
          return (
            <button key={action.title} type="button" className={className} onClick={() => openWolliExternalUrl(action.url)}>
              {content}
            </button>
          );
        }
        return (
          <Link key={action.title} className={className} to={action.route || '/dashboard'}>
            {content}
          </Link>
        );
      })}
    </section>
  );
}

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-h-[136px] animate-pulse rounded-lg border border-[#E4ECE8] bg-white p-4">
          <div className="h-4 w-24 rounded bg-[#E5EFEB]" />
          <div className="mt-4 h-5 w-3/4 rounded bg-[#D8E8E2]" />
          <div className="mt-3 h-3 w-full rounded bg-[#EEF4F1]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#EEF4F1]" />
        </div>
      ))}
    </>
  );
}

function NewsGrid({ news, loading, limit }: { news: OfficialNewsItem[]; loading: boolean; limit?: number }) {
  const visible = typeof limit === 'number' ? news.slice(0, limit) : news;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {loading ? <LoadingCards count={limit || 4} /> : null}
      {!loading && visible.length === 0 ? (
        <button
          type="button"
          onClick={() => openWolliExternalUrl(BAYSIDE_NEWS_URL)}
          className="rounded-lg border border-[#DCEBE5] bg-white p-4 text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#008A8C]">Official source</p>
          <h3 className="mt-2 text-base font-black text-[#17221F]">Bayside Council Latest News</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#58706A]">Open the official council news page for the latest updates.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
            Open latest news <ExternalLink className="h-4 w-4" />
          </span>
        </button>
      ) : null}
      {!loading && visible.map((item) => (
        <button
          key={`${item.source}-${item.slug}-${item.source_url}`}
          type="button"
          onClick={() => openWolliExternalUrl(item.source_url)}
          className="group overflow-hidden rounded-lg border border-[#DCEBE5] bg-white text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)] transition hover:-translate-y-0.5 hover:border-[#97D7CF]"
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" className="h-32 w-full object-cover" loading="lazy" />
          ) : null}
          <div className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#008A8C]">
              {formatShortDate(item.published_at) || 'Bayside Council'}
            </p>
            <h3 className="mt-2 break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">
              {item.title}
            </h3>
            {item.summary ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#58706A]">{item.summary}</p> : null}
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
              Read official update <ExternalLink className="h-4 w-4" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function EventsGrid({ events, loading, limit }: { events: OfficialEvent[]; loading: boolean; limit?: number }) {
  const visible = typeof limit === 'number' ? events.slice(0, limit) : events;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {loading ? <LoadingCards count={limit || 4} /> : null}
      {!loading && visible.length === 0 ? (
        <button
          type="button"
          onClick={() => openWolliExternalUrl(BAYSIDE_EVENTS_URL)}
          className="rounded-lg border border-[#DCEBE5] bg-white p-4 text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#008A8C]">Official source</p>
          <h3 className="mt-2 text-base font-black text-[#17221F]">Bayside Council What's On</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#58706A]">Open the official What's On page for upcoming Bayside activities.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
            Open What's On <ExternalLink className="h-4 w-4" />
          </span>
        </button>
      ) : null}
      {!loading && visible.map((event) => (
        <Link
          key={`${event.source}-${event.slug}`}
          to={`/events/${encodeURIComponent(event.source)}/${encodeURIComponent(event.slug)}`}
          className="group overflow-hidden rounded-lg border border-[#DCEBE5] bg-white shadow-[0_8px_22px_rgba(20,40,37,0.06)] transition hover:-translate-y-0.5 hover:border-[#97D7CF]"
        >
          {event.image_url || event.hero_image_url ? (
            <img src={event.image_url || event.hero_image_url} alt="" className="h-32 w-full object-cover" loading="lazy" />
          ) : null}
          <div className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#008A8C]">
              {event.dates_humanized || event.upcoming_time || event.source_label || "What's On"}
            </p>
            <h3 className="mt-2 break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">
              {event.title}
            </h3>
            {event.summary ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#58706A]">{event.summary}</p> : null}
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#58706A]">
              <MapPin className="h-4 w-4 shrink-0 text-[#008A8C]" />
              <span className="truncate">{event.venue_name || event.suburb || 'Bayside Council area'}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ServiceCard({ service }: { service: WolliServiceLink }) {
  return (
    <button
      type="button"
      onClick={() => openWolliExternalUrl(service.url)}
      className="group flex min-h-[132px] gap-3 rounded-lg border border-[#DCEBE5] bg-white p-4 text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)] transition hover:-translate-y-0.5 hover:border-[#97D7CF]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F3FAF7]">
        <img src={service.icon} alt="" className="h-14 w-14 object-contain" loading="lazy" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">{service.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#58706A]">{service.body}</p>
        <span className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
          Official page <ExternalLink className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function WolliSuburbStatsResourceCard() {
  return (
    <Link
      to="/suburb-stats"
      className="group flex min-h-[132px] gap-3 rounded-lg border border-[#DCEBE5] bg-white p-4 text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)] transition hover:-translate-y-0.5 hover:border-[#97D7CF]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F3FAF7]">
        <img src={wolliShortcutIcons.suburbs} alt="" className="h-14 w-14 object-contain" loading="lazy" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">Suburb stats</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#58706A]">Select a Bayside suburb and explore its diversity mix.</p>
        <span className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
          Open stats <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function updateWolliSuburbStatsSearchParams(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  nextValues: { suburb?: string; mode?: WolliSuburbStatsMode },
) {
  const nextParams = new URLSearchParams(searchParams);
  if (nextValues.suburb) nextParams.set('suburb', nextValues.suburb);
  if (nextValues.mode) nextParams.set('mode', nextValues.mode);
  setSearchParams(nextParams, { replace: true });
}

export function WolliSuburbStatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSuburb = getWolliSuburbStatsBySlug(searchParams.get('suburb'));
  const selectedMode = getWolliSuburbStatsMode(searchParams.get('mode'));
  const selectedModeMeta = WOLLI_SUBURB_STATS_MODES.find((mode) => mode.id === selectedMode) || WOLLI_SUBURB_STATS_MODES[0];
  const selectedMix = selectedSuburb.mixes[selectedMode];
  const maxCount = selectedMix.reduce((max, item) => Math.max(max, item.count), 1);

  if (APP_CONFIG.variant !== 'wheres_wolli') {
    return <Navigate to={APP_CONFIG.resourcesRoute || '/dashboard'} replace />;
  }

  return (
    <WolliPageShell>
      <section className="relative overflow-hidden px-5 pb-6 pt-6 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-[1fr_260px] sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCEBE5] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#008A8C] shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Suburb stats
            </div>
            <h1 className="mt-4 max-w-[12ch] text-[2.5rem] font-black leading-none text-[#062D4F] sm:text-[3.6rem]">
              Select suburb then filter
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-[#364A45]">
              Choose a suburb, then switch the diversity mix between All Residents, Locals, and Internationals.
            </p>
          </div>
          <img src={wolliShortcutIcons.suburbs} alt="" className="hidden w-full object-contain sm:block" />
        </div>
      </section>

      <div className="space-y-5 px-5 pb-8 sm:px-8">
        <label className="block">
          <span className="sr-only">Select suburb</span>
          <select
            aria-label="Select suburb"
            value={selectedSuburb.slug}
            onChange={(event) => {
              updateWolliSuburbStatsSearchParams(searchParams, setSearchParams, {
                suburb: event.currentTarget.value,
                mode: selectedMode,
              });
            }}
            className="min-h-14 w-full appearance-none rounded-full border border-[#DCEBE5] bg-white px-5 py-3 text-base font-semibold text-[#17221F] shadow-sm outline-none transition focus:border-[#008A8C] focus:ring-4 focus:ring-[#008A8C]/10"
          >
            {WOLLI_SUBURB_STATS.map((suburb) => (
              <option key={suburb.slug} value={suburb.slug}>
                {suburb.name}
              </option>
            ))}
          </select>
        </label>

        <section className="rounded-lg border border-[#DCEBE5] bg-[#F3FAF7] p-4 shadow-[0_8px_22px_rgba(20,40,37,0.06)]">
          <div className="flex gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white">
              <img src={wolliShortcutIcons.suburbs} alt="" className="h-14 w-14 object-contain" loading="lazy" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-2xl font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">
                {selectedSuburb.name} has {formatWolliStatsNumber(selectedSuburb.totals.all)} residents
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {WOLLI_SUBURB_STATS_MODES.map((mode) => (
                  <span key={mode.id} className="rounded-full border border-[#DCEBE5] bg-white px-3 py-1.5 text-xs font-black text-[#173A37]">
                    {formatWolliStatsNumber(selectedSuburb.totals[mode.id])} {mode.countLabel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 rounded-full border border-[#DCEBE5] bg-[#F3FAF7] p-1 shadow-sm" role="tablist" aria-label="Resident type">
          {WOLLI_SUBURB_STATS_MODES.map((mode) => {
            const isActive = mode.id === selectedMode;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  updateWolliSuburbStatsSearchParams(searchParams, setSearchParams, {
                    suburb: selectedSuburb.slug,
                    mode: mode.id,
                  });
                }}
                className={`min-h-11 rounded-full px-2 py-2 text-xs font-black transition sm:text-sm ${
                  isActive ? 'bg-[#008A8C] text-white shadow-[0_10px_20px_rgba(0,138,140,0.18)]' : 'text-[#58706A]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <section className="rounded-lg border border-[#DCEBE5] bg-white p-4 shadow-[0_8px_22px_rgba(20,40,37,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black leading-tight text-[#17221F]">{selectedSuburb.name}'s diversity mix is below:</h2>
              <p className="mt-1 text-sm font-semibold text-[#58706A]">
                Showing {selectedMix.length} non-zero countries for {selectedModeMeta.label}.
              </p>
            </div>
            <span className="rounded-full bg-[#F3FAF7] px-3 py-1.5 text-xs font-black text-[#008A8C]">{selectedModeMeta.label}</span>
          </div>

          <ol className="mt-4 space-y-3">
            {selectedMix.map((item, index) => {
              const width = `${Math.max(4, Math.round((item.count / maxCount) * 100))}%`;
              return (
                <li key={`${selectedMode}-${item.country}`} data-testid="wolli-country-row" className="grid gap-1">
                  <div className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-2">
                    <span className="text-xs font-black text-[#64748B]">{index + 1}</span>
                    <span className="min-w-0 break-words text-sm font-black text-[#17221F] [overflow-wrap:anywhere]">
                      {getWolliCountryDisplayName(item.country)}
                    </span>
                    <span className="text-sm font-black text-[#062D4F]">{formatWolliStatsNumber(item.count)}</span>
                  </div>
                  <div className="ml-10 h-2.5 overflow-hidden rounded-full bg-[#EEF5F3]">
                    <div className="h-full rounded-full bg-[#008A8C]" style={{ width }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </WolliPageShell>
  );
}

export function WolliHomePage() {
  const firstName = readName();
  const { events, loading: eventsLoading } = useWolliFeeds({ newsLimit: 1, eventLimit: 16 });
  const { guides, loading: guidesLoading, failed: guidesFailed } = useWolliGuides(5);
  const eventRailItems = events.length > 1 ? [...events, ...events] : events;
  const guideRailItems = guides.length > 1 ? [...guides, ...guides] : guides;

  return (
    <WolliPageShell>
      <section className="relative min-h-[250px] w-full overflow-hidden px-4 pb-10 pt-[calc(var(--native-safe-area-top)+1.25rem)] sm:min-h-[288px] sm:px-6 sm:pb-12 sm:pt-[calc(var(--native-safe-area-top)+1.5rem)]">
        <img
          src={APP_CONFIG.launchArt?.headerBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-100"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/96 via-white/50 to-white/0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
        <img
          src={APP_CONFIG.launchArt?.mascot}
          alt=""
          aria-hidden="true"
          className="wolli-float pointer-events-none absolute bottom-[2px] right-[-1%] w-[52%] max-w-[260px] object-contain opacity-95 drop-shadow-[0_18px_30px_rgba(15,23,42,0.16)] sm:bottom-[-2px] sm:right-[3%] sm:w-[36%] sm:max-w-[360px]"
          style={{ animation: 'wolliHeroFloat 4.2s ease-in-out infinite' }}
        />
        <div className="relative z-10 mt-7 max-w-[58%] sm:mt-9 sm:max-w-[45%]">
          <h1 className="break-words text-[2.35rem] font-black leading-[1.04] text-[#080B12] [overflow-wrap:anywhere] sm:text-[2.65rem]">
            {firstName ? `Hi ${firstName}` : "Where's Wolli"}
          </h1>
          <p className="mt-2 max-w-[18rem] break-words text-base font-medium leading-6 text-[#5B6472] [overflow-wrap:anywhere] sm:max-w-[22rem] sm:text-xl">
            Bayside events, maps, guides, news, and official council links with Wolli.
          </p>
        </div>
      </section>

      <QuickActionGrid />

      <Link
        to="/dashboard?view=map"
        className="mx-4 mt-6 flex min-w-0 items-center justify-between gap-4 rounded-[20px] border border-[#CFE9E5] bg-[#F3FAF7] p-4 shadow-[0_12px_28px_rgba(0,138,140,0.07)] sm:mx-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">
            <img src={wolliShortcutIcons.maps} alt="" aria-hidden="true" className="h-14 w-14 object-contain sm:h-16 sm:w-16" loading="lazy" />
          </span>
          <span className="min-w-0">
            <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">Open Map</span>
            <span className="mt-1 block break-words text-sm font-semibold leading-tight text-[#64748B] [overflow-wrap:anywhere]">Explore Bayside places, transport, toilets, and local services</span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#008A8C]" />
      </Link>

      <Link
        to="/dashboard?view=map&panel=wards"
        className="mx-4 mt-3 flex min-w-0 items-center justify-between gap-4 rounded-[20px] border border-[#CFE9E5] bg-white p-4 shadow-[0_12px_28px_rgba(0,138,140,0.05)] sm:mx-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">
            <img src={wolliShortcutIcons.maps} alt="" aria-hidden="true" className="h-14 w-14 object-contain sm:h-16 sm:w-16" loading="lazy" />
          </span>
          <span className="min-w-0">
            <span className="block break-words text-base font-black leading-tight text-[#111827] [overflow-wrap:anywhere]">Bayside Council Wards &amp; LGA</span>
            <span className="mt-1 block break-words text-sm font-semibold leading-tight text-[#64748B] [overflow-wrap:anywhere]">Official ward boundaries, LGA lookup, and ward numbers</span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#008A8C]" />
      </Link>

      <div className="space-y-8 pt-6">
        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">
              What&apos;s On <span className="ml-2 text-base font-semibold text-[#6B7280]">Sydney + Bayside</span>
            </h2>
            <Link to="/vibe?section=events&events_tab=whatson" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#008A8C]">
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
                className={`wolli-auto-rail flex w-max gap-3 pr-3 ${events.length > 1 ? '' : 'animate-none'}`}
                style={events.length > 1 ? { animation: 'wolliRailScroll 42s linear infinite' } : undefined}
              >
                {eventRailItems.map((event, index) => {
                  const eventImage = event.image_url || event.hero_image_url;
                  return (
                    <Link
                      key={`${event.id || event.slug}-${index}`}
                      to={`/events/${encodeURIComponent(event.source)}/${encodeURIComponent(event.slug)}`}
                      className="flex w-[154px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-[#008A8C] shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:w-[172px]"
                    >
                      <div className="relative h-[92px] bg-[#E8F7F4] sm:h-[100px]">
                        {eventImage ? (
                          <img src={eventImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full place-items-center text-[#008A8C]">
                            <CalendarDays className="h-10 w-10" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 items-center bg-[#008A8C] p-3">
                        <h3 className="line-clamp-2 break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-[0.95rem]">{event.title}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openWolliExternalUrl(BAYSIDE_EVENTS_URL)}
                className="block min-w-full rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-left text-sm font-semibold leading-6 text-[#64748B] [overflow-wrap:anywhere]"
              >
                Open Bayside Council What&apos;s On for the latest official events.
              </button>
            )}
          </div>
        </section>

        <section className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight text-[#080B12] sm:text-2xl">
              Guides <span className="ml-2 text-base font-semibold text-[#6B7280]">Sydney local tips</span>
            </h2>
            <Link to="/vibe?section=guides&city=sydney" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#008A8C]">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
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
                className={`wolli-auto-rail flex w-max gap-3 pr-3 ${guides.length > 1 ? '' : 'animate-none'}`}
                style={guides.length > 1 ? { animation: 'wolliRailScroll 38s linear infinite' } : undefined}
              >
                {guideRailItems.map((guide, index) => (
                  <Link key={`${guide.id || guide.slug}-${index}`} to={getWolliGuideRoute(guide)} className="flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-[#C7552B] shadow-[0_10px_22px_rgba(15,23,42,0.08)] sm:w-[166px]">
                    {guide.cover_image_url ? (
                      <img src={guide.cover_image_url} alt="" className="h-[82px] w-full object-cover sm:h-[90px]" loading="lazy" />
                    ) : (
                      <div className="grid h-[82px] place-items-center bg-[#FFF4EE] text-[#C7552B] sm:h-[90px]">
                        <BookOpen className="h-9 w-9" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-1 items-center bg-[#C7552B] p-3">
                      <p className="line-clamp-2 break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-[0.95rem]">{guide.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="min-w-full rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm font-semibold leading-6 text-[#64748B] [overflow-wrap:anywhere]">
                {guidesFailed ? 'Sydney guides are temporarily unavailable.' : 'Sydney guides will appear here when they are available.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </WolliPageShell>
  );
}

export function WolliVibePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSection = searchParams.get('section');
  const section: WolliSection = rawSection === 'guides' || rawSection === 'alerts' ? rawSection : 'events';
  const rawEventTab = searchParams.get('events_tab');
  const eventTab: EventsTab = rawEventTab === 'networking' || rawEventTab === 'plans' ? rawEventTab : 'whatson';
  const rawGuidesView = searchParams.get('guides_view');
  const guidesView: GuideFeedView = rawGuidesView === 'list' ? 'list' : 'carousel';
  const cityParam = searchParams.get('city') || WOLLI_GUIDES_CITY_SLUG;
  const guideParam = searchParams.get('guide') || '';
  const councilParam = searchParams.get('council') || WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG;
  const networkingViewParam: NetworkingView =
    searchParams.get('networking_view') === 'cards' ? 'cards' : 'events';
  const officialEventsSourceModeParam: OfficialEventsSourceMode =
    searchParams.get('events_source_mode') === 'university' ? 'university' : 'lga';
  const defaultExploreEventRange = useMemo(() => getHomeEventRange(), []);
  const rawOfficialEventStartDay = searchParams.get('events_start_day') || defaultExploreEventRange.startDay;
  const rawOfficialEventEndDay = searchParams.get('events_end_day') || defaultExploreEventRange.endDay;
  const officialEventWhenParam: EventDateRangeState = useMemo(
    () => ({
      startDay: rawOfficialEventStartDay,
      endDay: rawOfficialEventEndDay,
    }),
    [rawOfficialEventEndDay, rawOfficialEventStartDay],
  );
  const officialEventTypesParam = useMemo(
    () => parseParamList(searchParams.get('events_types')),
    [searchParams],
  );
  const officialEventCategoriesParam = useMemo(
    () => parseParamList(searchParams.get('events_tags')),
    [searchParams],
  );
  const selectedUniversityIdParam = searchParams.get('university_id') || '';
  const rawPlansView = searchParams.get('plans_view');
  const plansViewParam: PlansView =
    rawPlansView === 'my' || rawPlansView === 'itinerary' ? rawPlansView : 'public';
  const { news, loading } = useWolliFeeds({ newsLimit: 12, eventLimit: 1 });
  const { banners } = useGharData();

  const tabs = useMemo(() => [
    { id: 'events' as const, label: "What's On" },
    { id: 'guides' as const, label: 'Guides' },
    { id: 'alerts' as const, label: 'News' },
  ], []);

  const setSection = (next: WolliSection) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', next);
    if (next === 'events') {
      if (!nextParams.get('events_tab')) nextParams.set('events_tab', 'whatson');
      if (!nextParams.get('council')) nextParams.set('council', WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG);
      nextParams.delete('guide');
      nextParams.delete('guides_view');
    } else {
      nextParams.delete('events_tab');
      nextParams.delete('networking_view');
      nextParams.delete('events_source_mode');
      nextParams.delete('events_start_day');
      nextParams.delete('events_end_day');
      nextParams.delete('events_types');
      nextParams.delete('events_tags');
      nextParams.delete('university_id');
      nextParams.delete('plans_view');
    }
    if (next === 'guides' && !nextParams.get('city')) nextParams.set('city', WOLLI_GUIDES_CITY_SLUG);
    if (next !== 'guides') {
      nextParams.delete('city');
      nextParams.delete('guide');
      nextParams.delete('guides_view');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex size-full min-w-0 flex-col bg-white text-[#17221F]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <WolliStyles />
      <div className="shrink-0 bg-white px-4 pb-2 pt-[calc(var(--native-safe-area-top)+0.75rem)] sm:px-6">
        <div className="grid w-full grid-cols-3 gap-1 rounded-[18px] border border-[#DCEBE5] bg-white p-1 shadow-sm sm:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`min-h-[44px] rounded-[14px] px-1.5 py-2 text-sm font-bold leading-tight ${
                section === tab.id
                  ? 'bg-[#E8F7F4] text-[#006C72]'
                  : 'text-[#64748B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        {section === 'events' ? (
          <div className="flex size-full min-h-0 flex-col bg-white">
            <div className="w-full px-4 pb-4 pt-4 sm:px-6">
              <h1 className="break-words text-[1.85rem] font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-[2.25rem]">What&apos;s On</h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#5B6472]">
                City of Sydney and Bayside events with official details linked from each listing.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
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
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'events');
                  params.set('events_tab', nextTab);
                  if (!params.get('council')) params.set('council', WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG);
                  if (nextTab !== 'networking') params.delete('networking_view');
                  if (nextTab !== 'plans') params.delete('plans_view');
                  setSearchParams(params, { replace: true });
                }}
                onCouncilChange={(nextCouncil) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'events');
                  params.set('events_tab', eventTab);
                  params.set('council', nextCouncil || WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG);
                  setSearchParams(params, { replace: true });
                }}
                onStateChange={(updates: VibeEventsHubStateUpdate) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'events');
                  if (!params.get('events_tab')) params.set('events_tab', eventTab);
                  if (!params.get('council')) params.set('council', WOLLI_DEFAULT_EXPLORE_COUNCIL_SLUG);
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
                }}
              />
            </div>
          </div>
        ) : section === 'guides' ? (
          <div className="flex size-full min-h-0 flex-col bg-white">
            <div className="w-full px-4 pb-4 pt-4 sm:px-6">
              <h1 className="break-words text-[1.85rem] font-black leading-tight text-[#080B12] [overflow-wrap:anywhere] sm:text-[2.25rem]">Sydney Guides</h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#5B6472]">
                Practical Sydney guides reused from the latest SETU guide source, now inside Wolli Explore.
              </p>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--app-bottom-nav-clearance)+2.5rem)]"
              style={{ WebkitOverflowScrolling: 'touch', scrollPaddingBottom: 'calc(var(--app-bottom-nav-clearance) + 2.5rem)' }}
            >
              <CityGuidesHub
                cityParam={cityParam}
                guideParam={guideParam}
                guidesView={guidesView}
                onCityChange={(nextCity) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'guides');
                  params.set('city', nextCity || WOLLI_GUIDES_CITY_SLUG);
                  params.delete('guide');
                  setSearchParams(params, { replace: true });
                }}
                onGuideChange={(nextGuide) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'guides');
                  params.set('city', cityParam || WOLLI_GUIDES_CITY_SLUG);
                  if (nextGuide) params.set('guide', nextGuide);
                  else params.delete('guide');
                  setSearchParams(params, { replace: true });
                }}
                onGuidesViewChange={(nextView) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('section', 'guides');
                  params.set('city', cityParam || WOLLI_GUIDES_CITY_SLUG);
                  params.set('guides_view', nextView);
                  if (guideParam) params.set('guide', guideParam);
                  setSearchParams(params, { replace: true });
                }}
                embedded
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-4 pb-[calc(var(--app-bottom-nav-clearance)+2.5rem)] pt-4 sm:px-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <SectionHeading eyebrow="Bayside Council" title="Latest News" body="Official news and local updates from Bayside Council." />
                <ActionButton href={BAYSIDE_NEWS_URL}>Official news <ExternalLink className="h-4 w-4" /></ActionButton>
              </div>
              <NoticeboardBannerCarousel
                banners={banners}
                className="w-full"
                cardClassName="overflow-hidden rounded-[18px] border border-[#DCEBE5] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                dotActiveClassName="w-5 bg-[#008A8C]"
                dotInactiveClassName="w-2 bg-[#CFE7E1]"
              />
              <NewsGrid news={news} loading={loading} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export function WolliResourcesPage() {
  return (
    <WolliPageShell>
      <section className="relative overflow-hidden px-5 pb-8 pt-6 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-[1fr_260px] sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCEBE5] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#008A8C] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Official links first
            </div>
            <h1 className="mt-4 max-w-[12ch] text-[2.5rem] font-black leading-none text-[#062D4F] sm:text-[3.6rem]">
              Bayside services
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-[#364A45]">
              Wolli points you to the relevant Bayside Council section for local tasks like waste, parking, pets, rates, permits, libraries, parks, and reports.
            </p>
          </div>
          <img src={wolliShortcutIcons.resources} alt="" className="hidden w-full object-contain sm:block" />
        </div>
      </section>

      <div className="space-y-8 px-5 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-2">
          <WolliSuburbStatsResourceCard />
          {wolliServices.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </section>

        <section className="rounded-lg border border-[#DCEBE5] bg-white p-4 shadow-[0_8px_22px_rgba(20,40,37,0.06)]">
          <SectionHeading eyebrow="New here" title="Arrival checklist" body="A short local setup list for people new to Bayside." />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {wolliNewResidentChecklist.map((item) => (
              <div key={item} className="flex gap-2 rounded-lg bg-[#F3FAF7] p-3 text-sm font-semibold text-[#364A45]">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#008A8C]" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </WolliPageShell>
  );
}

export function WolliProfilePage({ onLogout }: { onLogout: () => void }) {
  const [name, setName] = useState(() => readName());
  const [email, setEmail] = useState(() => readEmail());
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'account' ? 'account' : 'timeline';
  const officialLinks = [
    { title: 'Bayside Council', body: 'Official council home page.', url: BAYSIDE_HOME_URL, icon: wolliShortcutIcons.info },
    { title: 'Latest News', body: 'Official Bayside updates and alerts.', url: BAYSIDE_NEWS_URL, icon: wolliShortcutIcons.alerts },
    { title: "What's On", body: 'Official Bayside event listings.', url: BAYSIDE_EVENTS_URL, icon: wolliShortcutIcons.events },
    { title: 'Boundaries & wards', body: 'Official Bayside Council ward boundary lookup.', url: BAYSIDE_WARD_BOUNDARY_URL, icon: wolliShortcutIcons.maps },
    { title: 'Contact Council', body: 'Phone, email, and service centre details.', url: BAYSIDE_CONTACT_URL, icon: wolliShortcutIcons.chat },
  ];

  useEffect(() => {
    setName(readName());
    setEmail(readEmail());
  }, []);

  const setTab = (tab: 'timeline' | 'account') => {
    setSearchParams(tab === 'timeline' ? { tab: 'timeline' } : { tab: 'account' });
  };

  return (
    <WolliPageShell>
      <section className="px-5 pb-8 pt-6 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-[1fr_260px] sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCEBE5] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#008A8C] shadow-sm">
              <User className="h-4 w-4" />
              Where's Wolli
            </div>
            <h1 className="mt-4 text-[2.5rem] font-black leading-none text-[#062D4F] sm:text-[3.6rem]">
              {name ? `${name}'s local guide` : 'Your local guide'}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-[#364A45]">
              Wolli is a Bayside local companion. Official council decisions, applications, payments, and urgent updates should be checked through Bayside Council.
            </p>
          </div>
          <img src={APP_CONFIG.webIcon} alt="Where's Wolli logo" className="hidden w-full rounded-lg object-contain sm:block" />
        </div>
      </section>

      <div className="space-y-8 px-5 sm:px-8">
        <section className="grid grid-cols-2 gap-2 rounded-[18px] border border-[#DCEBE5] bg-[#F8FAFC] p-1.5 shadow-sm">
          {([
            { id: 'timeline', label: 'My Timeline', icon: Home },
            { id: 'account', label: 'Account', icon: User },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-black transition ${
                  active
                    ? 'bg-white text-[#008A8C] shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
                    : 'text-[#64748B]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </section>

        {activeTab === 'timeline' ? (
          <WolliTimelineSection email={email} />
        ) : (
          <section className="rounded-[22px] border border-[#DCEBE5] bg-white p-4 shadow-[0_8px_22px_rgba(20,40,37,0.06)]">
            <SectionHeading eyebrow="Profile" title={name || 'Local resident'} body={email || 'No email saved on this device.'} />
            <button
              type="button"
              onClick={onLogout}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#F2C3B6] bg-[#FFF7F3] px-4 py-2 text-sm font-black text-[#A33A1D]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </section>
        )}

        <section className="space-y-3 pb-6">
          <SectionHeading eyebrow="Official links" title="Use council pages for final details" body="Applications, payments, reports, bookings, and rules should be checked on Bayside Council pages." />
          <div className="grid gap-3 sm:grid-cols-2">
            {officialLinks.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => openWolliExternalUrl(item.url)}
                className="rounded-lg border border-[#DCEBE5] bg-white p-4 text-left shadow-[0_8px_22px_rgba(20,40,37,0.06)] transition hover:-translate-y-0.5 hover:border-[#97D7CF]"
              >
                <img src={item.icon} alt="" className="h-16 w-16 object-contain" />
                <h3 className="mt-3 break-words text-base font-black leading-tight text-[#17221F] [overflow-wrap:anywhere]">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#58706A]">{item.body}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#006C72]">
                  Open official page <ExternalLink className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </WolliPageShell>
  );
}
