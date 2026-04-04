/**
 * Notification utilities for LOCALlift PWA.
 * Uses the Web Notifications API via the Service Worker for reliable delivery.
 */

import { storage } from './storage';

export type NotificationPermission = 'granted' | 'denied' | 'default';

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

export async function showNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
  }
): Promise<void> {
  if (getPermission() !== 'granted') return;

  const icon = options?.icon ?? '/logo.png';
  const badge = options?.badge ?? '/logo.png';

  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon,
        badge,
        tag: options?.tag ?? 'localift',
        data: options?.data ?? {},
        requireInteraction: options?.requireInteraction ?? false,
        silent: false,
      } as NotificationOptions);
    } else {
      // Fallback: show directly (no SW)
      new Notification(title, { body, icon });
    }
  } catch {
    // Fallback
    try {
      new Notification(title, { body, icon });
    } catch { /* not supported */ }
  }
}

/** Show workout completion notification */
export async function notifyWorkoutComplete(planName: string, durationSeconds: number, totalSets: number): Promise<void> {
  const minutes = Math.floor(durationSeconds / 60);
  await showNotification(
    '🏆 Training abgeschlossen!',
    `${planName} · ${minutes} Min · ${totalSets} Sätze`,
    {
      tag: 'workout-complete',
      data: { screen: 'history' },
      requireInteraction: false,
    }
  );
}

// ── Reminder scheduling ───────────────────────────────────────────────────────

let reminderIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Schedule reminder checks every minute.
 * When time + day matches, shows a notification.
 * Works while the app tab is active (no push server needed).
 */
export function scheduleReminder(
  time: string,       // "HH:MM"
  days: boolean[],    // Mon=0 … Sun=6
): void {
  clearReminders();

  reminderIntervalId = setInterval(() => {
    checkReminder(time, days);
  }, 60_000); // every minute

  // Also check immediately on load (catch missed reminders within last 5 min)
  checkReminder(time, days, 5);
}

export function clearReminders(): void {
  if (reminderIntervalId !== null) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
}

async function checkReminder(time: string, days: boolean[], toleranceMinutes = 0): Promise<void> {
  if (getPermission() !== 'granted') return;

  const now = new Date();
  const [hh, mm] = time.split(':').map(Number);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hh * 60 + mm;

  const diff = nowMinutes - targetMinutes;
  if (diff < 0 || diff > toleranceMinutes) return;

  // JS: Sunday=0, Monday=1 … Saturday=6 → convert to Mon=0 … Sun=6
  const jsDay = now.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  if (!days[dayIndex]) return;

  // Avoid duplicate: store last shown date
  const todayStr = now.toDateString();
  if (await storage.getLastReminder() === todayStr) return;
  await storage.saveLastReminder(todayStr);

  showNotification(
    '💪 Zeit zum Trainieren!',
    'Dein tägliches Training wartet auf dich.',
    { tag: 'daily-reminder', data: { screen: 'dashboard' } }
  );
}

// ── Storage API ───────────────────────────────────────────────────────────────

/** Request persistent storage so the browser never auto-evicts our data */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    const persisted = await navigator.storage.persist();
    return persisted;
  } catch {
    return false;
  }
}

export interface StorageEstimate {
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usedMB: Math.round((usage / 1024 / 1024) * 100) / 100,
      quotaMB: Math.round((quota / 1024 / 1024) * 100) / 100,
      percentUsed: quota > 0 ? Math.round((usage / quota) * 100) : 0,
    };
  } catch {
    return null;
  }
}
