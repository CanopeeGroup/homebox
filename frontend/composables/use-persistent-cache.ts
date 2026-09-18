const DB_NAME = "homebox-data-cache";
const DB_VERSION = 1;
const STORE_NAME = "entries";

type CacheEntry<T> = {
  key: string;
  value: T;
  updatedAt: number;
};

function openCache(): Promise<IDBDatabase | null> {
  if (!import.meta.client || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export function persistentCacheKey(resource: string) {
  const collectionId = useViewPreferences().value.collectionId || "default";
  return `${collectionId}:${resource}`;
}

export async function readPersistentCache<T>(key: string, maxAgeMs = Number.POSITIVE_INFINITY): Promise<T | null> {
  const db = await openCache();
  if (!db) return null;
  return new Promise(resolve => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const entry = request.result as CacheEntry<T> | undefined;
      if (!entry || Date.now() - entry.updatedAt > maxAgeMs) resolve(null);
      else resolve(entry.value);
    };
    request.onerror = () => resolve(null);
  });
}

export async function writePersistentCache<T>(key: string, value: T): Promise<void> {
  const db = await openCache();
  if (!db) return;
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, value, updatedAt: Date.now() } satisfies CacheEntry<T>);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

export async function deletePersistentCache(key: string): Promise<void> {
  const db = await openCache();
  if (!db) return;
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}
