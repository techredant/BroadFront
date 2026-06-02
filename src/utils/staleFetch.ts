/** TTLs for stale-while-revalidate caches (ms). */
export const CACHE_TTL = {
  feed: 60_000,
  members: 300_000,
  profile: 60_000,
  profilePosts: 60_000,
  liveCalls: 30_000,
  audioCalls: 30_000,
  media: 60_000,
  status: 60_000,
  focusMinGap: 120_000,
} as const;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string, ttlMs: number): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > ttlMs) return undefined;
  return entry.data;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function shouldRefetchOnFocus(
  key: string,
  minGapMs: number = CACHE_TTL.focusMinGap,
): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.fetchedAt >= minGapMs;
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; force?: boolean },
): Promise<T> {
  const ttl = options?.ttl ?? CACHE_TTL.feed;
  const force = options?.force ?? false;

  if (!force) {
    const cached = getCached<T>(key, ttl);
    if (cached !== undefined) return cached;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      setCached(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
