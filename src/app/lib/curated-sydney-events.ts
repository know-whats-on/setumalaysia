type OfficialEventFacetLike = {
  id: string;
  label: string;
  count: number;
};

type OfficialEventLike = {
  id: string;
  source: string;
  source_label: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string;
  hero_image_url: string;
  instagram_post_image_url?: string;
  instagram_story_image_url?: string;
  visible_until_ms?: number;
  categories: string[];
  tags: string[];
  dates: string[];
  venue_name: string;
  suburb: string;
  regions: string[];
  free_event: boolean;
  upcoming_date: string;
  upcoming_time: string;
  event_type: string[];
  source_url: string;
  lat: number | null;
  lng: number | null;
  address: string;
  location_additional_information: string;
  booking_url: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  organiser: string;
  dates_humanized: string;
  accessibilities: string[];
  refreshed_at: string;
  stale?: boolean;
  distance_km?: number | null;
};

type OfficialEventsMetaLike = {
  available_categories: OfficialEventFacetLike[];
  available_tags: OfficialEventFacetLike[];
  total_candidates?: number;
  has_more?: boolean;
  next_offset?: number | null;
  returned_count?: number;
  requested_range?: {
    start_day: string;
    end_day: string;
  };
  [key: string]: unknown;
};

type OfficialEventsResponseLike<TEvent extends OfficialEventLike> = {
  data: TEvent[];
  meta: OfficialEventsMetaLike;
};

type OfficialEventsQueryLike = {
  categories?: string[];
  tags?: string[];
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  centerLat?: number;
  centerLng?: number;
  limit?: number;
  offset?: number;
  startDay?: string;
  endDay?: string;
};

const EVENTBRITE_SOURCE = 'eventbrite';
const CITY_OF_SYDNEY_SOURCE = 'cityofsydney';
const BOTANIC_GARDENS_SOURCE = 'botanicgardens';
const CURATED_EVENT_SOURCES = new Set([EVENTBRITE_SOURCE]);
const SERVER_BACKED_CURATED_EVENT_SOURCES = new Set<string>([
  CITY_OF_SYDNEY_SOURCE,
  BOTANIC_GARDENS_SOURCE,
]);
const OMNI_INSTAGRAM_POST_IMAGE_URL =
  'https://pcgdqsdiidtiziypvqri.supabase.co/storage/v1/object/public/make-1d591b90-guide-assets/city-guides/official-events-omni-sydney-genai-film-festival-feed/cover.png';
const OMNI_INSTAGRAM_STORY_IMAGE_URL =
  'https://pcgdqsdiidtiziypvqri.supabase.co/storage/v1/object/public/make-1d591b90-guide-assets/city-guides/official-events-omni-sydney-genai-film-festival-story/cover.png';
const FLOWER_MARKET_BANNER_IMAGE_URL =
  'https://www.botanicgardens.org.au/sites/default/files/2026-02/events-flower-market-1024x676.jpg';
const FLOWER_MARKET_SOURCE_URL =
  'https://www.botanicgardens.org.au/whats-on/flower-market-cj-hendry';
const HENDRYS_TURNING_2_SLUG = 'hendrys-turning-2';
const HENDRYS_TURNING_2_CUTOFF_MS = Date.parse('2026-06-14T06:00:00.000Z');
const HENDRYS_TURNING_2_EVENT_URL = 'https://www.instagram.com/hendryscoffee';
const HENDRYS_TURNING_2_BANNER_IMAGE_URL =
  '/noticeboard/hendrys-turning-2-alerts-banner.png';
const HENDRYS_TURNING_2_FEED_IMAGE_URL =
  '/event-assets/hendrys-turning-2-feed.png';
const HENDRYS_TURNING_2_STORY_IMAGE_URL =
  '/event-assets/hendrys-turning-2-story.png';
const STARBUCKS_MATCHA_BOGO_SLUG = 'starbucks-matcha-bogo-2026';
const STARBUCKS_MATCHA_BOGO_IMAGE_URL =
  'https://pcgdqsdiidtiziypvqri.supabase.co/storage/v1/object/public/make-1d591b90-guide-assets/event-assets/starbucks-matcha-bogo-2026-feed.jpg';
const STARBUCKS_MATCHA_BOGO_URL = 'https://www.starbucks.com.au/';

const CURATED_SYDNEY_EVENTS: OfficialEventLike[] = [
  {
    id: `${CITY_OF_SYDNEY_SOURCE}:${STARBUCKS_MATCHA_BOGO_SLUG}`,
    source: CITY_OF_SYDNEY_SOURCE,
    source_label: 'Starbucks Rewards',
    slug: STARBUCKS_MATCHA_BOGO_SLUG,
    title: 'Starbucks Matcha Buy 1, Get 1 Free',
    summary:
      'Starbucks Rewards members can buy one participating matcha item and get one free on Monday 22 June.',
    description:
      'Starbucks Rewards member offer for Monday 22 June: buy one participating matcha drink or treat and get one free, while availability lasts. Check store participation and offer terms in the Starbucks app or at your local store before ordering.',
    image_url: STARBUCKS_MATCHA_BOGO_IMAGE_URL,
    hero_image_url: STARBUCKS_MATCHA_BOGO_IMAGE_URL,
    instagram_post_image_url: STARBUCKS_MATCHA_BOGO_IMAGE_URL,
    instagram_story_image_url: STARBUCKS_MATCHA_BOGO_IMAGE_URL,
    categories: ['Food & drink', 'Special events'],
    tags: ['Starbucks', 'Matcha', 'Rewards', 'Buy one get one free'],
    dates: ['2026-06-22'],
    venue_name: 'Participating Starbucks stores',
    suburb: 'Australia',
    regions: ['Australia'],
    free_event: false,
    upcoming_date: '2026-06-22',
    upcoming_time: 'All day',
    event_type: ['Offer'],
    source_url: STARBUCKS_MATCHA_BOGO_URL,
    lat: null,
    lng: null,
    address: 'Participating Starbucks stores in Australia',
    location_additional_information:
      'Store participation and availability may vary. Check the Starbucks app or your local store for offer terms before ordering.',
    booking_url: '',
    website_url: STARBUCKS_MATCHA_BOGO_URL,
    contact_email: '',
    contact_phone: '',
    organiser: 'Starbucks Rewards',
    dates_humanized: 'Mon 22 Jun 2026 • All day',
    accessibilities: [],
    refreshed_at: '2026-06-22T00:00:00.000Z',
  },
  {
    id: `${CITY_OF_SYDNEY_SOURCE}:${HENDRYS_TURNING_2_SLUG}`,
    source: CITY_OF_SYDNEY_SOURCE,
    source_label: "Hendry's Coffee",
    slug: HENDRYS_TURNING_2_SLUG,
    title: "Hendry's is Turning 2",
    summary:
      "Celebrate Hendry's second birthday in Darlinghurst with free matcha all day and a DJ set from 9am to midday.",
    description:
      "Hendry's Coffee is turning 2. Drop into the Darlinghurst cafe on Sunday 14 June for free hot or iced matcha all day, with a DJ set running from 9am to midday.",
    image_url: HENDRYS_TURNING_2_BANNER_IMAGE_URL,
    hero_image_url: HENDRYS_TURNING_2_BANNER_IMAGE_URL,
    instagram_post_image_url: HENDRYS_TURNING_2_FEED_IMAGE_URL,
    instagram_story_image_url: HENDRYS_TURNING_2_STORY_IMAGE_URL,
    visible_until_ms: HENDRYS_TURNING_2_CUTOFF_MS,
    categories: ['Food & drink', 'Special events'],
    tags: ['Free', 'Matcha', 'Coffee', 'Darlinghurst', "Hendry's Coffee"],
    dates: ['2026-06-14'],
    venue_name: "Hendry's Coffee",
    suburb: 'Darlinghurst',
    regions: ['Sydney'],
    free_event: true,
    upcoming_date: '2026-06-14',
    upcoming_time: '9:00am-4:00pm',
    event_type: ['Cafe event', 'Birthday'],
    source_url: HENDRYS_TURNING_2_EVENT_URL,
    lat: -33.877426,
    lng: 151.2158231,
    address: '1/144-150 Liverpool St, Darlinghurst NSW 2010',
    location_additional_information:
      'Free hot or iced matcha is available all day. DJ set runs 9:00am-12:00pm.',
    booking_url: HENDRYS_TURNING_2_EVENT_URL,
    website_url: HENDRYS_TURNING_2_EVENT_URL,
    contact_email: '',
    contact_phone: '',
    organiser: "Hendry's Coffee",
    dates_humanized: 'Sun 14 Jun 2026 • 9:00am-4:00pm',
    accessibilities: [],
    refreshed_at: '2026-06-12T00:00:00.000Z',
  },
  {
    id: 'eventbrite:omni-sydney-genai-film-festival',
    source: EVENTBRITE_SOURCE,
    source_label: 'Eventbrite',
    slug: 'omni-sydney-genai-film-festival',
    title: 'OMNI Sydney – GenAI Film Festival',
    summary:
      'A screening of emerging AI films followed by a panel on creativity, ethics, copyright and the future of filmmaking.',
    description:
      'UNSW Founders is hosting the Kensington screening of OMNI, with a 45-minute showcase of emerging AI films and a panel discussion with AI filmmakers and technologists.',
    image_url:
      'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1182187033%2F147761249777%2F1%2Foriginal.20260414-232529?crop=focalpoint&fit=crop&w=480&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.5&fp-y=0.5&s=c6902bb705ffd30bbcc368775e3e684a',
    hero_image_url:
      'https://cdn.evbuc.com/images/1182187033/147761249777/1/original.20260414-232529',
    instagram_post_image_url: OMNI_INSTAGRAM_POST_IMAGE_URL,
    instagram_story_image_url: OMNI_INSTAGRAM_STORY_IMAGE_URL,
    categories: ['Film'],
    tags: ['AI', 'Panel', 'Creative Technology'],
    dates: ['2026-04-30'],
    venue_name: 'Michael Crouch Innovation Centre',
    suburb: 'Kensington',
    regions: ['Sydney'],
    free_event: false,
    upcoming_date: '2026-04-30',
    upcoming_time: '5:00pm-8:00pm',
    event_type: ['Screening', 'Panel'],
    source_url:
      'https://www.eventbrite.com.au/e/omni-sydney-genai-film-festival-tickets-1986955086150',
    lat: -33.91653,
    lng: 151.22849,
    address: 'Gate 2 Avenue, Kensington NSW 2033',
    location_additional_information:
      'UNSW Kensington campus, Michael Crouch Innovation Centre.',
    booking_url:
      'https://www.eventbrite.com.au/e/omni-sydney-genai-film-festival-tickets-1986955086150',
    website_url: 'https://www.omnifilmfestival.com/',
    contact_email: '',
    contact_phone: '',
    organiser: 'UNSW Founders Program',
    dates_humanized: 'Thu 30 Apr 2026 • 5:00pm-8:00pm',
    accessibilities: [],
    refreshed_at: '2026-04-23T00:00:00.000Z',
  },
  {
    id: `${BOTANIC_GARDENS_SOURCE}:flower-market-cj-hendry`,
    source: BOTANIC_GARDENS_SOURCE,
    source_label: 'Botanic Gardens of Sydney',
    slug: 'flower-market-cj-hendry',
    title: 'Flower Market by Cj Hendry',
    summary:
      'Explore 100,000 vibrant plush flowers by Cj Hendry at The Domain Sydney.',
    description:
      "Cj Hendry's Flower Market turns an enormous greenhouse into a colourful textile-based installation of 100,000 plush flowers, with each guest's first flower free and additional flowers available for purchase.",
    image_url: FLOWER_MARKET_BANNER_IMAGE_URL,
    hero_image_url: FLOWER_MARKET_BANNER_IMAGE_URL,
    instagram_post_image_url: FLOWER_MARKET_BANNER_IMAGE_URL,
    instagram_story_image_url: FLOWER_MARKET_BANNER_IMAGE_URL,
    categories: ['Art & exhibitions', 'Special events'],
    tags: ['Flower Market', 'Cj Hendry', 'Free', 'Botanic Gardens'],
    dates: ['2026-05-15', '2026-05-16', '2026-05-17'],
    venue_name: 'The Domain Sydney',
    suburb: 'Sydney',
    regions: ['Sydney'],
    free_event: true,
    upcoming_date: '2026-05-15',
    upcoming_time: '10am-8pm',
    event_type: ['Installation', 'Market'],
    source_url: FLOWER_MARKET_SOURCE_URL,
    lat: -33.86882,
    lng: 151.2153,
    address: 'Mrs Macquaries Rd, Sydney NSW 2000',
    location_additional_information:
      'The event is held at The Domain Sydney, next to the Royal Botanic Garden Sydney.',
    booking_url: FLOWER_MARKET_SOURCE_URL,
    website_url: FLOWER_MARKET_SOURCE_URL,
    contact_email: '',
    contact_phone: '+61 2 9231 8111',
    organiser: 'Botanic Gardens of Sydney',
    dates_humanized: 'Fri 15 May to Sun 17 May 2026 • 10am-8pm',
    accessibilities: [],
    refreshed_at: '2026-05-17T00:00:00.000Z',
  },
];

function normalizeComparable(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeSourceId(value: unknown) {
  return normalizeComparable(value).replace(/[^a-z0-9]+/g, '');
}

function normalizeFacetId(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasMatchingFacet(values: string[], selected: string[]) {
  if (selected.length === 0) return true;
  return values.some((value) => selected.includes(normalizeFacetId(value)));
}

function withinViewport(
  event: Pick<OfficialEventLike, 'lat' | 'lng'>,
  query: Pick<
    OfficialEventsQueryLike,
    'minLat' | 'minLng' | 'maxLat' | 'maxLng'
  >,
) {
  if (
    query.minLat == null ||
    query.minLng == null ||
    query.maxLat == null ||
    query.maxLng == null
  ) {
    return true;
  }
  if (event.lat == null || event.lng == null) return false;
  const minLat = Math.min(query.minLat, query.maxLat);
  const maxLat = Math.max(query.minLat, query.maxLat);
  const minLng = Math.min(query.minLng, query.maxLng);
  const maxLng = Math.max(query.minLng, query.maxLng);
  return (
    event.lat >= minLat &&
    event.lat <= maxLat &&
    event.lng >= minLng &&
    event.lng <= maxLng
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function compareEvents(left: OfficialEventLike, right: OfficialEventLike) {
  const leftDistance = left.distance_km ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.distance_km ?? Number.POSITIVE_INFINITY;
  if (leftDistance !== rightDistance) return leftDistance - rightDistance;

  const leftDate = left.upcoming_date || left.dates[0] || '';
  const rightDate = right.upcoming_date || right.dates[0] || '';
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

  return left.title.localeCompare(right.title);
}

function trimWithCuratedPriority(
  events: OfficialEventLike[],
  limit: number,
  curatedKeys: Set<string>,
) {
  if (limit <= 0 || events.length <= limit) return events;

  const curated = events.filter((event) =>
    curatedKeys.has(`${event.source}:${event.slug}`)
  );
  const nonCurated = events.filter((event) =>
    !curatedKeys.has(`${event.source}:${event.slug}`)
  );

  if (curated.length >= limit) {
    return curated.slice(0, limit);
  }

  return [...curated, ...nonCurated.slice(0, limit - curated.length)];
}

function mergeFacetCounts(
  existing: OfficialEventFacetLike[],
  additions: string[],
) {
  const merged = new Map<string, OfficialEventFacetLike>();

  existing.forEach((facet) => {
    const id = normalizeFacetId(facet.id || facet.label);
    if (!id) return;
    merged.set(id, {
      id,
      label: String(facet.label || '').trim() || String(facet.id || '').trim(),
      count: Number.isFinite(facet.count) ? Number(facet.count) : 0,
    });
  });

  additions.forEach((label) => {
    const id = normalizeFacetId(label);
    if (!id) return;
    const current = merged.get(id);
    if (current) {
      current.count += 1;
      return;
    }
    merged.set(id, { id, label, count: 1 });
  });

  return Array.from(merged.values()).sort((left, right) => {
    if (left.count !== right.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });
}

function eventMatchesRequestedRange(
  event: Pick<OfficialEventLike, 'dates' | 'upcoming_date'>,
  startDay: string,
  endDay: string,
) {
  if (!startDay || !endDay) return true;

  const rangeDates = event.dates.length
    ? event.dates
    : event.upcoming_date
      ? [event.upcoming_date]
      : [];

  if (rangeDates.length === 0) return true;
  return rangeDates.some((date) => date >= startDay && date <= endDay);
}

function isCuratedEventVisible(event: OfficialEventLike, nowMs = Date.now()) {
  return !event.visible_until_ms || nowMs <= event.visible_until_ms;
}

function getQueryRange(
  meta: OfficialEventsMetaLike | null | undefined,
  query: OfficialEventsQueryLike,
) {
  return {
    startDay:
      String(meta?.requested_range?.start_day || '').trim() ||
      String(query.startDay || '').trim(),
    endDay:
      String(meta?.requested_range?.end_day || '').trim() ||
      String(query.endDay || '').trim(),
  };
}

function getMatchingCuratedSydneyEvents(
  query: OfficialEventsQueryLike,
  meta?: OfficialEventsMetaLike | null,
) {
  const normalizedCategories = (query.categories || []).map((item) =>
    normalizeFacetId(item),
  );
  const normalizedTags = (query.tags || []).map((item) => normalizeFacetId(item));
  const { startDay, endDay } = getQueryRange(meta, query);

  return CURATED_SYDNEY_EVENTS.filter(
    (event) =>
      isCuratedEventVisible(event) &&
      eventMatchesRequestedRange(event, startDay, endDay) &&
      hasMatchingFacet(event.categories, normalizedCategories) &&
      hasMatchingFacet(event.tags, normalizedTags) &&
      withinViewport(event, query),
  ).map((event) => decorateEventWithDistance(event, query));
}

function resolvePaginationMeta(
  meta: OfficialEventsMetaLike,
  fallbackReturnedCount: number,
  offset: number,
) {
  const returnedCount =
    typeof meta.returned_count === 'number'
      ? meta.returned_count
      : fallbackReturnedCount;
  const hasMore =
    typeof meta.has_more === 'boolean'
      ? meta.has_more
      : typeof meta.total_candidates === 'number'
        ? offset + returnedCount < meta.total_candidates
        : false;
  const nextOffset = hasMore
    ? typeof meta.next_offset === 'number'
      ? meta.next_offset
      : offset + returnedCount
    : null;

  return {
    returnedCount,
    hasMore,
    nextOffset,
  };
}

function decorateEventWithDistance(
  event: OfficialEventLike,
  query: Pick<OfficialEventsQueryLike, 'centerLat' | 'centerLng'>,
) {
  if (
    query.centerLat == null ||
    query.centerLng == null ||
    event.lat == null ||
    event.lng == null
  ) {
    return {
      ...event,
      distance_km: null,
    };
  }

  return {
    ...event,
    distance_km: haversineKm(
      query.centerLat,
      query.centerLng,
      event.lat,
      event.lng,
    ),
  };
}

export function isCuratedSydneyEventSource(source: string) {
  return CURATED_EVENT_SOURCES.has(
    normalizeSourceId(source),
  );
}

export function countMatchingCuratedSydneyEvents(query: OfficialEventsQueryLike) {
  return getMatchingCuratedSydneyEvents(query).filter(
    (event) => !SERVER_BACKED_CURATED_EVENT_SOURCES.has(event.source),
  ).length;
}

export function getCuratedSydneyOfficialEvent(source: string, slug: string) {
  const normalizedSource = normalizeSourceId(source);
  return (
    CURATED_SYDNEY_EVENTS.find(
      (event) =>
        isCuratedEventVisible(event) &&
        event.slug === String(slug || '').trim() &&
        normalizeSourceId(event.source) === normalizedSource,
    ) || null
  );
}

export function mergeCuratedSydneyOfficialEvents<TEvent extends OfficialEventLike>(
  response: OfficialEventsResponseLike<TEvent>,
  query: OfficialEventsQueryLike,
): OfficialEventsResponseLike<TEvent | OfficialEventLike> {
  const normalizedOffset = Math.max(0, Math.floor(Number(query.offset) || 0));
  const matchingCuratedEvents = getMatchingCuratedSydneyEvents(
    query,
    response.meta,
  );

  const seenKeys = new Set(
    response.data.map((event) => `${event.source}:${event.slug}`),
  );
  const seenSlugs = new Set(response.data.map((event) => event.slug));
  const curatedToInsert = matchingCuratedEvents.filter(
    (event) =>
      !seenKeys.has(`${event.source}:${event.slug}`) &&
      !seenSlugs.has(event.slug),
  );
  const limit =
    typeof query.limit === 'number' && query.limit > 0
      ? query.limit
      : response.data.length + curatedToInsert.length;
  const pagination = resolvePaginationMeta(
    response.meta,
    response.data.length,
    normalizedOffset,
  );
  const totalCandidates =
    (typeof response.meta.total_candidates === 'number'
      ? response.meta.total_candidates
      : response.data.length) + curatedToInsert.length;
  const mergedMeta = {
    ...response.meta,
    available_categories: mergeFacetCounts(
      response.meta.available_categories || [],
      curatedToInsert.flatMap((event) => event.categories),
    ),
    available_tags: mergeFacetCounts(
      response.meta.available_tags || [],
      curatedToInsert.flatMap((event) => event.tags),
    ),
    total_candidates: totalCandidates,
    has_more: pagination.hasMore,
    next_offset: pagination.nextOffset,
  };

  if (normalizedOffset > 0) {
    return {
      data: response.data.slice(0),
      meta: {
        ...mergedMeta,
        returned_count: pagination.returnedCount,
      },
    };
  }

  const curatedKeys = new Set(
    matchingCuratedEvents.map((event) => `${event.source}:${event.slug}`),
  );
  const mergedData = trimWithCuratedPriority(
    [...response.data, ...curatedToInsert].sort(compareEvents),
    limit,
    curatedKeys,
  );

  return {
    data: mergedData,
    meta: {
      ...mergedMeta,
      returned_count: mergedData.length,
    },
  };
}
