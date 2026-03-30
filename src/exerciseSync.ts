/**
 * Exercise library sync.
 * Fetches exercises.json from the same origin (served by GitHub Pages / dev server).
 * Uses a version field for change detection — only updates localStorage when the
 * version string changes. Re-checks at most once every 6 hours.
 */
import type { Exercise } from './types';

const REMOTE_KEY = 'localift_remote_exercises';
const VERSION_KEY = 'localift_remote_exercises_version';
const LAST_SYNC_KEY = 'localift_remote_exercises_last_sync';
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function exercisesUrl(): string {
  // import.meta.env.BASE_URL is '/' locally and '/<repo>/' on GitHub Pages
  return `${import.meta.env.BASE_URL}exercises.json`;
}

/** Return the last successfully fetched exercise list, or null if never synced. */
export function getCachedRemoteExercises(): Exercise[] | null {
  try {
    const raw = localStorage.getItem(REMOTE_KEY);
    return raw ? (JSON.parse(raw) as Exercise[]) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch exercises.json if the cached version is stale or missing.
 * Returns the new exercise list when an update was applied, otherwise null.
 */
export async function syncExercisesIfStale(): Promise<Exercise[] | null> {
  const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) ?? '0', 10);
  if (Date.now() - lastSync < SYNC_INTERVAL_MS && localStorage.getItem(REMOTE_KEY)) {
    return null; // recently synced, skip
  }

  try {
    const res = await fetch(exercisesUrl(), { cache: 'no-cache' });
    if (!res.ok) return null;

    const data = (await res.json()) as { version: string; exercises: Exercise[] };

    const cachedVersion = localStorage.getItem(VERSION_KEY);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    if (cachedVersion === data.version) {
      return null; // same version, no update needed
    }

    localStorage.setItem(REMOTE_KEY, JSON.stringify(data.exercises));
    localStorage.setItem(VERSION_KEY, data.version);
    return data.exercises;
  } catch {
    return null;
  }
}
