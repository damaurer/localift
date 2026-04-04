import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { storage, generateId, DEFAULT_EXERCISES } from './storage';
import { notifyWorkoutComplete, scheduleReminder, clearReminders } from './notifications';
import { syncExercisesIfStale } from './exerciseSync';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  ActiveWorkoutState,
  ActiveExerciseState,
  SetTemplate,
  LoggedSet,
} from './types/workout.types.ts';
import type {
  NutritionDay,
  NutritionGoals,
  FoodEntry,
  MealType,
} from './types/nutrition.types.ts';
import type {
  AppSettings,
} from './types/app.types.ts';

interface AppContextValue {
  // State
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  settings: AppSettings;
  activeWorkout: ActiveWorkoutState | null;

  // Exercise library
  addExercise: (ex: Omit<Exercise, 'id'>) => void;
  deleteExercise: (id: string) => void;
  getExerciseById: (id: string) => Exercise | undefined;

  // Plans
  savePlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  deletePlan: (id: string) => void;
  getPlanById: (id: string) => WorkoutPlan | undefined;
  updatePlanExerciseSets: (planId: string, planExerciseId: string, sets: SetTemplate[]) => void;
  addExerciseToPlan: (planId: string, exerciseId: string) => string;
  removeExerciseFromPlan: (planId: string, planExerciseId: string) => void;
  reorderPlanExercises: (planId: string, from: number, to: number) => void;

  // Active workout
  startWorkout: (planId: string, prevSession?: WorkoutSession) => void;
  updateActiveSet: (exerciseIndex: number, field: 'weight' | 'reps', value: number) => void;
  completeSet: (exerciseIndex: number) => void;
  setExpandedExercise: (index: number) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;

  // Sessions
  getSessionById: (id: string) => WorkoutSession | undefined;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearAllData: () => void;

  // Nutrition
  nutritionDays: NutritionDay[];
  nutritionGoals: NutritionGoals;
  getTodayNutrition: () => NutritionDay;
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'loggedAt'> & { mealType: MealType }) => void;
  removeFoodEntry: (entryId: string) => void;
  updateWater: (date: string, waterMl: number) => void;
  updateNutritionGoals: (goals: NutritionGoals) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    // We can't use async here, so we might need to handle it in useEffect
    // For now, use a safe default and update in useEffect
    return {
      weightUnit: 'kg',
      reminderEnabled: false,
      reminderTime: '07:00',
      reminderDays: [true, true, true, true, true, false, false],
      vibration: true,
    };
  });
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [nutritionDays, setNutritionDays] = useState<NutritionDay[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(() => {
    return {
      calories: 2500,
      protein: 180,
      carbs: 280,
      fat: 75,
      waterMl: 3000,
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [
          loadedExercises,
          loadedPlans,
          loadedSessions,
          loadedSettings,
          loadedActiveWorkout,
          loadedNutritionDays,
          loadedNutritionGoals,
        ] = await Promise.all([
          storage.getExercises(),
          storage.getPlans(),
          storage.getSessions(),
          storage.getSettings(),
          storage.getActiveWorkout(),
          storage.getNutritionDays(),
          storage.getNutritionGoals(),
        ]);

        setExercises(loadedExercises);
        setPlans(loadedPlans);
        setSessions(loadedSessions);
        setSettings(loadedSettings);
        setActiveWorkout(loadedActiveWorkout);
        setNutritionDays(loadedNutritionDays);
        setNutritionGoals(loadedNutritionGoals);

        // Also sync remote exercises if stale
        const updated = await syncExercisesIfStale();
        if (updated) setExercises(updated);
      } catch (error) {
        console.error('Failed to load storage data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Exercise library
  const addExercise = useCallback((ex: Omit<Exercise, 'id'>) => {
    const newEx: Exercise = { ...ex, id: generateId() };
    setExercises(prev => {
      const next = [...prev, newEx];
      storage.saveExercises(next);
      return next;
    });
  }, []);

  const deleteExercise = useCallback((id: string) => {
    setExercises(prev => {
      const next = prev.filter(e => e.id !== id);
      storage.saveExercises(next);
      return next;
    });
  }, []);

  const getExerciseById = useCallback((id: string) => exercises.find(e => e.id === id), [exercises]);

  // Plans
  const savePlan = useCallback((plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    const id = plan.id ?? generateId();
    setPlans(prev => {
      const existing = prev.find(p => p.id === id);
      let next: WorkoutPlan[];
      if (existing) {
        next = prev.map(p =>
          p.id === id
            ? { ...p, ...plan, id, updatedAt: now }
            : p
        );
      } else {
        const newPlan: WorkoutPlan = {
          ...plan,
          id,
          createdAt: now,
          updatedAt: now,
        };
        next = [...prev, newPlan];
      }
      storage.savePlans(next);
      return next;
    });
    return id;
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans(prev => {
      const next = prev.filter(p => p.id !== id);
      storage.savePlans(next);
      return next;
    });
  }, []);

  const getPlanById = useCallback((id: string) => plans.find(p => p.id === id), [plans]);

  const updatePlanExerciseSets = useCallback((planId: string, planExerciseId: string, sets: SetTemplate[]) => {
    setPlans(prev => {
      const next = prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          exercises: p.exercises.map(ex =>
            ex.id === planExerciseId ? { ...ex, sets } : ex
          ),
          updatedAt: new Date().toISOString(),
        };
      });
      storage.savePlans(next);
      return next;
    });
  }, []);

  const addExerciseToPlan = useCallback((planId: string, exerciseId: string) => {
    const newId = generateId();
    const defaultSet: SetTemplate = { id: generateId(), weight: 60, reps: 8, restSeconds: 90, weightUnit: 'kg' };
    setPlans(prev => {
      const next = prev.map(p => {
        if (p.id !== planId) return p;
        const newEx = {
          id: newId,
          exerciseId,
          order: p.exercises.length,
          sets: [defaultSet],
        };
        return {
          ...p,
          exercises: [...p.exercises, newEx],
          updatedAt: new Date().toISOString(),
        };
      });
      storage.savePlans(next);
      return next;
    });
    return newId;
  }, []);

  const removeExerciseFromPlan = useCallback((planId: string, planExerciseId: string) => {
    setPlans(prev => {
      const next = prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          exercises: p.exercises
            .filter(ex => ex.id !== planExerciseId)
            .map((ex, i) => ({ ...ex, order: i })),
          updatedAt: new Date().toISOString(),
        };
      });
      storage.savePlans(next);
      return next;
    });
  }, []);

  const reorderPlanExercises = useCallback((planId: string, from: number, to: number) => {
    setPlans(prev => {
      const next = prev.map(p => {
        if (p.id !== planId) return p;
        const exs = [...p.exercises];
        const [moved] = exs.splice(from, 1);
        exs.splice(to, 0, moved);
        return {
          ...p,
          exercises: exs.map((ex, i) => ({ ...ex, order: i })),
          updatedAt: new Date().toISOString(),
        };
      });
      storage.savePlans(next);
      return next;
    });
  }, []);

  // Active workout
  const startWorkout = useCallback((planId: string, prevSession?: WorkoutSession) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const exStates: ActiveExerciseState[] = plan.exercises
      .sort((a, b) => a.order - b.order)
      .map(pe => {
        const ex = exercises.find(e => e.id === pe.exerciseId);
        const firstSet = pe.sets[0];

        // Pre-fill with the last achieved values from the previous session
        const prevEx = prevSession?.exercises.find(e => e.exerciseId === pe.exerciseId);
        const lastLogged = prevEx?.loggedSets[prevEx.loggedSets.length - 1];

        return {
          planExerciseId: pe.id,
          exerciseId: pe.exerciseId,
          exerciseName: ex?.name ?? 'Übung',
          targetSets: pe.sets,
          loggedSets: [],
          currentWeight: lastLogged?.weight ?? firstSet?.weight ?? 60,
          currentReps: lastLogged?.reps ?? firstSet?.reps ?? 8,
        };
      });

    const state: ActiveWorkoutState = {
      sessionId: generateId(),
      planId,
      planName: plan.name,
      startedAt: new Date().toISOString(),
      exercises: exStates,
      expandedIndex: 0,
    };
    storage.saveActiveWorkout(state);
    setActiveWorkout(state);
  }, [plans, exercises]);

  const updateActiveSet = useCallback((exerciseIndex: number, field: 'weight' | 'reps', value: number) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const exs = [...prev.exercises];
      exs[exerciseIndex] = { ...exs[exerciseIndex], [field === 'weight' ? 'currentWeight' : 'currentReps']: value };
      const next = { ...prev, exercises: exs };
      storage.saveActiveWorkout(next);
      return next;
    });
  }, []);

  const completeSet = useCallback((exerciseIndex: number) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const exs = [...prev.exercises];
      const ex = exs[exerciseIndex];
      const logged: LoggedSet = {
        weight: ex.currentWeight,
        reps: ex.currentReps,
        completedAt: new Date().toISOString(),
      };
      const nextSetIndex = ex.loggedSets.length + 1;
      const nextTarget = ex.targetSets[nextSetIndex];
      exs[exerciseIndex] = {
        ...ex,
        loggedSets: [...ex.loggedSets, logged],
        currentWeight: nextTarget?.weight ?? ex.currentWeight,
        currentReps: nextTarget?.reps ?? ex.currentReps,
      };

      // Auto-advance to next exercise if all sets done
      let expandedIndex = prev.expandedIndex;
      if (exs[exerciseIndex].loggedSets.length >= ex.targetSets.length) {
        const nextIncomplete = exs.findIndex((e, i) => i > exerciseIndex && e.loggedSets.length < e.targetSets.length);
        if (nextIncomplete >= 0) expandedIndex = nextIncomplete;
      }

      const next = { ...prev, exercises: exs, expandedIndex };
      storage.saveActiveWorkout(next);
      return next;
    });
  }, []);

  const setExpandedExercise = useCallback((index: number) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const next = { ...prev, expandedIndex: index };
      storage.saveActiveWorkout(next);
      return next;
    });
  }, []);

  const finishWorkout = useCallback(() => {
    if (!activeWorkout) return;
    const now = new Date().toISOString();
    const startTime = new Date(activeWorkout.startedAt).getTime();
    const duration = Math.floor((Date.now() - startTime) / 1000);

    const session: WorkoutSession = {
      id: activeWorkout.sessionId,
      planId: activeWorkout.planId,
      planName: activeWorkout.planName,
      startedAt: activeWorkout.startedAt,
      completedAt: now,
      durationSeconds: duration,
      exercises: activeWorkout.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        loggedSets: ex.loggedSets,
      })),
    };

    setSessions(prev => {
      const next = [session, ...prev];
      storage.saveSessions(next);
      return next;
    });
    storage.saveActiveWorkout(null);
    setActiveWorkout(null);
    notifyWorkoutComplete(
      activeWorkout.planName,
      duration,
      activeWorkout.exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0)
    );
  }, [activeWorkout]);

  const cancelWorkout = useCallback(() => {
    storage.saveActiveWorkout(null);
    setActiveWorkout(null);
  }, []);

  const getSessionById = useCallback((id: string) => sessions.find(s => s.id === id), [sessions]);

  // Settings
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      if (next.reminderEnabled) {
        scheduleReminder(next.reminderTime, next.reminderDays);
      } else {
        clearReminders();
      }
      return next;
    });
  }, []);

  // Nutrition
  const getTodayNutrition = useCallback((): NutritionDay => {
    const today = new Date().toISOString().split('T')[0];
    return nutritionDays.find(d => d.date === today) ?? { date: today, entries: [], waterMl: 0 };
  }, [nutritionDays]);

  const addFoodEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'loggedAt'> & { mealType: MealType }) => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: FoodEntry = { ...entry, id: generateId(), loggedAt: new Date().toISOString() };
    setNutritionDays(prev => {
      const idx = prev.findIndex(d => d.date === today);
      let next: NutritionDay[];
      if (idx >= 0) {
        next = prev.map((d, i) => i === idx ? { ...d, entries: [...d.entries, newEntry] } : d);
      } else {
        next = [...prev, { date: today, entries: [newEntry], waterMl: 0 }];
      }
      storage.saveNutritionDays(next);
      return next;
    });
  }, []);

  const removeFoodEntry = useCallback((entryId: string) => {
    setNutritionDays(prev => {
      const next = prev.map(d => ({ ...d, entries: d.entries.filter(e => e.id !== entryId) }));
      storage.saveNutritionDays(next);
      return next;
    });
  }, []);

  const updateWater = useCallback((date: string, waterMl: number) => {
    setNutritionDays(prev => {
      const idx = prev.findIndex(d => d.date === date);
      let next: NutritionDay[];
      if (idx >= 0) {
        next = prev.map((d, i) => i === idx ? { ...d, waterMl } : d);
      } else {
        next = [...prev, { date, entries: [], waterMl }];
      }
      storage.saveNutritionDays(next);
      return next;
    });
  }, []);

  const updateNutritionGoals = useCallback((goals: NutritionGoals) => {
    setNutritionGoals(goals);
    storage.saveNutritionGoals(goals);
  }, []);

  const clearAllData = useCallback(async () => {
    storage.clearAll();
    setExercises(DEFAULT_EXERCISES);
    setPlans([]);
    setSessions([]);
    setActiveWorkout(null);
    const [defSettings, defGoals] = await Promise.all([
      storage.getSettings(),
      storage.getNutritionGoals(),
    ]);
    setSettings(defSettings);
    setNutritionDays([]);
    setNutritionGoals(defGoals);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      exercises, plans, sessions, settings, activeWorkout,
      addExercise, deleteExercise, getExerciseById,
      savePlan, deletePlan, getPlanById, updatePlanExerciseSets,
      addExerciseToPlan, removeExerciseFromPlan, reorderPlanExercises,
      startWorkout, updateActiveSet, completeSet, setExpandedExercise,
      finishWorkout, cancelWorkout,
      getSessionById,
      updateSettings, clearAllData,
      nutritionDays, nutritionGoals,
      getTodayNutrition, addFoodEntry, removeFoodEntry, updateWater, updateNutritionGoals,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
