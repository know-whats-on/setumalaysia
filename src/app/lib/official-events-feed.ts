type OfficialEventFeedItemLike = {
  source?: unknown;
  source_url?: unknown;
  categories?: unknown;
  tags?: unknown;
};

type OfficialEventFacetLike = {
  id: string;
  label: string;
  count: number;
};

type OfficialEventFeedMetaLike = {
  available_categories?: OfficialEventFacetLike[];
  available_tags?: OfficialEventFacetLike[];
  total_candidates?: number;
  [key: string]: unknown;
};

const CANONICAL_OFFICIAL_EVENT_SOURCE = "cityofsydney";
const ARC_UNSW_OFFICIAL_EVENT_SOURCE = "arcunsw";
const UNIVERSITY_EVENTS_OFFICIAL_EVENT_SOURCE = "universityevents";
const SWF_OFFICIAL_EVENT_SOURCE = "swf";
const ART_GALLERY_NSW_OFFICIAL_EVENT_SOURCE = "artgallerynsw";
const ICC_SYDNEY_OFFICIAL_EVENT_SOURCE = "iccsydney";
const BARANGAROO_OFFICIAL_EVENT_SOURCE = "barangaroo";
const MCA_SYDNEY_OFFICIAL_EVENT_SOURCE = "mcasydney";
const AT_PARRAMATTA_OFFICIAL_EVENT_SOURCE = "atparramatta";
const BAYSIDE_OFFICIAL_EVENT_SOURCE = "bayside";
const CANTERBURY_BANKSTOWN_OFFICIAL_EVENT_SOURCE = "canterburybankstown";
const INNER_WEST_OFFICIAL_EVENT_SOURCE = "innerwest";

function normalizeComparable(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeOfficialEventFacetId(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function isSupportedOfficialEvent(record: OfficialEventFeedItemLike) {
  const normalizedSource = normalizeComparable(record.source).replace(
    /[^a-z0-9]+/g,
    "",
  );
  const sourceUrl = String(record.source_url || "")
    .trim()
    .toLowerCase();
  const isInnerWestWhatsOnUrl =
    sourceUrl.startsWith("https://www.innerwest.nsw.gov.au/whats-on/") ||
    sourceUrl === "https://www.innerwest.nsw.gov.au/whats-on" ||
    sourceUrl.startsWith("http://www.innerwest.nsw.gov.au/whats-on/");
  const isCanterburyBankstownEventUrl =
    sourceUrl.startsWith("https://whereinterestinghappens.com.au/event/") ||
    sourceUrl.startsWith("http://whereinterestinghappens.com.au/event/");

  if (normalizedSource === INNER_WEST_OFFICIAL_EVENT_SOURCE) {
    return isInnerWestWhatsOnUrl;
  }

  if (normalizedSource === CANTERBURY_BANKSTOWN_OFFICIAL_EVENT_SOURCE) {
    return isCanterburyBankstownEventUrl;
  }

  if (
    normalizedSource === CANONICAL_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === ARC_UNSW_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === UNIVERSITY_EVENTS_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === SWF_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === ART_GALLERY_NSW_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === ICC_SYDNEY_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === BARANGAROO_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === MCA_SYDNEY_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === AT_PARRAMATTA_OFFICIAL_EVENT_SOURCE ||
    normalizedSource === BAYSIDE_OFFICIAL_EVENT_SOURCE
  ) {
    return true;
  }

  return (
    sourceUrl.startsWith("https://whatson.cityofsydney.nsw.gov.au/") ||
    sourceUrl.startsWith("http://whatson.cityofsydney.nsw.gov.au/") ||
    sourceUrl.startsWith("https://campus.hellorubric.com/") ||
    sourceUrl.startsWith("http://campus.hellorubric.com/") ||
    sourceUrl.startsWith("https://www.swf.org.au/program/") ||
    sourceUrl.startsWith("http://www.swf.org.au/program/") ||
    sourceUrl.startsWith("https://swf.org.au/program/") ||
    sourceUrl.startsWith("http://swf.org.au/program/") ||
    sourceUrl.startsWith("https://www.artgallery.nsw.gov.au/whats-on/events/") ||
    sourceUrl.startsWith("http://www.artgallery.nsw.gov.au/whats-on/events/") ||
    sourceUrl.startsWith("https://iccsydney.com.au/events/") ||
    sourceUrl.startsWith("https://www.iccsydney.com.au/events/") ||
    sourceUrl.startsWith("http://iccsydney.com.au/events/") ||
    sourceUrl.startsWith("http://www.iccsydney.com.au/events/") ||
    sourceUrl.startsWith("https://tiktokentcent.com/event/") ||
    sourceUrl.startsWith("https://www.tiktokentcent.com/event/") ||
    sourceUrl.startsWith("http://tiktokentcent.com/event/") ||
    sourceUrl.startsWith("http://www.tiktokentcent.com/event/") ||
    sourceUrl.startsWith("https://www.barangaroo.com/whats-on/events/") ||
    sourceUrl.startsWith("http://www.barangaroo.com/whats-on/events/") ||
    sourceUrl.startsWith("https://www.mca.com.au/events-programs/calendar/") ||
    sourceUrl.startsWith("http://www.mca.com.au/events-programs/calendar/") ||
    sourceUrl.startsWith("https://atparramatta.com/whats-on/") ||
    sourceUrl.startsWith("https://www.atparramatta.com/whats-on/") ||
    sourceUrl.startsWith("http://atparramatta.com/whats-on/") ||
    sourceUrl.startsWith("http://www.atparramatta.com/whats-on/") ||
    sourceUrl.startsWith("https://www.bayside.nsw.gov.au/whats-on/") ||
    sourceUrl === "https://www.bayside.nsw.gov.au/whats-on" ||
    sourceUrl.startsWith("http://www.bayside.nsw.gov.au/whats-on/") ||
    isCanterburyBankstownEventUrl ||
    isInnerWestWhatsOnUrl
  );
}

function buildFacetCounts(
  records: OfficialEventFeedItemLike[],
  field: "categories" | "tags",
): OfficialEventFacetLike[] {
  const counts = new Map<string, { label: string; count: number }>();

  records.forEach((record) => {
    const seen = new Set<string>();
    toStringList(record[field]).forEach((label) => {
      const id = normalizeOfficialEventFacetId(label);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const current = counts.get(id);
      if (current) {
        current.count += 1;
        return;
      }
      counts.set(id, { label, count: 1 });
    });
  });

  return Array.from(counts.entries())
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      count: entry.count,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    });
}

export function sanitizeOfficialEventsPayload<
  T extends OfficialEventFeedItemLike,
>(rawData: T[], rawMeta?: OfficialEventFeedMetaLike | null) {
  const data = Array.isArray(rawData) ? rawData.filter(Boolean) : [];
  const supportedData = data.filter((record) =>
    isSupportedOfficialEvent(record),
  );
  const filteredUnsupportedRecords = supportedData.length !== data.length;

  const meta = {
    available_categories: [] as OfficialEventFacetLike[],
    available_tags: [] as OfficialEventFacetLike[],
    ...(rawMeta || {}),
  };

  if (supportedData.length > 0 || data.length === 0) {
    if (
      filteredUnsupportedRecords ||
      !Array.isArray(rawMeta?.available_categories) ||
      rawMeta.available_categories.length === 0
    ) {
      meta.available_categories = buildFacetCounts(supportedData, "categories");
    }
    if (
      filteredUnsupportedRecords ||
      !Array.isArray(rawMeta?.available_tags) ||
      rawMeta.available_tags.length === 0
    ) {
      meta.available_tags = buildFacetCounts(supportedData, "tags");
    }
    if (
      filteredUnsupportedRecords ||
      typeof rawMeta?.total_candidates !== "number"
    ) {
      meta.total_candidates = supportedData.length;
    }
  } else {
    meta.available_categories = [];
    meta.available_tags = [];
    meta.total_candidates = 0;
  }

  return {
    data: supportedData,
    meta,
  };
}
