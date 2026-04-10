
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'abs' | 'legs' | 'glutes';

export interface Exercise {
  id: string;
  name: string;
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';
  muscleGroups: MuscleGroup[];
  category: string;
  tags?: string[];
  description?: string;
  imageUrl?: string | null;
}

export type WeightUnit = 'kg' | 'lbs';
export type Weight = number;
export interface SetTemplate {
  id: string;
  weight: Weight;
  weightUnit: WeightUnit;
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

export interface ShareablePlan {
  type: 'localift-plan';
  version: 1;
  plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>;
  exercises: Exercise[];
}
