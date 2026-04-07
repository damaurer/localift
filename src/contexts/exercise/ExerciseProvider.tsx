import { type ReactNode, useCallback,  useState} from "react";
import type {Exercise} from "../../types/workout.types.ts";
import {generateId, storage} from "../../storage.ts";
import {ExerciseContext} from "./ExerciseContext.tsx";


const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function ExerciseProvider({children}: { children: ReactNode }) {
    const [exercises, setExercises] = useState<Exercise[]>([]);

    const syncExercisesWithRepo = useCallback(async () => {
        const {version: cachedVersion, lastSync} = await storage.getRemoteSyncInfo();
        const cachedExercises = await storage.getExercises(); // This will already check remote storage internally

        if (Date.now() - lastSync < SYNC_INTERVAL_MS && cachedExercises.length > 0) {
            return cachedExercises; // recently synced, skip
        }

        try {
            const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`, {cache: 'no-cache'});
            if (!res.ok) return cachedExercises;

            const data = (await res.json()) as { version: string; exercises: Exercise[] };

            await storage.saveRemoteSyncInfo(data.version, Date.now());

            if (cachedVersion === data.version) {
                return cachedExercises; // same version, no update needed
            }

            const updatedExercises: Exercise[] = data.exercises.reduce((acc: Exercise[], ex: Exercise) => {
                const existing = cachedExercises.find(e => e.id === ex.id);
                if (!existing) {
                    acc.push(ex)
                }
                return acc;
            }, cachedExercises);


            setExercises(updatedExercises);
            await storage.saveExercises(updatedExercises);
            return updatedExercises;
        } catch (error) {
            console.error('Failed to sync exercises with remote storage', error);
            return [];
        }
    }, [])

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

    return (
        <ExerciseContext.Provider
            value={{exercises, setExercises, addExercise, deleteExercise, getExerciseById, syncExercisesWithRepo}}>
            {children}
        </ExerciseContext.Provider>
    )
}

