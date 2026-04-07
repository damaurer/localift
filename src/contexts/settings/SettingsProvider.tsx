import {type ReactNode, useCallback, useEffect, useState} from "react";
import type {AppSettings} from "../../types/app.types.ts";
import type {Exercise, WorkoutPlan, WorkoutSession} from "../../types/workout.types.ts";
import {storage} from "../../storage.ts";
import {clearReminders, scheduleReminder} from "../../notifications.ts";
import {useExerciseContext} from "../exercise/ExerciseContext.tsx";
import {usePlanContext} from "../plan/PlanContext.tsx";
import {useWorkoutContext} from "../workout/WorkoutContext.tsx";
import {SettingContext} from "./SettingsContext.tsx";
import {useNutritionContext} from "../nutrition/NutritionContext.tsx";

export function SettingsProvider({children}: { children: ReactNode }) {
    const {setExercises, syncExercisesWithRepo} = useExerciseContext()
    const {setPlans} = usePlanContext()
    const {setSessions, setActiveWorkout} = useWorkoutContext()
    const {setNutritionDays, setNutritionGoals} = useNutritionContext()

    const [settings, setSettings] = useState<AppSettings>({
            weightUnit: 'kg',
            reminderEnabled: false,
            reminderTime: '07:00',
            reminderDays: [true, true, true, true, true, false, false],
            vibration: true,
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

                syncExercisesWithRepo();
            } catch (error) {
                console.error('Failed to load storage data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadInitialData();
    }, []);

    const updateSettings = useCallback((patch: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = {...prev, ...patch};
            storage.saveSettings(next);
            if (next.reminderEnabled) {
                scheduleReminder(next.reminderTime, next.reminderDays);
            } else {
                clearReminders();
            }
            return next;
        });
    }, []);

    const clearAllData = useCallback(async () => {
        storage.clearAll();
        setExercises([]);
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

    const importBackup = useCallback((data: {
        plans?: WorkoutPlan[];
        sessions?: WorkoutSession[];
        exercises?: Exercise[];
        exportDate?: string;
    }) => {
        setExercises(prev => {
            const incoming = Array.isArray(data.exercises) ? data.exercises : [];
            const nextById = new Map(prev.map(ex => [ex.id, ex]));
            incoming.forEach(ex => nextById.set(ex.id, ex));
            const next = Array.from(nextById.values());
            storage.saveExercises(next);
            return next;
        });

        setPlans(prev => {
            const incoming = Array.isArray(data.plans) ? data.plans : [];
            const nextById = new Map(prev.map(plan => [plan.id, plan]));
            incoming.forEach(plan => nextById.set(plan.id, plan));
            const next = Array.from(nextById.values());
            storage.savePlans(next);
            return next;
        });

        setSessions(prev => {
            const incoming = Array.isArray(data.sessions) ? data.sessions : [];
            const nextById = new Map(prev.map(session => [session.id, session]));
            incoming.forEach(session => nextById.set(session.id, session));
            const next = Array.from(nextById.values());
            storage.saveSessions(next);
            return next;
        });
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }


    return (
        <SettingContext.Provider value={{settings, updateSettings, clearAllData, importBackup}}>
            {children}
        </SettingContext.Provider>
    )
}

