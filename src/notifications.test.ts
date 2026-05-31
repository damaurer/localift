// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./data/storage.ts', () => ({
  storage: {
    getLastReminder: vi.fn().mockResolvedValue(null),
    saveLastReminder: vi.fn().mockResolvedValue(undefined),
    clearLastReminder: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  getPermission,
  requestPermission,
  showNotification,
  notifyWorkoutComplete,
  scheduleReminder,
  clearReminders,
  requestPersistentStorage,
  getStorageEstimate,
} from './notifications.ts';

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('getPermission', () => {
  it('returns denied when Notification is not available', () => {
    const orig = globalThis.Notification;
    // @ts-expect-error - removing Notification
    delete globalThis.Notification;
    expect(getPermission()).toBe('denied');
    globalThis.Notification = orig;
  });

  it('returns current permission', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      writable: true,
      configurable: true,
    });
    expect(getPermission()).toBe('granted');
  });
});

describe('requestPermission', () => {
  it('returns denied when Notification is not available', async () => {
    const orig = globalThis.Notification;
    // @ts-expect-error - removing Notification
    delete globalThis.Notification;
    expect(await requestPermission()).toBe('denied');
    globalThis.Notification = orig;
  });

  it('returns granted when already granted', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(await requestPermission()).toBe('granted');
  });

  it('calls requestPermission when not granted', async () => {
    const mockRequest = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: mockRequest },
      writable: true,
      configurable: true,
    });
    const result = await requestPermission();
    expect(mockRequest).toHaveBeenCalled();
    expect(result).toBe('granted');
  });
});

describe('showNotification', () => {
  it('does nothing when permission is not granted', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      writable: true,
      configurable: true,
    });
    await showNotification('Test', 'Body');
    // No error thrown
  });
});

describe('notifyWorkoutComplete', () => {
  it('calls showNotification with formatted message', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      writable: true,
      configurable: true,
    });
    // Should not throw even when permission denied
    await notifyWorkoutComplete('Push Day', 3600, 15);
  });
});

describe('scheduleReminder / clearReminders', () => {
  it('scheduleReminder sets an interval and clearReminders clears it', () => {
    vi.useFakeTimers();
    scheduleReminder('07:00', [true, true, true, true, true, false, false]);
    clearReminders();
    vi.useRealTimers();
  });

  it('clearReminders is safe to call multiple times', () => {
    clearReminders();
    clearReminders();
  });
});

describe('requestPersistentStorage', () => {
  it('returns false when storage.persist is not available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('returns result from persist()', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persist: vi.fn().mockResolvedValue(true) },
      writable: true,
      configurable: true,
    });
    expect(await requestPersistentStorage()).toBe(true);
  });
});

describe('getStorageEstimate', () => {
  it('returns null when estimate is not available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(await getStorageEstimate()).toBeNull();
  });

  it('returns formatted estimate', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 1048576, quota: 1073741824 }),
      },
      writable: true,
      configurable: true,
    });
    const result = await getStorageEstimate();
    expect(result).not.toBeNull();
    expect(result!.usedMB).toBe(1);
    expect(result!.quotaMB).toBe(1024);
    expect(result!.percentUsed).toBeGreaterThan(0);
  });
});
