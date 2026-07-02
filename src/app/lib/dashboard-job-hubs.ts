import type { JobVenue } from './employment-zones';

export function mergeJobVenueBatches(batches: Iterable<JobVenue[]>) {
  const venues: JobVenue[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    for (const venue of batch) {
      if (!venue?.id || seen.has(venue.id)) continue;
      seen.add(venue.id);
      venues.push(venue);
    }
  }

  return venues;
}

export async function resolveGlobeJobHubVenues(
  getCachedBatches: () => Iterable<JobVenue[]>,
  ensurePrefetched: () => Promise<void>,
) {
  const cachedVenues = mergeJobVenueBatches(getCachedBatches());
  if (cachedVenues.length > 0) {
    return {
      venues: cachedVenues,
      didPrefetch: false,
    };
  }

  await ensurePrefetched();

  return {
    venues: mergeJobVenueBatches(getCachedBatches()),
    didPrefetch: true,
  };
}
