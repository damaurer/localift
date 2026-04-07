import {createContext, type Dispatch, type SetStateAction, useContext} from "react";
import type {Exercise} from "../../types/workout.types.ts";

export interface ExerciseContextValue {
    exercises: Exercise[];
    setExercises:  Dispatch<SetStateAction<Exercise[]>>
    addExercise: (ex: Omit<Exercise, 'id'>) => void;
    deleteExercise: (id: string) => void;
    getExerciseById: (id: string) => Exercise | undefined;
    syncExercisesWithRepo: () => Promise<Exercise[]>;
}



export const ExerciseContext = createContext<ExerciseContextValue | null>(null);


export function useExerciseContext() {
    const context = useContext(ExerciseContext);
    if (!context) {
        throw new Error('useExerciseContext must be used within an ExerciseProvider');
    }
    return context;
}