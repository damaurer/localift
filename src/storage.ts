import type {
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  ActiveWorkoutState,
  LoggedSet,
} from './types/workout.types.ts';
import type {
  NutritionDay,
  NutritionGoals,
} from './types/nutrition.types.ts';
import type {
  AppSettings,
} from './types/app.types.ts';

const KEYS = {
  exercises: 'localift_exercises',
  remoteExercises: 'localift_remote_exercises',
  remoteVersion: 'localift_remote_exercises_version',
  remoteLastSync: 'localift_remote_exercises_last_sync',
  lastReminder: 'localift_last_reminder',
  feedbackSkip: 'localift_feedback_skip',
  plans: 'localift_plans',
  sessions: 'localift_sessions',
  activeWorkout: 'localift_active_workout',
  settings: 'localift_settings',
  nutritionDays: 'localift_nutrition_days',
  nutritionGoals: 'localift_nutrition_goals',
} as const;

export async function load<T>(key: string, fallback: T): Promise<T> {
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
    // Storage full or unavailable
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
  weightUnit: 'kg',
  reminderEnabled: false,
  reminderTime: '07:00',
  reminderDays: [true, true, true, true, true, false, false],
  vibration: true,
};

export const storage = {
  getExercises: async (): Promise<Exercise[]> =>  load<Exercise[]>(KEYS.exercises, []),
  saveExercises: (v: Exercise[]) => save(KEYS.exercises, v),

  getPlans: () => load<WorkoutPlan[]>(KEYS.plans, []),
  savePlans: (v: WorkoutPlan[]) => save(KEYS.plans, v),

  getSessions: () => load<WorkoutSession[]>(KEYS.sessions, []),
  saveSessions: (v: WorkoutSession[]) => save(KEYS.sessions, v),

  getActiveWorkout: () => load<ActiveWorkoutState | null>(KEYS.activeWorkout, null),
  saveActiveWorkout: (v: ActiveWorkoutState | null) => {
    if (v === null) {
      localStorage.removeItem(KEYS.activeWorkout);
      return Promise.resolve();
    } else {
      return save(KEYS.activeWorkout, v);
    }
  },

  getSettings: () => load<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (v: AppSettings) => save(KEYS.settings, v),

  getNutritionDays: () => load<NutritionDay[]>(KEYS.nutritionDays, []),
  saveNutritionDays: (v: NutritionDay[]) => save(KEYS.nutritionDays, v),

  getNutritionGoals: () => load<NutritionGoals>(KEYS.nutritionGoals, DEFAULT_NUTRITION_GOALS),
  saveNutritionGoals: (v: NutritionGoals) => save(KEYS.nutritionGoals, v),

  getRemoteSyncInfo: async () => {
    return {
      version: localStorage.getItem(KEYS.remoteVersion),
      lastSync: parseInt(localStorage.getItem(KEYS.remoteLastSync) ?? '0', 10),
    };
  },
  saveRemoteSyncInfo: async (version: string, lastSync: number) => {
    localStorage.setItem(KEYS.remoteVersion, version);
    localStorage.setItem(KEYS.remoteLastSync, lastSync.toString());
  },

  getFeedbackSkip: async () => localStorage.getItem(KEYS.feedbackSkip) === 'true',
  saveFeedbackSkip: async (skip: boolean) => {
    localStorage.setItem(KEYS.feedbackSkip, skip ? 'true' : 'false');
  },

  getLastReminder: async () => localStorage.getItem(KEYS.lastReminder),
  saveLastReminder: async (dateStr: string) => {
    localStorage.setItem(KEYS.lastReminder, dateStr);
  },

  clearAll: () => {
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
