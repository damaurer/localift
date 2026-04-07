import { type ReactNode, useCallback,  useState} from "react";
import type {
    ActiveExerciseState,
    ActiveWorkoutState,
    LoggedSet,
    WorkoutSession
} from "../../types/workout.types.ts";
import {generateId, storage} from "../../storage.ts";
import {notifyWorkoutComplete} from "../../notifications.ts";
import {WorkoutContext} from "./WorkoutContext.tsx";
import {usePlanContext} from "../plan/PlanContext.tsx";
import {useExerciseContext} from "../exercise/ExerciseContext.tsx";




export function WorkoutProvider({children}: { children: ReactNode }) {
    const {plans} = usePlanContext();
    const {exercises} = useExerciseContext();

    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);

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
            exs[exerciseIndex] = {...exs[exerciseIndex], [field === 'weight' ? 'currentWeight' : 'currentReps']: value};
            const next = {...prev, exercises: exs};
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

            const next = {...prev, exercises: exs, expandedIndex};
            storage.saveActiveWorkout(next);
            return next;
        });
    }, []);

    const setExpandedExercise = useCallback((index: number) => {
        setActiveWorkout(prev => {
            if (!prev) return prev;
            const next = {...prev, expandedIndex: index};
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


    return (
        <WorkoutContext.Provider value={{
            sessions, setSessions, activeWorkout, setActiveWorkout,
            startWorkout, updateActiveSet, completeSet, setExpandedExercise,
            finishWorkout, cancelWorkout,
            getSessionById,
        }}>
            {children}
        </WorkoutContext.Provider>
    )
}

