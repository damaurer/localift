/**
 * Exercise library sync.
 * Fetches exercises.json from the same origin (served by GitHub Pages / dev server).
 * Uses a version field for change detection — only updates localStorage when the
 * version string changes. Re-checks at most once every 6 hours.
 */
import type { Exercise } from './types/workout.types.ts';
import { storage } from './storage';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function exercisesUrl(): string {
  // import.meta.env.BASE_URL is '/' locally and '/<repo>/' on GitHub Pages
  return `${import.meta.env.BASE_URL}exercises.json`;
}

/**
 * Fetch exercises.json if the cached version is stale or missing.
 * Returns the new exercise list when an update was applied, otherwise null.
 */
export async function syncExercisesIfStale(): Promise<Exercise[] | null> {
  const { version: cachedVersion, lastSync } = await storage.getRemoteSyncInfo();
  const cachedExercises = await storage.getExercises(); // This will already check remote storage internally

  if (Date.now() - lastSync < SYNC_INTERVAL_MS && cachedExercises.length > 0) {
    return null; // recently synced, skip
  }

  try {
    const res = await fetch(exercisesUrl(), { cache: 'no-cache' });
    if (!res.ok) return null;

    const data = (await res.json()) as { version: string; exercises: Exercise[] };

    await storage.saveRemoteSyncInfo(data.version, Date.now());

    if (cachedVersion === data.version) {
      return null; // same version, no update needed
    }

    await storage.saveRemoteExercises(data.exercises);
    return data.exercises;
  } catch {
    return null;
  }
}
