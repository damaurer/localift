import type {
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  ActiveWorkoutState,
  LoggedSet,
} from '../types/workout.types.ts';
import type {
  NutritionDay,
  NutritionGoals,
} from '../types/nutrition.types.ts';
import type {
  AppSettings,
} from "../types/app.types.ts";
import { idbClearAll, idbDelete, idbGet, idbSet } from "./db.ts";

const KEYS = {
  settings: "localift_settings",
  remoteVersion: "localift_remote_exercises_version",
  remoteLastSync: "localift_remote_exercises_last_sync",
  lastReminder: "localift_last_reminder",
  feedbackSkip: "localift_feedback_skip",
} as const;

const DB_KEYS = {
  exercises: "data",
  plans: "data",
  sessions: "data",
  activeWorkout: "data",
  nutritionDays: "data",
  nutritionGoals: "data",
} as const;

export function loadSync<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories: 2500,
  protein: 180,
  carbs: 280,
  fat: 75,
  waterMl: 3000,
};

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: "kg",
  reminderEnabled: false,
  reminderTime: "07:00",
  reminderDays: [true, true, true, true, true, false, false],
  vibration: true,
};

export const storage = {
  getExercises: () => idbGet<Exercise[]>("exercises", DB_KEYS.exercises, []),
  saveExercises: (v: Exercise[]) => idbSet("exercises", DB_KEYS.exercises, v),

  getPlans: () => idbGet<WorkoutPlan[]>("plans", DB_KEYS.plans, []),
  savePlans: (v: WorkoutPlan[]) => idbSet("plans", DB_KEYS.plans, v),

  getSessions: () => idbGet<WorkoutSession[]>("sessions", DB_KEYS.sessions, []),
  saveSessions: (v: WorkoutSession[]) => idbSet("sessions", DB_KEYS.sessions, v),

  getActiveWorkout: () => idbGet<ActiveWorkoutState | null>("activeWorkout", DB_KEYS.activeWorkout, null),
  saveActiveWorkout: (v: ActiveWorkoutState | null) => {
    if (v === null) return idbDelete("activeWorkout", DB_KEYS.activeWorkout);
    return idbSet("activeWorkout", DB_KEYS.activeWorkout, v);
  },

  getNutritionDays: () => idbGet<NutritionDay[]>("nutritionDays", DB_KEYS.nutritionDays, []),
  saveNutritionDays: (v: NutritionDay[]) => idbSet("nutritionDays", DB_KEYS.nutritionDays, v),

  getNutritionGoals: () => idbGet<NutritionGoals>("nutritionGoals", DB_KEYS.nutritionGoals, DEFAULT_NUTRITION_GOALS),
  saveNutritionGoals: (v: NutritionGoals) => idbSet("nutritionGoals", DB_KEYS.nutritionGoals, v),

  getSettings: () => Promise.resolve(loadSync<AppSettings>(KEYS.settings, DEFAULT_SETTINGS)),
  getSettingsSync: (): AppSettings => loadSync<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (v: AppSettings) => save(KEYS.settings, v),

  getRemoteSyncInfo: async () => ({
    version: localStorage.getItem(KEYS.remoteVersion),
    lastSync: parseInt(localStorage.getItem(KEYS.remoteLastSync) ?? "0", 10),
  }),
  saveRemoteSyncInfo: async (version: string, lastSync: number) => {
    localStorage.setItem(KEYS.remoteVersion, version);
    localStorage.setItem(KEYS.remoteLastSync, lastSync.toString());
  },

  getFeedbackSkip: async () => localStorage.getItem(KEYS.feedbackSkip) === "true",
  saveFeedbackSkip: async (skip: boolean) => {
    localStorage.setItem(KEYS.feedbackSkip, skip ? "true" : "false");
  },

  getLastReminder: async () => localStorage.getItem(KEYS.lastReminder),
  saveLastReminder: async (dateStr: string) => {
    localStorage.setItem(KEYS.lastReminder, dateStr);
  },

  clearAll: async () => {
    await idbClearAll();
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function calcTotalVolume(exercises: { loggedSets: LoggedSet[] }[]): number {
  return exercises.reduce((total, ex) => {
    return total + ex.loggedSets.reduce((s, set) => s + set.weight * set.reps, 0);
  }, 0);
}

export function calcTotalSets(exercises: { loggedSets: LoggedSet[] }[]): number {
  return exercises.reduce((total, ex) => total + ex.loggedSets.length, 0);
}
