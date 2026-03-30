import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { storage, generateId, DEFAULT_EXERCISES } from './storage';
import { notifyWorkoutComplete, scheduleReminder, clearReminders } from './notifications';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  ActiveWorkoutState,
  ActiveExerciseState,
  AppSettings,
  SetTemplate,
  AppRoute,
  LoggedSet,
} from './types';

interface AppContextValue {
  // State
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  settings: AppSettings;
  activeWorkout: ActiveWorkoutState | null;
  route: AppRoute;

  // Navigation
  navigate: (route: AppRoute) => void;
  goBack: () => void;

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
  startWorkout: (planId: string) => void;
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(() => storage.getExercises());
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => storage.getPlans());
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => storage.getSessions());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(() => storage.getActiveWorkout());
  const [route, setRoute] = useState<AppRoute>({ screen: 'dashboard' });
  const [, setHistory] = useState<AppRoute[]>([]);

  const navigate = useCallback((newRoute: AppRoute) => {
    setHistory(h => [...h, route]);
    setRoute(newRoute);
  }, [route]);

  const goBack = useCallback(() => {
    setHistory(h => {
      const prev = h[h.length - 1];
      if (prev) {
        setRoute(prev);
        return h.slice(0, -1);
      }
      return h;
    });
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
    let id = plan.id ?? generateId();
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
    const defaultSet: SetTemplate = { id: generateId(), weight: 60, reps: 8, restSeconds: 90 };
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
  const startWorkout = useCallback((planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const exStates: ActiveExerciseState[] = plan.exercises
      .sort((a, b) => a.order - b.order)
      .map(pe => {
        const ex = exercises.find(e => e.id === pe.exerciseId);
        const firstSet = pe.sets[0];
        return {
          planExerciseId: pe.id,
          exerciseId: pe.exerciseId,
          exerciseName: ex?.name ?? 'Übung',
          targetSets: pe.sets,
          loggedSets: [],
          currentWeight: firstSet?.weight ?? 60,
          currentReps: firstSet?.reps ?? 8,
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
    navigate({ screen: 'active-workout' });
  }, [plans, exercises, navigate]);

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
    navigate({ screen: 'history' });
  }, [activeWorkout, navigate]);

  const cancelWorkout = useCallback(() => {
    storage.saveActiveWorkout(null);
    setActiveWorkout(null);
    navigate({ screen: 'dashboard' });
  }, [navigate]);

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

  const clearAllData = useCallback(() => {
    storage.clearAll();
    setExercises(DEFAULT_EXERCISES);
    setPlans([]);
    setSessions([]);
    setActiveWorkout(null);
    setSettings(storage.getSettings());
    navigate({ screen: 'dashboard' });
  }, [navigate]);

  return (
    <AppContext.Provider value={{
      exercises, plans, sessions, settings, activeWorkout, route,
      navigate, goBack,
      addExercise, deleteExercise, getExerciseById,
      savePlan, deletePlan, getPlanById, updatePlanExerciseSets,
      addExerciseToPlan, removeExerciseFromPlan, reorderPlanExercises,
      startWorkout, updateActiveSet, completeSet, setExpandedExercise,
      finishWorkout, cancelWorkout,
      getSessionById,
      updateSettings, clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
