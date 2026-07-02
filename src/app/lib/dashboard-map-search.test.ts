import { describe, expect, it, vi } from 'vitest';
import {
  filterDashboardMapSearchResults,
  resolveDashboardMapSearchResults,
} from './dashboard-map-search';
import type { NominatimResult } from './api';

function result(
  displayName: string,
  lat: string,
  lon: string,
  placeId = Math.floor(Math.random() * 100000),
): NominatimResult {
  return {
    place_id: placeId,
    display_name: displayName,
    lat,
    lon,
  };
}

describe('dashboard map search helpers', () => {
  it('prefers open-map suburb and venue results over Nominatim fallback', async () => {
    const openMapSearch = vi.fn(async () => [
      result('Wolli Creek, NSW, Australia', '-33.9300', '151.1540', 1),
    ]);
    const addressSearch = vi.fn(async () => [
      result('Fallback Wolli Creek, NSW, Australia', '-33.9310', '151.1550', 2),
    ]);

    const results = await resolveDashboardMapSearchResults('Wolli Creek', {
      state: 'NSW',
      limit: 6,
      openMapSearch,
      addressSearch,
    });

    expect(results).toEqual([
      expect.objectContaining({ display_name: 'Wolli Creek, NSW, Australia' }),
    ]);
    expect(openMapSearch).toHaveBeenCalledWith('Wolli Creek', {
      state: 'NSW',
      lat: undefined,
      lng: undefined,
      limit: 6,
    });
    expect(addressSearch).not.toHaveBeenCalled();
  });

  it('falls back to address search when open-map returns no valid results', async () => {
    const openMapSearch = vi.fn(async () => []);
    const addressSearch = vi.fn(async () => [
      result('Sydney NSW, Australia', '-33.8688', '151.2093', 3),
    ]);

    const results = await resolveDashboardMapSearchResults('Sydney', {
      openMapSearch,
      addressSearch,
    });

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('Sydney NSW, Australia');
    expect(addressSearch).toHaveBeenCalledWith('Sydney');
  });

  it('filters invalid coordinates and duplicate map results', () => {
    const results = filterDashboardMapSearchResults([
      result('Invalid Zero', '0', '0', 1),
      result('Invalid Latitude', '-120', '151.1', 2),
      result('Valid Place', '-33.9', '151.1', 3),
      result('Valid Place', '-33.900001', '151.100001', 4),
      result('Second Place', '-34', '151.2', 5),
    ]);

    expect(results.map((entry) => entry.display_name)).toEqual([
      'Valid Place',
      'Second Place',
    ]);
  });
});
