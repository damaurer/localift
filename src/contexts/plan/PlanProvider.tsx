import {type ReactNode, useEffect, useCallback, useState} from "react";
import type {PlanExercise, SetTemplate, WorkoutPlan} from "../../types/workout.types.ts";
import {generateId, storage} from "../../data/storage.ts";
import {PlanContext} from "./PlanContext.tsx";


export function PlanProvider({children}: { children: ReactNode }) {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);

    useEffect(() => {
        storage.getPlans().then(setPlans).catch(() => setPlans([]));
    }, []);
    const savePlan = useCallback((plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        const now = new Date().toISOString();
        const id = plan.id ?? generateId();
        setPlans(prev => {
            const existing = prev.find(p => p.id === id);
            let next: WorkoutPlan[];
            if (existing) {
                next = prev.map(p =>
                    p.id === id
                        ? {...p, ...plan, id, updatedAt: now}
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
                        ex.id === planExerciseId ? {...ex, sets} : ex
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
        const defaultSet: SetTemplate = {id: generateId(), weight: 60, reps: 8, restSeconds: 90, weightUnit: 'kg'};
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
                        .reduce((acc, ex, i) => {
                            if(ex.id === planExerciseId) {
                                return acc;
                            }
                            return [...acc, {...ex, order: i}]
                        }, [] as PlanExercise[]),
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
                    exercises: exs.map((ex, i) => ({...ex, order: i})),
                    updatedAt: new Date().toISOString(),
                };
            });
            storage.savePlans(next);
            return next;
        });
    }, []);

    return (
        <PlanContext.Provider value={{
            plans, setPlans,
            savePlan, deletePlan, getPlanById, updatePlanExerciseSets,
            addExerciseToPlan, removeExerciseFromPlan, reorderPlanExercises,
        }}>
            {children}
        </PlanContext.Provider>
    )
}

