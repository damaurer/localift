
import type {SetTemplate, WorkoutPlan} from "../../types/workout.types.ts";
import {createContext, type Dispatch, type SetStateAction, useContext} from "react";

export interface PlanContextValue{
    plans: WorkoutPlan[];
    setPlans: Dispatch<SetStateAction<WorkoutPlan[]>>;
    savePlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
    deletePlan: (id: string) => void;
    getPlanById: (id: string) => WorkoutPlan | undefined;
    updatePlanExerciseSets: (planId: string, planExerciseId: string, sets: SetTemplate[]) => void;
    addExerciseToPlan: (planId: string, exerciseId: string) => string;
    removeExerciseFromPlan: (planId: string, planExerciseId: string) => void;
    reorderPlanExercises: (planId: string, from: number, to: number) => void;
}

export const PlanContext = createContext<PlanContextValue | null>(null);


export function usePlanContext() {
    const context = useContext(PlanContext);
    if (!context) {
        throw new Error('usePlanContext must be used within an PlanProvider');
    }
    return context;
}