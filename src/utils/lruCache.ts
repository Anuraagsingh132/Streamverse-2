/**
 * Bounded Least-Recently-Used (LRU) Cache with capacity capping
 * and in-flight request deduplication helper.
 * Prevents memory leaks and storage quota errors.
 */

export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity = 100) {
    this.capacity = Math.max(1, capacity);
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // Refresh position to Most Recently Used (MRU)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict Least Recently Used (LRU) - first item in Map iterator
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
    return this;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Executes an async task while deduplicating in-flight calls sharing the same key.
 */
export async function deduplicateInFlight<T>(
  key: string,
  fetcher: () => Promise<T>,
  inFlightMap: Map<string, Promise<T>>
): Promise<T> {
  const existing = inFlightMap.get(key);
  if (existing) {
    return existing;
  }

  const promise = fetcher().finally(() => {
    inFlightMap.delete(key);
  });

  inFlightMap.set(key, promise);
  return promise;
}
