export interface Exercise {
  id: string;
  name: string;
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';
  muscleGroups: string[];
  category: string;
  tags?: string[];
  description?: string;
  imageUrl?: string | null;
}

export interface SetTemplate {
  id: string;
  weight: number;
  reps: number;
  restSeconds: number;
}

export interface PlanExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: SetTemplate[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  tags: string[];
  exercises: PlanExercise[];
  estimatedDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoggedSet {
  weight: number;
  reps: number;
  completedAt: string;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  loggedSets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  planId: string;
  planName: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  exercises: SessionExercise[];
}

export interface ActiveExerciseState {
  planExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  targetSets: SetTemplate[];
  loggedSets: LoggedSet[];
  currentWeight: number;
  currentReps: number;
}

export interface ActiveWorkoutState {
  sessionId: string;
  planId: string;
  planName: string;
  startedAt: string;
  exercises: ActiveExerciseState[];
  expandedIndex: number;
}

export interface AppSettings {
  weightUnit: 'kg' | 'lbs';
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDays: boolean[];
  vibration: boolean;
}

export type MealType = 'fruehstueck' | 'mittagessen' | 'abendessen' | 'snack';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
  mealType: MealType;
}

export interface NutritionDay {
  date: string; // YYYY-MM-DD
  entries: FoodEntry[];
  waterMl: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

export type NavTab = 'dashboard' | 'plans' | 'calories' | 'settings';

export type AppRoute =
  | { screen: 'dashboard' }
  | { screen: 'plans' }
  | { screen: 'plan-detail'; planId: string | null }
  | { screen: 'exercise-config'; planId: string; planExerciseId: string }
  | { screen: 'active-workout' }
  | { screen: 'history' }
  | { screen: 'history-detail'; sessionId: string }
  | { screen: 'calories' }
  | { screen: 'settings' };
