export type AsyncRequestCache<T> = {
  cache: Map<string, T>;
  pending: Map<string, Promise<T>>;
  get: (key: string) => T | undefined;
  has: (key: string) => boolean;
  getOrCreate: (key: string, factory: () => Promise<T>) => Promise<T>;
  clear: (key?: string) => void;
};

export function createAsyncRequestCache<T>(): AsyncRequestCache<T> {
  const cache = new Map<string, T>();
  const pending = new Map<string, Promise<T>>();

  return {
    cache,
    pending,
    get(key: string) {
      return cache.get(key);
    },
    has(key: string) {
      return cache.has(key);
    },
    getOrCreate(key: string, factory: () => Promise<T>) {
      if (cache.has(key)) {
        return Promise.resolve(cache.get(key)!);
      }

      const inFlight = pending.get(key);
      if (inFlight) {
        return inFlight;
      }

      const request = factory()
        .then((value) => {
          cache.set(key, value);
          return value;
        })
        .finally(() => {
          pending.delete(key);
        });

      pending.set(key, request);
      return request;
    },
    clear(key?: string) {
      if (typeof key === 'string') {
        cache.delete(key);
        pending.delete(key);
        return;
      }

      cache.clear();
      pending.clear();
    },
  };
}
