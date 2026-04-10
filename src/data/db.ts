const DB_NAME = "localift-db";
const DB_VERSION = 1;

type StoreName =
  | "exercises"
  | "plans"
  | "sessions"
  | "activeWorkout"
  | "nutritionDays"
  | "nutritionGoals";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("exercises")) db.createObjectStore("exercises");
      if (!db.objectStoreNames.contains("plans")) db.createObjectStore("plans");
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions");
      if (!db.objectStoreNames.contains("activeWorkout")) db.createObjectStore("activeWorkout");
      if (!db.objectStoreNames.contains("nutritionDays")) db.createObjectStore("nutritionDays");
      if (!db.objectStoreNames.contains("nutritionGoals")) db.createObjectStore("nutritionGoals");
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T>(storeName: StoreName, key: IDBValidKey, fallback: T): Promise<T> {
  try {
    const value = await withStore<T | undefined>(storeName, "readonly", store => store.get(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function idbSet<T>(storeName: StoreName, key: IDBValidKey, value: T): Promise<void> {
  try {
    await withStore(storeName, "readwrite", store => store.put(value, key));
  } catch {
    // ignore write failures
  }
}

export async function idbDelete(storeName: StoreName, key: IDBValidKey): Promise<void> {
  try {
    await withStore(storeName, "readwrite", store => store.delete(key));
  } catch {
    // ignore
  }
}

export async function idbClearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(db.objectStoreNames, "readwrite");
  for (const name of Array.from(db.objectStoreNames)) {
    tx.objectStore(name).clear();
  }
}
