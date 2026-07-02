import { describe, expect, it, vi } from 'vitest';
import {
  mergeJobVenueBatches,
  resolveGlobeJobHubVenues,
} from './dashboard-job-hubs';
import type { JobVenue } from './employment-zones';

const cafeVenue: JobVenue = {
  id: 'node-1',
  lat: -33.9,
  lng: 151.1,
  name: 'Campus Cafe',
  category: 'cafe',
};

const retailVenue: JobVenue = {
  id: 'node-2',
  lat: -33.91,
  lng: 151.11,
  name: 'Student Retail',
  category: 'retail',
};

describe('dashboard job hub helpers', () => {
  it('merges cached job batches without duplicate venues', () => {
    expect(mergeJobVenueBatches([[cafeVenue], [cafeVenue, retailVenue]])).toEqual([
      cafeVenue,
      retailVenue,
    ]);
  });

  it('uses cached globe venues without prefetching again', async () => {
    const ensurePrefetched = vi.fn(async () => {});

    const result = await resolveGlobeJobHubVenues(
      () => [[cafeVenue]],
      ensurePrefetched,
    );

    expect(result).toEqual({
      venues: [cafeVenue],
      didPrefetch: false,
    });
    expect(ensurePrefetched).not.toHaveBeenCalled();
  });

  it('prefetches when globe cache is empty and then emits cached venues', async () => {
    const cachedBatches: JobVenue[][] = [];
    const ensurePrefetched = vi.fn(async () => {
      cachedBatches.push([retailVenue]);
    });

    const result = await resolveGlobeJobHubVenues(
      () => cachedBatches,
      ensurePrefetched,
    );

    expect(ensurePrefetched).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      venues: [retailVenue],
      didPrefetch: true,
    });
  });
});
