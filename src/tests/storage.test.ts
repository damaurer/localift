// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db.ts
vi.mock('./db.ts', () => ({
  idbGet: vi.fn().mockResolvedValue([]),
  idbSet: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
  idbClearAll: vi.fn().mockResolvedValue(undefined),
}));

// Mock wllama-config.ts
vi.mock('../ai/wllama-config.ts', () => ({
  DEFAULT_MODEL_URL: 'https://example.com/model.gguf',
}));

// Provide a working localStorage mock
const localStorageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageMap.set(key, value),
  removeItem: (key: string) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear(),
  get length() { return localStorageMap.size; },
  key: (index: number) => Array.from(localStorageMap.keys())[index] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Import after mocks are set up
import { calcTotalVolume, calcTotalSets, generateId, loadSync, save, needsConsent, storage, DEFAULT_NUTRITION_GOALS } from '../data/storage.ts';

beforeEach(() => {
  localStorageMap.clear();
});

describe('calcTotalVolume', () => {
  it('sums weight × reps across all sets and exercises', () => {
    const exercises = [
      { loggedSets: [{ weight: 100, reps: 5, completedAt: '' }, { weight: 80, reps: 8, completedAt: '' }] },
      { loggedSets: [{ weight: 60, reps: 10, completedAt: '' }] },
    ];
    expect(calcTotalVolume(exercises)).toBe(100 * 5 + 80 * 8 + 60 * 10);
  });

  it('returns 0 for empty exercises', () => {
    expect(calcTotalVolume([])).toBe(0);
  });

  it('returns 0 for exercises with no sets', () => {
    expect(calcTotalVolume([{ loggedSets: [] }])).toBe(0);
  });
});

describe('calcTotalSets', () => {
  it('counts total logged sets', () => {
    const exercises = [
      { loggedSets: [{ weight: 0, reps: 0, completedAt: '' }, { weight: 0, reps: 0, completedAt: '' }] },
      { loggedSets: [{ weight: 0, reps: 0, completedAt: '' }] },
    ];
    expect(calcTotalSets(exercises)).toBe(3);
  });

  it('returns 0 for empty exercises', () => {
    expect(calcTotalSets([])).toBe(0);
  });
});

describe('generateId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  it('generates string ids', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('contains a timestamp component', () => {
    const id = generateId();
    const timestamp = parseInt(id.split('-')[0], 10);
    expect(timestamp).toBeGreaterThan(0);
  });
});

describe('loadSync', () => {
  it('returns fallback when key does not exist', () => {
    expect(loadSync('nonexistent', 'default')).toBe('default');
  });

  it('returns parsed value when key exists', () => {
    localStorage.setItem('test_key', JSON.stringify({ a: 1 }));
    expect(loadSync('test_key', {})).toEqual({ a: 1 });
  });

  it('returns fallback on invalid JSON', () => {
    localStorage.setItem('bad_json', '{invalid');
    expect(loadSync('bad_json', 'fallback')).toBe('fallback');
  });
});

describe('save', () => {
  it('saves value to localStorage', async () => {
    await save('save_key', { x: 42 });
    expect(JSON.parse(localStorage.getItem('save_key')!)).toEqual({ x: 42 });
  });
});

describe('needsConsent', () => {
  it('returns true when no consent stored', () => {
    expect(needsConsent()).toBe(true);
  });

  it('returns true when consent not accepted', () => {
    localStorage.setItem('localift_consent', JSON.stringify({ accepted: false, version: '1.0', timestamp: Date.now() }));
    expect(needsConsent()).toBe(true);
  });

  it('returns true when consent version mismatch', () => {
    localStorage.setItem('localift_consent', JSON.stringify({ accepted: true, version: '0.9', timestamp: Date.now() }));
    expect(needsConsent()).toBe(true);
  });

  it('returns false when consent is valid', () => {
    localStorage.setItem('localift_consent', JSON.stringify({ accepted: true, version: '1.0', timestamp: Date.now() }));
    expect(needsConsent()).toBe(false);
  });
});

describe('storage', () => {
  it('getSettingsSync returns default settings', () => {
    const settings = storage.getSettingsSync();
    expect(settings.weightUnit).toBe('kg');
    expect(settings.language).toBe('de');
    expect(settings.reminderEnabled).toBe(false);
    expect(settings.vibration).toBe(true);
    expect(settings.aiTrainer.enabled).toBe(false);
  });

  it('getSettings returns a promise with default settings', async () => {
    const settings = await storage.getSettings();
    expect(settings.weightUnit).toBe('kg');
  });

  it('saveSettings persists to localStorage', async () => {
    const settings = storage.getSettingsSync();
    const updated = { ...settings, weightUnit: 'lbs' as const };
    await storage.saveSettings(updated);
    const loaded = storage.getSettingsSync();
    expect(loaded.weightUnit).toBe('lbs');
  });

  it('getRemoteSyncInfo returns defaults', async () => {
    const info = await storage.getRemoteSyncInfo();
    expect(info.version).toBeNull();
    expect(info.lastSync).toBe(0);
  });

  it('saveRemoteSyncInfo persists values', async () => {
    await storage.saveRemoteSyncInfo('v2', 12345);
    const info = await storage.getRemoteSyncInfo();
    expect(info.version).toBe('v2');
    expect(info.lastSync).toBe(12345);
  });

  it('getFeedbackSkip returns false by default', async () => {
    expect(await storage.getFeedbackSkip()).toBe(false);
  });

  it('saveFeedbackSkip persists value', async () => {
    await storage.saveFeedbackSkip(true);
    expect(await storage.getFeedbackSkip()).toBe(true);
  });

  it('getLastReminder returns null by default', async () => {
    expect(await storage.getLastReminder()).toBeNull();
  });

  it('saveLastReminder and clearLastReminder work', async () => {
    await storage.saveLastReminder('2024-01-01');
    expect(await storage.getLastReminder()).toBe('2024-01-01');
    await storage.clearLastReminder();
    expect(await storage.getLastReminder()).toBeNull();
  });

  it('getConsent returns null by default', () => {
    expect(storage.getConsent()).toBeNull();
  });

  it('saveConsent persists consent state', async () => {
    const consent = { accepted: true, version: '1.0', timestamp: Date.now() };
    await storage.saveConsent(consent);
    expect(storage.getConsent()).toEqual(consent);
  });

  it('DEFAULT_NUTRITION_GOALS has expected values', () => {
    expect(DEFAULT_NUTRITION_GOALS.calories).toBe(2500);
    expect(DEFAULT_NUTRITION_GOALS.protein).toBe(180);
    expect(DEFAULT_NUTRITION_GOALS.carbs).toBe(280);
    expect(DEFAULT_NUTRITION_GOALS.fat).toBe(75);
    expect(DEFAULT_NUTRITION_GOALS.waterMl).toBe(3000);
  });
});
