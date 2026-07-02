import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Compass,
  ExternalLink,
  Navigation,
  Sparkles,
} from "lucide-react";
import {
  fetchCityGuides,
  fetchProfile,
  fetchRentalHistory,
  type CityGuide,
} from "../lib/api";
import { APP_CONFIG } from "../lib/app-config";
import { APP_VARIANT } from "../lib/app-variant";
import { HoodieShareActions } from "./share/hoodie-share-actions";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { buildCityGuideShareDescriptor } from "../lib/hoodie-share";
import {
  findHoodieGuideBySlug,
  getHoodieGuideSelectionState,
} from "../lib/hoodie-guide-routing";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";
import {
  getFlagshipEventCountdownDays,
  getFlagshipEventGuideMeta,
  getFlagshipEventStatus,
  getFlagshipEventThemeClass,
  mergeFlagshipEventGuides,
  type FlagshipEventGuideEntry,
} from "../lib/flagship-event-guides";

type GuideFeedView = "carousel" | "list";

type CityGuidesHubProps = {
  cityParam: string;
  guideParam: string;
  guidesView: GuideFeedView;
  onCityChange: (citySlug: string) => void;
  onGuideChange: (guideSlug: string | null) => void;
  onGuidesViewChange: (view: GuideFeedView) => void;
  embedded?: boolean;
};

type CityOption = {
  slug: string;
  label: string;
  state: string;
};

type GuideMapAvailability = {
  canOpenGuideMap: boolean;
  hasExactCoordinates: boolean;
  disabledReason?: string;
};

const MY_HOOD_CITY_STORAGE_KEY = "ghar_vibe_my_hood_city";
const MY_HOOD_CAROUSEL_CUE_STORAGE_KEY = "ghar_vibe_my_hood_carousel_cue_seen";
const PIZZA_HUT_GUIDE_SLUG_PREFIX =
  "only-all-you-can-eat-pizza-huts-in-australia-";
const CITY_OPTIONS: CityOption[] = [
  { slug: "sydney", label: "Sydney", state: "NSW" },
  { slug: "melbourne", label: "Melbourne", state: "VIC" },
  { slug: "brisbane", label: "Brisbane", state: "QLD" },
  { slug: "adelaide", label: "Adelaide", state: "SA" },
  { slug: "perth", label: "Perth", state: "WA" },
  { slug: "canberra", label: "Canberra", state: "ACT" },
  { slug: "hobart", label: "Hobart", state: "TAS" },
  { slug: "darwin", label: "Darwin", state: "NT" },
  { slug: "gold-coast", label: "Gold Coast", state: "QLD" },
  { slug: "newcastle", label: "Newcastle", state: "NSW" },
  { slug: "wollongong", label: "Wollongong", state: "NSW" },
  { slug: "geelong", label: "Geelong", state: "VIC" },
  { slug: "armidale", label: "Armidale", state: "NSW" },
];

function slugifyCity(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCityOptionFromSlug(slug: string) {
  return CITY_OPTIONS.find((option) => option.slug === slug) || null;
}

function resolveCityFromAddressBits(bits: Array<string | null | undefined>) {
  const haystack = bits.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return null;

  for (const option of CITY_OPTIONS) {
    if (haystack.includes(option.label.toLowerCase())) {
      return option;
    }
  }

  if (haystack.includes("nsw")) return getCityOptionFromSlug("sydney");
  if (haystack.includes("vic")) return getCityOptionFromSlug("melbourne");
  if (haystack.includes("qld")) return getCityOptionFromSlug("brisbane");
  if (haystack.includes("sa")) return getCityOptionFromSlug("adelaide");
  if (haystack.includes("wa")) return getCityOptionFromSlug("perth");
  if (haystack.includes("act")) return getCityOptionFromSlug("canberra");
  if (haystack.includes("tas")) return getCityOptionFromSlug("hobart");
  if (haystack.includes("nt")) return getCityOptionFromSlug("darwin");

  return null;
}

function getCityGuidesFriendlyError(error?: unknown) {
  const message = String(
    error instanceof Error ? error.message : error || "",
  ).trim();
  if (
    !message ||
    /string did not match the expected pattern|request failed|failed to fetch|load failed|networkerror/i.test(
      message,
    )
  ) {
    return "Guides aren't available right now.";
  }
  return message;
}

function normalizeGuideText(value: unknown) {
  return String(value || "").trim();
}

function normalizeGuideCoordinate(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined)
    return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasUsableGuideCoordinates(place: CityGuide["places"][number]) {
  const normalizedLat = normalizeGuideCoordinate(place.lat);
  const normalizedLng = normalizeGuideCoordinate(place.lng);
  return (
    normalizedLat !== null &&
    normalizedLng !== null &&
    normalizedLat >= -90 &&
    normalizedLat <= 90 &&
    normalizedLng >= -180 &&
    normalizedLng <= 180 &&
    !(normalizedLat === 0 && normalizedLng === 0)
  );
}

function formatGuideLocation(city: unknown, state: unknown) {
  return [normalizeGuideText(city), normalizeGuideText(state)]
    .filter(Boolean)
    .join(", ");
}

function getGuideTextParagraphs(value: unknown) {
  return normalizeGuideText(value)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getGuidePlaceAnchorId(
  guideSlug: string,
  placeId: string,
  index: number,
) {
  return `guide-place-${guideSlug}-${placeId || index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-");
}

function getGuideCitySlug(guide: Pick<CityGuide, "city" | "city_slug">) {
  return guide.city_slug || slugifyCity(guide.city);
}

function getGuideFlagshipMeta(guide: CityGuide | null) {
  if (!guide) return null;
  return getFlagshipEventGuideMeta({
    slug: guide.slug,
    city: guide.city,
    city_slug: getGuideCitySlug(guide),
  });
}

function isPizzaHutGuide(guide: CityGuide) {
  return guide.slug.startsWith(PIZZA_HUT_GUIDE_SLUG_PREFIX);
}

function getGuideDisplayRank(guide: CityGuide, now = new Date()) {
  const meta = getGuideFlagshipMeta(guide);
  if (meta?.pinInGuideFeed) return -1;
  if (isPizzaHutGuide(guide)) return 2;
  if (!meta) return 0;
  return getFlagshipEventStatus(meta, now) === "countdown" ? 1 : 0;
}

function orderGuidesForDisplay(guides: CityGuide[], now = new Date()) {
  return guides
    .map((guide, index) => ({
      guide,
      index,
      rank: getGuideDisplayRank(guide, now),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((item) => item.guide);
}

function getGuideBadgeLabel(guide: CityGuide, now = new Date()) {
  const meta = getGuideFlagshipMeta(guide);
  if (!meta) return `${guide.places.length} places`;
  const status = getFlagshipEventStatus(meta, now);
  if (status === "live" && meta.liveSections?.length) {
    return `${guide.places.length} live sections`;
  }
  if (status === "live") return "Live now";
  return "Countdown";
}

function getGuideSectionLabel(guide: CityGuide, index: number) {
  const meta = getGuideFlagshipMeta(guide);
  if (!meta) return `Place ${index + 1}`;
  return meta.liveSections?.length ? `Section ${index + 1}` : "Event info";
}

function formatCountdownDays(daysUntilStart: number) {
  if (daysUntilStart <= 0) return "Starts today";
  if (daysUntilStart === 1) return "Starts tomorrow";
  return `Starts in ${daysUntilStart} days`;
}

function FlagshipEventStatusPanel({
  entry,
  isThemed,
}: {
  entry: FlagshipEventGuideEntry;
  isThemed: boolean;
}) {
  const countdown = getFlagshipEventCountdownDays(entry);
  const statusLabel =
    countdown.status === "live"
      ? "Live now"
      : formatCountdownDays(countdown.daysUntilStart);
  const detail =
    countdown.status === "live"
      ? `Running ${entry.displayDate}. Use the official source for current sessions, ticketing and access updates.`
      : `${entry.countdownCopy} Official dates: ${entry.displayDate}.`;

  return (
    <section
      className={`mt-6 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6 ${
        isThemed ? "hoodie-vivid-place hoodie-flagship-status-panel" : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
            Flagship event
          </p>
          <h4 className="mt-2 break-words text-2xl font-bold leading-tight text-[#0F172A]">
            {statusLabel}
          </h4>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475569]">
            {detail}
          </p>
        </div>
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B] ${
            isThemed ? "hoodie-vivid-map-button" : ""
          }`}
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
          <span>Official event source</span>
        </a>
      </div>
    </section>
  );
}

function getGuidePlaceMapAvailability(
  place: CityGuide["places"][number],
): GuideMapAvailability {
  const hasExactCoordinates = hasUsableGuideCoordinates(place);
  const hasSearchFallback = Boolean(normalizeGuideText(place.name));
  const canOpenGuideMap = hasExactCoordinates || hasSearchFallback;

  if (hasExactCoordinates) {
    return {
      canOpenGuideMap,
      hasExactCoordinates,
    };
  }

  if (canOpenGuideMap) {
    return {
      canOpenGuideMap,
      hasExactCoordinates,
    };
  }

  return {
    canOpenGuideMap,
    hasExactCoordinates,
    disabledReason: "Map details are still being updated for this place.",
  };
}

function readSeenGuideCarouselCueCities() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw =
      sessionStorage.getItem(MY_HOOD_CAROUSEL_CUE_STORAGE_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.map((entry) => String(entry || "").trim()).filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

function writeSeenGuideCarouselCueCities(cities: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    MY_HOOD_CAROUSEL_CUE_STORAGE_KEY,
    JSON.stringify(Array.from(cities)),
  );
}

type GuideImageProps = {
  src?: string;
  alt: string;
  className: string;
  emptyStateClassName: string;
  iconClassName: string;
  eager?: boolean;
  highPriority?: boolean;
};

function GuideImage({
  src,
  alt,
  className,
  emptyStateClassName,
  iconClassName,
  eager = false,
  highPriority = false,
}: GuideImageProps) {
  const imageSrc = String(src || "").trim();
  if (!imageSrc) {
    return (
      <div className={emptyStateClassName}>
        <BookOpen className={iconClassName} strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <ImageWithFallback
      src={imageSrc}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchpriority={highPriority ? "high" : "auto"}
    />
  );
}

export function CityGuidesHub({
  cityParam,
  guideParam,
  guidesView,
  onCityChange,
  onGuideChange,
  onGuidesViewChange,
  embedded = false,
}: CityGuidesHubProps) {
  const isSetuChina = APP_VARIANT === "setu_china";
  const isStudentHubVariant = APP_VARIANT === "setu_china" || APP_VARIANT === "jom_settle";
  const rootScrollClassName = embedded ? "w-full overflow-visible bg-white" : "h-full overflow-y-auto overflow-x-hidden bg-white";
  const rootScrollStyle = !embedded && isSetuChina
    ? { WebkitOverflowScrolling: "touch", scrollPaddingBottom: "calc(var(--app-bottom-nav-clearance) + 2rem)" }
    : undefined;
  const contentPaddingClassName = embedded
    ? "pb-4"
    : isSetuChina
      ? "pb-[calc(var(--app-bottom-nav-clearance)+2rem)]"
      : "pb-8";
  const contentWidthClassName = isSetuChina ? "w-full px-4" : "mx-auto max-w-5xl px-4";
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState(cityParam || "");
  const [guides, setGuides] = useState<CityGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCity, setLoadedCity] = useState("");
  const [resolvingDefaultCity, setResolvingDefaultCity] = useState(false);
  const [error, setError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [guideCarouselApi, setGuideCarouselApi] = useState<CarouselApi | null>(
    null,
  );
  const [guideCarouselIndex, setGuideCarouselIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [playGuideCarouselCue, setPlayGuideCarouselCue] = useState(false);
  const shownGuideCarouselCueCitiesRef = useRef<Set<string>>(new Set());
  const guideScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveGuideSlugRef = useRef("");

  useEffect(() => {
    setSelectedCity(cityParam || "");
  }, [cityParam]);

  useEffect(() => {
    shownGuideCarouselCueCitiesRef.current = readSeenGuideCarouselCueCities();
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreference);
      return () => mediaQuery.removeEventListener("change", syncPreference);
    }
    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  useEffect(() => {
    if (cityParam) return;

    const storedCity = localStorage.getItem(MY_HOOD_CITY_STORAGE_KEY) || "";
    if (storedCity) {
      setSelectedCity(storedCity);
      onCityChange(storedCity);
      return;
    }

    const email = localStorage.getItem("ghar_email") || "";
    if (!email) {
      if (isSetuChina) {
        setSelectedCity("sydney");
        localStorage.setItem(MY_HOOD_CITY_STORAGE_KEY, "sydney");
        onCityChange("sydney");
      }
      return;
    }

    let cancelled = false;
    setResolvingDefaultCity(true);

    void Promise.allSettled([fetchProfile(email), fetchRentalHistory(email)])
      .then((results) => {
        if (cancelled) return;
        const profile =
          results[0].status === "fulfilled" ? results[0].value : null;
        const rentalHistory =
          results[1].status === "fulfilled" ? results[1].value : [];
        const currentRental = Array.isArray(rentalHistory)
          ? rentalHistory.find((entry: any) => entry?.is_current) ||
            rentalHistory[0]
          : null;
        const resolved = resolveCityFromAddressBits([
          currentRental?.display_address,
          currentRental?.address,
          currentRental?.suburb,
          currentRental?.state,
          currentRental?.postcode,
          profile?.australian_state,
          profile?.home_state,
          profile?.postcode,
          profile?.work_display_address,
          profile?.work_state,
          profile?.work_postcode,
        ]);

        const nextCity = resolved?.slug || (isSetuChina ? "sydney" : "");
        if (nextCity) {
          setSelectedCity(nextCity);
          localStorage.setItem(MY_HOOD_CITY_STORAGE_KEY, nextCity);
          onCityChange(nextCity);
        }
      })
      .finally(() => {
        if (!cancelled) setResolvingDefaultCity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityParam, onCityChange]);

  useEffect(() => {
    if (!selectedCity) {
      setGuides([]);
      setError("");
      setLoadedCity("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setLoadedCity("");

    void fetchCityGuides({ city: selectedCity, appVariant: isStudentHubVariant ? "all" : APP_VARIANT })
      .then((data) => {
        if (cancelled) return;
        setGuides(data);
        setLoadedCity(selectedCity);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("GHAR city guides load error:", err);
        setError(getCityGuidesFriendlyError(err));
        setLoadedCity(selectedCity);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isStudentHubVariant, selectedCity, retryTick]);

  const guideFeedGuides = useMemo(
    () => mergeFlagshipEventGuides(selectedCity, guides),
    [guides, selectedCity],
  );
  const displayedGuideFeedGuides = orderGuidesForDisplay(guideFeedGuides);
  const visibleGuideError = error && guideFeedGuides.length === 0 ? error : "";

  const availableCities = useMemo(() => {
    const dynamicOptions = guideFeedGuides.map((guide) => ({
      slug: guide.city_slug || slugifyCity(guide.city),
      label: guide.city,
      state: guide.state || "",
    }));
    const merged = [...CITY_OPTIONS, ...dynamicOptions];
    return merged.filter(
      (option, index, array) =>
        array.findIndex((item) => item.slug === option.slug) === index,
    );
  }, [guideFeedGuides]);

  const activeGuide = useMemo(
    () =>
      guideParam ? findHoodieGuideBySlug(guideFeedGuides, guideParam) : null,
    [guideParam, guideFeedGuides],
  );
  const activeFlagshipMeta = getGuideFlagshipMeta(activeGuide);

  const guideSelectionState = useMemo(
    () =>
      getHoodieGuideSelectionState({
        guideSlug: guideParam,
        selectedCity,
        loadedCity,
        isLoading: loading,
        hasActiveGuide: Boolean(activeGuide),
        hasError: Boolean(visibleGuideError),
      }),
    [
      activeGuide,
      guideParam,
      loadedCity,
      loading,
      selectedCity,
      visibleGuideError,
    ],
  );

  const relatedGuides = activeGuide
    ? displayedGuideFeedGuides.filter((guide) => guide.slug !== activeGuide.slug)
    : displayedGuideFeedGuides;

  const selectedCityOption =
    availableCities.find((option) => option.slug === selectedCity) ||
    getCityOptionFromSlug(selectedCity) ||
    null;
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);
  const showGuideFeedAction =
    !loading &&
    !visibleGuideError &&
    guideSelectionState !== "pending" &&
    !activeGuide &&
    displayedGuideFeedGuides.length > 0 &&
    (guidesView === "list" || displayedGuideFeedGuides.length > 1);
  const showThemedGuideTreatment =
    Boolean(activeFlagshipMeta) && !prefersReducedMotion;
  const activeFlagshipThemeClass = activeFlagshipMeta
    ? getFlagshipEventThemeClass(activeFlagshipMeta)
    : "";

  const resetDocumentScrollPosition = () => {
    if (typeof window === "undefined") return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const resetGuideScrollPosition = () => {
    const scroller = guideScrollContainerRef.current;
    if (scroller) {
      if (typeof scroller.scrollTo === "function") {
        scroller.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } else {
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }
    }
    resetDocumentScrollPosition();
  };

  const updateGuidePlaceHash = (anchorId: string) => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}${window.location.search}#${anchorId}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  };

  const handleGuidePlaceAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    anchorId: string,
  ) => {
    event.preventDefault();
    const scroller = guideScrollContainerRef.current;
    const target = document.getElementById(anchorId);

    if (!scroller || !target) {
      updateGuidePlaceHash(anchorId);
      resetDocumentScrollPosition();
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = Math.max(
      0,
      scroller.scrollTop + targetRect.top - scrollerRect.top - 16,
    );

    scroller.scrollTo({
      top: nextTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    updateGuidePlaceHash(anchorId);
    resetDocumentScrollPosition();
  };

  useEffect(() => {
    const activeGuideSlug = activeGuide?.slug || "";
    if (lastActiveGuideSlugRef.current === activeGuideSlug) return;
    lastActiveGuideSlugRef.current = activeGuideSlug;
    if (activeGuideSlug) {
      resetGuideScrollPosition();
    }
  }, [activeGuide?.slug]);

  useEffect(() => {
    if (!guideCarouselApi) return;
    const updateSelection = () =>
      setGuideCarouselIndex(guideCarouselApi.selectedScrollSnap());
    updateSelection();
    guideCarouselApi.on("select", updateSelection);
    guideCarouselApi.on("reInit", updateSelection);
    return () => {
      guideCarouselApi.off("select", updateSelection);
      guideCarouselApi.off("reInit", updateSelection);
    };
  }, [guideCarouselApi]);

  useEffect(() => {
    if (
      !guideCarouselApi ||
      activeGuide ||
      guidesView === "list" ||
      displayedGuideFeedGuides.length === 0
    )
      return;
    guideCarouselApi.scrollTo(0);
    setGuideCarouselIndex(0);
  }, [
    activeGuide,
    guideCarouselApi,
    displayedGuideFeedGuides.length,
    guidesView,
    selectedCity,
  ]);

  useEffect(() => {
    if (
      !selectedCity ||
      loading ||
      activeGuide ||
      guidesView === "list" ||
      prefersReducedMotion ||
      !guideCarouselApi ||
      displayedGuideFeedGuides.length <= 1 ||
      !guideCarouselApi.canScrollNext()
    ) {
      setPlayGuideCarouselCue(false);
      return undefined;
    }

    if (shownGuideCarouselCueCitiesRef.current.has(selectedCity)) {
      setPlayGuideCarouselCue(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      shownGuideCarouselCueCitiesRef.current.add(selectedCity);
      writeSeenGuideCarouselCueCities(shownGuideCarouselCueCitiesRef.current);
      setPlayGuideCarouselCue(true);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [
    activeGuide,
    guideCarouselApi,
    displayedGuideFeedGuides.length,
    guidesView,
    loading,
    prefersReducedMotion,
    selectedCity,
  ]);

  useEffect(() => {
    if (!selectedCity || guideSelectionState !== "missing") return;
    if (guideParam) {
      onGuideChange(null);
    }
  }, [guideParam, guideSelectionState, onGuideChange, selectedCity]);

  const handleCitySelect = (nextCity: string) => {
    setSelectedCity(nextCity);
    onGuideChange(null);
    if (nextCity) {
      localStorage.setItem(MY_HOOD_CITY_STORAGE_KEY, nextCity);
      onCityChange(nextCity);
    } else {
      localStorage.removeItem(MY_HOOD_CITY_STORAGE_KEY);
      onCityChange("");
    }
  };

  const handleOpenGuideMap = (
    guide: CityGuide,
    place: CityGuide["places"][number],
  ) => {
    const normalizedName = normalizeGuideText(place.name);
    const normalizedCity = normalizeGuideText(guide.city);
    const normalizedState = normalizeGuideText(guide.state);
    const normalizedLat = normalizeGuideCoordinate(place.lat);
    const normalizedLng = normalizeGuideCoordinate(place.lng);
    const returnGuide = {
      citySlug: guide.city_slug || selectedCity || slugifyCity(guide.city),
      guideSlug: guide.slug,
      guidesView,
    };
    const fallbackQuery = [normalizedName, normalizedCity]
      .filter(Boolean)
      .join(" ")
      .trim();
    const hasExactCoordinates =
      normalizedLat !== null &&
      normalizedLng !== null &&
      normalizedLat >= -90 &&
      normalizedLat <= 90 &&
      normalizedLng >= -180 &&
      normalizedLng <= 180 &&
      !(normalizedLat === 0 && normalizedLng === 0);

    if (!fallbackQuery) return;

    navigate(APP_CONFIG.variant === "setu_china" || APP_CONFIG.variant === "jom_settle" ? "/dashboard?view=map" : "/dashboard", {
      state: {
        hoodienieMapSearch: {
          query: fallbackQuery,
          displayName: normalizedName || fallbackQuery,
          suburb: normalizedCity,
          state: normalizedState,
          source: hasExactCoordinates ? "guide-place" : "search",
          lat: hasExactCoordinates ? normalizedLat : undefined,
          lng: hasExactCoordinates ? normalizedLng : undefined,
          returnGuide,
          placeTarget: hasExactCoordinates
            ? {
                kind: "guide-place",
                label: normalizedName || fallbackQuery,
                city: normalizedCity,
                state: normalizedState,
                description: place.description,
                imageUrl: place.image_url,
                navigationLink: place.navigation_link,
                returnGuide,
                lat: normalizedLat,
                lng: normalizedLng,
              }
            : undefined,
        },
      },
    });
  };

  if (!selectedCity && resolvingDefaultCity) {
    return (
      <div className={`flex items-center justify-center px-4 ${embedded ? 'min-h-[180px]' : 'h-full'}`}>
        <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1E40AF]">
              <Compass className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">
                Finding your city
              </p>
              <p className="text-xs text-[#64748B]">
                Looking at your saved address so My 'hood opens in the right
                place.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCity) {
    return (
      <div className={rootScrollClassName}>
        <div className={`${contentWidthClassName} ${contentPaddingClassName}`}>
          <section className="border-b border-[#E2E8F0] pb-5 pt-2">
            <div className={`relative w-full min-w-0 ${isSetuChina ? "max-w-none sm:max-w-[240px]" : "max-w-[240px]"}`}>
              <ChevronDown
                data-testid="city-guides-city-select-chevron"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                strokeWidth={1.8}
              />
              <select
                value=""
                onChange={(event) => handleCitySelect(event.target.value)}
                aria-label="Choose city"
                className="h-11 w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 pr-9 text-sm font-semibold text-[#0F172A] outline-none"
              >
                <option value="">
                  {isSetuChina ? "选择城市 / Choose a city" : "Choose a city"}
                </option>
                {availableCities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={guideScrollContainerRef}
      data-testid="city-guides-scroll-container"
      className={rootScrollClassName}
      style={rootScrollStyle}
    >
      <div className={`${contentWidthClassName} ${contentPaddingClassName}`}>
        <section className="border-b border-[#E2E8F0] pb-5 pt-2">
          <div className={`flex gap-3 ${isSetuChina ? "flex-col items-stretch sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between"}`}>
            <div className={`relative min-w-0 flex-1 ${isSetuChina ? "max-w-none sm:max-w-[240px]" : "max-w-[200px] sm:max-w-[240px]"}`}>
              <ChevronDown
                data-testid="city-guides-city-select-chevron"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                strokeWidth={1.8}
              />
              <select
                value={selectedCity}
                onChange={(event) => handleCitySelect(event.target.value)}
                aria-label="Choose city"
                className="h-11 w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 pr-9 text-sm font-semibold text-[#0F172A] outline-none"
              >
                {availableCities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>
            {showGuideFeedAction ? (
              guidesView === "list" ? (
                <button
                  type="button"
                  onClick={() => onGuidesViewChange("carousel")}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-[#D8E3F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] ${
                    isSetuChina ? "min-h-10 justify-center whitespace-normal text-center leading-tight [overflow-wrap:anywhere] sm:w-auto" : ""
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                  {isSetuChina ? "返回推荐" : "Back to carousel"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onGuidesViewChange("list")}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-[#D8E3F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] ${
                    isSetuChina ? "min-h-10 justify-center whitespace-normal text-center leading-tight [overflow-wrap:anywhere] sm:w-auto" : ""
                  }`}
                >
                  {isSetuChina ? "查看全部" : "View All"}
                </button>
              )
            ) : null}
          </div>
        </section>

        <div className="mt-6">
          {loading || (guideSelectionState === "pending" && !visibleGuideError) ? (
            <div className="min-w-0 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <div className="flex items-center gap-3 text-[#64748B]">
                <Sparkles
                  className="h-5 w-5 text-[#1E40AF]"
                  strokeWidth={1.8}
                />
                <p className="text-sm">
                  {guideSelectionState === "pending" && guideParam
                    ? isSetuChina
                      ? `正在打开 ${selectedCityOption?.label || "当前城市"} 的共享指南...`
                      : `Opening your shared guide in ${selectedCityOption?.label || "this city"}...`
                    : isSetuChina
                      ? `正在加载 ${selectedCityOption?.label || "当前城市"} 的地区指南...`
                      : `Loading guides for ${selectedCityOption?.label || "your city"}...`}
                </p>
              </div>
            </div>
          ) : visibleGuideError ? (
            <div className="min-w-0 rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] p-5">
              <p className="text-sm text-[#991B1B]">{visibleGuideError}</p>
              <button
                type="button"
                onClick={() => setRetryTick((current) => current + 1)}
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-[#FCA5A5] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] transition-colors hover:bg-[#FFF1F2]"
              >
                {isSetuChina ? "重试" : "Try again"}
              </button>
            </div>
          ) : displayedGuideFeedGuides.length === 0 ? (
            <div className="min-w-0 rounded-[24px] border border-dashed border-[#CBD5E1] bg-white p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#1E40AF]">
                <BookOpen className="h-6 w-6" strokeWidth={1.7} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">
                {isSetuChina ? "这个城市暂无地区指南" : "No guides in this city yet"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                {isSetuChina
                  ? "切换城市，或稍后查看新的地区与生活指南。"
                  : "Switch cities or add a guide from the admin panel when you are ready to curate this place."}
              </p>
            </div>
          ) : activeGuide ? (
            <div
              className={`space-y-10 ${
                showThemedGuideTreatment
                  ? `hoodie-vivid-guide hoodie-flagship-guide ${activeFlagshipThemeClass}`
                  : ""
              }`}
            >
              {showThemedGuideTreatment ? (
                <>
                  <div
                    className="hoodie-vivid-screen-lights"
                    aria-hidden="true"
                  />
                  <div
                    className="hoodie-vivid-light-field"
                    aria-hidden="true"
                  />
                </>
              ) : null}
              <article className="min-w-0">
                <button
                  type="button"
                  onClick={() => onGuideChange(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                  {isSetuChina ? "全部指南" : "All guides"}
                </button>

                <div
                  className={`aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-[#F8FAFC] sm:aspect-[16/9] ${
                    showThemedGuideTreatment
                      ? "hoodie-vivid-media hoodie-vivid-cover-media"
                      : ""
                  }`}
                >
                  <GuideImage
                    src={activeGuide.cover_image_url}
                    alt={activeGuide.title}
                    className="h-full w-full object-cover"
                    emptyStateClassName="flex h-full items-center justify-center text-[#94A3B8]"
                    iconClassName="h-8 w-8"
                    eager
                    highPriority
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#1E40AF] ${
                      showThemedGuideTreatment ? "hoodie-vivid-chip" : ""
                    }`}
                  >
                    {formatGuideLocation(activeGuide.city, activeGuide.state)}
                  </span>
                  <span
                    className={`rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#475569] ${
                      showThemedGuideTreatment ? "hoodie-vivid-chip" : ""
                    }`}
                  >
                    {getGuideBadgeLabel(activeGuide)}
                  </span>
                </div>

                <h3
                  className={`mt-4 break-words font-bold leading-tight text-[#0F172A] [overflow-wrap:anywhere] ${
                    isSetuChina ? "text-[2rem] sm:text-[34px]" : "text-[34px]"
                  } ${
                    showThemedGuideTreatment ? "hoodie-vivid-title" : ""
                  }`}
                >
                  {normalizeGuideText(activeGuide.title)}
                </h3>
                <p className="mt-4 max-w-3xl break-words text-base leading-8 text-[#475569]">
                  {normalizeGuideText(activeGuide.intro)}
                </p>
                {activeFlagshipMeta ? (
                  <FlagshipEventStatusPanel
                    entry={activeFlagshipMeta}
                    isThemed={showThemedGuideTreatment}
                  />
                ) : null}
                {shareEnabled ? (
                  <div
                    className={`mt-5 ${
                      showThemedGuideTreatment ? "hoodie-vivid-share" : ""
                    }`}
                  >
                    <HoodieShareActions
                      descriptor={buildCityGuideShareDescriptor(activeGuide)}
                      variant="invite"
                    />
                  </div>
                ) : null}

                {activeGuide.places.length > 1 ? (
                  <div className="mt-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      In this guide
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeGuide.places.map((place, index) => {
                        const anchorId = getGuidePlaceAnchorId(
                          activeGuide.slug,
                          place.id,
                          index,
                        );
                        return (
                          <a
                            key={place.id}
                            href={`#${anchorId}`}
                            onClick={(event) =>
                              handleGuidePlaceAnchorClick(event, anchorId)
                            }
                            className={`inline-flex max-w-full items-center rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] ${
                              showThemedGuideTreatment
                                ? "hoodie-vivid-anchor"
                                : ""
                            }`}
                          >
                            <span className={isSetuChina ? "min-w-0 break-words leading-tight [overflow-wrap:anywhere]" : "truncate"}>
                              {getGuideSectionLabel(activeGuide, index)}:{" "}
                              {normalizeGuideText(place.name)}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mt-10 space-y-10">
                  {activeGuide.places.map((place, index) => {
                    const anchorId = getGuidePlaceAnchorId(
                      activeGuide.slug,
                      place.id,
                      index,
                    );
                    const availability = getGuidePlaceMapAvailability(place);
                    const paragraphs = getGuideTextParagraphs(
                      place.description,
                    );

                    return (
                      <article
                        key={place.id}
                        id={anchorId}
                        className={`scroll-mt-24 border-t border-[#E2E8F0] pt-8 ${
                          showThemedGuideTreatment
                            ? "hoodie-vivid-place"
                            : ""
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                          {getGuideSectionLabel(activeGuide, index)}
                        </p>
                        <h4 className={`mt-3 break-words font-bold leading-tight text-[#0F172A] [overflow-wrap:anywhere] ${
                          isSetuChina ? "text-[1.65rem] sm:text-[28px]" : "text-[28px]"
                        }`}>
                          {normalizeGuideText(place.name)}
                        </h4>

                        {place.image_url ? (
                          <div
                            className={`mt-5 overflow-hidden rounded-[24px] bg-[#F8FAFC] ${
                              showThemedGuideTreatment
                                ? "hoodie-vivid-media hoodie-vivid-place-media"
                                : ""
                            }`}
                          >
                            <GuideImage
                              src={place.image_url}
                              alt={place.name}
                              className="aspect-[16/10] w-full object-cover"
                              emptyStateClassName="flex aspect-[16/10] w-full items-center justify-center text-[#94A3B8]"
                              iconClassName="h-8 w-8"
                            />
                          </div>
                        ) : null}

                        <div className="mt-5 max-w-3xl space-y-5 text-base leading-8 text-[#475569]">
                          {paragraphs.length ? (
                            paragraphs.map((paragraph, paragraphIndex) => (
                              <p
                                key={`${place.id}-paragraph-${paragraphIndex}`}
                              >
                                {paragraph}
                              </p>
                            ))
                          ) : (
                            <p>
                              Editorial notes for this place are being updated.
                            </p>
                          )}
                        </div>

                        <div className="mt-6 flex flex-col items-start gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenGuideMap(activeGuide, place)
                            }
                            disabled={!availability.canOpenGuideMap}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] disabled:text-white/90 sm:w-auto ${
                              showThemedGuideTreatment
                                ? "hoodie-vivid-map-button"
                                : ""
                            }`}
                          >
                            <Navigation className="h-4 w-4" strokeWidth={1.8} />
                            <span>{isSetuChina ? "在地图中查看" : "Show on Map"}</span>
                          </button>
                          {availability.disabledReason ? (
                            <p className="max-w-2xl text-sm leading-6 text-[#64748B]">
                              {availability.disabledReason}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>

              {relatedGuides.length ? (
                <section className="border-t border-[#E2E8F0] pt-8">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      More in {selectedCityOption?.label || "this city"}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                      {isSetuChina ? "更多指南" : "More guides"}
                    </h3>
                  </div>

                  <div className="mt-6 space-y-6">
                    {relatedGuides.map((guide) => (
                      <button
                        key={guide.id}
                        type="button"
                        onClick={() => {
                          resetGuideScrollPosition();
                          onGuideChange(guide.slug);
                        }}
                        className="group block w-full border-b border-[#E2E8F0] pb-6 text-left last:border-b-0 last:pb-0"
                      >
                        <div className="grid gap-4 sm:grid-cols-[180px,minmax(0,1fr)] sm:items-start">
                          <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-[#F8FAFC]">
                            <GuideImage
                              src={guide.cover_image_url}
                              alt={guide.title}
                              className="h-full w-full object-cover"
                              emptyStateClassName="flex h-full items-center justify-center text-[#94A3B8]"
                              iconClassName="h-7 w-7"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#1E40AF]">
                                {formatGuideLocation(guide.city, guide.state)}
                              </span>
                              <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#475569]">
                                {getGuideBadgeLabel(guide)}
                              </span>
                            </div>

                            <h4 className="mt-3 break-words text-[22px] font-bold leading-tight text-[#0F172A]">
                              {normalizeGuideText(guide.title)}
                            </h4>
                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1E40AF] transition-colors group-hover:text-[#1D4ED8]">
                              <BookOpen className="h-4 w-4" strokeWidth={1.8} />
                              Read guide
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <section className="pt-2">
              {guidesView === "list" ? (
                <div className="space-y-5">
                  {displayedGuideFeedGuides.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => onGuideChange(guide.slug)}
                      className="group block w-full border-b border-[#E2E8F0] pb-5 text-left last:border-b-0 last:pb-0"
                    >
                      <div className="grid grid-cols-[112px,minmax(0,1fr)] gap-3 sm:grid-cols-[160px,minmax(0,1fr)] sm:gap-4">
                        <div className="aspect-[5/4] overflow-hidden rounded-[18px] bg-[#F8FAFC] sm:rounded-[20px]">
                          <GuideImage
                            src={guide.cover_image_url}
                            alt={guide.title}
                            className="h-full w-full object-cover"
                            emptyStateClassName="flex h-full items-center justify-center text-[#94A3B8]"
                            iconClassName="h-7 w-7"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-semibold text-[#1E40AF]">
                              {getGuideBadgeLabel(guide)}
                            </span>
                            <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-semibold text-[#475569]">
                              {formatGuideLocation(guide.city, guide.state)}
                            </span>
                          </div>

                          <h4 className="mt-2 break-words text-[20px] font-bold leading-tight text-[#0F172A] sm:text-[22px]">
                            {normalizeGuideText(guide.title)}
                          </h4>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#475569]">
                            {normalizeGuideText(guide.intro) ||
                              "Open the full guide to read every place in this city story."}
                          </p>
                          <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1E40AF] transition-colors group-hover:text-[#1D4ED8]">
                            <BookOpen className="h-4 w-4" strokeWidth={1.8} />
                            Read guide
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <motion.div
                    animate={
                      playGuideCarouselCue ? { x: [0, -18, 0] } : { x: 0 }
                    }
                    transition={
                      playGuideCarouselCue
                        ? {
                            duration: 0.72,
                            ease: "easeInOut",
                            times: [0, 0.45, 1],
                          }
                        : { duration: 0 }
                    }
                    onAnimationComplete={() => {
                      if (playGuideCarouselCue) setPlayGuideCarouselCue(false);
                    }}
                    className="-mr-4 pr-4 sm:mr-0 sm:pr-0"
                  >
                    <Carousel
                      setApi={setGuideCarouselApi}
                      opts={{ align: "start", loop: false }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-0 pr-2 sm:pr-0">
                        {displayedGuideFeedGuides.map((guide, guideIndex) => (
                          <CarouselItem
                            key={guide.id}
                            className="basis-[88%] pl-0 pr-3 sm:basis-full sm:pr-0"
                          >
                            <button
                              type="button"
                              onClick={() => onGuideChange(guide.slug)}
                              className="group block w-full text-left"
                            >
                              <div className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-sm">
                                <div className="relative aspect-[5/4] overflow-hidden bg-[#F8FAFC] sm:aspect-[16/10]">
                                  <GuideImage
                                    src={guide.cover_image_url}
                                    alt={guide.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    emptyStateClassName="flex h-full items-center justify-center text-[#94A3B8]"
                                    iconClassName="h-8 w-8"
                                    eager={guideIndex === guideCarouselIndex}
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F172A]/82 via-[#0F172A]/42 to-transparent px-4 pb-4 pt-10 sm:px-5 sm:pb-5 sm:pt-12">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                        {getGuideBadgeLabel(guide)}
                                      </span>
                                      <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                        {formatGuideLocation(
                                          guide.city,
                                          guide.state,
                                        )}
                                      </span>
                                    </div>
                                    <h4 className="mt-2 line-clamp-2 break-words text-[22px] font-bold leading-tight text-white sm:mt-3 sm:text-[24px]">
                                      {normalizeGuideText(guide.title)}
                                    </h4>
                                  </div>
                                </div>

                                <div className="px-4 py-4 sm:px-5 sm:py-5">
                                  <p className="line-clamp-2 text-sm leading-6 text-[#475569] sm:leading-7">
                                    {normalizeGuideText(guide.intro) ||
                                      "Open the full guide to read every place in this city story."}
                                  </p>
                                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1E40AF] transition-colors group-hover:text-[#1D4ED8]">
                                    <BookOpen
                                      className="h-4 w-4"
                                      strokeWidth={1.8}
                                    />
                                    Read guide
                                  </div>
                                </div>
                              </div>
                            </button>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </motion.div>

                  {displayedGuideFeedGuides.length > 1 ? (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {displayedGuideFeedGuides.map((guide, index) => (
                        <button
                          key={guide.id}
                          type="button"
                          onClick={() => guideCarouselApi?.scrollTo(index)}
                          aria-label={`Go to guide ${index + 1}`}
                          className={`h-2.5 rounded-full transition-all ${
                            guideCarouselIndex === index
                              ? "w-7 bg-[#1E40AF]"
                              : "w-2.5 bg-[#CBD5E1]"
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
