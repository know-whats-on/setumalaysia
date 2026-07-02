import type { OfficialEvent } from './api';
import type { DashboardInitialMapSearch } from './focused-map-targets';

function hasValidOfficialEventCoordinates(lat?: number | null, lng?: number | null) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180 &&
    !(Number(lat) === 0 && Number(lng) === 0)
  );
}

function extractAustralianStateFromText(value?: string) {
  const match = String(value || '').match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
  return match ? match[1].toUpperCase() : '';
}

export function buildOfficialEventMapSearch(
  event?: Pick<
    OfficialEvent,
    | 'title'
    | 'summary'
    | 'description'
    | 'source_label'
    | 'venue_name'
    | 'address'
    | 'suburb'
    | 'dates_humanized'
    | 'upcoming_date'
    | 'upcoming_time'
    | 'hero_image_url'
    | 'image_url'
    | 'lat'
    | 'lng'
  > | null,
  options?: { returnRoute?: string },
): DashboardInitialMapSearch | null {
  if (!event) return null;
  const displayName = String(event.title || event.venue_name || '').trim();
  const locationLine = String(event.address || event.suburb || '').trim();
  const hasCoordinates = hasValidOfficialEventCoordinates(event.lat, event.lng);

  if (!hasCoordinates && !locationLine) {
    return null;
  }

  const query = [displayName, locationLine].filter(Boolean).join(', ').trim() || locationLine || displayName;
  if (!query) return null;

  const dateLine = String(
    event.dates_humanized ||
      [event.upcoming_date, event.upcoming_time].filter(Boolean).join(' • '),
  ).trim();

  const basePayload: DashboardInitialMapSearch = {
    query,
    displayName: displayName || query,
    suburb: String(event.suburb || '').trim() || undefined,
    state: extractAustralianStateFromText(event.address),
    lat: hasCoordinates ? Number(event.lat) : undefined,
    lng: hasCoordinates ? Number(event.lng) : undefined,
    source: 'search',
  };

  if (!hasCoordinates) {
    return basePayload;
  }

  return {
    ...basePayload,
    source: 'event-place',
    eventTarget: {
      kind: 'event-place',
      label: String(event.title || displayName || query).trim() || query,
      sourceLabel: String(event.source_label || '').trim() || 'Official Event',
      dateLine: dateLine || undefined,
      locationLine: [event.venue_name, event.address || event.suburb].filter(Boolean).join(' • ') || undefined,
      summary: String(event.summary || event.description || '').trim() || undefined,
      imageUrl: String(event.hero_image_url || event.image_url || '').trim() || undefined,
      address: String(event.address || '').trim() || undefined,
      suburb: String(event.suburb || '').trim() || undefined,
      state: extractAustralianStateFromText(event.address) || undefined,
      returnEvent: options?.returnRoute
        ? {
            route: options.returnRoute,
          }
        : undefined,
      lat: Number(event.lat),
      lng: Number(event.lng),
    },
    returnEvent: options?.returnRoute
      ? {
          route: options.returnRoute,
        }
      : undefined,
  };
}
