import { describe, expect, it, vi } from 'vitest';
import { createAsyncRequestCache } from './async-request-cache';

describe('createAsyncRequestCache', () => {
  it('reuses the first in-flight request for the same key', async () => {
    const cache = createAsyncRequestCache<number>();
    const loader = vi.fn(async () => {
      await Promise.resolve();
      return 42;
    });

    const [first, second] = await Promise.all([
      cache.getOrCreate('jobs:wolli', loader),
      cache.getOrCreate('jobs:wolli', loader),
    ]);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.get('jobs:wolli')).toBe(42);
  });
});
