import type { PublicToiletLocation } from './api';

export type PublicToiletFilterId =
  | 'open-now'
  | '24-hour'
  | 'accessible'
  | 'baby-change'
  | 'drinking-water'
  | 'shower'
  | 'mlak-key';

export type PublicToiletDistanceMeta = {
  distanceM: number;
  walkMin: number;
};

export const PUBLIC_TOILET_FILTERS: Array<{ id: PublicToiletFilterId; label: string }> = [
  { id: 'open-now', label: 'Open now' },
  { id: '24-hour', label: '24 hours' },
  { id: 'accessible', label: 'Accessible' },
  { id: 'baby-change', label: 'Baby change' },
  { id: 'drinking-water', label: 'Drinking water' },
  { id: 'shower', label: 'Shower' },
  { id: 'mlak-key', label: 'MLAK/key' },
];

export function formatPublicToiletAddress(toilet: PublicToiletLocation) {
  return [toilet.address, toilet.town, toilet.state]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function getPublicToiletUrl(toilet: PublicToiletLocation) {
  return String(toilet.url || '').trim() || 'https://toiletmap.gov.au/';
}

export function formatPublicToiletDistance(distanceM: number) {
  if (!Number.isFinite(distanceM)) return '';
  return distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`;
}

export function measurePublicToiletDistanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const radiusM = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getPublicToiletDistanceMeta(
  origin: { lat: number; lng: number } | null | undefined,
  toilet: PublicToiletLocation,
): PublicToiletDistanceMeta | null {
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return null;
  if (!Number.isFinite(toilet.lat) || !Number.isFinite(toilet.lng)) return null;
  const directDistanceM = measurePublicToiletDistanceMeters(origin.lat, origin.lng, toilet.lat, toilet.lng);
  const distanceM = Math.round(directDistanceM * 1.3);
  return {
    distanceM,
    walkMin: Math.max(1, Math.round(distanceM / 80)),
  };
}

function normalizeHours(value: string) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isPublicToilet24Hours(toilet: PublicToiletLocation) {
  const hours = normalizeHours(`${toilet.openingHours} ${toilet.openingHoursNote}`);
  return /\b24\s*(?:hours?|hrs?|hour)\b/.test(hours) || /\bopen:\s*24\b/.test(hours);
}

function parseHour(rawHour: string, rawMinute: string | undefined, suffix: string | undefined) {
  let hour = Number(rawHour);
  const minute = Number(rawMinute || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const cleanSuffix = String(suffix || '').toLowerCase();
  if (cleanSuffix === 'pm' && hour < 12) hour += 12;
  if (cleanSuffix === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function parseTimeRangeMinutes(hours: string) {
  const match = normalizeHours(hours).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  const start = parseHour(match[1], match[2], match[3] || match[6]);
  const end = parseHour(match[4], match[5], match[6]);
  if (start == null || end == null) return null;
  return { start, end };
}

export function isPublicToiletOpenNow(toilet: PublicToiletLocation, now = new Date()) {
  if (isPublicToilet24Hours(toilet)) return true;
  const hours = `${toilet.openingHours} ${toilet.openingHoursNote}`;
  const range = parseTimeRangeMinutes(hours);
  if (!range) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (range.end < range.start) {
    return currentMinutes >= range.start || currentMinutes <= range.end;
  }
  return currentMinutes >= range.start && currentMinutes <= range.end;
}

export function publicToiletMatchesFilters(
  toilet: PublicToiletLocation,
  activeFilters: ReadonlySet<PublicToiletFilterId>,
  now = new Date(),
) {
  for (const filter of activeFilters) {
    if (filter === 'open-now' && !isPublicToiletOpenNow(toilet, now)) return false;
    if (filter === '24-hour' && !isPublicToilet24Hours(toilet)) return false;
    if (filter === 'accessible' && toilet.accessible !== true) return false;
    if (filter === 'baby-change' && toilet.babyChange !== true && toilet.babyCareRoom !== true) return false;
    if (filter === 'drinking-water' && toilet.drinkingWater !== true) return false;
    if (filter === 'shower' && toilet.shower !== true) return false;
    if (filter === 'mlak-key' && toilet.keyRequired !== true && toilet.mlak24 !== true && toilet.mlakAfterHours !== true) return false;
  }
  return true;
}

export function sortPublicToiletsForResults(
  toilets: PublicToiletLocation[],
  options: {
    origin?: { lat: number; lng: number } | null;
    filters?: ReadonlySet<PublicToiletFilterId>;
    now?: Date;
  } = {},
) {
  const filters = options.filters || new Set<PublicToiletFilterId>();
  const now = options.now || new Date();
  return toilets
    .filter((toilet) => Number.isFinite(toilet.lat) && Number.isFinite(toilet.lng))
    .filter((toilet) => publicToiletMatchesFilters(toilet, filters, now))
    .map((toilet) => ({
      toilet,
      distance: getPublicToiletDistanceMeta(options.origin, toilet),
    }))
    .sort((left, right) => {
      if (left.distance && right.distance) return left.distance.distanceM - right.distance.distanceM;
      if (left.distance) return -1;
      if (right.distance) return 1;
      return (left.toilet.name || '').localeCompare(right.toilet.name || '') ||
        formatPublicToiletAddress(left.toilet).localeCompare(formatPublicToiletAddress(right.toilet));
    });
}
