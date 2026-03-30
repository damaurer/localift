import type {
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  ActiveWorkoutState,
  AppSettings,
  LoggedSet,
} from './types';

const KEYS = {
  exercises: 'localift_exercises',
  plans: 'localift_plans',
  sessions: 'localift_sessions',
  activeWorkout: 'localift_active_workout',
  settings: 'localift_settings',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex-bench', name: 'Bench Press', equipment: 'barbell', muscleGroups: ['Brust', 'Trizeps', 'Schultern'], category: 'Drücken' },
  { id: 'ex-squat', name: 'Kniebeuge', equipment: 'barbell', muscleGroups: ['Oberschenkel', 'Gesäß', 'Core'], category: 'Beine' },
  { id: 'ex-deadlift', name: 'Kreuzheben', equipment: 'barbell', muscleGroups: ['Rücken', 'Gesäß', 'Hamstrings'], category: 'Ziehen' },
  { id: 'ex-pullup', name: 'Klimmzüge', equipment: 'bodyweight', muscleGroups: ['Rücken', 'Bizeps'], category: 'Ziehen' },
  { id: 'ex-ohp', name: 'Schulterdrücken', equipment: 'barbell', muscleGroups: ['Schultern', 'Trizeps'], category: 'Drücken' },
  { id: 'ex-row', name: 'Rudern mit Langhantel', equipment: 'barbell', muscleGroups: ['Rücken', 'Bizeps'], category: 'Ziehen' },
  { id: 'ex-curl', name: 'Bizepscurl', equipment: 'dumbbell', muscleGroups: ['Bizeps'], category: 'Arme' },
  { id: 'ex-tri', name: 'Trizepsdrücken', equipment: 'cable', muscleGroups: ['Trizeps'], category: 'Arme' },
  { id: 'ex-legpress', name: 'Beinpresse', equipment: 'machine', muscleGroups: ['Oberschenkel', 'Gesäß'], category: 'Beine' },
  { id: 'ex-rdl', name: 'Rumänisches Kreuzheben', equipment: 'barbell', muscleGroups: ['Hamstrings', 'Gesäß'], category: 'Beine' },
  { id: 'ex-dips', name: 'Dips', equipment: 'bodyweight', muscleGroups: ['Brust', 'Trizeps'], category: 'Drücken' },
  { id: 'ex-latpull', name: 'Lat-Pulldown', equipment: 'cable', muscleGroups: ['Rücken', 'Bizeps'], category: 'Ziehen' },
  { id: 'ex-incline', name: 'Schrägbankdrücken', equipment: 'dumbbell', muscleGroups: ['Brust', 'Schultern'], category: 'Drücken' },
  { id: 'ex-legcurl', name: 'Beinbeuger', equipment: 'machine', muscleGroups: ['Hamstrings'], category: 'Beine' },
  { id: 'ex-legext', name: 'Beinstrecker', equipment: 'machine', muscleGroups: ['Oberschenkel'], category: 'Beine' },
  { id: 'ex-facepull', name: 'Face Pulls', equipment: 'cable', muscleGroups: ['Hintere Schultern', 'Rotatorenmanschette'], category: 'Ziehen' },
  { id: 'ex-cablerow', name: 'Kabelzug Rudern', equipment: 'cable', muscleGroups: ['Rücken', 'Bizeps'], category: 'Ziehen' },
  { id: 'ex-hipthrust', name: 'Hip Thrust', equipment: 'barbell', muscleGroups: ['Gesäß', 'Hamstrings'], category: 'Beine' },
  { id: 'ex-powclean', name: 'Power Clean', equipment: 'barbell', muscleGroups: ['Ganzkörper'], category: 'Olympisch' },
  { id: 'ex-frontsq', name: 'Frontkniebeuge', equipment: 'barbell', muscleGroups: ['Oberschenkel', 'Core'], category: 'Beine' },
];

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg',
  reminderEnabled: false,
  reminderTime: '07:00',
  reminderDays: [true, true, true, true, true, false, false],
  vibration: true,
};

export const storage = {
  getExercises: () => load<Exercise[]>(KEYS.exercises, DEFAULT_EXERCISES),
  saveExercises: (v: Exercise[]) => save(KEYS.exercises, v),

  getPlans: () => load<WorkoutPlan[]>(KEYS.plans, []),
  savePlans: (v: WorkoutPlan[]) => save(KEYS.plans, v),

  getSessions: () => load<WorkoutSession[]>(KEYS.sessions, []),
  saveSessions: (v: WorkoutSession[]) => save(KEYS.sessions, v),

  getActiveWorkout: () => load<ActiveWorkoutState | null>(KEYS.activeWorkout, null),
  saveActiveWorkout: (v: ActiveWorkoutState | null) => {
    if (v === null) {
      localStorage.removeItem(KEYS.activeWorkout);
    } else {
      save(KEYS.activeWorkout, v);
    }
  },

  getSettings: () => load<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (v: AppSettings) => save(KEYS.settings, v),

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
