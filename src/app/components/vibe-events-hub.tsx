import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import {
  type ButtonHTMLAttributes,
  Fragment,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DateRange } from "react-day-picker";
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  GripVertical,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Route,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { ItineraryRouteMap, ITINERARY_MAP_STYLE_URL } from "./itinerary-route-map";
import { universityCoordinates } from "../lib/au-universities";
import {
  addCustomItineraryStop,
  createItineraryPlan,
  deletePublicPlan,
  fetchItineraryWalkingRoute,
  fetchOfficialEvents,
  fetchOfficialEventUniversities,
  fetchMyItinerary,
  fetchProfile,
  fetchPublicPlans,
  joinPublicPlan,
  leavePublicPlan,
  removeCustomItineraryStop,
  removeEventFromItinerary,
  rejectPublicPlan,
  reorderItineraryDay,
  resolveItineraryLocationFromMapUrl,
  updateCustomItineraryStop,
  type CustomItineraryStopPayload,
  type ItineraryEvent,
  type ItineraryWalkingRoute,
  type OfficialEvent,
  type OfficialEventFacet,
  type OfficialEventUniversity,
  type OfficialEventsMeta,
  type PublicPlan,
  type PublicPlanVisibility,
} from "../lib/api";
import { APP_CONFIG } from "../lib/app-config";
import { getCurrentAppPosition } from "../lib/geolocation";
import {
  getKeyboardAwareLargeSheetStyle,
  keyboardAwareLargeSheetBodyStyle,
  keyboardAwareLargeSheetFooterStyle,
} from "../lib/keyboard-ui";
import { isNativeShell } from "../lib/platform";
import {
  COUNCIL_WHATS_ON_LINKS,
  getCouncilWhatsOnLink,
} from "../lib/council-whats-on-links";
import {
  buildPublicPlanRoute,
  buildStandalonePlanRoute,
} from "../lib/public-plan-links";
import {
  buildOfficialEventShareDescriptor,
  buildPublicPlanShareDescriptor,
  buildStandalonePublicPlanShareDescriptor,
} from "../lib/hoodie-share";
import { shareHoodieDescriptorGeneric } from "../lib/instagram-story-share";
import {
  getPublicPlanActionGridClass,
  getPublicPlanPersonInitials,
} from "../lib/public-plan-ui";
import {
  formatItinerarySpotSummary,
  shouldShowItineraryPlanNote,
} from "../lib/itinerary-plan-display";
import { ExperienceLaunchMark } from "./hoodie-launch-splash";
import { useGharData } from "./layout";
import { NetworkingCardsPanel } from "./networking-cards-panel";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { useIsMobile } from "./ui/use-mobile";

export type EventsTab = "whatson" | "networking" | "plans";
type EventFilterKey = "when" | "types" | "categories";
export type PlansView = "public" | "my" | "itinerary";
export type NetworkingView = "events" | "cards";
export type OfficialEventsSourceMode = "lga" | "university";
export type EventDateRangeState = {
  startDay: string;
  endDay: string;
};
export type VibeEventsHubStateUpdate = {
  networkingView?: NetworkingView;
  officialEventsSourceMode?: OfficialEventsSourceMode;
  officialEventWhen?: EventDateRangeState;
  officialEventTypes?: string[];
  officialEventCategories?: string[];
  selectedUniversityId?: string;
  plansView?: PlansView;
};

type ItineraryPlanDraft = {
  title: string;
  note: string;
  meetingPoint: string;
  meetupAt: string;
  attendeeCap: string;
  visibility: PublicPlanVisibility;
  inviteeEmails: string;
};

type CustomItineraryStopDraft = {
  eventSlug?: string;
  isCreateItinerary?: boolean;
  title: string;
  summary: string;
  eventDay: string;
  upcomingTime: string;
  venueName: string;
  address: string;
  mapsUrl: string;
  imageUrl: string;
  lat: string;
  lng: string;
};

const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };
const OFFICIAL_EVENTS_TIMEZONE = "Australia/Sydney";
const OFFICIAL_EVENTS_WEB_FALLBACK_URL =
  "https://whatson.cityofsydney.nsw.gov.au/events";
const UNIVERSITY_EVENTS_WEB_FALLBACK_URL =
  "https://campus.hellorubric.com/search?country=AU&type=events&iframe=true&showall=true";
const NETWORKING_EVENTS_WEB_FALLBACK_URL =
  "https://app.thefoundersunion.com/events";
const DEFAULT_COUNCIL_WHATS_ON_SLUG = "city-of-sydney";
const OFFICIAL_EVENTS_PAGE_SIZE = 24;
const OFFICIAL_EVENTS_NAV_CACHE_TTL_MS = 10 * 60 * 1000;
const OFFICIAL_EVENTS_SESSION_CACHE_KEY = "ghar_vibe_official_events_nav_cache_v2";
const OFFICIAL_EVENTS_SESSION_CACHE_LIMIT = 12;
const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  timeZone: OFFICIAL_EVENTS_TIMEZONE,
});

type OfficialEventsNavigationCacheEntry = {
  events: OfficialEvent[];
  meta: OfficialEventsMeta | null;
  hasMore: boolean;
  nextOffset: number | null;
  scrollTop: number;
  scrollHeight?: number;
  scrollY?: number;
  lastOpenedEventKey?: string;
  updatedAt: number;
};

const officialEventsNavigationCache = new Map<
  string,
  OfficialEventsNavigationCacheEntry
>();

function readOfficialEventsSessionCache() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(OFFICIAL_EVENTS_SESSION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, OfficialEventsNavigationCacheEntry>;
    Object.entries(parsed).forEach(([queryKey, entry]) => {
      if (!queryKey || !entry || !Array.isArray(entry.events)) return;
      if (Date.now() - Number(entry.updatedAt || 0) > OFFICIAL_EVENTS_NAV_CACHE_TTL_MS) {
        return;
      }
      officialEventsNavigationCache.set(queryKey, {
        events: entry.events,
        meta: entry.meta || null,
        hasMore: Boolean(entry.hasMore),
        nextOffset: typeof entry.nextOffset === "number" ? entry.nextOffset : null,
        scrollTop: Number(entry.scrollTop ?? entry.scrollY ?? 0),
        scrollHeight: Number(entry.scrollHeight || 0) || undefined,
        scrollY: Number(entry.scrollY || 0) || undefined,
        lastOpenedEventKey: String(entry.lastOpenedEventKey || "") || undefined,
        updatedAt: Number(entry.updatedAt || Date.now()),
      });
    });
  } catch {
    // Session cache is a best-effort navigation hint.
  }
}

function persistOfficialEventsSessionCache() {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.from(officialEventsNavigationCache.entries())
      .filter(([, entry]) => Date.now() - entry.updatedAt <= OFFICIAL_EVENTS_NAV_CACHE_TTL_MS)
      .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
      .slice(0, OFFICIAL_EVENTS_SESSION_CACHE_LIMIT);
    window.sessionStorage.setItem(
      OFFICIAL_EVENTS_SESSION_CACHE_KEY,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    // Ignore quota/private-mode failures; memory cache still works for this tab.
  }
}

function readOfficialEventsNavigationCache(queryKey: string) {
  if (officialEventsNavigationCache.size === 0) {
    readOfficialEventsSessionCache();
  }
  const cached = officialEventsNavigationCache.get(queryKey);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > OFFICIAL_EVENTS_NAV_CACHE_TTL_MS) {
    officialEventsNavigationCache.delete(queryKey);
    persistOfficialEventsSessionCache();
    return null;
  }
  return cached;
}

function writeOfficialEventsNavigationCache(
  queryKey: string,
  entry: Partial<OfficialEventsNavigationCacheEntry>,
) {
  if (!queryKey) return;
  const current = readOfficialEventsNavigationCache(queryKey);
  officialEventsNavigationCache.set(queryKey, {
    events: current?.events || [],
    meta: current?.meta || null,
    hasMore: current?.hasMore || false,
    nextOffset: current?.nextOffset ?? null,
    scrollTop: current?.scrollTop ?? current?.scrollY ?? 0,
    scrollHeight: current?.scrollHeight,
    scrollY: current?.scrollY,
    lastOpenedEventKey: current?.lastOpenedEventKey,
    ...entry,
    updatedAt: Date.now(),
  });
  persistOfficialEventsSessionCache();
}

export function clearVibeEventsHubOfficialEventsCacheForTest() {
  officialEventsNavigationCache.clear();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(OFFICIAL_EVENTS_SESSION_CACHE_KEY);
  }
}

function normalizeCouncilWhatsOnSlug(slug?: string) {
  const normalizedSlug =
    String(slug || "").trim() || DEFAULT_COUNCIL_WHATS_ON_SLUG;
  return getCouncilWhatsOnLink(normalizedSlug)
    ? normalizedSlug
    : DEFAULT_COUNCIL_WHATS_ON_SLUG;
}

function formatSydneyDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeUniversityMatchName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getDefaultOfficialEventRange(daysAhead = 29) {
  const start = new Date();
  const end = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return {
    startDay: formatSydneyDayKey(start),
    endDay: formatSydneyDayKey(end),
  };
}

export function normalizeOfficialEventRange(
  startDay?: string,
  endDay?: string,
) {
  const start = String(startDay || "").trim();
  const end = String(endDay || "").trim();
  if (!start && !end) return null;

  const normalizedStart = start || end;
  if (!normalizedStart) return null;

  const normalizedEnd = !end || end < normalizedStart ? normalizedStart : end;
  return {
    startDay: normalizedStart,
    endDay: normalizedEnd,
  };
}

export function applyOfficialEventDateSelection(
  range: EventDateRangeState,
  activeBoundary: "start" | "end",
  selectedDay: string,
) {
  const normalizedSelectedDay = String(selectedDay || "").trim();
  if (!normalizedSelectedDay) {
    return {
      nextRange: range,
      nextBoundary: activeBoundary,
    };
  }

  if (activeBoundary === "start") {
    return {
      nextRange: {
        startDay: normalizedSelectedDay,
        endDay: normalizedSelectedDay,
      },
      nextBoundary: "end" as const,
    };
  }

  const currentStartDay = String(range.startDay || "").trim();
  if (currentStartDay && normalizedSelectedDay < currentStartDay) {
    return {
      nextRange: {
        startDay: normalizedSelectedDay,
        endDay: currentStartDay,
      },
      nextBoundary: "start" as const,
    };
  }

  const normalizedRange = normalizeOfficialEventRange(
    currentStartDay || normalizedSelectedDay,
    normalizedSelectedDay,
  );
  return {
    nextRange: normalizedRange || {
      startDay: normalizedSelectedDay,
      endDay: normalizedSelectedDay,
    },
    nextBoundary: "start" as const,
  };
}

function formatDayLabel(dayKey: string) {
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map((part) => Number(part));
  if (!year || !month || !day) return dayKey;
  return DAY_LABEL_FORMATTER.format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function formatCompactDayLabel(dayKey: string, includeYear = false) {
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map((part) => Number(part));
  if (!year || !month || !day) return dayKey;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 12))).replace(",", "");
}

function formatWhenSummary(range: { startDay: string; endDay: string }) {
  if (!range.startDay && !range.endDay) return "Any";
  const startDay = range.startDay || range.endDay;
  const endDay = range.endDay || range.startDay;
  const includeYear = startDay.slice(0, 4) !== endDay.slice(0, 4);
  const startLabel = formatCompactDayLabel(startDay, includeYear);
  const endLabel = formatCompactDayLabel(endDay, includeYear);
  if (!startLabel) return endLabel;
  if (!endLabel || startDay === endDay) return startLabel;
  return `${startLabel}-${endLabel}`;
}

function parseDayKeyToDate(dayKey: string) {
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function eventRangeToCalendarRange(
  range: EventDateRangeState,
): DateRange | undefined {
  const start = parseDayKeyToDate(range.startDay || range.endDay);
  const end = parseDayKeyToDate(range.endDay || range.startDay);
  if (!start) return undefined;
  return { from: start, to: end || start };
}

function slugToLabel(value: string) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatEventListDate(event: OfficialEvent) {
  const primaryDate = event.upcoming_date || event.dates?.[0] || "";
  if (primaryDate) {
    const parsedDate = new Date(`${primaryDate}T12:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      const formattedDate = new Intl.DateTimeFormat("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(parsedDate);
      return [formattedDate, event.upcoming_time].filter(Boolean).join(" • ");
    }
  }
  return event.dates_humanized || "Upcoming";
}

function formatEventListLocation(event: OfficialEvent) {
  const primary = event.venue_name || event.address || event.suburb || "";
  const secondary = event.venue_name ? event.address || event.suburb || "" : "";
  return [primary, secondary].filter(Boolean).join(" • ");
}

function formatFacetSummary(
  selectedIds: string[],
  emptyLabel: string,
  facets: OfficialEventFacet[],
  pluralLabel: string,
) {
  if (selectedIds.length === 0) return emptyLabel;
  if (selectedIds.length === 1) {
    const matchedFacet = facets.find((facet) => facet.id === selectedIds[0]);
    return matchedFacet?.label || slugToLabel(selectedIds[0]);
  }
  return `${selectedIds.length} ${pluralLabel}`;
}

function getEventListLabels(event: OfficialEvent) {
  const seen = new Set<string>();
  const orderedLabels = [
    ...event.tags.map(slugToLabel),
    ...event.categories.map(slugToLabel),
  ].filter((label) => {
    const normalized = label.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return {
    visible: orderedLabels.slice(0, 2),
    hiddenCount: Math.max(0, orderedLabels.length - 2),
  };
}

function PlanStatusPill({ status }: { status: PublicPlan["status"] }) {
  const className =
    status === "active"
      ? "bg-[#DCFCE7] text-[#166534]"
      : status === "full"
        ? "bg-[#DBEAFE] text-[#1D4ED8]"
        : status === "ended"
          ? "bg-[#F1F5F9] text-[#475569]"
          : "bg-[#FEE2E2] text-[#B91C1C]";

  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const FilterTriggerButton = forwardRef<
  HTMLButtonElement,
  {
    icon: typeof CalendarDays;
    label: string;
    summary: string;
    active: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function FilterTriggerButton(
  { icon: Icon, label, summary, active, className, ...buttonProps },
  ref,
) {
  const isSetuChina = APP_CONFIG.variant === "setu_china";
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      className={`${className || ""} min-w-0 rounded-[18px] border text-left transition ${
        isSetuChina ? "min-h-[72px] px-3 py-3" : "px-3 py-2.5"
      } ${
        active
          ? "border-[#0F766E] bg-[#F0FDFA] shadow-[0_10px_24px_rgba(15,118,110,0.08)]"
          : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
      }`}
    >
      <div className={`flex items-start gap-2 text-[10px] font-semibold text-[#64748B] ${
        isSetuChina ? "leading-tight tracking-normal" : "uppercase tracking-[0.18em]"
      }`}>
        <Icon className="h-3.5 w-3.5 text-[#0F766E]" strokeWidth={1.7} />
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`min-w-0 text-[15px] font-semibold leading-5 text-[#0F172A] ${
          isSetuChina ? "break-words [overflow-wrap:anywhere]" : "truncate"
        }`}>
          {summary}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[#94A3B8]"
          strokeWidth={1.7}
        />
      </div>
    </button>
  );
});

function FilterOptionButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
        active
          ? "border-[#99F6E4] bg-[#F0FDFA]"
          : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active
            ? "border-[#0F766E] bg-[#0F766E] text-white"
            : "border-[#CBD5E1] bg-white text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-[#0F172A] [overflow-wrap:anywhere]">
        {label}
      </span>
      {typeof count === "number" ? (
        <span className="shrink-0 text-xs font-medium text-[#94A3B8]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SetuChinaSegmentLabel({ label }: { label: string }) {
  const match = label.match(/^(.*)\s+([\u3400-\u9FFF].*)$/);
  if (!match) {
    return (
      <span className="break-words [overflow-wrap:anywhere]">
        {label}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-center leading-tight">
      <span className="max-w-full break-words [overflow-wrap:anywhere]">
        {match[1]}
      </span>
      <span className="max-w-full break-words text-[12px] font-semibold [overflow-wrap:anywhere]">
        {match[2]}
      </span>
    </span>
  );
}

function FilterSurface({
  mobile,
  open,
  onOpenChange,
  title,
  trigger,
  children,
  onClear,
}: {
  mobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: ReactNode;
  children: ReactNode;
  onClear?: () => void;
}) {
  if (mobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent
            overlayClassName="z-[5000]"
            className="z-[5010] overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white shadow-[0_-18px_48px_rgba(15,23,42,0.22)] data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--native-safe-area-top)-1rem)]"
          >
            <DrawerHeader className="shrink-0 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className="text-lg font-bold text-[#0F172A]">
                  {title}
                </DrawerTitle>
                {onClear ? (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-sm font-semibold text-[#0F766E] transition hover:text-[#115E59]"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </DrawerHeader>
            <DrawerBody className="max-h-[52vh] pb-2 pt-4">
              {children}
            </DrawerBody>
            <DrawerFooter className="border-t border-[#E2E8F0] bg-white/95 pb-[calc(var(--native-safe-area-bottom)+16px)]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
              >
                Done
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] rounded-[24px] border-[#E2E8F0] p-0 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4">
          <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-semibold text-[#0F766E] transition hover:text-[#115E59]"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="max-h-[360px] overflow-y-auto p-4">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function EventDatePickerSurface({
  mobile,
  open,
  range,
  onRangeChange,
  onClear,
  onClose,
  onApply,
}: {
  mobile: boolean;
  open: boolean;
  range: EventDateRangeState;
  onRangeChange: (nextRange: EventDateRangeState) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const [activeBoundary, setActiveBoundary] = useState<"start" | "end">(
    "start",
  );

  useEffect(() => {
    if (!open) return;
    setActiveBoundary("start");
  }, [open]);

  if (!open) return null;

  const selectedRange = eventRangeToCalendarRange(range);
  const defaultMonth =
    selectedRange?.from ||
    parseDayKeyToDate(getDefaultOfficialEventRange().startDay) ||
    new Date();

  const handleDaySelect = (day: Date) => {
    const selectedDay = formatSydneyDayKey(day);
    if (!selectedDay) return;
    const selection = applyOfficialEventDateSelection(
      range,
      activeBoundary,
      selectedDay,
    );
    onRangeChange(selection.nextRange);
    setActiveBoundary(selection.nextBoundary);
  };

  const shell = (
    <div
      className={`flex h-full flex-col overflow-hidden bg-white ${mobile ? "" : "max-h-[90vh] w-full max-w-3xl rounded-[32px] border border-[#E2E8F0] shadow-[0_30px_80px_rgba(15,23,42,0.18)]"}`}
    >
      <div className="shrink-0 border-b border-[#E2E8F0] px-4 py-4 md:px-6">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#E2E8F0] md:hidden" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#0F172A]">When</h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Pick one date or a start and end date for a range.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-semibold text-[#0F766E] transition hover:text-[#115E59]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC]"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveBoundary("start")}
            className={`rounded-[22px] border px-4 py-3 text-left transition ${
              activeBoundary === "start"
                ? "border-[#0F766E] bg-[#F0FDFA] shadow-[0_10px_24px_rgba(15,118,110,0.08)]"
                : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
              Start date
            </p>
            <p className="mt-2 text-base font-semibold text-[#0F172A]">
              {range.startDay ? formatDayLabel(range.startDay) : "Tap a date"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveBoundary("end")}
            className={`rounded-[22px] border px-4 py-3 text-left transition ${
              activeBoundary === "end"
                ? "border-[#0F766E] bg-[#F0FDFA] shadow-[0_10px_24px_rgba(15,118,110,0.08)]"
                : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
              End date
            </p>
            <p className="mt-2 text-base font-semibold text-[#0F172A]">
              {range.endDay
                ? formatDayLabel(range.endDay)
                : range.startDay
                  ? formatDayLabel(range.startDay)
                  : "Tap a date"}
            </p>
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white">
          <Calendar
            mode="range"
            selected={selectedRange}
            onDayClick={handleDaySelect}
            defaultMonth={defaultMonth}
            numberOfMonths={mobile ? 1 : 2}
            className="p-4"
            classNames={{
              months: mobile
                ? "mx-auto flex w-fit flex-col items-center gap-6"
                : "mx-auto flex w-fit flex-col items-center gap-6 md:flex-row md:items-start md:gap-8",
              month: "mx-auto flex w-fit flex-col gap-4",
              caption: "relative flex w-full items-center justify-center px-10",
              caption_label: "text-base font-semibold text-[#0F172A]",
              table: "mx-auto border-collapse",
              head_row: "flex justify-center",
              row: "mt-2 flex justify-center",
              head_cell:
                "w-10 text-center text-[12px] font-medium text-[#94A3B8]",
              day: "h-10 w-10 rounded-full p-0 text-sm font-medium text-[#0F172A]",
              cell: "relative p-0 text-center text-sm",
              day_range_middle:
                "aria-selected:bg-[#DBEAFE] aria-selected:text-[#1E3A8A]",
              day_selected:
                "bg-[#0F172A] text-white hover:bg-[#0F172A] hover:text-white focus:bg-[#0F172A] focus:text-white",
              day_range_start:
                "day-range-start rounded-full bg-[#0F172A] text-white",
              day_range_end:
                "day-range-end rounded-full bg-[#0F172A] text-white",
            }}
          />
        </div>
        <div className="mt-4 pb-[calc(var(--native-safe-area-bottom)+16px)] md:pb-0">
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-[22px] bg-[#0F172A] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#1E293B]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return <div className="fixed inset-0 z-[1100] bg-white">{shell}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(15,23,42,0.38)] p-6"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full"
        onClick={(event) => event.stopPropagation()}
      >
        {shell}
      </div>
    </div>
  );
}

function EventListCard({
  event,
  onOpen,
}: {
  event: OfficialEvent;
  onOpen: () => void;
}) {
  const labelSet = getEventListLabels(event);
  const locationLine = formatEventListLocation(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-official-event-key={officialEventCacheKey(event)}
      className="flex w-full items-start gap-2.5 rounded-[20px] border border-[#E2E8F0] bg-white p-2.5 text-left shadow-sm transition hover:border-[#CBD5E1] hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
    >
      {event.hero_image_url || event.image_url ? (
        <img
          src={event.hero_image_url || event.image_url}
          alt={event.title}
          className="h-20 w-20 shrink-0 rounded-[16px] object-cover sm:h-24 sm:w-24"
          loading="lazy"
        />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-[16px] bg-[#F1F5F9] sm:h-24 sm:w-24" />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[17px] font-bold leading-[1.25] text-[#0F172A] sm:text-lg">
          {event.title}
        </h3>
        <p className="mt-1 text-[13px] font-medium text-[#475569] sm:text-sm">
          {formatEventListDate(event)}
        </p>
        {locationLine ? (
          <div className="mt-1.5 flex items-start gap-1.5 text-[13px] text-[#64748B] sm:text-sm">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E] sm:h-4 sm:w-4"
              strokeWidth={1.7}
            />
            <span className="line-clamp-2">{locationLine}</span>
          </div>
        ) : null}

        {labelSet.visible.length > 0 || labelSet.hiddenCount > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {labelSet.visible.map((label) => (
              <span
                key={label}
                className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]"
              >
                {label}
              </span>
            ))}
            {labelSet.hiddenCount > 0 ? (
              <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4338CA]">
                +{labelSet.hiddenCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function appendUniqueOfficialEvents(
  current: OfficialEvent[],
  nextPage: OfficialEvent[],
) {
  const merged = [...current];
  const seen = new Set(
    current.map((event) => `${event.source}:${event.slug}`),
  );

  nextPage.forEach((event) => {
    const key = `${event.source}:${event.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(event);
  });

  return merged;
}

function officialEventCacheKey(event: OfficialEvent) {
  return `${event.source}:${event.slug}`;
}

function readOfficialEventsScrollSnapshot(
  scroller: HTMLDivElement | null,
  fallback?: Pick<
    OfficialEventsNavigationCacheEntry,
    "scrollTop" | "scrollHeight" | "scrollY"
  > | null,
  options: { preserveFallbackWhenZero?: boolean } = {},
) {
  if (!scroller) {
    const fallbackTop = Number(fallback?.scrollTop ?? fallback?.scrollY ?? 0);
    return {
      scrollTop: fallbackTop,
      scrollHeight: Number(fallback?.scrollHeight || 0) || undefined,
    };
  }
  const currentTop = Number(scroller.scrollTop || 0);
  const fallbackTop = Number(fallback?.scrollTop ?? fallback?.scrollY ?? 0);
  return {
    scrollTop: currentTop > 0 || !options.preserveFallbackWhenZero ? currentTop : fallbackTop,
    scrollHeight: Number(scroller.scrollHeight || 0) || undefined,
  };
}

function scrollOfficialEventsScrollerTo(
  scroller: HTMLDivElement,
  scrollTop: number,
) {
  const targetTop = Math.max(0, Math.round(Number(scrollTop) || 0));
  if (typeof scroller.scrollTo === "function") {
    try {
      scroller.scrollTo({ left: 0, top: targetTop, behavior: "auto" });
    } catch {
      // Some test/WebView environments expose scrollTo without implementing it.
    }
  }
  scroller.scrollTop = targetTop;
}

function findOfficialEventCardByKey(
  scroller: HTMLDivElement,
  eventKey?: string,
) {
  if (!eventKey) return null;
  return Array.from(
    scroller.querySelectorAll<HTMLElement>("[data-official-event-key]"),
  ).find((node) => node.dataset.officialEventKey === eventKey) || null;
}

function scrollOfficialEventCardIntoView(
  scroller: HTMLDivElement,
  eventKey?: string,
) {
  const card = findOfficialEventCardByKey(scroller, eventKey);
  if (!card) return;
  const cardOffsetTop = Number(card.offsetTop || 0);
  if (cardOffsetTop > 0) {
    scrollOfficialEventsScrollerTo(scroller, Math.max(0, cardOffsetTop - 16));
    return;
  }
  if (typeof card.scrollIntoView === "function") {
    card.scrollIntoView({ block: "center", behavior: "auto" });
  }
}

function compareItineraryEvents(left: ItineraryEvent, right: ItineraryEvent) {
  const leftDay = left.event_day || "9999-12-31";
  const rightDay = right.event_day || "9999-12-31";
  if (leftDay !== rightDay) return leftDay.localeCompare(rightDay);
  if (left.order !== right.order) return left.order - right.order;
  return left.title.localeCompare(right.title);
}

function groupItineraryEvents(events: ItineraryEvent[]) {
  const groups = new Map<string, ItineraryEvent[]>();
  [...events].sort(compareItineraryEvents).forEach((event) => {
    const day = event.event_day || "undated";
    groups.set(day, [...(groups.get(day) || []), event]);
  });
  return Array.from(groups.entries()).map(([day, items]) => ({
    day,
    items: items.sort(compareItineraryEvents),
  }));
}

function applyItineraryDayOrder(
  events: ItineraryEvent[],
  eventDay: string,
  eventKeys: string[],
) {
  const orderByKey = new Map(eventKeys.map((key, index) => [key, index]));
  return events
    .map((event) =>
      event.event_day === eventDay && orderByKey.has(event.event_key)
        ? { ...event, order: orderByKey.get(event.event_key) || 0 }
        : event,
    )
    .sort(compareItineraryEvents);
}

function moveItineraryEventWithinDay(
  events: ItineraryEvent[],
  eventDay: string,
  activeKey: string,
  targetKey: string,
) {
  if (!activeKey || !targetKey || activeKey === targetKey) return events;
  const dayKeys = events
    .filter((event) => event.event_day === eventDay)
    .sort(compareItineraryEvents)
    .map((event) => event.event_key);
  const fromIndex = dayKeys.indexOf(activeKey);
  const toIndex = dayKeys.indexOf(targetKey);
  if (fromIndex < 0 || toIndex < 0) return events;
  const nextKeys = [...dayKeys];
  const [moved] = nextKeys.splice(fromIndex, 1);
  nextKeys.splice(toIndex, 0, moved);
  return applyItineraryDayOrder(events, eventDay, nextKeys);
}

function formatItineraryDayHeading(dayKey: string) {
  if (dayKey === "undated") return "Date TBC";
  const [year, month, day] = String(dayKey || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return dayKey;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: OFFICIAL_EVENTS_TIMEZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function getItineraryAreaChips(events: ItineraryEvent[]) {
  const seen = new Set<string>();
  return events
    .map((event) => event.suburb || event.venue_name || event.address)
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value) => {
      const normalized = value.trim().toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 4);
}

function getItineraryRouteSummary(events: ItineraryEvent[], isSetuChina: boolean) {
  const stopCount = events.length;
  const chips = getItineraryAreaChips(events);
  const countLabel = isSetuChina
    ? `${stopCount} 站`
    : `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  if (chips.length === 0) return countLabel;
  return `${countLabel} · ${chips.join(" → ")}`;
}

function buildItineraryMapUrl(event: ItineraryEvent) {
  const mapsUrl = firstNonEmptyString(event.maps_url);
  if (mapsUrl) return mapsUrl;
  const lat = Number(event.lat);
  const lng = Number(event.lng);
  const query = Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat},${lng}`
    : [event.venue_name, event.address, event.suburb]
        .filter((value) => Boolean(String(value || "").trim()))
        .join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function isIsoDayKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type ItineraryMapStop = {
  event: ItineraryEvent;
  eventKey: string;
  stopNumber: number;
  lat: number;
  lng: number;
};

function hasValidItineraryCoordinatePair(lat: unknown, lng: unknown) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function getItineraryMapStops(events: ItineraryEvent[]) {
  return events.flatMap((event, index): ItineraryMapStop[] => {
    if (!hasValidItineraryCoordinatePair(event.lat, event.lng)) return [];
    return [
      {
        event,
        eventKey: event.event_key,
        stopNumber: index + 1,
        lat: Number(event.lat),
        lng: Number(event.lng),
      },
    ];
  });
}

function getItineraryMapBounds(stops: ItineraryMapStop[]) {
  return stops.reduce(
    (bounds, stop) => ({
      minLat: Math.min(bounds.minLat, stop.lat),
      maxLat: Math.max(bounds.maxLat, stop.lat),
      minLng: Math.min(bounds.minLng, stop.lng),
      maxLng: Math.max(bounds.maxLng, stop.lng),
    }),
    {
      minLat: stops[0]?.lat ?? SYDNEY_CENTER.lat,
      maxLat: stops[0]?.lat ?? SYDNEY_CENTER.lat,
      minLng: stops[0]?.lng ?? SYDNEY_CENTER.lng,
      maxLng: stops[0]?.lng ?? SYDNEY_CENTER.lng,
    },
  );
}

function getItineraryMapInitialView(stops: ItineraryMapStop[]) {
  if (stops.length === 0) {
    return { longitude: SYDNEY_CENTER.lng, latitude: SYDNEY_CENTER.lat, zoom: 10 };
  }
  const bounds = getItineraryMapBounds(stops);
  const latDelta = Math.abs(bounds.maxLat - bounds.minLat);
  const lngDelta = Math.abs(bounds.maxLng - bounds.minLng);
  const maxDelta = Math.max(latDelta, lngDelta);
  const zoom =
    maxDelta <= 0.008 ? 14 :
    maxDelta <= 0.025 ? 13 :
    maxDelta <= 0.06 ? 12 :
    maxDelta <= 0.15 ? 11 : 10;
  return {
    longitude: (bounds.minLng + bounds.maxLng) / 2,
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    zoom,
  };
}

function buildItineraryRouteGeoJson(stops: ItineraryMapStop[]) {
  return {
    type: "FeatureCollection",
    features: stops.length > 1
      ? [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: stops.map((stop) => [stop.lng, stop.lat]),
            },
          },
        ]
      : [],
  };
}

function buildItineraryWalkingRouteStops(stops: ItineraryMapStop[]) {
  return stops.map((stop) => ({
    event_key: stop.eventKey,
    lat: stop.lat,
    lng: stop.lng,
  }));
}

function getRouteGeometryOrFallback(
  route: ItineraryWalkingRoute | null,
  stops: ItineraryMapStop[],
) {
  if (route?.geometry?.type === "FeatureCollection") {
    return route.geometry;
  }
  return buildItineraryRouteGeoJson(stops);
}

function formatItineraryRouteMetric(
  route: ItineraryWalkingRoute | null,
  isSetuChina: boolean,
) {
  if (!route || route.status === "unavailable") return "";
  const distance = Number(route.distance_m);
  const duration = Number(route.duration_s);
  const parts: string[] = [];
  if (Number.isFinite(distance) && distance > 0) {
    parts.push(distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`);
  }
  if (Number.isFinite(duration) && duration > 0) {
    const minutes = Math.max(1, Math.round(duration / 60));
    parts.push(isSetuChina ? `约 ${minutes} 分钟步行` : `${minutes} min walk`);
  }
  return parts.join(" · ");
}

function getRouteStatusLabel(route: ItineraryWalkingRoute | null, isSetuChina: boolean) {
  if (!route) return isSetuChina ? "规划步行路线中" : "Routing walk";
  if (route.status === "walking") return isSetuChina ? "步行路线" : "Walking route";
  if (route.status === "fallback") return isSetuChina ? "直线路线备用" : "Fallback route";
  return isSetuChina ? "地图站点" : "Mapped stops";
}

function buildDefaultItineraryPlanMeetupAt(dayKey: string) {
  const todayKey = formatSydneyDayKey(new Date());
  const targetDay = isIsoDayKey(dayKey) && dayKey > todayKey
    ? dayKey
    : formatSydneyDayKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return `${targetDay}T09:00`;
}

function buildDefaultItineraryPlanDraft(dayKey: string, events: ItineraryEvent[]): ItineraryPlanDraft {
  const firstEvent = events[0];
  const dayLabel = formatCompactDayLabel(dayKey, true);
  return {
    title: `${dayLabel} itinerary`,
    note: "",
    meetingPoint: firstEvent
      ? firstNonEmptyString(firstEvent.venue_name, firstEvent.address, firstEvent.suburb)
      : "Meet at the first stop",
    meetupAt: buildDefaultItineraryPlanMeetupAt(dayKey),
    attendeeCap: "",
    visibility: "public",
    inviteeEmails: "",
  };
}

function buildDefaultCustomStopDraft(
  dayKey = formatSydneyDayKey(new Date()),
  isCreateItinerary = false,
): CustomItineraryStopDraft {
  return {
    isCreateItinerary,
    title: "",
    summary: "",
    eventDay: dayKey,
    upcomingTime: "",
    venueName: "",
    address: "",
    mapsUrl: "",
    imageUrl: "",
    lat: "",
    lng: "",
  };
}

function buildCustomStopDraftFromEvent(event: ItineraryEvent): CustomItineraryStopDraft {
  return {
    eventSlug: event.event_slug,
    isCreateItinerary: false,
    title: event.title,
    summary: event.summary || "",
    eventDay: event.event_day,
    upcomingTime: event.upcoming_time || "",
    venueName: event.venue_name || "",
    address: event.address || "",
    mapsUrl: event.maps_url || event.source_url || "",
    imageUrl: event.hero_image_url || event.image_url || "",
    lat: event.lat == null ? "" : String(event.lat),
    lng: event.lng == null ? "" : String(event.lng),
  };
}

function customStopDraftToPayload(draft: CustomItineraryStopDraft): CustomItineraryStopPayload {
  const lat = draft.lat.trim() ? Number(draft.lat) : null;
  const lng = draft.lng.trim() ? Number(draft.lng) : null;
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    event_day: draft.eventDay.trim(),
    upcoming_time: draft.upcomingTime.trim(),
    venue_name: draft.venueName.trim(),
    address: draft.address.trim(),
    maps_url: draft.mapsUrl.trim(),
    image_url: draft.imageUrl.trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function parseInviteeEmailsInput(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function ItineraryMapFallback({
  events,
  isSetuChina,
}: {
  events: ItineraryEvent[];
  isSetuChina: boolean;
}) {
  return (
    <div
      data-testid="itinerary-map-fallback"
      className="relative overflow-hidden rounded-[24px] border border-[#DDE7F0] bg-[#ECFDF5] p-4"
    >
      <div className="absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute left-[-10%] top-[12%] h-px w-[120%] rotate-[-14deg] bg-[#A7F3D0]" />
        <div className="absolute left-[-8%] top-[50%] h-px w-[120%] rotate-[11deg] bg-[#A7F3D0]" />
        <div className="absolute bottom-[18%] left-[-4%] h-px w-[112%] rotate-[-4deg] bg-[#A7F3D0]" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
              {isSetuChina ? "路线地图" : "Route map"}
            </p>
            <p className="mt-1 text-xs font-medium text-[#64748B]">
              {isSetuChina ? "这些活动暂时没有坐标，已按行程顺序显示。" : "Coordinates are not available yet, so stops are shown in itinerary order."}
            </p>
          </div>
          <Route className="h-5 w-5 shrink-0 text-[#0F766E]" strokeWidth={1.8} />
        </div>
        <div className="mt-4 grid gap-2">
          {events.slice(0, 4).map((event, index) => (
            <div
              key={event.event_key}
              className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-xs font-semibold text-[#0F172A] shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[11px] font-black text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{event.venue_name || event.suburb || event.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItineraryEmptyMapPlaceholder({ isSetuChina }: { isSetuChina: boolean }) {
  return (
    <div
      data-testid="itinerary-empty-map"
      className="relative overflow-hidden rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-4 top-6 h-px w-[85%] rotate-[-10deg] bg-[#E2E8F0]" />
        <div className="absolute left-2 top-20 h-px w-[92%] rotate-[9deg] bg-[#E2E8F0]" />
        <div className="absolute bottom-8 left-6 h-px w-[80%] rotate-[-4deg] bg-[#E2E8F0]" />
      </div>
      <div className="relative flex min-h-[142px] items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[#0F766E] shadow-sm">
          <MapPin className="h-7 w-7" strokeWidth={1.7} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F172A]">
            {isSetuChina ? "你的路线地图会显示在这里" : "Your route map will appear here"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">
            {isSetuChina
              ? "打开活动详情并点击 Attend 后，地图会显示你当天的站点。"
              : "Open an event and tap Attend to map your stops for the day."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ItineraryMapPreview({
  events,
  isSetuChina,
  email,
  eventDay,
}: {
  events: ItineraryEvent[];
  isSetuChina: boolean;
  email: string;
  eventDay: string;
}) {
  const stops = useMemo(() => getItineraryMapStops(events), [events]);
  const routeStops = useMemo(() => buildItineraryWalkingRouteStops(stops), [stops]);
  const [walkingRoute, setWalkingRoute] = useState<ItineraryWalkingRoute | null>(null);
  const [walkingRouteLoading, setWalkingRouteLoading] = useState(false);
  const [walkingRouteError, setWalkingRouteError] = useState("");
  const routeGeoJson = useMemo(
    () => getRouteGeometryOrFallback(walkingRoute, stops),
    [stops, walkingRoute],
  );
  const initialViewState = useMemo(() => getItineraryMapInitialView(stops), [stops]);
  const routeMetric = formatItineraryRouteMetric(walkingRoute, isSetuChina);
  const routeStatusLabel = getRouteStatusLabel(walkingRoute, isSetuChina);

  useEffect(() => {
    let cancelled = false;
    if (!email || !eventDay || routeStops.length < 2) {
      setWalkingRoute(null);
      setWalkingRouteError("");
      setWalkingRouteLoading(false);
      return;
    }
    setWalkingRouteLoading(true);
    setWalkingRouteError("");
    fetchItineraryWalkingRoute({
      email,
      eventDay,
      stops: routeStops,
      appVariant: APP_CONFIG.variant,
    })
      .then((route) => {
        if (cancelled) return;
        setWalkingRoute(route);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("GHAR itinerary walking route error:", error);
        setWalkingRoute(null);
        setWalkingRouteError(
          isSetuChina ? "暂时无法规划步行路线" : "Walking route unavailable",
        );
      })
      .finally(() => {
        if (!cancelled) setWalkingRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email, eventDay, isSetuChina, routeStops]);

  if (stops.length === 0) {
    return <ItineraryMapFallback events={events} isSetuChina={isSetuChina} />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#DDE7F0] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
            {isSetuChina ? "路线地图" : "Route map"}
          </p>
          <p className="text-xs font-medium text-[#64748B]">
            {routeMetric ||
              (isSetuChina
                ? "按当天行程顺序显示地图站点。"
                : "Numbered by your itinerary order for this day.")}
          </p>
        </div>
        <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#0F766E]">
          {walkingRouteLoading
            ? isSetuChina ? "路线中" : "Routing"
            : routeStatusLabel}
        </span>
      </div>
      <div className="relative">
        <ItineraryRouteMap
          stops={stops.map((stop) => ({
            id: stop.eventKey,
            stopNumber: stop.stopNumber,
            title: stop.event.title,
            lat: stop.lat,
            lng: stop.lng,
          }))}
          routeGeoJson={routeGeoJson}
          initialViewState={initialViewState}
          mapStyle={ITINERARY_MAP_STYLE_URL}
          isSetuChina={isSetuChina}
        />
        {walkingRouteError ? (
          <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#92400E] shadow-sm">
            {walkingRouteError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VibeEventsHub({
  eventTab,
  councilParam = "",
  networkingView: controlledNetworkingView,
  officialEventsSourceMode: controlledOfficialEventsSourceMode,
  officialEventWhen: controlledOfficialEventWhen,
  officialEventTypes: controlledOfficialEventTypes,
  officialEventCategories: controlledOfficialEventCategories,
  selectedUniversityId: controlledSelectedUniversityId,
  plansView: controlledPlansView,
  onEventTabChange,
  onCouncilChange,
  onStateChange,
}: {
  eventTab: EventsTab;
  councilParam?: string;
  networkingView?: NetworkingView;
  officialEventsSourceMode?: OfficialEventsSourceMode;
  officialEventWhen?: EventDateRangeState;
  officialEventTypes?: string[];
  officialEventCategories?: string[];
  selectedUniversityId?: string;
  plansView?: PlansView;
  onEventTabChange: (tab: EventsTab) => void;
  onCouncilChange?: (councilSlug: string) => void;
  onStateChange?: (updates: VibeEventsHubStateUpdate) => void;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { banners } = useGharData();
  const sessionEmail = localStorage.getItem("ghar_email") || "";
  const isSetuChina = APP_CONFIG.variant === "setu_china";
  const isWolli = APP_CONFIG.variant === "wheres_wolli";
  const sharedFeedAppVariant = isSetuChina || APP_CONFIG.variant === "jom_settle" ? ("burb_mate" as const) : undefined;
  const [queryCenter, setQueryCenter] = useState(SYDNEY_CENTER);
  const [openFilter, setOpenFilter] = useState<EventFilterKey | null>(null);
  const [fallbackNetworkingView, setFallbackNetworkingView] =
    useState<NetworkingView>("events");
  const [fallbackOfficialEventsSourceMode, setFallbackOfficialEventsSourceMode] =
    useState<OfficialEventsSourceMode>("lga");
  const [fallbackOfficialEventWhen, setFallbackOfficialEventWhen] =
    useState<EventDateRangeState>({ startDay: "", endDay: "" });
  const [draftOfficialEventWhen, setDraftOfficialEventWhen] =
    useState<EventDateRangeState>(() => getDefaultOfficialEventRange());
  const [fallbackOfficialEventTypes, setFallbackOfficialEventTypes] = useState<string[]>([]);
  const [fallbackOfficialEventCategories, setFallbackOfficialEventCategories] = useState<
    string[]
  >([]);
  const [officialEvents, setOfficialEvents] = useState<OfficialEvent[]>([]);
  const [officialEventsMeta, setOfficialEventsMeta] =
    useState<OfficialEventsMeta | null>(null);
  const [officialEventsLoading, setOfficialEventsLoading] = useState(false);
  const [officialEventsLoadingMore, setOfficialEventsLoadingMore] =
    useState(false);
  const [officialEventsError, setOfficialEventsError] = useState<string | null>(
    null,
  );
  const [officialEventsLoadMoreError, setOfficialEventsLoadMoreError] =
    useState<string | null>(null);
  const [officialEventsRetryToken, setOfficialEventsRetryToken] = useState(0);
  const [officialEventsHasMore, setOfficialEventsHasMore] = useState(false);
  const [officialEventsNextOffset, setOfficialEventsNextOffset] = useState<
    number | null
  >(null);
  const [officialEventUniversities, setOfficialEventUniversities] = useState<
    OfficialEventUniversity[]
  >([]);
  const [officialEventUniversitiesLoading, setOfficialEventUniversitiesLoading] =
    useState(false);
  const [officialEventUniversitiesError, setOfficialEventUniversitiesError] =
    useState<string | null>(null);
  const [fallbackSelectedUniversityId, setFallbackSelectedUniversityId] = useState("");
  const [selectedCouncilSlug, setSelectedCouncilSlug] = useState(
    () => normalizeCouncilWhatsOnSlug(councilParam),
  );
  const [fallbackPlansView, setFallbackPlansView] = useState<PlansView>("public");
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planActionId, setPlanActionId] = useState<string | null>(null);
  const [planDeleteId, setPlanDeleteId] = useState<string | null>(null);
  const [planRejectId, setPlanRejectId] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryEvent[]>([]);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [itineraryActionId, setItineraryActionId] = useState<string | null>(null);
  const [draggedItineraryKey, setDraggedItineraryKey] = useState<string | null>(null);
  const [itineraryPlanDraftDay, setItineraryPlanDraftDay] = useState<string | null>(null);
  const [itineraryPlanDraft, setItineraryPlanDraft] = useState<ItineraryPlanDraft | null>(null);
  const [itineraryPlanSubmitting, setItineraryPlanSubmitting] = useState(false);
  const [customStopDraft, setCustomStopDraft] = useState<CustomItineraryStopDraft | null>(null);
  const [customStopSubmitting, setCustomStopSubmitting] = useState(false);
  const [customStopResolving, setCustomStopResolving] = useState(false);
  const [itineraryShareStatus, setItineraryShareStatus] = useState("");
  const [planShareStatus, setPlanShareStatus] = useState("");
  const [showPastItineraries, setShowPastItineraries] = useState(false);
  const officialEventsQueryKeyRef = useRef("");
  const lastRestoredOfficialEventsScrollRef = useRef("");
  const officialEventsScrollRef = useRef<HTMLDivElement | null>(null);
  const officialEventsScrollSaveTimerRef = useRef<number | null>(null);
  const lastEventTabRef = useRef(eventTab);
  const itineraryRef = useRef<ItineraryEvent[]>([]);
  const draggedItineraryRef = useRef<{ eventKey: string; eventDay: string } | null>(null);
  const networkingView = controlledNetworkingView || fallbackNetworkingView;
  const officialEventsSourceMode =
    controlledOfficialEventsSourceMode || fallbackOfficialEventsSourceMode;
  const officialEventWhen =
    controlledOfficialEventWhen || fallbackOfficialEventWhen;
  const officialEventTypes =
    controlledOfficialEventTypes || fallbackOfficialEventTypes;
  const officialEventCategories =
    controlledOfficialEventCategories || fallbackOfficialEventCategories;
  const selectedUniversityId =
    controlledSelectedUniversityId ?? fallbackSelectedUniversityId;
  const plansView = controlledPlansView || fallbackPlansView;
  const isNetworkingEventsTab = eventTab === "networking";
  const isNetworkingCardsView = isNetworkingEventsTab && networkingView === "cards";
  const isOfficialEventsListTab =
    eventTab === "whatson" || (isNetworkingEventsTab && !isNetworkingCardsView);
  const isUniversityEventsMode =
    eventTab === "whatson" && officialEventsSourceMode === "university";
  const itineraryGroups = useMemo(
    () => groupItineraryEvents(itinerary),
    [itinerary],
  );

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  const applyStateChange = useCallback(
    (updates: VibeEventsHubStateUpdate) => {
      if (onStateChange) {
        onStateChange(updates);
        return;
      }
      if (updates.networkingView !== undefined) {
        setFallbackNetworkingView(updates.networkingView);
      }
      if (updates.officialEventsSourceMode !== undefined) {
        setFallbackOfficialEventsSourceMode(updates.officialEventsSourceMode);
      }
      if (updates.officialEventWhen !== undefined) {
        setFallbackOfficialEventWhen(updates.officialEventWhen);
      }
      if (updates.officialEventTypes !== undefined) {
        setFallbackOfficialEventTypes(updates.officialEventTypes);
      }
      if (updates.officialEventCategories !== undefined) {
        setFallbackOfficialEventCategories(updates.officialEventCategories);
      }
      if (updates.selectedUniversityId !== undefined) {
        setFallbackSelectedUniversityId(updates.selectedUniversityId);
      }
      if (updates.plansView !== undefined) {
        setFallbackPlansView(updates.plansView);
      }
    },
    [onStateChange],
  );

  const handleNetworkingViewChange = useCallback(
    (nextView: NetworkingView) => {
      applyStateChange({ networkingView: nextView });
    },
    [applyStateChange],
  );

  const explicitOfficialEventRange = useMemo(
    () =>
      normalizeOfficialEventRange(
        officialEventWhen.startDay,
        officialEventWhen.endDay,
      ),
    [officialEventWhen.endDay, officialEventWhen.startDay],
  );
  const currentSydneyDayKey = formatSydneyDayKey(new Date());
  const currentItineraryGroups = useMemo(
    () =>
      itineraryGroups.filter(
        (group) => group.day === "undated" || group.day >= currentSydneyDayKey,
      ),
    [currentSydneyDayKey, itineraryGroups],
  );
  const pastItineraryGroups = useMemo(
    () =>
      itineraryGroups.filter(
        (group) => group.day !== "undated" && group.day < currentSydneyDayKey,
      ),
    [currentSydneyDayKey, itineraryGroups],
  );
  const visibleItineraryGroups = useMemo(
    () =>
      showPastItineraries
        ? [...currentItineraryGroups, ...pastItineraryGroups]
        : currentItineraryGroups,
    [currentItineraryGroups, pastItineraryGroups, showPastItineraries],
  );
  const firstPastItineraryDay = pastItineraryGroups[0]?.day || "";
  const defaultOfficialEventRange = useMemo(
    () => getDefaultOfficialEventRange(isUniversityEventsMode ? 6 : isWolli ? 89 : 29),
    [currentSydneyDayKey, isUniversityEventsMode, isWolli],
  );
  const committedOfficialEventStartDay =
    explicitOfficialEventRange?.startDay || "";
  const committedOfficialEventEndDay = explicitOfficialEventRange?.endDay || "";
  const effectiveOfficialEventRange =
    explicitOfficialEventRange || defaultOfficialEventRange;
  const selectedUniversity = useMemo(
    () =>
      officialEventUniversities.find((item) => item.id === selectedUniversityId) ||
      null,
    [officialEventUniversities, selectedUniversityId],
  );
  const officialEventsSourceGroup = isNetworkingEventsTab
    ? ("networking" as const)
    : isUniversityEventsMode
      ? ("campus" as const)
      : undefined;
  const officialEventsCouncilSlug =
    isNetworkingEventsTab || isUniversityEventsMode ? undefined : selectedCouncilSlug;
  const officialEventsUniversityId = isUniversityEventsMode
    ? selectedUniversityId
    : undefined;
  const officialEventsBaseParams = useMemo(
    () => ({
      appVariant: sharedFeedAppVariant,
      sourceGroup: officialEventsSourceGroup,
      councilSlug: officialEventsCouncilSlug,
      universityId: officialEventsUniversityId,
      preset: explicitOfficialEventRange || isWolli ? undefined : ("next_thirty" as const),
      categories: isNetworkingEventsTab ? [] : officialEventTypes,
      tags: officialEventCategories,
      centerLat: queryCenter.lat,
      centerLng: queryCenter.lng,
      limit: OFFICIAL_EVENTS_PAGE_SIZE,
      startDay: effectiveOfficialEventRange.startDay,
      endDay: effectiveOfficialEventRange.endDay,
    }),
    [
      effectiveOfficialEventRange.endDay,
      effectiveOfficialEventRange.startDay,
      explicitOfficialEventRange,
      isNetworkingEventsTab,
      isWolli,
      officialEventCategories,
      officialEventsCouncilSlug,
      officialEventsSourceGroup,
      officialEventsUniversityId,
      officialEventTypes,
      queryCenter.lat,
      queryCenter.lng,
      sharedFeedAppVariant,
    ],
  );
  const officialEventsQueryKey = useMemo(
    () =>
      JSON.stringify({
        preset: officialEventsBaseParams.preset || "",
        categories: officialEventsBaseParams.categories,
        councilSlug: officialEventsBaseParams.councilSlug || "",
        universityId: officialEventsBaseParams.universityId || "",
        sourceGroup: officialEventsBaseParams.sourceGroup || "",
        tags: officialEventsBaseParams.tags,
        limit: officialEventsBaseParams.limit,
        startDay: officialEventsBaseParams.startDay,
        endDay: officialEventsBaseParams.endDay,
        appVariant: officialEventsBaseParams.appVariant || "",
      }),
    [officialEventsBaseParams],
  );
  const saveOfficialEventsScrollPosition = useCallback((options?: {
    lastOpenedEventKey?: string;
  }) => {
    const activeQueryKey = officialEventsQueryKeyRef.current;
    if (!activeQueryKey) return;
    const snapshot = readOfficialEventsScrollSnapshot(
      officialEventsScrollRef.current,
      readOfficialEventsNavigationCache(activeQueryKey),
    );
    writeOfficialEventsNavigationCache(activeQueryKey, options?.lastOpenedEventKey
      ? { ...snapshot, lastOpenedEventKey: options.lastOpenedEventKey }
      : snapshot);
  }, []);
  const restoreOfficialEventsScrollPosition = useCallback(
    (
      queryKey: string,
      cacheEntry: Pick<
        OfficialEventsNavigationCacheEntry,
        "scrollTop" | "scrollHeight" | "scrollY" | "lastOpenedEventKey"
      >,
    ) => {
      if (typeof window === "undefined") return;
      const scrollTop = Number(cacheEntry.scrollTop ?? cacheEntry.scrollY ?? 0);
      const lastOpenedEventKey = cacheEntry.lastOpenedEventKey;
      if (scrollTop <= 0 && !lastOpenedEventKey) return;
      const restoreKey = `${queryKey}:${Math.round(scrollTop)}:${lastOpenedEventKey || ""}`;
      if (lastRestoredOfficialEventsScrollRef.current === restoreKey) return;
      lastRestoredOfficialEventsScrollRef.current = restoreKey;

      const restore = () => {
        const scroller = officialEventsScrollRef.current;
        if (!scroller) return;
        if (scrollTop > 0) {
          scrollOfficialEventsScrollerTo(scroller, scrollTop);
        }
        const expectedHeight = Number(cacheEntry.scrollHeight || 0);
        const contentHeightShifted =
          expectedHeight > 0 && Math.abs(scroller.scrollHeight - expectedHeight) > 48;
        const didNotMoveEnough =
          scrollTop > 0 && Math.abs(Number(scroller.scrollTop || 0) - scrollTop) > 48;
        if (lastOpenedEventKey && (scrollTop <= 0 || contentHeightShifted || didNotMoveEnough)) {
          scrollOfficialEventCardIntoView(scroller, lastOpenedEventKey);
        }
      };
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            restore();
            window.setTimeout(restore, 80);
          });
        });
      } else {
        window.setTimeout(restore, 0);
      }
    },
    [],
  );
  const openOfficialEventDetail = useCallback(
    (event: OfficialEvent) => {
      saveOfficialEventsScrollPosition({
        lastOpenedEventKey: officialEventCacheKey(event),
      });
      navigate(`/events/${event.source}/${event.slug}`);
    },
    [navigate, saveOfficialEventsScrollPosition],
  );
  const handleOfficialEventsScroll = useCallback(() => {
    if (!isOfficialEventsListTab || typeof window === "undefined") return;
    if (officialEventsScrollSaveTimerRef.current != null) {
      window.clearTimeout(officialEventsScrollSaveTimerRef.current);
    }
    officialEventsScrollSaveTimerRef.current = window.setTimeout(() => {
      officialEventsScrollSaveTimerRef.current = null;
      saveOfficialEventsScrollPosition();
    }, 120);
  }, [isOfficialEventsListTab, saveOfficialEventsScrollPosition]);

  const eventPanelBanners = useMemo(
    () =>
      banners.filter(
        (banner) =>
          Boolean(banner?.url) && banner?.placement === "official_events",
    ),
    [banners],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && officialEventsScrollSaveTimerRef.current != null) {
        window.clearTimeout(officialEventsScrollSaveTimerRef.current);
        officialEventsScrollSaveTimerRef.current = null;
      }
      saveOfficialEventsScrollPosition();
    };
  }, [saveOfficialEventsScrollPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saveBeforeLeaving = () => {
      saveOfficialEventsScrollPosition();
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        saveOfficialEventsScrollPosition();
      }
    };
    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [saveOfficialEventsScrollPosition]);

  useEffect(() => {
    setSelectedCouncilSlug(normalizeCouncilWhatsOnSlug(councilParam));
  }, [councilParam]);

  useEffect(() => {
    if (!APP_CONFIG.showOfficialEventsFeature || eventTab !== "whatson") {
      return;
    }

    let cancelled = false;
    setOfficialEventUniversitiesLoading(true);
    setOfficialEventUniversitiesError(null);

    const loadUniversities = async () => {
      try {
        const universities = await fetchOfficialEventUniversities({
          appVariant: sharedFeedAppVariant,
        });
        let profileUniversityName = "";
        if (sessionEmail) {
          try {
            const profile = await fetchProfile(sessionEmail);
            profileUniversityName = String(profile?.university || "");
          } catch {
            profileUniversityName = "";
          }
        }
        const normalizedProfileUniversity = normalizeUniversityMatchName(
          profileUniversityName,
        );
        const profileMatch = normalizedProfileUniversity
          ? universities.find((item) => {
            const normalizedName = normalizeUniversityMatchName(item.name);
            return normalizedName === normalizedProfileUniversity ||
              normalizedName.includes(normalizedProfileUniversity) ||
              normalizedProfileUniversity.includes(normalizedName);
          })
          : null;
        const preferredUniversity =
          profileMatch ||
          universities.find((item) => Number(item.upcoming_count || 0) > 0) ||
          universities.find((item) => item.id === "5") ||
          universities[0] ||
          null;
        if (cancelled) return;
        setOfficialEventUniversities(universities);
        if (
          !selectedUniversityId ||
          !universities.some((item) => item.id === selectedUniversityId)
        ) {
          applyStateChange({
            selectedUniversityId: preferredUniversity?.id || "",
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("GHAR VibeEventsHub university events load error:", error);
        setOfficialEventUniversities([]);
        setOfficialEventUniversitiesError(
          error instanceof Error
            ? error.message
            : "Failed to load universities",
        );
      } finally {
        if (!cancelled) setOfficialEventUniversitiesLoading(false);
      }
    };

    void loadUniversities();

    return () => {
      cancelled = true;
    };
  }, [applyStateChange, eventTab, selectedUniversityId, sessionEmail, sharedFeedAppVariant]);

  useEffect(() => {
    if (!isUniversityEventsMode || !selectedUniversity) return;
    if (selectedUniversity.lat == null || selectedUniversity.lng == null) return;
    setQueryCenter({
      lat: Number(selectedUniversity.lat),
      lng: Number(selectedUniversity.lng),
    });
  }, [isUniversityEventsMode, selectedUniversity]);

  const setFilterState = useCallback(
    (filter: EventFilterKey, open: boolean) => {
      setOpenFilter((current) => {
        if (open) return filter;
        return current === filter ? null : current;
      });
    },
    [],
  );

  const toggleOfficialEventType = useCallback((typeId: string) => {
    applyStateChange({
      officialEventTypes: officialEventTypes.includes(typeId)
        ? officialEventTypes.filter((item) => item !== typeId)
        : [...officialEventTypes, typeId],
    });
  }, [applyStateChange, officialEventTypes]);

  const toggleOfficialEventCategory = useCallback((categoryId: string) => {
    applyStateChange({
      officialEventCategories: officialEventCategories.includes(categoryId)
        ? officialEventCategories.filter((item) => item !== categoryId)
        : [...officialEventCategories, categoryId],
    });
  }, [applyStateChange, officialEventCategories]);

  useEffect(() => {
    let cancelled = false;

    const seedCenter = async () => {
      if (sessionEmail) {
        try {
          const profile = await fetchProfile(sessionEmail);
          if (cancelled || !profile) return;
          if (profile.work_lat != null && profile.work_lng != null) {
            setQueryCenter({
              lat: Number(profile.work_lat),
              lng: Number(profile.work_lng),
            });
          } else if (
            profile.university &&
            universityCoordinates[profile.university]
          ) {
            setQueryCenter(universityCoordinates[profile.university]);
          }
        } catch (error) {
          console.error("GHAR VibeEventsHub profile center error:", error);
        }
      }

      try {
        const position = await getCurrentAppPosition({
          timeout: 6000,
          maximumAge: 60000,
        });
        if (cancelled) return;
        setQueryCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch {
        // Keep the best-known non-GPS fallback.
      }
    };

    void seedCenter();

    return () => {
      cancelled = true;
    };
  }, [sessionEmail]);

  useEffect(() => {
    if (!APP_CONFIG.showOfficialEventsFeature || !isOfficialEventsListTab) {
      saveOfficialEventsScrollPosition();
      officialEventsQueryKeyRef.current = "";
      return;
    }

    let cancelled = false;
    officialEventsQueryKeyRef.current = officialEventsQueryKey;
    const cached = officialEventsRetryToken === 0
      ? readOfficialEventsNavigationCache(officialEventsQueryKey)
      : null;
    if (cached) {
      setOfficialEvents(cached.events);
      setOfficialEventsMeta(cached.meta);
      setOfficialEventsHasMore(cached.hasMore);
      setOfficialEventsNextOffset(cached.nextOffset);
      setOfficialEventsLoadingMore(false);
      setOfficialEventsError(null);
      setOfficialEventsLoadMoreError(null);
      restoreOfficialEventsScrollPosition(officialEventsQueryKey, cached);
    } else {
      setOfficialEvents([]);
      setOfficialEventsMeta(null);
      setOfficialEventsHasMore(false);
      setOfficialEventsNextOffset(null);
      setOfficialEventsLoadMoreError(null);
    }

    setOfficialEventsLoading(true);
    setOfficialEventsLoadingMore(false);
    setOfficialEventsError(null);

    fetchOfficialEvents(officialEventsBaseParams)
      .then(({ data, meta }) => {
        if (cancelled || officialEventsQueryKeyRef.current !== officialEventsQueryKey) {
          return;
        }
        const preserveCachedTail = Boolean(cached && cached.events.length > data.length);
        const refreshedEvents = preserveCachedTail
          ? appendUniqueOfficialEvents(data, cached?.events || [])
          : data;
        const hasMore = preserveCachedTail ? Boolean(cached?.hasMore) : Boolean(meta.has_more);
        const nextOffset = preserveCachedTail
          ? cached?.nextOffset ?? null
          : typeof meta.next_offset === "number" ? meta.next_offset : null;
        const refreshedMeta = preserveCachedTail
          ? {
              ...meta,
              returned_count: refreshedEvents.length,
              has_more: hasMore,
              next_offset: nextOffset,
            }
          : meta;
        setOfficialEvents(refreshedEvents);
        setOfficialEventsMeta(refreshedMeta);
        setOfficialEventsHasMore(hasMore);
        setOfficialEventsNextOffset(nextOffset);
        writeOfficialEventsNavigationCache(officialEventsQueryKey, {
          events: refreshedEvents,
          meta: refreshedMeta,
          hasMore,
          nextOffset,
          ...readOfficialEventsScrollSnapshot(
            officialEventsScrollRef.current,
            cached,
            { preserveFallbackWhenZero: true },
          ),
          lastOpenedEventKey: cached?.lastOpenedEventKey,
        });
      })
      .catch((error) => {
        if (cancelled || officialEventsQueryKeyRef.current !== officialEventsQueryKey) {
          return;
        }
        console.error("GHAR VibeEventsHub official events error:", error);
        if (!cached) {
          setOfficialEvents([]);
          setOfficialEventsMeta(null);
          setOfficialEventsHasMore(false);
          setOfficialEventsNextOffset(null);
        }
        setOfficialEventsError(
          error instanceof Error
            ? error.message
            : "Failed to load official events",
        );
      })
      .finally(() => {
        if (
          !cancelled &&
          officialEventsQueryKeyRef.current === officialEventsQueryKey
        ) {
          setOfficialEventsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    eventTab,
    isOfficialEventsListTab,
    officialEventsBaseParams,
    officialEventsQueryKey,
    officialEventsRetryToken,
    restoreOfficialEventsScrollPosition,
    saveOfficialEventsScrollPosition,
  ]);

  const handleLoadMoreOfficialEvents = useCallback(async () => {
    if (
      officialEventsLoading ||
      officialEventsLoadingMore ||
      !officialEventsHasMore ||
      officialEventsNextOffset == null
    ) {
      return;
    }

    const requestKey = officialEventsQueryKey;
    setOfficialEventsLoadingMore(true);
    setOfficialEventsLoadMoreError(null);

    try {
      const { data, meta } = await fetchOfficialEvents({
        ...officialEventsBaseParams,
        offset: officialEventsNextOffset,
      });
      if (officialEventsQueryKeyRef.current !== requestKey) return;
      const hasMore = Boolean(meta.has_more);
      const nextOffset = typeof meta.next_offset === "number" ? meta.next_offset : null;
      setOfficialEvents((current) => {
        const mergedEvents = appendUniqueOfficialEvents(current, data);
        writeOfficialEventsNavigationCache(requestKey, {
          events: mergedEvents,
          meta,
          hasMore,
          nextOffset,
          ...readOfficialEventsScrollSnapshot(
            officialEventsScrollRef.current,
            readOfficialEventsNavigationCache(requestKey),
          ),
        });
        return mergedEvents;
      });
      setOfficialEventsMeta(meta);
      setOfficialEventsHasMore(hasMore);
      setOfficialEventsNextOffset(nextOffset);
    } catch (error) {
      if (officialEventsQueryKeyRef.current !== requestKey) return;
      console.error("GHAR VibeEventsHub official events load-more error:", error);
      setOfficialEventsLoadMoreError(
        error instanceof Error
          ? error.message
          : "Failed to load more official events",
      );
    } finally {
      if (officialEventsQueryKeyRef.current === requestKey) {
        setOfficialEventsLoadingMore(false);
      }
    }
  }, [
    officialEventsBaseParams,
    officialEventsHasMore,
    officialEventsLoading,
    officialEventsLoadingMore,
    officialEventsNextOffset,
    officialEventsQueryKey,
  ]);

  const refreshPlans = useCallback(
    async (scope: PlansView = plansView) => {
      if (!APP_CONFIG.showPublicPlansFeature) return;
      if (scope === "itinerary") return;
      if (scope === "my" && !sessionEmail) {
        setPlans([]);
        setPlansError(null);
        setPlansLoading(false);
        return;
      }
      setPlansLoading(true);
      setPlansError(null);
      try {
        const nextPlans = await fetchPublicPlans({
          viewerEmail: sessionEmail || undefined,
          scope: scope === "my" ? "my" : undefined,
          appVariant: sharedFeedAppVariant,
        });
        setPlans(nextPlans);
      } catch (error) {
        console.error("GHAR VibeEventsHub public plans error:", error);
        setPlans([]);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load public plans";
        setPlansError(
          /event_source.*event_slug.*(required|provided)/i.test(message)
            ? `${APP_CONFIG.displayName} plans are refreshing right now. Please try again in a moment.`
            : message,
        );
      } finally {
        setPlansLoading(false);
      }
    },
    [plansView, sessionEmail, sharedFeedAppVariant],
  );

  const refreshItinerary = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!sessionEmail) {
      setItinerary([]);
      setItineraryError(null);
      setItineraryLoading(false);
      return;
    }
    const silent = Boolean(options.silent);
    if (!silent) setItineraryLoading(true);
    setItineraryError(null);
    try {
      const nextItinerary = await fetchMyItinerary({
        email: sessionEmail,
        appVariant: APP_CONFIG.variant,
      });
      setItinerary(nextItinerary.sort(compareItineraryEvents));
    } catch (error) {
      console.error("GHAR VibeEventsHub itinerary error:", error);
      if (!silent) setItinerary([]);
      setItineraryError(
        error instanceof Error ? error.message : "Failed to load itinerary",
      );
    } finally {
      if (!silent) setItineraryLoading(false);
    }
  }, [sessionEmail]);

  useEffect(() => {
    if (eventTab !== "plans") return;
    if (plansView === "itinerary") {
      void refreshItinerary();
      return;
    }
    void refreshPlans(plansView);
  }, [eventTab, plansView, refreshItinerary, refreshPlans]);

  useEffect(() => {
    if (!sessionEmail || eventTab !== "plans" || plansView !== "itinerary") return;
    let removeNativeListener: (() => void) | null = null;
    let cancelled = false;
    const refreshVisibleItinerary = () => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      void refreshItinerary({ silent: true });
    };
    const refreshFocusedItinerary = () => {
      void refreshItinerary({ silent: true });
    };
    document.addEventListener("visibilitychange", refreshVisibleItinerary);
    window.addEventListener("focus", refreshFocusedItinerary);
    if (isNativeShell()) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void refreshItinerary({ silent: true });
      }).then((listener) => {
        if (cancelled) {
          void listener.remove();
          return;
        }
        removeNativeListener = () => void listener.remove();
      });
    }
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshVisibleItinerary);
      window.removeEventListener("focus", refreshFocusedItinerary);
      removeNativeListener?.();
    };
  }, [eventTab, plansView, refreshItinerary, sessionEmail]);

  useEffect(() => {
    if (lastEventTabRef.current === eventTab) return;
    lastEventTabRef.current = eventTab;
    setOpenFilter(null);
  }, [eventTab]);

  useEffect(() => {
    if (openFilter !== "when") return;
    setDraftOfficialEventWhen(
      committedOfficialEventStartDay && committedOfficialEventEndDay
        ? {
            startDay: committedOfficialEventStartDay,
            endDay: committedOfficialEventEndDay,
          }
        : defaultOfficialEventRange,
    );
  }, [
    committedOfficialEventEndDay,
    committedOfficialEventStartDay,
    defaultOfficialEventRange,
    openFilter,
  ]);

  const handleClearOfficialEventDates = useCallback(() => {
    const clearedRange = { startDay: "", endDay: "" };
    setDraftOfficialEventWhen(clearedRange);
    applyStateChange({ officialEventWhen: clearedRange });
    setOpenFilter(null);
  }, [applyStateChange]);

  const handleApplyOfficialEventDates = useCallback(() => {
    const normalizedRange = normalizeOfficialEventRange(
      draftOfficialEventWhen.startDay,
      draftOfficialEventWhen.endDay,
    );
    applyStateChange({
      officialEventWhen: normalizedRange || { startDay: "", endDay: "" },
    });
    setOpenFilter(null);
  }, [applyStateChange, draftOfficialEventWhen.endDay, draftOfficialEventWhen.startDay]);

  const handleJoinLeave = useCallback(
    async (plan: PublicPlan) => {
      if (!sessionEmail) return;
      setPlanActionId(plan.id);
      setPlansError(null);
      try {
        if (plan.viewer_joined && plan.can_leave) {
          await leavePublicPlan(plan.id, sessionEmail);
        } else {
          await joinPublicPlan(plan.id, sessionEmail);
        }
        await refreshPlans();
      } catch (error) {
        console.error("GHAR VibeEventsHub join/leave error:", error);
        setPlansError(
          error instanceof Error
            ? error.message
            : "Failed to update plan attendance",
        );
      } finally {
        setPlanActionId(null);
      }
    },
    [refreshPlans, sessionEmail],
  );

  const handleRejectPlan = useCallback(
    async (plan: PublicPlan) => {
      if (!sessionEmail || !plan.can_reject) return;
      setPlanRejectId(plan.id);
      setPlansError(null);
      try {
        await rejectPublicPlan(plan.id, sessionEmail);
        await refreshPlans();
      } catch (error) {
        console.error("GHAR VibeEventsHub reject plan error:", error);
        setPlansError(
          error instanceof Error ? error.message : "Failed to reject plan",
        );
      } finally {
        setPlanRejectId(null);
      }
    },
    [refreshPlans, sessionEmail],
  );

  const handleDeletePlan = useCallback(
    async (plan: PublicPlan) => {
      if (
        !sessionEmail ||
        !window.confirm(
          "Delete this plan permanently? This removes the plan, attendees, and comments.",
        )
      ) {
        return;
      }
      setPlanDeleteId(plan.id);
      setPlansError(null);
      try {
        await deletePublicPlan(plan.id, sessionEmail);
        await refreshPlans();
      } catch (error) {
        console.error("GHAR VibeEventsHub delete plan error:", error);
        setPlansError(
          error instanceof Error ? error.message : "Failed to delete plan",
        );
      } finally {
        setPlanDeleteId(null);
      }
    },
    [refreshPlans, sessionEmail],
  );

  const commitItineraryDayOrder = useCallback(
    async (eventDay: string, eventKeys: string[]) => {
      if (!sessionEmail || !eventDay || eventKeys.length === 0) return;
      setItinerary((current) =>
        applyItineraryDayOrder(current, eventDay, eventKeys),
      );
      setItineraryError(null);
      try {
        const nextItinerary = await reorderItineraryDay({
          email: sessionEmail,
          eventDay,
          eventKeys,
          appVariant: APP_CONFIG.variant,
        });
        setItinerary(nextItinerary.sort(compareItineraryEvents));
      } catch (error) {
        console.error("GHAR VibeEventsHub itinerary reorder error:", error);
        setItineraryError(
          error instanceof Error
            ? error.message
            : "Failed to update itinerary order",
        );
        await refreshItinerary();
      }
    },
    [refreshItinerary, sessionEmail],
  );

  const handleMoveItineraryEvent = useCallback(
    (event: ItineraryEvent, direction: -1 | 1) => {
      const dayEvents = itineraryRef.current
        .filter((item) => item.event_day === event.event_day)
        .sort(compareItineraryEvents);
      const currentIndex = dayEvents.findIndex(
        (item) => item.event_key === event.event_key,
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= dayEvents.length) {
        return;
      }
      const eventKeys = dayEvents.map((item) => item.event_key);
      const [moved] = eventKeys.splice(currentIndex, 1);
      eventKeys.splice(nextIndex, 0, moved);
      void commitItineraryDayOrder(event.event_day, eventKeys);
    },
    [commitItineraryDayOrder],
  );

  const handleRemoveItineraryEvent = useCallback(
    async (event: ItineraryEvent) => {
      if (!sessionEmail) return;
      setItineraryActionId(event.event_key);
      setItineraryError(null);
      try {
        if (event.kind === "custom_stop") {
          await removeCustomItineraryStop({
            email: sessionEmail,
            eventSlug: event.event_slug,
            appVariant: APP_CONFIG.variant,
          });
        } else {
          await removeEventFromItinerary({
            email: sessionEmail,
            eventSource: event.event_source,
            eventSlug: event.event_slug,
            appVariant: APP_CONFIG.variant,
          });
        }
        await refreshItinerary();
      } catch (error) {
        console.error("GHAR VibeEventsHub itinerary remove error:", error);
        setItineraryError(
          error instanceof Error
            ? error.message
            : "Failed to remove event from itinerary",
        );
      } finally {
        setItineraryActionId(null);
      }
    },
    [refreshItinerary, sessionEmail],
  );

  const openCustomStopDraft = useCallback((dayKey?: string, options?: { createItinerary?: boolean }) => {
    setItineraryError(null);
    setItineraryShareStatus("");
    setCustomStopDraft(buildDefaultCustomStopDraft(dayKey, Boolean(options?.createItinerary)));
  }, []);

  const openCustomStopEdit = useCallback((event: ItineraryEvent) => {
    setItineraryError(null);
    setItineraryShareStatus("");
    setCustomStopDraft(buildCustomStopDraftFromEvent(event));
  }, []);

  const handleResolveCustomStopLocation = useCallback(async () => {
    if (!sessionEmail || !customStopDraft) return;
    setCustomStopResolving(true);
    setItineraryError(null);
    try {
      const resolved = await resolveItineraryLocationFromMapUrl({
        email: sessionEmail,
        appVariant: APP_CONFIG.variant,
        title: customStopDraft.title,
        venue_name: customStopDraft.venueName,
        address: customStopDraft.address,
        maps_url: customStopDraft.mapsUrl,
        lat: customStopDraft.lat.trim() ? Number(customStopDraft.lat) : null,
        lng: customStopDraft.lng.trim() ? Number(customStopDraft.lng) : null,
      });
      setCustomStopDraft((current) =>
        current
          ? {
              ...current,
              title: resolved.title || resolved.place_name || resolved.venue_name || current.title,
              venueName: resolved.place_name || resolved.venue_name || current.venueName,
              address: resolved.address || current.address,
              mapsUrl: resolved.maps_url || current.mapsUrl,
              lat: resolved.lat == null ? current.lat : String(resolved.lat),
              lng: resolved.lng == null ? current.lng : String(resolved.lng),
            }
          : current,
      );
    } catch (error) {
      console.error("GHAR VibeEventsHub custom stop resolve error:", error);
      setItineraryError(
        error instanceof Error ? error.message : "Failed to resolve location",
      );
    } finally {
      setCustomStopResolving(false);
    }
  }, [customStopDraft, sessionEmail]);

  const handleSaveCustomStop = useCallback(async () => {
    if (!sessionEmail || !customStopDraft) return;
    setCustomStopSubmitting(true);
    setItineraryError(null);
    try {
      const stop = customStopDraftToPayload(customStopDraft);
      if (customStopDraft.eventSlug) {
        await updateCustomItineraryStop({
          email: sessionEmail,
          eventSlug: customStopDraft.eventSlug,
          stop,
          appVariant: APP_CONFIG.variant,
        });
      } else {
        await addCustomItineraryStop({
          email: sessionEmail,
          stop,
          appVariant: APP_CONFIG.variant,
        });
      }
      setCustomStopDraft(null);
      await refreshItinerary();
    } catch (error) {
      console.error("GHAR VibeEventsHub custom stop save error:", error);
      setItineraryError(
        error instanceof Error ? error.message : "Failed to save itinerary stop",
      );
    } finally {
      setCustomStopSubmitting(false);
    }
  }, [customStopDraft, refreshItinerary, sessionEmail]);

  const openItineraryPlanDraft = useCallback((group: { day: string; items: ItineraryEvent[] }) => {
    setItineraryError(null);
    setItineraryShareStatus("");
    setItineraryPlanDraftDay(group.day);
    setItineraryPlanDraft(buildDefaultItineraryPlanDraft(group.day, group.items));
  }, []);

  const handleCreateItineraryPlan = useCallback(async () => {
    if (!sessionEmail || !itineraryPlanDraftDay || !itineraryPlanDraft) return;
    setItineraryPlanSubmitting(true);
    setItineraryError(null);
    try {
      const createdPlan = await createItineraryPlan({
        email: sessionEmail,
        appVariant: APP_CONFIG.variant,
        eventDay: itineraryPlanDraftDay,
        visibility: itineraryPlanDraft.visibility,
        title: itineraryPlanDraft.title,
        note: itineraryPlanDraft.note,
        meeting_point: itineraryPlanDraft.meetingPoint,
        meetup_at: itineraryPlanDraft.meetupAt,
        attendee_cap: itineraryPlanDraft.attendeeCap.trim()
          ? Number(itineraryPlanDraft.attendeeCap)
          : null,
        invitee_emails: parseInviteeEmailsInput(itineraryPlanDraft.inviteeEmails),
      });
      setItineraryPlanDraftDay(null);
      setItineraryPlanDraft(null);
      applyStateChange({ plansView: "my" });
      await refreshPlans("my");
      navigate(buildStandalonePlanRoute(createdPlan.id));
    } catch (error) {
      console.error("GHAR itinerary plan create error:", error);
      setItineraryError(
        error instanceof Error ? error.message : "Failed to create plan from itinerary",
      );
    } finally {
      setItineraryPlanSubmitting(false);
    }
  }, [
    applyStateChange,
    itineraryPlanDraft,
    itineraryPlanDraftDay,
    navigate,
    refreshPlans,
    sessionEmail,
  ]);

  const handleShareItineraryEvent = useCallback(async (event: ItineraryEvent) => {
    setItineraryShareStatus("");
    try {
      if (event.kind === "custom_stop") {
        const mapUrl = buildItineraryMapUrl(event);
        const shareText = [
          event.title,
          event.upcoming_time,
          firstNonEmptyString(event.venue_name, event.address),
          event.summary,
          mapUrl,
        ].filter(Boolean).join("\n");
        if (navigator.share) {
          await navigator.share({
            title: event.title,
            text: shareText,
            url: mapUrl || undefined,
          });
          setItineraryShareStatus(isSetuChina ? "已打开分享面板。" : "Share sheet opened.");
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          setItineraryShareStatus(isSetuChina ? "已复制站点详情。" : "Stop details copied.");
        }
        return;
      }
      const descriptor = buildOfficialEventShareDescriptor({
        source: event.event_source,
        slug: event.event_slug,
        title: event.title,
        summary: event.summary,
        source_label: event.source_label,
        free_event: true,
        dates_humanized: event.dates_humanized,
        venue_name: event.venue_name,
        suburb: event.suburb,
        image_url: event.image_url,
        hero_image_url: event.hero_image_url,
        instagram_post_image_url: event.image_url,
        instagram_story_image_url: event.hero_image_url || event.image_url,
      });
      const result = await shareHoodieDescriptorGeneric(descriptor);
      if (result.status !== "cancelled") {
        setItineraryShareStatus(result.message);
      }
    } catch (error) {
      console.error("GHAR itinerary event share error:", error);
      setItineraryShareStatus("Could not share this event right now.");
    }
  }, [isSetuChina]);

  const handleSharePlan = useCallback(async (plan: PublicPlan) => {
    setPlanShareStatus("");
    try {
      const descriptor =
        plan.source_type === "custom" || plan.source_type === "itinerary" || plan.event_source === "custom"
          ? buildStandalonePublicPlanShareDescriptor(plan)
          : buildPublicPlanShareDescriptor(plan);
      const result = await shareHoodieDescriptorGeneric(descriptor);
      if (result.status !== "cancelled") {
        setPlanShareStatus(result.message);
      }
    } catch (error) {
      console.error("GHAR public plan share error:", error);
      setPlanShareStatus("Could not share this plan right now.");
    }
  }, []);

  const handleItineraryDragStart = useCallback((event: ItineraryEvent) => {
    draggedItineraryRef.current = {
      eventKey: event.event_key,
      eventDay: event.event_day,
    };
    setDraggedItineraryKey(event.event_key);
  }, []);

  const handleItineraryDragEnter = useCallback((target: ItineraryEvent) => {
    const active = draggedItineraryRef.current;
    if (!active || active.eventDay !== target.event_day) return;
    if (active.eventKey === target.event_key) return;
    setItinerary((current) =>
      moveItineraryEventWithinDay(
        current,
        active.eventDay,
        active.eventKey,
        target.event_key,
      ),
    );
  }, []);

  const finishItineraryDrag = useCallback(() => {
    const active = draggedItineraryRef.current;
    if (!active) return;
    const eventKeys = itineraryRef.current
      .filter((event) => event.event_day === active.eventDay)
      .sort(compareItineraryEvents)
      .map((event) => event.event_key);
    draggedItineraryRef.current = null;
    setDraggedItineraryKey(null);
    void commitItineraryDayOrder(active.eventDay, eventKeys);
  }, [commitItineraryDayOrder]);

  useEffect(() => {
    window.addEventListener("pointerup", finishItineraryDrag);
    window.addEventListener("pointercancel", finishItineraryDrag);
    return () => {
      window.removeEventListener("pointerup", finishItineraryDrag);
      window.removeEventListener("pointercancel", finishItineraryDrag);
    };
  }, [finishItineraryDrag]);

  const openExternalUrl = useCallback((url?: string) => {
    const target = String(url || "").trim();
    if (!target) return;
    if (isNativeShell()) {
      void Browser.open({ url: target });
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  }, []);

  const retryOfficialEvents = useCallback(() => {
    setOfficialEventsRetryToken((current) => current + 1);
  }, []);

  const handleOfficialEventsSourceModeChange = useCallback(
    (nextMode: OfficialEventsSourceMode) => {
      applyStateChange({
        officialEventsSourceMode: nextMode,
        officialEventTypes: [],
        officialEventCategories: [],
        officialEventWhen: { startDay: "", endDay: "" },
      });
      setOpenFilter(null);
      retryOfficialEvents();
    },
    [applyStateChange, retryOfficialEvents],
  );

  const handleCouncilSelect = useCallback(
    (nextCouncilSlug: string) => {
      const normalizedSlug = normalizeCouncilWhatsOnSlug(nextCouncilSlug);
      setSelectedCouncilSlug(normalizedSlug);

      if (normalizedSlug === DEFAULT_COUNCIL_WHATS_ON_SLUG) {
        onCouncilChange?.("");
        retryOfficialEvents();
        return;
      }

      onCouncilChange?.(normalizedSlug);
      if (isWolli) {
        retryOfficialEvents();
        return;
      }
      const council = getCouncilWhatsOnLink(normalizedSlug);
      if (council) {
        openExternalUrl(council.url);
      }
    },
    [isWolli, onCouncilChange, openExternalUrl, retryOfficialEvents],
  );

  const handleUniversitySelect = useCallback((nextUniversityId: string) => {
    applyStateChange({
      selectedUniversityId: nextUniversityId,
      officialEventTypes: [],
      officialEventCategories: [],
    });
    setOpenFilter(null);
    retryOfficialEvents();
  }, [applyStateChange, retryOfficialEvents]);

  const availableOfficialEventTypes = useMemo(
    () =>
      [...(officialEventsMeta?.available_categories || [])].sort(
        (left, right) => left.label.localeCompare(right.label),
      ),
    [officialEventsMeta?.available_categories],
  );
  const availableOfficialEventCategories = useMemo(
    () =>
      [...(officialEventsMeta?.available_tags || [])].sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    [officialEventsMeta?.available_tags],
  );

  const typeSummary = formatFacetSummary(
    officialEventTypes,
    isSetuChina ? "全部" : "All",
    availableOfficialEventTypes,
    isNetworkingEventsTab
      ? isSetuChina ? "来源" : "sources"
      : isSetuChina ? "类型" : "types",
  );
  const categorySummary = formatFacetSummary(
    officialEventCategories,
    isSetuChina ? "全部" : "All",
    availableOfficialEventCategories,
    isNetworkingEventsTab
      ? isSetuChina ? "标签" : "tags"
      : isSetuChina ? "分类" : "categories",
  );
  const whenSummary = formatWhenSummary(effectiveOfficialEventRange);
  const primaryFilterLabel = isNetworkingEventsTab
    ? isSetuChina ? "Sources 来源" : "Sources"
    : isSetuChina ? "Types 类型" : "Types";
  const secondaryFilterLabel = isNetworkingEventsTab
    ? isSetuChina ? "Tags 标签" : "Tags"
    : isSetuChina ? "Categories 分类" : "Categories";
  const eventsFeedName = isNetworkingEventsTab
    ? isSetuChina ? "Networking 社交" : "Networking"
    : isUniversityEventsMode
      ? isSetuChina ? "University Events 大学活动" : "University Events"
    : isSetuChina ? "Events 活动" : "What's On";
  const eventsFallbackUrl = isNetworkingEventsTab
    ? NETWORKING_EVENTS_WEB_FALLBACK_URL
    : isUniversityEventsMode
      ? UNIVERSITY_EVENTS_WEB_FALLBACK_URL
    : OFFICIAL_EVENTS_WEB_FALLBACK_URL;
  const eventsErrorTitle = isNetworkingEventsTab
    ? isSetuChina ? "社交活动数据暂时无法加载。" : "The in-app Networking feed is having a moment."
    : isUniversityEventsMode
      ? isSetuChina ? "大学活动数据暂时无法加载。" : "The in-app University Events feed is having a moment."
    : isSetuChina ? "活动数据暂时无法加载。" : "The in-app event feed is having a moment.";
  const eventsErrorDescription = isNetworkingEventsTab
    ? isSetuChina ? "你可以打开实时来源页面，或稍后重试。"
      : "Open the live source page while we recover the in-app events list, or retry the feed now."
    : isUniversityEventsMode
      ? isSetuChina ? "你可以打开大学活动页面，或稍后重试。"
        : "Open the live University Events page while we recover the in-app events list, or retry the feed now."
    : isSetuChina ? "你可以打开实时活动页面，或稍后重试。"
      : "Open the live What's On page while we recover the in-app events list, or retry the feed now.";
  const eventsFallbackButtonLabel = isNetworkingEventsTab
    ? isSetuChina ? "打开来源页面" : "Open source page"
    : isUniversityEventsMode
      ? isSetuChina ? "打开大学活动页面" : "Open University Events"
    : isSetuChina ? "打开活动页面" : "Open What's On page";
  const showOfficialEventsLoadingState =
    !officialEventsError &&
    (officialEventsLoading || officialEventsMeta?.bootstrapping) &&
    officialEvents.length === 0;
  const plansHeading = plansView === "my"
    ? isSetuChina ? "我的计划" : "My live plans"
    : isSetuChina ? "实时计划" : "Live plans";
  const plansSubtitle =
    plansView === "my"
      ? isSetuChina ? "你创建、加入或被邀请的计划。" : "Plans you created, joined, or were invited to."
      : isSetuChina ? "查看可以加入或参考的公开计划。" : "Shared across supported app variants.";
  const plansEmptyMessage =
    plansView === "my"
      ? isSetuChina ? "你还没有创建、加入或收到任何实时计划邀请。" : "You haven't created, joined, or been invited to any live plans yet."
      : isSetuChina ? "目前暂无公开计划。" : "No active public plans are live right now.";

  if (!APP_CONFIG.showOfficialEventsFeature) {
    return (
      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#0F172A]">
          Events are not enabled in this app configuration.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={officialEventsScrollRef}
      data-testid="vibe-events-hub-scroll"
      data-vibe-events-hub-scroll="true"
      onScroll={handleOfficialEventsScroll}
      className={`h-full min-h-0 min-w-0 flex-1 overflow-y-auto px-4 ${isSetuChina ? "pb-[calc(var(--native-safe-area-bottom)+7rem)]" : "pb-6"}`}
    >
      <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
        {[
          { id: "whatson" as const, label: isSetuChina ? "Events 活动" : "What's On" },
          { id: "networking" as const, label: isSetuChina ? "Networking 社交" : "Networking" },
          { id: "plans" as const, label: isSetuChina ? "Plans 计划" : "Plans" },
        ].map((tab) => {
          const active = eventTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onEventTabChange(tab.id)}
              className={`rounded-[18px] text-sm font-semibold leading-tight transition ${
                isSetuChina ? "min-h-[52px] px-1.5 py-2" : "px-4 py-3"
              } ${
                active
                  ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {isSetuChina ? (
                <SetuChinaSegmentLabel label={tab.label} />
              ) : (
                <span className="break-words [overflow-wrap:anywhere]">{tab.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {isNetworkingEventsTab ? (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
          {[
            { id: "events" as const, label: isSetuChina ? "Events 活动" : "Events" },
            { id: "cards" as const, label: isSetuChina ? "My Network 人脉" : "My Network" },
          ].map((tab) => {
            const active = networkingView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNetworkingViewChange(tab.id)}
                className={`rounded-[16px] text-sm font-semibold leading-tight transition ${
                  isSetuChina ? "min-h-[48px] px-2 py-2" : "px-4 py-2.5"
                } ${
                  active
                    ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {isSetuChina ? (
                  <SetuChinaSegmentLabel label={tab.label} />
                ) : (
                  <span className="break-words [overflow-wrap:anywhere]">{tab.label}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {isNetworkingCardsView ? (
        <div className="space-y-4 pb-4 pt-4">
          <NetworkingCardsPanel email={sessionEmail} />
        </div>
      ) : isOfficialEventsListTab ? (
        <div className="space-y-4 pb-4 pt-4">
          <EventDatePickerSurface
            mobile={isMobile}
            open={openFilter === "when"}
            range={draftOfficialEventWhen}
            onRangeChange={setDraftOfficialEventWhen}
            onClear={handleClearOfficialEventDates}
            onClose={() => setOpenFilter(null)}
            onApply={handleApplyOfficialEventDates}
          />

          {eventTab === "whatson" ? (
            <section className="space-y-3 border-b border-[#E2E8F0] pb-4">
              <div className="grid w-full max-w-[320px] grid-cols-2 gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                {[
                  { id: "lga" as const, label: isSetuChina ? "City/Area 地区" : "City/Area" },
                  { id: "university" as const, label: isSetuChina ? "University 大学" : "University" },
                ].map((sourceMode) => {
                  const active = officialEventsSourceMode === sourceMode.id;
                  return (
                    <button
                      key={sourceMode.id}
                      type="button"
                      onClick={() => handleOfficialEventsSourceModeChange(sourceMode.id)}
                      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-white text-[#0F172A] shadow-sm"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {sourceMode.label}
                    </button>
                  );
                })}
              </div>

              {officialEventsSourceMode === "lga" ? (
                <>
                <label
                  htmlFor="council-whats-on-select"
                  className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]"
                >
                  {isSetuChina ? "City / Area 城市地区" : "City / Area"}
                </label>
                <div className="relative w-full max-w-[280px] min-w-0">
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                    strokeWidth={1.8}
                  />
                  <select
                    id="council-whats-on-select"
                    value={selectedCouncilSlug}
                    onChange={(event) => handleCouncilSelect(event.target.value)}
                    className="h-11 w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 pr-9 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:bg-white"
                  >
                    {COUNCIL_WHATS_ON_LINKS.map((council) => (
                      <option key={council.slug} value={council.slug}>
                        {council.label}
                      </option>
                    ))}
                  </select>
                </div>
                </>
              ) : (
                <>
                  <label
                    htmlFor="university-events-select"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]"
                  >
                    {isSetuChina ? "University 大学" : "University"}
                  </label>
                  <div className="relative w-full max-w-[320px] min-w-0">
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                      strokeWidth={1.8}
                    />
                    <select
                      id="university-events-select"
                      value={selectedUniversityId}
                      onChange={(event) => handleUniversitySelect(event.target.value)}
                      disabled={officialEventUniversitiesLoading || officialEventUniversities.length === 0}
                      className="h-11 w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 pr-9 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                    >
                      {officialEventUniversities.length === 0 ? (
                        <option value="">
                          {officialEventUniversitiesLoading
                            ? isSetuChina ? "正在加载大学..." : "Loading universities..."
                            : isSetuChina ? "暂无大学" : "No universities available"}
                        </option>
                      ) : (
                        officialEventUniversities.map((university) => (
                          <option key={university.id} value={university.id}>
                            {university.shortname
                              ? `${university.name} (${university.shortname})`
                              : university.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {officialEventUniversitiesError ? (
                    <p className="text-xs font-medium text-[#B91C1C]">
                      {officialEventUniversitiesError}
                    </p>
                  ) : selectedUniversity ? (
                    <p className="text-xs font-medium text-[#64748B]">
                      {selectedUniversity.state}
                      {typeof selectedUniversity.upcoming_count === "number"
                        ? ` · ${selectedUniversity.upcoming_count} upcoming`
                        : ""}
                    </p>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          <div
            className={
              isMobile
                ? isSetuChina
                  ? "grid grid-cols-1 gap-2 min-[390px]:grid-cols-2"
                  : "grid grid-cols-2 gap-2"
                : "flex flex-wrap gap-2"
            }
          >
            <div className={isMobile ? "min-[390px]:col-span-1" : ""}>
              <FilterTriggerButton
                icon={CalendarDays}
                label="When"
                summary={whenSummary}
                active={openFilter === "when"}
                onClick={() => setFilterState("when", openFilter !== "when")}
                className={isMobile ? "w-full" : "flex-1"}
              />
            </div>

            {!isNetworkingEventsTab ? (
              <div className={isMobile ? "min-[390px]:col-span-1" : "flex-1"}>
                <FilterSurface
                  mobile={isMobile}
                  open={openFilter === "types"}
                  onOpenChange={(open) => setFilterState("types", open)}
                  title={primaryFilterLabel}
                  onClear={
                    officialEventTypes.length
                      ? () => applyStateChange({ officialEventTypes: [] })
                      : undefined
                  }
                  trigger={
                    <FilterTriggerButton
                      icon={Layers3}
                      label={primaryFilterLabel}
                      summary={typeSummary}
                      active={
                        openFilter === "types" || officialEventTypes.length > 0
                      }
                      onClick={() =>
                        setFilterState("types", openFilter !== "types")
                      }
                      className={isMobile ? "w-full" : "flex-1"}
                    />
                  }
                >
                  {availableOfficialEventTypes.length > 0 ? (
                    <div className="space-y-2">
                      {availableOfficialEventTypes.map(
                        (type: OfficialEventFacet) => (
                          <FilterOptionButton
                            key={type.id}
                            label={type.label}
                            count={type.count}
                            active={officialEventTypes.includes(type.id)}
                            onClick={() => toggleOfficialEventType(type.id)}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#64748B]">
                      {isSetuChina
                        ? `${primaryFilterLabel} 会在活动数据加载后显示。`
                        : `${primaryFilterLabel} will appear here once the event feed finishes loading.`}
                    </p>
                  )}
                </FilterSurface>
              </div>
            ) : null}

            <div
              className={
                isMobile
                  ? isSetuChina
                    ? isNetworkingEventsTab
                      ? "min-[390px]:col-span-1"
                      : "min-[390px]:col-span-2"
                    : isNetworkingEventsTab
                      ? "col-span-1"
                      : "col-span-2"
                  : "flex-1"
              }
            >
              <FilterSurface
                mobile={isMobile}
                open={openFilter === "categories"}
                onOpenChange={(open) => setFilterState("categories", open)}
                title={secondaryFilterLabel}
                onClear={
                  officialEventCategories.length
                    ? () => applyStateChange({ officialEventCategories: [] })
                    : undefined
                }
                trigger={
                  <FilterTriggerButton
                    icon={Layers3}
                    label={secondaryFilterLabel}
                    summary={categorySummary}
                    active={
                      openFilter === "categories" ||
                      officialEventCategories.length > 0
                    }
                    onClick={() =>
                      setFilterState("categories", openFilter !== "categories")
                    }
                    className={isMobile ? "w-full" : "flex-1"}
                  />
                }
              >
                {availableOfficialEventCategories.length > 0 ? (
                  <div className="space-y-2">
                    {availableOfficialEventCategories.map(
                      (category: OfficialEventFacet) => (
                        <FilterOptionButton
                          key={category.id}
                          label={category.label}
                          count={category.count}
                          active={officialEventCategories.includes(category.id)}
                          onClick={() => toggleOfficialEventCategory(category.id)}
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">
                    {isSetuChina
                      ? `${secondaryFilterLabel} 会在活动数据加载后显示。`
                      : `${secondaryFilterLabel} will appear here once the event feed finishes loading.`}
                  </p>
                )}
              </FilterSurface>
            </div>
          </div>

          {eventTab === "whatson" && eventPanelBanners.length > 0 ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-1">
              {eventPanelBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => openExternalUrl(banner.link)}
                  className={`min-w-[260px] overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white text-left shadow-sm ${banner.link ? "cursor-pointer" : "cursor-default"}`}
                >
                  <img
                    src={banner.url}
                    alt={`${APP_CONFIG.displayName} event banner ${index + 1}`}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {officialEventsMeta?.stale ? (
            <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEA] px-4 py-3 text-sm text-[#92400E]">
              {isSetuChina
                ? `正在显示缓存的 ${eventsFeedName}，实时数据刷新中。`
                : `Showing cached ${eventsFeedName} results while the feed refreshes.`}
            </div>
          ) : null}

          {officialEventsError ? (
            <div className="rounded-[24px] border border-[#FDE68A] bg-[#FFFBEA] p-5 shadow-sm">
              <p className="text-base font-semibold text-[#0F172A]">
                {eventsErrorTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                {eventsErrorDescription}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    openExternalUrl(eventsFallbackUrl)
                  }
                  className="inline-flex items-center justify-center rounded-[18px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1E293B]"
                >
                  {eventsFallbackButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={retryOfficialEvents}
                  className="inline-flex items-center justify-center rounded-[18px] border border-[#CBD5E1] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC]"
                >
                  Try again
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#92400E]">
                {officialEventsError}
              </p>
            </div>
          ) : showOfficialEventsLoadingState ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-[#E2E8F0] bg-[#050505] px-6 py-10 text-center shadow-sm">
              {isWolli && APP_CONFIG.launchArt?.loadingBlip ? (
                <img
                  src={APP_CONFIG.launchArt.loadingBlip}
                  alt=""
                  aria-hidden="true"
                  className="h-16 w-12 object-contain drop-shadow-[0_18px_40px_rgba(0,138,140,0.28)] sm:h-20 sm:w-14"
                />
              ) : (
                <ExperienceLaunchMark className="h-16 w-16 object-contain drop-shadow-[0_18px_40px_rgba(251,212,51,0.2)] sm:h-20 sm:w-20" />
              )}
              <p className="mt-5 text-base font-semibold text-white">
                {isSetuChina ? "正在加载附近活动..." : "Loading nearby events..."}
              </p>
              <p className="mt-2 max-w-[16rem] text-sm leading-6 text-white/72">
                {isSetuChina
                  ? `正在为 ${APP_CONFIG.displayName} 获取最新 ${eventsFeedName}。`
                  : `Pulling the latest ${eventsFeedName} events for ${APP_CONFIG.displayName}.`}
              </p>
            </div>
          ) : officialEventsMeta?.bootstrapping ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              {isSetuChina
                ? `我们正在刷新 ${eventsFeedName}。请稍后查看最新活动。`
                : <>We&apos;re refreshing {eventsFeedName}. Check back in a minute for the latest events.</>}
            </div>
          ) : officialEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              {isSetuChina
                ? "暂无符合当前筛选的实时活动。新的活动发布后会显示在这里。"
                : `No ${isNetworkingEventsTab ? "networking" : "official"} events matched this filter set right now.`}
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#0F172A]">
                  {isSetuChina
                    ? isNetworkingEventsTab ? "即将开始的社交活动" : "即将开始的活动"
                    : isNetworkingEventsTab ? "Upcoming networking" : "Upcoming events"}
                </p>
                {officialEventsLoading ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Loading…
                  </span>
                ) : null}
              </div>

              {officialEvents.map((event) => (
                <EventListCard
                  key={event.id}
                  event={event}
                  onOpen={() => openOfficialEventDetail(event)}
                />
              ))}

              {officialEventsHasMore ? (
                <button
                  type="button"
                  onClick={handleLoadMoreOfficialEvents}
                  disabled={officialEventsLoadingMore}
                  className="w-full rounded-xl border border-[#DBEAFE] bg-white px-4 py-3 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EEF4FF] disabled:cursor-wait disabled:opacity-70"
                >
                  {officialEventsLoadingMore ? "Loading…" : "Show more"}
                </button>
              ) : null}

              {officialEventsLoadMoreError ? (
                <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                  {officialEventsLoadMoreError}
                </p>
              ) : null}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-4 pb-4 pt-4">
          <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
            {[
              { id: "public" as const, label: isSetuChina ? "Public Plans 公开计划" : "Public Plans" },
              { id: "my" as const, label: isSetuChina ? "My Plans 我的计划" : "My Plans" },
              { id: "itinerary" as const, label: isSetuChina ? "My Itinerary 我的行程" : "My Itinerary" },
            ].map((tab) => {
              const active = plansView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => applyStateChange({ plansView: tab.id })}
                  className={`rounded-[18px] text-sm font-semibold leading-tight transition ${
                    isSetuChina ? "min-h-[52px] px-2 py-2" : "px-4 py-3"
                  } ${
                    active
                      ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {isSetuChina ? (
                    <SetuChinaSegmentLabel label={tab.label} />
                  ) : (
                    <span className="break-words [overflow-wrap:anywhere]">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {plansView === "itinerary" ? (
            <>
              {!sessionEmail ? (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                  {isSetuChina
                    ? `登录 ${APP_CONFIG.displayName} 后查看你的活动行程。`
                    : <>Sign in with your {APP_CONFIG.displayName} profile to see your itinerary.</>}
                </div>
              ) : null}

              {itineraryError ? (
                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                  {itineraryError}
                </div>
              ) : null}

              {itineraryShareStatus ? (
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-sm text-[#1D4ED8]">
                  {itineraryShareStatus}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-[#0F172A]">
                    {isSetuChina ? "我的行程" : "My Itinerary"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {isSetuChina
                      ? "你点击 Attend 添加的活动和自定义地点会按日期自动分组。"
                      : "Events and custom stops are grouped by date. Reorder stops inside the same day."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {itineraryLoading ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                      Loading…
                    </span>
                  ) : null}
                  {sessionEmail ? (
                    <button
                      type="button"
                      onClick={() => openCustomStopDraft(undefined, { createItinerary: true })}
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-[#0F766E] bg-[#F0FDFA] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#CCFBF1]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {isSetuChina ? "Create Itinerary 创建行程" : "Create Itinerary"}
                    </button>
                  ) : null}
                </div>
              </div>

              {sessionEmail && itinerary.length === 0 && !itineraryLoading ? (
                <div className="space-y-3">
                  <ItineraryEmptyMapPlaceholder isSetuChina={isSetuChina} />
                  <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                    {isSetuChina
                      ? "你还没有添加任何站点。打开活动详情点击 Attend，或添加自己的地点。"
                      : "No stops in your itinerary yet. Open an event and tap Attend, or add your own location."}
                  </div>
                </div>
              ) : null}

              {sessionEmail && pastItineraryGroups.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPastItineraries((current) => !current)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                >
                  {showPastItineraries
                    ? isSetuChina
                      ? "Hide Past Itineraries 隐藏过往行程"
                      : "Hide Past Itineraries"
                    : isSetuChina
                      ? `Show Past Itineraries 显示过往行程 (${pastItineraryGroups.length})`
                      : `Show Past Itineraries (${pastItineraryGroups.length})`}
                </button>
              ) : null}

              {sessionEmail && itinerary.length > 0 && visibleItineraryGroups.length === 0 && !itineraryLoading ? (
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                  {isSetuChina
                    ? "你还没有即将到来的行程。显示过往行程可以查看旧的站点。"
                    : "No upcoming itinerary stops. Show past itineraries to review older stops."}
                </div>
              ) : null}

              {sessionEmail && visibleItineraryGroups.length > 0 ? (
                <div className="space-y-5">
                  {visibleItineraryGroups.map((group) => {
                    const areaChips = getItineraryAreaChips(group.items);
                    const isFirstPastGroup =
                      showPastItineraries && group.day === firstPastItineraryDay;
                    return (
                      <Fragment key={group.day}>
                        {isFirstPastGroup ? (
                          <div className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                            {isSetuChina ? "Past Itineraries 过往行程" : "Past Itineraries"}
                          </div>
                        ) : null}
                      <section
                        className="overflow-hidden rounded-[26px] border border-[#DDE7F0] bg-[#F8FAFC] shadow-sm"
                      >
                        <div className="border-b border-[#E2E8F0] bg-white px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F766E]">
                                <Route className="h-3.5 w-3.5" strokeWidth={1.8} />
                                {isSetuChina ? "路线行程" : "Trip Route"}
                              </div>
                              <h3 className="mt-2 break-words text-lg font-bold leading-6 text-[#0F172A] [overflow-wrap:anywhere]">
                                {formatItineraryDayHeading(group.day)}
                              </h3>
                              <p className="mt-1 text-xs font-medium text-[#64748B]">
                                {getItineraryRouteSummary(group.items, isSetuChina)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <div className="rounded-2xl bg-[#0F172A] px-3 py-2 text-center text-white">
                                <p className="text-lg font-black leading-none">{group.items.length}</p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                                  {isSetuChina ? "站" : "Stops"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openItineraryPlanDraft(group)}
                                disabled={!sessionEmail}
                                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-[#0F766E] bg-[#F0FDFA] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#CCFBF1] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.7} />
                                {isSetuChina ? "Create Plan 创建计划" : "Create Plan"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openCustomStopDraft(group.day)}
                                disabled={!sessionEmail}
                                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
                                {isSetuChina ? "Add Stop 添加" : "Add Stop"}
                              </button>
                            </div>
                          </div>
                          {areaChips.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {areaChips.map((chip) => (
                                <span
                                  key={chip}
                                  className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#4338CA]"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <ItineraryMapPreview
                            events={group.items}
                            isSetuChina={isSetuChina}
                            email={sessionEmail}
                            eventDay={group.day}
                          />
                        </div>
                        <div className="relative px-4 py-4">
                          <div className="absolute bottom-5 left-[2.15rem] top-5 w-px bg-[#CBD5E1]" aria-hidden="true" />
                          <div className="space-y-4">
                            {group.items.map((event, index) => {
                              const locationLine = [
                                event.venue_name,
                                event.address || event.suburb,
                              ].filter(Boolean).join(" • ");
                              const isDragging = draggedItineraryKey === event.event_key;
                              const mapUrl = buildItineraryMapUrl(event);
                              const isCustomStop = event.kind === "custom_stop";
                              const openLabel = isCustomStop
                                ? isSetuChina ? "Edit 编辑" : "Edit Stop"
                                : isSetuChina ? "View Event 活动" : "View Event";
                              const mapLabel = isSetuChina ? "Directions 导航" : "Directions";
                              const shareLabel = isSetuChina ? "Share 分享" : "Share";
                              const moveUpLabel = isSetuChina ? "Move Up 上移" : "Move Up";
                              const moveDownLabel = isSetuChina ? "Move Down 下移" : "Move Down";
                              const removeLabel = itineraryActionId === event.event_key
                                ? isSetuChina ? "Deleting..." : "Deleting..."
                                : isSetuChina ? "Delete 删除" : "Delete";
                              return (
                                <article
                                  key={event.event_key}
                                  onPointerEnter={() => handleItineraryDragEnter(event)}
                                  onPointerUp={finishItineraryDrag}
                                  className="relative pl-12"
                                >
                                  <button
                                    type="button"
                                    aria-label={`${isSetuChina ? "调整顺序" : "Reorder"} ${event.title}`}
                                    onPointerDown={(pointerEvent) => {
                                      pointerEvent.preventDefault();
                                      handleItineraryDragStart(event);
                                    }}
                                    className={`absolute left-0 top-3 z-10 flex h-11 w-11 touch-none items-center justify-center rounded-full border-4 border-[#F8FAFC] text-sm font-black shadow-sm transition ${
                                      isDragging
                                        ? "bg-[#0F766E] text-white ring-4 ring-[#99F6E4]"
                                        : "bg-[#111827] text-white"
                                    }`}
                                  >
                                    <span>#{index + 1}</span>
                                    <GripVertical className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#64748B]" strokeWidth={2} />
                                  </button>
                                  <div
                                    className={`rounded-[22px] border bg-white p-3 shadow-sm transition ${
                                      isDragging
                                        ? "border-[#0F766E] ring-2 ring-[#99F6E4]"
                                        : "border-[#E2E8F0]"
                                    }`}
                                  >
                                    <div className="flex gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
                                          {event.upcoming_time || event.dates_humanized || formatCompactDayLabel(event.event_day)}
                                        </p>
                                        <h4 className="mt-1 break-words text-base font-bold leading-5 text-[#0F172A] [overflow-wrap:anywhere]">
                                          {event.title}
                                        </h4>
                                        {locationLine ? (
                                          <div className="mt-2 flex items-start gap-1.5 text-sm text-[#64748B]">
                                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" strokeWidth={1.7} />
                                            <span className="break-words [overflow-wrap:anywhere]">
                                              {locationLine}
                                            </span>
                                          </div>
                                        ) : null}
                                      </div>
                                      {event.hero_image_url || event.image_url ? (
                                        <img
                                          src={event.hero_image_url || event.image_url}
                                          alt={event.title}
                                          className="h-20 w-20 shrink-0 rounded-[18px] object-cover sm:h-24 sm:w-24"
                                          loading="lazy"
                                        />
                                      ) : null}
                                    </div>
                                    {event.summary ? (
                                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#475569]">
                                        {event.summary}
                                      </p>
                                    ) : null}
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          isCustomStop
                                            ? openCustomStopEdit(event)
                                            : navigate(`/events/${event.event_source}/${event.event_slug}`)
                                        }
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CBD5E1] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                                      >
                                        {isCustomStop ? (
                                          <Pencil className="mr-1 h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        ) : null}
                                        {openLabel}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openExternalUrl(mapUrl)}
                                        disabled={!mapUrl}
                                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#166534] transition hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:border-[#E2E8F0] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        <span>{mapLabel}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleShareItineraryEvent(event)}
                                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#CBD5E1] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                                      >
                                        <Share2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        <span>{shareLabel}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveItineraryEvent(event, -1)}
                                        disabled={index === 0 || itineraryActionId === event.event_key}
                                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#CBD5E1] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#475569] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        <ArrowUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        <span>{moveUpLabel}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveItineraryEvent(event, 1)}
                                        disabled={index === group.items.length - 1 || itineraryActionId === event.event_key}
                                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#CBD5E1] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#475569] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        <ArrowDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        <span>{moveDownLabel}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItineraryEvent(event)}
                                        disabled={itineraryActionId === event.event_key}
                                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#FECACA] px-2 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                                        <span>{removeLabel}</span>
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                            <div className="relative pl-12">
                              <div
                                className="absolute left-0 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#F8FAFC] bg-white text-[#0F766E] shadow-sm"
                                aria-hidden="true"
                              >
                                <Plus className="h-5 w-5" strokeWidth={1.8} />
                              </div>
                              <button
                                type="button"
                                onClick={() => openCustomStopDraft(group.day)}
                                disabled={!sessionEmail}
                                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#0F766E] bg-[#F0FDFA] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#CCFBF1] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4" strokeWidth={1.8} />
                                {isSetuChina ? "Add Stop 添加" : "Add Stop"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                      </Fragment>
                    );
                  })}
                </div>
              ) : null}

              <Drawer
                open={Boolean(itineraryPlanDraftDay && itineraryPlanDraft)}
                repositionInputs={false}
                onOpenChange={(open) => {
                  if (open) return;
                  setItineraryPlanDraftDay(null);
                  setItineraryPlanDraft(null);
                }}
              >
                <DrawerContent
                  className="flex flex-col overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white"
                  style={getKeyboardAwareLargeSheetStyle(760)}
                >
                  <DrawerHeader className="shrink-0 border-b border-[#E2E8F0]">
                    <DrawerTitle className="text-lg font-bold text-[#0F172A]">
                      {isSetuChina ? "Create Plan 创建计划" : "Create Plan from Itinerary"}
                    </DrawerTitle>
                  </DrawerHeader>
                  {itineraryPlanDraft ? (
                    <div
                      data-keyboard-aware-scroll
                      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
                      style={keyboardAwareLargeSheetBodyStyle}
                    >
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "标题" : "Title"}
                        </span>
                        <input
                          type="text"
                          value={itineraryPlanDraft.title}
                          onChange={(event) =>
                            setItineraryPlanDraft((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "集合地点" : "Meeting Point"}
                        </span>
                        <input
                          type="text"
                          value={itineraryPlanDraft.meetingPoint}
                          onChange={(event) =>
                            setItineraryPlanDraft((current) =>
                              current ? { ...current, meetingPoint: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "时间" : "Meetup Time"}
                        </span>
                        <input
                          type="datetime-local"
                          value={itineraryPlanDraft.meetupAt}
                          onChange={(event) =>
                            setItineraryPlanDraft((current) =>
                              current ? { ...current, meetupAt: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "人数上限" : "Cap"}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={itineraryPlanDraft.attendeeCap}
                            onChange={(event) =>
                              setItineraryPlanDraft((current) =>
                                current ? { ...current, attendeeCap: event.target.value } : current
                              )
                            }
                            className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                            placeholder={isSetuChina ? "不限" : "No cap"}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "可见性" : "Visibility"}
                          </span>
                          <select
                            value={itineraryPlanDraft.visibility}
                            onChange={(event) =>
                              setItineraryPlanDraft((current) =>
                                current
                                  ? { ...current, visibility: event.target.value as PublicPlanVisibility }
                                  : current
                              )
                            }
                            className="mt-1 w-full rounded-2xl border border-[#CBD5E1] bg-white px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                          >
                            <option value="public">{isSetuChina ? "公开" : "Public"}</option>
                            <option value="invite_only">{isSetuChina ? "邀请制" : "Invite only"}</option>
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "邀请邮箱" : "Invite Emails"}
                        </span>
                        <textarea
                          value={itineraryPlanDraft.inviteeEmails}
                          onChange={(event) =>
                            setItineraryPlanDraft((current) =>
                              current ? { ...current, inviteeEmails: event.target.value } : current
                            )
                          }
                          className="mt-1 min-h-20 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder={isSetuChina ? "用逗号分隔" : "Separate emails with commas"}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "说明" : "Note"}
                        </span>
                        <textarea
                          value={itineraryPlanDraft.note}
                          onChange={(event) =>
                            setItineraryPlanDraft((current) =>
                              current ? { ...current, note: event.target.value } : current
                            )
                          }
                          className="mt-1 min-h-24 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                        />
                      </label>
                    </div>
                  ) : null}
                  <DrawerFooter
                    className="shrink-0 border-t border-[#E2E8F0] bg-white/95"
                    style={keyboardAwareLargeSheetFooterStyle}
                  >
                    <button
                      type="button"
                      onClick={() => void handleCreateItineraryPlan()}
                      disabled={
                        itineraryPlanSubmitting ||
                        !itineraryPlanDraft?.title.trim() ||
                        !itineraryPlanDraft?.meetingPoint.trim() ||
                        !itineraryPlanDraft?.meetupAt.trim()
                      }
                      className="w-full rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {itineraryPlanSubmitting
                        ? isSetuChina ? "创建中..." : "Creating..."
                        : isSetuChina ? "创建计划" : "Create Plan"}
                    </button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <Drawer
                open={Boolean(customStopDraft)}
                repositionInputs={false}
                onOpenChange={(open) => {
                  if (open) return;
                  setCustomStopDraft(null);
                }}
              >
                <DrawerContent
                  className="flex flex-col overflow-hidden rounded-t-[28px] border-[#E2E8F0] bg-white"
                  style={getKeyboardAwareLargeSheetStyle(800)}
                >
                  <DrawerHeader className="shrink-0 border-b border-[#E2E8F0]">
                    <DrawerTitle className="text-lg font-bold text-[#0F172A]">
                      {customStopDraft?.eventSlug
                        ? isSetuChina ? "Edit Stop 编辑站点" : "Edit Itinerary Stop"
                        : customStopDraft?.isCreateItinerary
                          ? isSetuChina ? "Create Itinerary 创建行程" : "Create Itinerary"
                          : isSetuChina ? "Add Stop 添加站点" : "Add Itinerary Stop"}
                    </DrawerTitle>
                  </DrawerHeader>
                  {customStopDraft ? (
                    <div
                      data-keyboard-aware-scroll
                      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
                      style={keyboardAwareLargeSheetBodyStyle}
                    >
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "标题" : "Title"}
                        </span>
                        <input
                          type="text"
                          value={customStopDraft.title}
                          onChange={(event) =>
                            setCustomStopDraft((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder={isSetuChina ? "例如 博物馆参观" : "e.g. Museum visit"}
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "日期" : "Date"}
                          </span>
                          <input
                            type="date"
                            value={customStopDraft.eventDay}
                            onChange={(event) =>
                              setCustomStopDraft((current) =>
                                current ? { ...current, eventDay: event.target.value } : current
                              )
                            }
                            className="mt-1 w-full min-w-0 rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "时间" : "Time"}
                          </span>
                          <input
                            type="text"
                            value={customStopDraft.upcomingTime}
                            onChange={(event) =>
                              setCustomStopDraft((current) =>
                                current ? { ...current, upcomingTime: event.target.value } : current
                              )
                            }
                            className="mt-1 w-full min-w-0 rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                            placeholder={isSetuChina ? "例如 10AM TO 11AM" : "e.g. 10AM TO 11AM"}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "Google Maps 链接" : "Google Maps Link"}
                        </span>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="url"
                            value={customStopDraft.mapsUrl}
                            onChange={(event) =>
                              setCustomStopDraft((current) =>
                                current ? { ...current, mapsUrl: event.target.value } : current
                              )
                            }
                            className="min-w-0 flex-1 rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                            placeholder="https://maps.app.goo.gl/..."
                          />
                          <button
                            type="button"
                            onClick={() => void handleResolveCustomStopLocation()}
                            disabled={customStopResolving || (!customStopDraft.mapsUrl.trim() && !customStopDraft.venueName.trim() && !customStopDraft.address.trim())}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-[#0F766E] bg-[#F0FDFA] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#CCFBF1] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {customStopResolving
                              ? isSetuChina ? "解析中..." : "Resolving..."
                              : isSetuChina ? "Fetch 获取" : "Fetch"}
                          </button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "地点名称" : "Location Name"}
                        </span>
                        <input
                          type="text"
                          value={customStopDraft.venueName}
                          onChange={(event) =>
                            setCustomStopDraft((current) =>
                              current ? { ...current, venueName: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder={isSetuChina ? "地点或场馆" : "Place or venue"}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "地址" : "Address"}
                        </span>
                        <input
                          type="text"
                          value={customStopDraft.address}
                          onChange={(event) =>
                            setCustomStopDraft((current) =>
                              current ? { ...current, address: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder={isSetuChina ? "街道地址" : "Street address"}
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "纬度" : "Latitude"}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={customStopDraft.lat}
                            onChange={(event) =>
                              setCustomStopDraft((current) =>
                                current ? { ...current, lat: event.target.value } : current
                              )
                            }
                            className="mt-1 w-full min-w-0 rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            {isSetuChina ? "经度" : "Longitude"}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={customStopDraft.lng}
                            onChange={(event) =>
                              setCustomStopDraft((current) =>
                                current ? { ...current, lng: event.target.value } : current
                              )
                            }
                            className="mt-1 w-full min-w-0 rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "图片链接" : "Image URL"}
                        </span>
                        <input
                          type="url"
                          value={customStopDraft.imageUrl}
                          onChange={(event) =>
                            setCustomStopDraft((current) =>
                              current ? { ...current, imageUrl: event.target.value } : current
                            )
                          }
                          className="mt-1 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                          placeholder="https://..."
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          {isSetuChina ? "备注" : "Notes"}
                        </span>
                        <textarea
                          value={customStopDraft.summary}
                          onChange={(event) =>
                            setCustomStopDraft((current) =>
                              current ? { ...current, summary: event.target.value } : current
                            )
                          }
                          className="mt-1 min-h-24 w-full rounded-2xl border border-[#CBD5E1] px-3 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                        />
                      </label>
                    </div>
                  ) : null}
                  <DrawerFooter
                    className="shrink-0 border-t border-[#E2E8F0] bg-white/95"
                    style={keyboardAwareLargeSheetFooterStyle}
                  >
                    <button
                      type="button"
                      onClick={() => void handleSaveCustomStop()}
                      disabled={
                        customStopSubmitting ||
                        !(
                          customStopDraft?.title.trim() ||
                          customStopDraft?.venueName.trim() ||
                          customStopDraft?.mapsUrl.trim()
                        ) ||
                        !customStopDraft?.eventDay.trim() ||
                        !customStopDraft?.upcomingTime.trim() ||
                        !(
                          customStopDraft?.venueName.trim() ||
                          customStopDraft?.address.trim() ||
                          customStopDraft?.mapsUrl.trim() ||
                          (customStopDraft?.lat.trim() && customStopDraft?.lng.trim())
                        )
                      }
                      className="w-full rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {customStopSubmitting
                        ? isSetuChina ? "保存中..." : "Saving..."
                        : customStopDraft?.eventSlug
                          ? isSetuChina ? "保存站点" : "Save Stop"
                          : customStopDraft?.isCreateItinerary
                            ? isSetuChina ? "创建行程" : "Create Itinerary"
                            : isSetuChina ? "添加站点" : "Add Stop"}
                    </button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            <>
          {!sessionEmail && plansView === "my" ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              {isSetuChina
                ? `登录 ${APP_CONFIG.displayName} 后查看你创建或加入的计划。`
                : <>Sign in with your {APP_CONFIG.displayName} profile to see the plans you created or joined.</>}
            </div>
          ) : !sessionEmail ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              {isSetuChina
                ? `登录 ${APP_CONFIG.displayName} 后可以加入计划、退出计划或在活动讨论中回复。`
                : <>Sign in with your {APP_CONFIG.displayName} profile to join a plan, leave one, or post in the event thread.</>}
            </div>
          ) : null}

          {plansError ? (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
              {plansError}
            </div>
          ) : null}

          {planShareStatus ? (
            <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-sm text-[#1D4ED8]">
              {planShareStatus}
            </div>
          ) : null}

          <div>
            <p className="text-xl font-bold text-[#0F172A]">
              {isSetuChina ? "加入计划，认识新朋友" : "Join New Plans! Make New Friends!"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                {plansHeading}
              </p>
              <p className="text-xs text-[#64748B]">{plansSubtitle}</p>
            </div>
            {plansLoading ? (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Loading…
              </span>
            ) : null}
          </div>

          {plans.length === 0 && !plansLoading ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              {plansEmptyMessage}
            </div>
          ) : null}

          <div className="space-y-3">
            {plans.map((plan) => {
              const isPendingInvite = Boolean(
                plan.viewer_invited && !plan.viewer_joined && !plan.is_creator,
              );
              const opensStandalonePlan =
                plan.source_type === "custom" ||
                plan.source_type === "itinerary" ||
                plan.event_source === "custom";
              const openRoute = opensStandalonePlan
                ? buildStandalonePlanRoute(plan.id)
                : buildPublicPlanRoute(
                    plan.event_source,
                    plan.event_slug,
                    plan.id,
                  );
              const canOpenInviteFriends = plan.is_creator && !opensStandalonePlan;
              let actionCount = 1;
              actionCount += 1;
              if (canOpenInviteFriends) actionCount += 1;
              if (isPendingInvite) {
                actionCount += 2;
              } else {
                actionCount += 1;
              }
              if (plan.can_delete) actionCount += 1;
              const itinerarySpotSummary = plan.source_type === "itinerary"
                ? formatItinerarySpotSummary(
                  plan.itinerary_stops?.length || 0,
                  isSetuChina,
                )
                : "";
              const visiblePlanNote = plan.source_type === "itinerary"
                ? shouldShowItineraryPlanNote(plan.note) ? plan.note : ""
                : plan.note;
              return (
                <article
                  key={plan.id}
                  className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-sm"
                >
                  {plan.source_event.image_url ? (
                    <img
                      src={plan.source_event.image_url}
                      alt={plan.source_event.title}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                          {isSetuChina ? "Source event 来源活动" : "Source event"}
                        </p>
                        <h3 className="mt-1 text-lg font-bold leading-6 text-[#0F172A]">
                          {plan.title}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-[#1D4ED8]">
                          {plan.source_event.title}
                        </p>
                        {plansView === "my" ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
                            {plan.is_creator
                              ? isSetuChina ? "你创建了这个计划" : "You created this plan"
                              : plan.viewer_joined
                                ? isSetuChina ? "你已加入这个计划" : "You joined this plan"
                                : isPendingInvite
                                  ? isSetuChina ? "你收到了邀请" : "You were invited"
                                  : isSetuChina ? "计划邀请" : "Plan invite"}
                          </p>
                        ) : null}
                      </div>
                      <PlanStatusPill status={plan.status} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-[#475569]">
                      <div className="flex items-start gap-2">
                        <CalendarDays
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                          strokeWidth={1.7}
                        />
                        <span>{formatDateTime(plan.meetup_at)}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                          strokeWidth={1.7}
                        />
                        <span>{plan.meeting_point}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                          strokeWidth={1.7}
                        />
                        <span>
                          {getPublicPlanPersonInitials(plan.creator_name)} ·{" "}
                          {plan.attendee_count} attending
                          {plan.attendee_cap != null
                            ? ` / ${plan.attendee_cap}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    {itinerarySpotSummary ? (
                      <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
                        {itinerarySpotSummary}
                      </p>
                    ) : null}

                    {visiblePlanNote ? (
                      <p className="mt-3 text-sm leading-6 text-[#475569]">
                        {visiblePlanNote}
                      </p>
                    ) : null}

                    <div
                      className={`mt-4 grid gap-2 ${getPublicPlanActionGridClass(actionCount)}`}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(openRoute)}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-[#CBD5E1] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                      >
                        {opensStandalonePlan ? "Open Plan Thread" : "Open Event"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSharePlan(plan)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                      >
                        <Share2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                        Share Plan
                      </button>
                      {canOpenInviteFriends ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              buildPublicPlanRoute(
                                plan.event_source,
                                plan.event_slug,
                                plan.id,
                                {
                                  invite: true,
                                },
                              ),
                            )
                          }
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0F766E] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                        >
                          <UserPlus className="h-3.5 w-3.5" strokeWidth={1.7} />
                          Invite Friends
                        </button>
                      ) : null}
                      {isPendingInvite ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleJoinLeave(plan)}
                            disabled={
                              !sessionEmail ||
                              planActionId === plan.id ||
                              planRejectId === plan.id ||
                              planDeleteId === plan.id ||
                              !plan.can_join
                            }
                            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0F766E] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {planActionId === plan.id
                              ? "Accepting..."
                              : "Accept Plan"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPlan(plan)}
                            disabled={
                              !sessionEmail ||
                              planRejectId === plan.id ||
                              planActionId === plan.id ||
                              planDeleteId === plan.id ||
                              !plan.can_reject
                            }
                            className="inline-flex w-full items-center justify-center rounded-lg border border-[#FECACA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {planRejectId === plan.id
                              ? "Rejecting..."
                              : "Reject Plan"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinLeave(plan)}
                          disabled={
                            !sessionEmail ||
                            planActionId === plan.id ||
                            planRejectId === plan.id ||
                            planDeleteId === plan.id ||
                            (!plan.can_join && !plan.can_leave)
                          }
                          className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                            plan.viewer_joined && plan.can_leave
                              ? "border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]"
                              : "bg-[#0F766E] text-white hover:bg-[#115E59]"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {planActionId === plan.id
                            ? "Saving..."
                            : plan.viewer_joined
                              ? "Leave Plan"
                              : plan.can_join
                                ? "Join Plan"
                                : "Unavailable"}
                        </button>
                      )}
                      {plan.can_delete ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          disabled={
                            !sessionEmail ||
                            planDeleteId === plan.id ||
                            planActionId === plan.id ||
                            planRejectId === plan.id
                          }
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                          {planDeleteId === plan.id
                            ? "Deleting..."
                            : "Delete Plan"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
