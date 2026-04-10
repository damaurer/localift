import { type ReactNode, useCallback, useEffect, useState} from "react";
import type {Exercise} from "../../types/workout.types.ts";
import {generateId, storage} from "../../data/storage.ts";
import {ExerciseContext} from "./ExerciseContext.tsx";


const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function ExerciseProvider({children}: { children: ReactNode }) {
    const [exercises, setExercises] = useState<Exercise[]>([]);

    const syncExercisesWithRepo = useCallback(async () => {
        const {version: cachedVersion, lastSync} = await storage.getRemoteSyncInfo();
        const cachedExercises = await storage.getExercises();

        if (Date.now() - lastSync < SYNC_INTERVAL_MS && cachedExercises.length > 0) {
            setExercises(cachedExercises);
            return cachedExercises;
        }

        try {
            const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`, {cache: 'no-cache'});
            if (!res.ok) {
                setExercises(cachedExercises);
                return cachedExercises;
            }

            const data = (await res.json()) as { version: string; exercises: Exercise[] };

            await storage.saveRemoteSyncInfo(data.version, Date.now());

            if (cachedVersion === data.version) {
                setExercises(cachedExercises);
                return cachedExercises;
            }

            const existingIds = new Set(cachedExercises.map(e => e.id));
            const newExercises = data.exercises.filter((ex: Exercise) => !existingIds.has(ex.id));
            const updatedExercises = newExercises.length > 0
                ? [...cachedExercises, ...newExercises]
                : cachedExercises;

            setExercises(updatedExercises);
            if (newExercises.length > 0) {
                await storage.saveExercises(updatedExercises);
            }
            return updatedExercises;
        } catch (error) {
            console.error('Failed to sync exercises with remote storage', error);
            setExercises(cachedExercises);
            return cachedExercises;
        }
    }, [])

    useEffect(() => {
        syncExercisesWithRepo();
    }, [syncExercisesWithRepo]);

    const addExercise = useCallback((ex: Omit<Exercise, 'id'>) => {
        const newEx: Exercise = {...ex, id: generateId()};
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

    const importExercises = useCallback(async (newExercises: Exercise[]) => {
        setExercises(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const toAdd = newExercises.filter(e => !existingIds.has(e.id));
            if (toAdd.length === 0) return prev;
            const next = [...prev, ...toAdd];
            storage.saveExercises(next);
            return next;
        });
    }, []);

    return (
        <ExerciseContext.Provider
            value={{exercises, setExercises, addExercise, deleteExercise, getExerciseById, syncExercisesWithRepo, importExercises}}>
            {children}
        </ExerciseContext.Provider>
    )
}

