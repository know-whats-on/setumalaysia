import { APP_CONFIG } from "./app-config";
import type { CityGuide, OfficialEvent, PublicPlan } from "./api";

export type HoodieShareKind =
  | "event"
  | "public_plan"
  | "city_guide"
  | "suburb_snapshot"
  | "address_check_snapshot"
  | "scam_check_summary"
  | "household_invite";

export type HoodieSharePrivacyClass =
  | "public_safe"
  | "personalized_generic_link";

export type HoodieShareCardTone =
  | "event"
  | "plan"
  | "guide"
  | "suburb"
  | "address"
  | "scam"
  | "household";

export type HoodieShareRenderStyle = "photo" | "brand";

export interface HoodieShareCardStatTile {
  label: string;
  value: string;
}

export interface HoodieShareCardData {
  tone: HoodieShareCardTone;
  title: string;
  eyebrowText?: string;
  insightLabel?: string;
  insightValue?: string;
  insightCaption?: string;
  insightBadgeText?: string;
  summaryText?: string;
  statTiles?: HoodieShareCardStatTile[];
  renderStyle: HoodieShareRenderStyle;
  backgroundImageUrl?: string;
  backgroundPosition?: string;
}

export interface HoodieShareDescriptor {
  kind: HoodieShareKind;
  privacyClass: HoodieSharePrivacyClass;
  canonicalShareUrl: string;
  appRoute: string;
  renderStyle: HoodieShareRenderStyle;
  backgroundImageUrl?: string;
  shareTitle: string;
  shareText: string;
  shareCaption: string;
  clipboardFallbackText?: string;
  storyCardData: HoodieShareCardData;
  feedCardData: HoodieShareCardData;
}

export type HoodieShareRouteMatch =
  | { kind: "event"; source: string; slug: string }
  | { kind: "public_plan"; source: string; slug: string; planId: string }
  | { kind: "city_guide"; citySlug: string; guideSlug: string }
  | { kind: "suburb_snapshot"; suburbSlug: string }
  | { kind: "address_check_snapshot" }
  | { kind: "scam_check_summary" }
  | { kind: "household_invite"; token: string };

type PublicGuideShareInput = Pick<
  CityGuide,
  | "slug"
  | "city"
  | "city_slug"
  | "state"
  | "title"
  | "intro"
  | "places"
  | "cover_image_url"
>;
type PublicEventShareInput = Pick<
  OfficialEvent,
  | "source"
  | "slug"
  | "title"
  | "summary"
  | "source_label"
  | "free_event"
  | "dates_humanized"
  | "venue_name"
  | "suburb"
  | "image_url"
  | "hero_image_url"
  | "instagram_post_image_url"
  | "instagram_story_image_url"
>;
type PublicPlanShareInput = Pick<
  PublicPlan,
  | "id"
  | "invite_token"
  | "event_source"
  | "event_slug"
  | "title"
  | "note"
  | "meeting_point"
  | "meetup_at"
  | "attendee_count"
  | "source_event"
>;

function cleanSegment(value: string) {
  return encodeURIComponent(String(value || "").trim());
}

export function slugifyHoodieShareText(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function humanizeHoodieShareSlug(value: string) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildDeepLink(route: string) {
  return `${APP_CONFIG.urlScheme}://${route.replace(/^\//, "")}`;
}

function getShareBaseUrl() {
  return new URL(APP_CONFIG.shareBaseUrl);
}

function getShareAppName() {
  return APP_CONFIG.displayName;
}

function buildShareUrl(pathname: string) {
  return new URL(pathname, getShareBaseUrl()).toString();
}

function normalizeBackgroundImageUrl(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function getRenderStyle(backgroundImageUrl?: string): HoodieShareRenderStyle {
  return backgroundImageUrl ? "photo" : "brand";
}

function buildShareCaption(title: string, canonicalShareUrl: string) {
  return `${title}\n${canonicalShareUrl}`;
}

function buildShareTitle(title: string) {
  return `${title} on ${getShareAppName()}`;
}

function buildVibeRoute(params: Record<string, string | null | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  return `/vibe${suffix}`;
}

function buildArrivalShareRoute(kind: "address-check" | "scam-check") {
  const searchParams = new URLSearchParams();
  searchParams.set("shared", kind);
  return `/arrival?${searchParams.toString()}`;
}

function buildGuideVibeRoute(citySlug: string, guideSlug?: string | null) {
  return buildVibeRoute({
    section: "vibe",
    vibe_tab: "my-hood",
    city: citySlug,
    guide: guideSlug || null,
  });
}

function buildSuburbVibeRoute(suburbSlug: string) {
  return buildVibeRoute({
    section: "vibe",
    vibe_tab: "suburb-score",
    suburb: suburbSlug,
  });
}

function buildPublicEventAppRoute(source: string, slug: string) {
  return `/events/${cleanSegment(source)}/${cleanSegment(slug)}`;
}

function buildPublicPlanAppRoute(source: string, slug: string, planId: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("plan", planId);
  return `/events/${cleanSegment(source)}/${cleanSegment(slug)}?${searchParams.toString()}`;
}

function buildStandalonePublicPlanAppRoute(planId: string, inviteToken?: string) {
  const searchParams = new URLSearchParams();
  if (inviteToken) searchParams.set("invite_token", inviteToken);
  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  return `/plans/${cleanSegment(planId)}${suffix}`;
}

export function buildHoodieEventSharePath(source: string, slug: string) {
  return `/share/event/${cleanSegment(source)}/${cleanSegment(slug)}`;
}

export function buildHoodiePlanSharePath(
  source: string,
  slug: string,
  planId: string,
) {
  return `/share/plan/${cleanSegment(source)}/${cleanSegment(slug)}/${cleanSegment(planId)}`;
}

export function buildStandalonePlanSharePath(planId: string, inviteToken?: string) {
  const searchParams = new URLSearchParams();
  if (inviteToken) searchParams.set("invite_token", inviteToken);
  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  return `/plans/${cleanSegment(planId)}${suffix}`;
}

export function buildHoodieGuideSharePath(citySlug: string, guideSlug: string) {
  return `/share/guide/${cleanSegment(citySlug)}/${cleanSegment(guideSlug)}`;
}

export function buildHoodieSuburbSharePath(suburbSlug: string) {
  return `/share/suburb/${cleanSegment(suburbSlug)}`;
}

export function buildHoodieAddressCheckSharePath() {
  return "/share/address-check";
}

export function buildHoodieScamCheckSharePath() {
  return "/share/scam-check";
}

export function buildHoodieHouseholdInviteSharePath(token: string) {
  return `/share/household-invite/${cleanSegment(token)}`;
}

export function buildHoodieGuideAppRoute(citySlug: string, guideSlug: string) {
  return `/guide/${cleanSegment(citySlug)}/${cleanSegment(guideSlug)}`;
}

export function buildHoodieSuburbAppRoute(suburbSlug: string) {
  return `/suburb/${cleanSegment(suburbSlug)}`;
}

function buildCardData(
  base: HoodieShareCardData,
  overrides?: Partial<HoodieShareCardData>,
) {
  return {
    ...base,
    ...overrides,
  };
}

function formatSuburbStatValue(
  value: number | null | undefined,
  options?: { suffix?: string },
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  const rounded = Math.max(0, Math.round(numeric));
  return `${rounded.toLocaleString()}${options?.suffix || ""}`;
}

function buildSuburbStatTiles(input: {
  crimeScore?: number | null;
  personalSafetyScore?: number | null;
  propertyCrimeScore?: number | null;
  totalStudents: number;
}): HoodieShareCardStatTile[] {
  return [
    { label: "Crime score", value: formatSuburbStatValue(input.crimeScore) },
    {
      label: "Personal safety",
      value: formatSuburbStatValue(input.personalSafetyScore),
    },
    {
      label: "Property crime",
      value: formatSuburbStatValue(input.propertyCrimeScore),
    },
    {
      label: "Tertiary students",
      value: formatSuburbStatValue(input.totalStudents),
    },
  ];
}

function getDefaultSuburbSummary(input: {
  vibeBadge?: string;
  crimeBand?: string | null;
  totalStudents: number;
}) {
  const vibeBadge = String(input.vibeBadge || "").trim();
  const crimeBand = String(input.crimeBand || "").trim();
  const studentsSummary =
    input.totalStudents > 0
      ? `${input.totalStudents.toLocaleString()} tertiary students already live nearby`
      : "Student move-in demand is already visible in this area";
  const vibeSummary = vibeBadge
    ? `${vibeBadge} character shows up strongly here`
    : "This suburb blends daily convenience with local context";
  const crimeSummary = crimeBand
    ? `${crimeBand} crime context in current Vibe data`
    : "Crime context is still being refreshed in Vibe";
  return `${studentsSummary}. ${vibeSummary}, with ${crimeSummary.toLowerCase()}.`;
}

export function buildOfficialEventShareDescriptor(
  event: PublicEventShareInput,
): HoodieShareDescriptor {
  const sharePath = buildHoodieEventSharePath(event.source, event.slug);
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildPublicEventAppRoute(event.source, event.slug);
  const feedBackgroundImageUrl = normalizeBackgroundImageUrl(
    event.instagram_post_image_url || event.hero_image_url || event.image_url,
  );
  const storyBackgroundImageUrl = normalizeBackgroundImageUrl(
    event.instagram_story_image_url || event.hero_image_url || event.image_url,
  );
  const backgroundImageUrl =
    feedBackgroundImageUrl || storyBackgroundImageUrl;
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const feedRenderStyle = getRenderStyle(feedBackgroundImageUrl);
  const storyRenderStyle = getRenderStyle(storyBackgroundImageUrl);
  const baseCard = {
    tone: "event" as const,
    title: event.title,
    eyebrowText: "Check out",
    backgroundPosition: "center center",
  };

  return {
    kind: "event",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(event.title),
    shareText: buildShareTitle(event.title),
    shareCaption: buildShareCaption(event.title, canonicalShareUrl),
    storyCardData: buildCardData(baseCard, {
      renderStyle: storyRenderStyle,
      backgroundImageUrl: storyBackgroundImageUrl,
    }),
    feedCardData: buildCardData(baseCard, {
      renderStyle: feedRenderStyle,
      backgroundImageUrl: feedBackgroundImageUrl,
    }),
  };
}

export function buildPublicPlanShareDescriptor(
  plan: PublicPlanShareInput,
): HoodieShareDescriptor {
  const sharePath = buildHoodiePlanSharePath(
    plan.event_source,
    plan.event_slug,
    plan.id,
  );
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildPublicPlanAppRoute(
    plan.event_source,
    plan.event_slug,
    plan.id,
  );
  const feedBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_post_image_url || plan.source_event.image_url,
  );
  const storyBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_story_image_url || plan.source_event.image_url,
  );
  const backgroundImageUrl =
    feedBackgroundImageUrl || storyBackgroundImageUrl;
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const feedRenderStyle = getRenderStyle(feedBackgroundImageUrl);
  const storyRenderStyle = getRenderStyle(storyBackgroundImageUrl);
  const baseCard = {
    tone: "plan" as const,
    title: plan.title,
    backgroundPosition: "center center",
  };

  return {
    kind: "public_plan",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(plan.title),
    shareText: buildShareTitle(plan.title),
    shareCaption: buildShareCaption(plan.title, canonicalShareUrl),
    storyCardData: buildCardData(baseCard, {
      renderStyle: storyRenderStyle,
      backgroundImageUrl: storyBackgroundImageUrl,
    }),
    feedCardData: buildCardData(baseCard, {
      renderStyle: feedRenderStyle,
      backgroundImageUrl: feedBackgroundImageUrl,
    }),
  };
}

export function buildPublicPlanInviteShareDescriptor(
  plan: PublicPlanShareInput,
): HoodieShareDescriptor {
  const sharePath = buildHoodiePlanSharePath(
    plan.event_source,
    plan.event_slug,
    plan.id,
  );
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildPublicPlanAppRoute(
    plan.event_source,
    plan.event_slug,
    plan.id,
  );
  const feedBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_post_image_url || plan.source_event.image_url,
  );
  const storyBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_story_image_url || plan.source_event.image_url,
  );
  const backgroundImageUrl =
    feedBackgroundImageUrl || storyBackgroundImageUrl;
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const feedRenderStyle = getRenderStyle(feedBackgroundImageUrl);
  const storyRenderStyle = getRenderStyle(storyBackgroundImageUrl);
  const inviteShareText = [
    "Join me for",
    plan.source_event.title,
    canonicalShareUrl,
  ].join("\n");
  const baseCard = {
    tone: "plan" as const,
    title: plan.source_event.title,
    eyebrowText: "Join me for",
    backgroundPosition: "center center",
  };

  return {
    kind: "public_plan",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(plan.source_event.title),
    shareText: inviteShareText,
    shareCaption: inviteShareText,
    clipboardFallbackText: inviteShareText,
    storyCardData: buildCardData(baseCard, {
      renderStyle: storyRenderStyle,
      backgroundImageUrl: storyBackgroundImageUrl,
    }),
    feedCardData: buildCardData(baseCard, {
      renderStyle: feedRenderStyle,
      backgroundImageUrl: feedBackgroundImageUrl,
    }),
  };
}

export function buildStandalonePublicPlanShareDescriptor(
  plan: PublicPlanShareInput,
): HoodieShareDescriptor {
  const sharePath = buildStandalonePlanSharePath(plan.id, plan.invite_token);
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildStandalonePublicPlanAppRoute(plan.id, plan.invite_token);
  const feedBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_post_image_url || plan.source_event.image_url,
  );
  const storyBackgroundImageUrl = normalizeBackgroundImageUrl(
    plan.source_event.instagram_story_image_url || plan.source_event.image_url,
  );
  const backgroundImageUrl =
    feedBackgroundImageUrl || storyBackgroundImageUrl;
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const baseCard = {
    tone: "plan" as const,
    title: plan.title,
    eyebrowText: "Join my plan",
    backgroundPosition: "center center",
  };

  return {
    kind: "public_plan",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(plan.title),
    shareText: `Join my plan: ${plan.title}`,
    shareCaption: buildShareCaption(plan.title, canonicalShareUrl),
    clipboardFallbackText: buildShareCaption(plan.title, canonicalShareUrl),
    storyCardData: buildCardData(baseCard, {
      renderStyle: getRenderStyle(storyBackgroundImageUrl),
      backgroundImageUrl: storyBackgroundImageUrl,
    }),
    feedCardData: buildCardData(baseCard, {
      renderStyle: getRenderStyle(feedBackgroundImageUrl),
      backgroundImageUrl: feedBackgroundImageUrl,
    }),
  };
}

export function buildCityGuideShareDescriptor(
  guide: PublicGuideShareInput,
): HoodieShareDescriptor {
  const citySlug = guide.city_slug || slugifyHoodieShareText(guide.city);
  const sharePath = buildHoodieGuideSharePath(citySlug, guide.slug);
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildHoodieGuideAppRoute(citySlug, guide.slug);
  const backgroundImageUrl = normalizeBackgroundImageUrl(guide.cover_image_url);
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const baseCard = {
    tone: "guide" as const,
    title: guide.title,
    eyebrowText: "Check this out",
    renderStyle,
    backgroundImageUrl,
    backgroundPosition: "center center",
  };

  return {
    kind: "city_guide",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(guide.title),
    shareText: buildShareTitle(guide.title),
    shareCaption: buildShareCaption(guide.title, canonicalShareUrl),
    storyCardData: buildCardData(baseCard),
    feedCardData: buildCardData(baseCard),
  };
}

export function buildSuburbSnapshotShareDescriptor(input: {
  suburb: string;
  state: string;
  totalStudents: number;
  badge?: string;
  crimeScore?: number | null;
  personalSafetyScore?: number | null;
  propertyCrimeScore?: number | null;
  crimeBand?: string | null;
  summaryText?: string;
  backgroundImageUrl?: string;
  backgroundPosition?: string;
}): HoodieShareDescriptor {
  const suburbSlug = slugifyHoodieShareText(input.suburb);
  const sharePath = buildHoodieSuburbSharePath(suburbSlug);
  const canonicalShareUrl = buildShareUrl(sharePath);
  const appRoute = buildHoodieSuburbAppRoute(suburbSlug);
  const backgroundImageUrl = normalizeBackgroundImageUrl(
    input.backgroundImageUrl,
  );
  const renderStyle = getRenderStyle(backgroundImageUrl);
  const baseCard = {
    tone: "suburb" as const,
    eyebrowText: "Explore",
    title: input.suburb,
    insightBadgeText: String(input.badge || "").trim() || undefined,
    summaryText:
      String(input.summaryText || "").trim() ||
      getDefaultSuburbSummary({
        vibeBadge: input.badge,
        crimeBand: input.crimeBand,
        totalStudents: input.totalStudents,
      }),
    statTiles: buildSuburbStatTiles({
      crimeScore: input.crimeScore,
      personalSafetyScore: input.personalSafetyScore,
      propertyCrimeScore: input.propertyCrimeScore,
      totalStudents: input.totalStudents,
    }),
    renderStyle,
    backgroundImageUrl,
    backgroundPosition:
      String(input.backgroundPosition || "center center").trim() ||
      "center center",
  };

  return {
    kind: "suburb_snapshot",
    privacyClass: "public_safe",
    canonicalShareUrl,
    appRoute,
    renderStyle,
    backgroundImageUrl,
    shareTitle: buildShareTitle(input.suburb),
    shareText: buildShareTitle(input.suburb),
    shareCaption: buildShareCaption(input.suburb, canonicalShareUrl),
    storyCardData: buildCardData(baseCard),
    feedCardData: buildCardData(baseCard),
  };
}

export function buildAddressCheckShareDescriptor(input: {
  suburb?: string;
  state?: string;
  city?: string;
  totalFlags?: number;
  matchedAddress?: string;
  summary?: string;
  query?: string;
}): HoodieShareDescriptor {
  const locationLabel = [input.suburb || input.city || "This area", input.state]
    .filter(Boolean)
    .join(", ");
  const totalFlags = Math.max(0, Number(input.totalFlags || 0));
  const canonicalShareUrl = buildShareUrl(buildHoodieAddressCheckSharePath());
  const appRoute = buildArrivalShareRoute("address-check");
  const baseCard = {
    tone: "address" as const,
    title: "Area snapshot",
    renderStyle: "brand" as const,
    backgroundImageUrl: undefined,
    backgroundPosition: "center center",
  };

  return {
    kind: "address_check_snapshot",
    privacyClass: "personalized_generic_link",
    canonicalShareUrl,
    appRoute,
    renderStyle: "brand",
    backgroundImageUrl: undefined,
    shareTitle: `Address check in ${getShareAppName()}`,
    shareText: `Address check in ${getShareAppName()}`,
    shareCaption: buildShareCaption(
      locationLabel || "Area snapshot",
      canonicalShareUrl,
    ),
    storyCardData: buildCardData(baseCard),
    feedCardData: buildCardData(baseCard),
  };
}

export function buildScamCheckShareDescriptor(input: {
  riskBand: "low" | "medium" | "high";
  flagCount: number;
  headline?: string;
  summary?: string;
  listingUrl?: string;
  contactName?: string;
}): HoodieShareDescriptor {
  const flagCount = Math.max(0, Number(input.flagCount || 0));
  const riskLabel =
    input.riskBand === "high"
      ? "High risk"
      : input.riskBand === "medium"
        ? "Medium risk"
        : "Low risk";
  const canonicalShareUrl = buildShareUrl(buildHoodieScamCheckSharePath());
  const appRoute = buildArrivalShareRoute("scam-check");
  const baseCard = {
    tone: "scam" as const,
    title: riskLabel,
    renderStyle: "brand" as const,
    backgroundImageUrl: undefined,
    backgroundPosition: "center center",
  };

  return {
    kind: "scam_check_summary",
    privacyClass: "personalized_generic_link",
    canonicalShareUrl,
    appRoute,
    renderStyle: "brand",
    backgroundImageUrl: undefined,
    shareTitle: `Scam check in ${getShareAppName()}`,
    shareText: `Scam check in ${getShareAppName()}`,
    shareCaption: buildShareCaption(riskLabel, canonicalShareUrl),
    storyCardData: buildCardData(baseCard),
    feedCardData: buildCardData(baseCard),
  };
}

export function isApprovedHoodieShareUrl(url: URL) {
  return (
    url.protocol === "https:" && url.hostname === getShareBaseUrl().hostname
  );
}

export function matchHoodieSharePath(
  pathname: string,
): HoodieShareRouteMatch | null {
  const trimmed = String(pathname || "").trim();
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  let match = normalizedPath.match(/^\/share\/event\/([^/]+)\/([^/]+)\/?$/i);
  if (match) {
    return {
      kind: "event",
      source: decodeURIComponent(match[1] || ""),
      slug: decodeURIComponent(match[2] || ""),
    };
  }

  match = normalizedPath.match(
    /^\/share\/plan\/([^/]+)\/([^/]+)\/([^/]+)\/?$/i,
  );
  if (match) {
    return {
      kind: "public_plan",
      source: decodeURIComponent(match[1] || ""),
      slug: decodeURIComponent(match[2] || ""),
      planId: decodeURIComponent(match[3] || ""),
    };
  }

  match = normalizedPath.match(/^\/share\/guide\/([^/]+)\/([^/]+)\/?$/i);
  if (match) {
    return {
      kind: "city_guide",
      citySlug: decodeURIComponent(match[1] || ""),
      guideSlug: decodeURIComponent(match[2] || ""),
    };
  }

  match = normalizedPath.match(/^\/share\/suburb\/([^/]+)\/?$/i);
  if (match) {
    return {
      kind: "suburb_snapshot",
      suburbSlug: decodeURIComponent(match[1] || ""),
    };
  }

  if (/^\/share\/address-check\/?$/i.test(normalizedPath)) {
    return { kind: "address_check_snapshot" };
  }

  if (/^\/share\/scam-check\/?$/i.test(normalizedPath)) {
    return { kind: "scam_check_summary" };
  }

  match = normalizedPath.match(/^\/share\/household-invite\/([^/]+)\/?$/i);
  if (match) {
    return {
      kind: "household_invite",
      token: decodeURIComponent(match[1] || ""),
    };
  }

  return null;
}

export function resolveHoodieShareMatchAppRoute(match: HoodieShareRouteMatch) {
  switch (match.kind) {
    case "event":
      return buildPublicEventAppRoute(match.source, match.slug);
    case "public_plan":
      return buildPublicPlanAppRoute(match.source, match.slug, match.planId);
    case "city_guide":
      return buildHoodieGuideAppRoute(match.citySlug, match.guideSlug);
    case "suburb_snapshot":
      return buildHoodieSuburbAppRoute(match.suburbSlug);
    case "address_check_snapshot":
      return buildArrivalShareRoute("address-check");
    case "scam_check_summary":
      return buildArrivalShareRoute("scam-check");
    case "household_invite":
      return `/profile?tab=household&invite=${cleanSegment(match.token)}&invite_intent=accept`;
    default:
      return "/";
  }
}

export function resolveHoodieGuidePathToVibeRoute(
  citySlug: string,
  guideSlug?: string | null,
) {
  return buildGuideVibeRoute(citySlug, guideSlug);
}

export function resolveHoodieSuburbPathToVibeRoute(suburbSlug: string) {
  return buildSuburbVibeRoute(suburbSlug);
}

export function resolveHoodieShareAppRouteFromPath(pathname: string) {
  const match = matchHoodieSharePath(pathname);
  return match ? resolveHoodieShareMatchAppRoute(match) : "";
}

export function buildHoodieShareDeepLinkForMatch(match: HoodieShareRouteMatch) {
  return buildDeepLink(resolveHoodieShareMatchAppRoute(match));
}

export function buildFallbackDescriptorForMatch(
  match: HoodieShareRouteMatch,
): HoodieShareDescriptor {
  const appName = getShareAppName();

  switch (match.kind) {
    case "event":
      return buildOfficialEventShareDescriptor({
        source: match.source,
        slug: match.slug,
        title: humanizeHoodieShareSlug(match.slug),
        summary: `Open this official event in ${appName} for the live details and local context.`,
        source_label: humanizeHoodieShareSlug(match.source),
        free_event: false,
        dates_humanized: "",
        venue_name: "",
        suburb: "",
        image_url: "",
        hero_image_url: "",
      });
    case "public_plan":
      return buildPublicPlanShareDescriptor({
        id: match.planId,
        event_source: match.source,
        event_slug: match.slug,
        title: "Public plan",
        note: `Open the plan in ${appName} for the meetup details.`,
        meeting_point: "",
        meetup_at: "",
        attendee_count: 0,
        source_event: {
          id: "",
          title: humanizeHoodieShareSlug(match.slug),
          summary: "",
          url: "",
          image_url: "",
          booking_url: "",
          venue_name: "",
          suburb: "",
          dates_humanized: "",
        },
      });
    case "city_guide":
      return buildCityGuideShareDescriptor({
        slug: match.guideSlug,
        city: humanizeHoodieShareSlug(match.citySlug),
        city_slug: match.citySlug,
        state: "",
        title: humanizeHoodieShareSlug(match.guideSlug),
        cover_image_url: "",
        intro: `Open this guide in ${appName} for the full city run-down.`,
        places: [],
      });
    case "suburb_snapshot":
      return buildSuburbSnapshotShareDescriptor({
        suburb: humanizeHoodieShareSlug(match.suburbSlug),
        state: "",
        totalStudents: 0,
      });
    case "address_check_snapshot":
      return buildAddressCheckShareDescriptor({});
    case "scam_check_summary":
      return buildScamCheckShareDescriptor({
        riskBand: "medium",
        flagCount: 0,
      });
    case "household_invite": {
      const sharePath = buildHoodieHouseholdInviteSharePath(match.token);
      const canonicalShareUrl = buildShareUrl(sharePath);
      const appRoute = resolveHoodieShareMatchAppRoute(match);
      const baseCard = {
        tone: "household" as const,
        title: `Household invite on ${appName}`,
        eyebrowText: `Shared from ${appName}`,
        summaryText: `Open ${appName} to review this household invite and decide whether to move in.`,
        renderStyle: "brand" as const,
      };
      return {
        kind: "household_invite",
        privacyClass: "personalized_generic_link",
        canonicalShareUrl,
        appRoute,
        renderStyle: "brand",
        shareTitle: `Household invite on ${appName}`,
        shareText: `Open this household invite in ${appName}.`,
        shareCaption: buildShareCaption("Household invite", canonicalShareUrl),
        storyCardData: buildCardData(baseCard),
        feedCardData: buildCardData(baseCard),
      };
    }
    default:
      return buildScamCheckShareDescriptor({
        riskBand: "medium",
        flagCount: 0,
      });
  }
}
