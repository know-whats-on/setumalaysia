import type { OverpassElement } from './api';

export type JobVenueCategory = 'mall' | 'restaurant' | 'cafe' | 'retail';

export interface JobVenue {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: JobVenueCategory;
}

export interface EmploymentAnalysis {
  score: number;
  venueCount: number;
  nearestHub: string;
  nearestHubDist: number;
  isHighPotential: boolean;
  isMidpoint: boolean;
  summary: string;
}

export const EMPLOYMENT_WALK_MINUTES = 20;
export const EMPLOYMENT_WALK_RADIUS_M = 2000;

const EMPLOYMENT_QUERY_TARGETS: ReadonlyArray<{
  key: 'amenity' | 'shop';
  value: string;
}> = [
  { key: 'shop', value: 'mall' },
  { key: 'shop', value: 'department_store' },
  { key: 'shop', value: 'superstore' },
  { key: 'amenity', value: 'restaurant' },
  { key: 'amenity', value: 'pub' },
  { key: 'amenity', value: 'fast_food' },
  { key: 'amenity', value: 'cafe' },
  { key: 'shop', value: 'clothes' },
  { key: 'shop', value: 'chemist' },
];

export function formatEmploymentWalkLabel(minutes = EMPLOYMENT_WALK_MINUTES) {
  return `${minutes}-min walk`;
}

export function formatEmploymentVenueCountLabel(
  venueCount: number,
  minutes = EMPLOYMENT_WALK_MINUTES,
) {
  return `${venueCount} venues within ${formatEmploymentWalkLabel(minutes)}`;
}

export function buildEmploymentZoneQuery(bbox: string) {
  const parts = EMPLOYMENT_QUERY_TARGETS.flatMap(({ key, value }) => [
    `node["${key}"="${value}"](${bbox});`,
    `way["${key}"="${value}"](${bbox});`,
  ]).join('');

  return `[out:json][timeout:20];(${parts});out center 1500;`;
}

export function normalizeEmploymentVenues(elements: OverpassElement[] = []): JobVenue[] {
  return elements
    .map((element) => {
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const shop = String(element.tags?.shop || '').trim();
      const amenity = String(element.tags?.amenity || '').trim();
      let category: JobVenueCategory = 'retail';

      if (shop === 'mall' || shop === 'department_store' || shop === 'superstore') {
        category = 'mall';
      } else if (amenity === 'restaurant' || amenity === 'pub' || amenity === 'fast_food') {
        category = 'restaurant';
      } else if (amenity === 'cafe') {
        category = 'cafe';
      }

      return {
        id: `${element.type}-${element.id}`,
        lat,
        lng,
        name: element.tags?.name || element.tags?.['name:en'] || 'Venue',
        category,
      };
    })
    .filter((venue): venue is JobVenue => Boolean(venue));
}

export function buildJobHeatmapGeoJSON(venues: JobVenue[]) {
  return {
    type: 'FeatureCollection',
    features: venues.map((venue) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [venue.lng, venue.lat] },
      properties: {
        weight: venue.category === 'mall' ? 3 : venue.category === 'restaurant' ? 1.5 : 1,
        category: venue.category,
        name: venue.name,
      },
    })),
  };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateEmploymentScore(
  lat: number,
  lng: number,
  venues: JobVenue[],
  uniCoords?: { lat: number; lng: number },
): EmploymentAnalysis {
  const venuesNearby = venues.filter(
    (venue) => haversineDistance(lat, lng, venue.lat, venue.lng) <= EMPLOYMENT_WALK_RADIUS_M,
  );
  const mallsNearby = venuesNearby.filter((venue) => venue.category === 'mall');
  const restaurantsNearby = venuesNearby.filter((venue) => venue.category === 'restaurant');
  const cafesNearby = venuesNearby.filter((venue) => venue.category === 'cafe');
  const retailNearby = venuesNearby.filter((venue) => venue.category === 'retail');

  const rawScore =
    mallsNearby.length * 2.5 +
    restaurantsNearby.length * 0.55 +
    cafesNearby.length * 0.45 +
    retailNearby.length * 0.18;

  const score = Math.min(10, Math.max(1, Math.round(rawScore)));
  const isHighPotential =
    score >= 7 || mallsNearby.length >= 1 || restaurantsNearby.length + cafesNearby.length >= 10;

  let isMidpoint = false;
  if (uniCoords) {
    const dToUni = haversineDistance(lat, lng, uniCoords.lat, uniCoords.lng);
    const nearestHub = venues.reduce<JobVenue | null>((best, venue) => {
      if (!best) return venue;
      return haversineDistance(lat, lng, venue.lat, venue.lng) <
        haversineDistance(lat, lng, best.lat, best.lng)
        ? venue
        : best;
    }, null);

    if (nearestHub) {
      const dToHub = haversineDistance(lat, lng, nearestHub.lat, nearestHub.lng);
      const dUniToHub = haversineDistance(
        uniCoords.lat,
        uniCoords.lng,
        nearestHub.lat,
        nearestHub.lng,
      );
      isMidpoint = dToUni < dUniToHub * 0.7 && dToHub < dUniToHub * 0.7;
    }
  }

  const nearestVenue = venues.reduce<JobVenue | null>((best, venue) => {
    if (!best) return venue;
    return haversineDistance(lat, lng, venue.lat, venue.lng) <
      haversineDistance(lat, lng, best.lat, best.lng)
      ? venue
      : best;
  }, null);
  const nearestDist = nearestVenue
    ? Math.round(haversineDistance(lat, lng, nearestVenue.lat, nearestVenue.lng) * 1.3)
    : 9999;
  const nearestName = nearestVenue?.name || 'nearby precinct';
  const tier = isHighPotential ? 'High' : score >= 5 ? 'Moderate' : score >= 3 ? 'Low-Moderate' : 'Low';
  let summary = `${venuesNearby.length} hospitality/retail venues within ${formatEmploymentWalkLabel()}.`;

  if (nearestVenue && nearestDist < 3000) {
    const distStr = nearestDist < 1000 ? `${nearestDist}m` : `${(nearestDist / 1000).toFixed(1)}km`;
    summary = `${distStr} from ${nearestName} — ${tier} potential for casual hospitality/retail work.`;
  }

  return {
    score,
    venueCount: venuesNearby.length,
    nearestHub: nearestName,
    nearestHubDist: nearestDist,
    isHighPotential,
    isMidpoint,
    summary,
  };
}
