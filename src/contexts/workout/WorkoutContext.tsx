import {createContext, type Dispatch, type SetStateAction, useContext} from "react";
import type {ActiveWorkoutState, WorkoutSession} from "../../types/workout.types.ts";

export interface WorkoutContextValue {
    sessions: WorkoutSession[];
    setSessions: Dispatch<SetStateAction<WorkoutSession[]>>;
    activeWorkout: ActiveWorkoutState | null;
    setActiveWorkout: Dispatch<SetStateAction<ActiveWorkoutState | null>>;
    startWorkout: (planId: string, prevSession?: WorkoutSession) => void;
    updateActiveSet: (exerciseIndex: number, field: 'weight' | 'reps', value: number) => void;
    completeSet: (exerciseIndex: number) => void;
    setExpandedExercise: (index: number) => void;
    finishWorkout: () => void;
    cancelWorkout: () => void;
    getSessionById: (id: string) => WorkoutSession | undefined;
}

export const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function useWorkoutContext() {
    const context = useContext(WorkoutContext);
    if (!context) {
        throw new Error('useWorkoutContext must be used within an WorkoutProvider');
    }
    return context;
}