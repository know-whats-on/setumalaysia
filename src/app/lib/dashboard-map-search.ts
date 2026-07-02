import {
  searchAddress,
  searchOpenMapLocations,
  type NominatimResult,
} from './api';

type SearchOpenMapLocations = typeof searchOpenMapLocations;
type SearchAddress = typeof searchAddress;

export type DashboardMapSearchOptions = {
  state?: string;
  lat?: number;
  lng?: number;
  limit?: number;
  openMapSearch?: SearchOpenMapLocations;
  addressSearch?: SearchAddress;
};

export function isValidDashboardMapSearchResult(result: NominatimResult) {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function filterDashboardMapSearchResults(
  results: NominatimResult[],
  limit = 6,
) {
  const seen = new Set<string>();
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 6), 10));
  const filtered: NominatimResult[] = [];

  for (const result of results) {
    if (!isValidDashboardMapSearchResult(result)) continue;
    const key = [
      String(result.display_name || '').trim().toLowerCase(),
      Number(result.lat).toFixed(5),
      Number(result.lon).toFixed(5),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(result);
    if (filtered.length >= normalizedLimit) break;
  }

  return filtered;
}

export async function resolveDashboardMapSearchResults(
  query: string,
  options: DashboardMapSearchOptions = {},
) {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 2) return [];

  const limit = Math.max(1, Math.min(Number(options.limit || 6), 10));
  const openMapSearch = options.openMapSearch || searchOpenMapLocations;
  const addressSearch = options.addressSearch || searchAddress;
  const openMapOptions = {
    state: options.state,
    lat: options.lat,
    lng: options.lng,
    limit,
  };

  const openMapResults = await openMapSearch(cleanQuery, openMapOptions).catch((error) => {
    console.error('GHAR dashboard open-map search error:', error);
    return [];
  });
  const validOpenMapResults = filterDashboardMapSearchResults(openMapResults, limit);
  if (validOpenMapResults.length > 0) return validOpenMapResults;

  const addressResults = await addressSearch(cleanQuery);
  return filterDashboardMapSearchResults(addressResults, limit);
}
