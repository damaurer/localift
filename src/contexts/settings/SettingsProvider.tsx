import {type ReactNode, useCallback} from "react";
import type {AppSettings} from "../../types/app.types.ts";
import type {Exercise, WorkoutPlan, WorkoutSession} from "../../types/workout.types.ts";
import {storage} from "../../data/storage.ts";
import {clearReminders, scheduleReminder} from "../../notifications.ts";
import {useExerciseContext} from "../exercise/ExerciseContext.tsx";
import {usePlanContext} from "../plan/PlanContext.tsx";
import {useWorkoutContext} from "../workout/WorkoutContext.tsx";
import {SettingContext} from "./SettingsContext.tsx";
import {useNutritionContext} from "../nutrition/NutritionContext.tsx";
import {useState} from "react";
import {DEFAULT_MODEL_URL} from "../../ai/wllama-config.ts";

export function SettingsProvider({children}: { children: ReactNode }) {
    const {setExercises} = useExerciseContext()
    const {setPlans} = usePlanContext()
    const {setSessions, setActiveWorkout} = useWorkoutContext()
    const {setNutritionDays, setNutritionGoals} = useNutritionContext()

    const [settings, setSettings] = useState<AppSettings>(() => storage.getSettingsSync());

    const clearAllData = useCallback(async () => {
        await storage.clearAll();
        setExercises([]);
        setPlans([]);
        setSessions([]);
        setActiveWorkout(null);
        setNutritionDays([]);
        setNutritionGoals({
            calories: 2500,
            protein: 180,
            carbs: 280,
            fat: 75,
            waterMl: 3000,
        });
        setSettings({
            weightUnit: 'kg',
            reminderEnabled: false,
            reminderTime: '07:00',
            reminderDays: [true, true, true, true, true, false, false],
            vibration: true,
            aiTrainer: {
                enabled: false,
                modelUrl:
                    DEFAULT_MODEL_URL,
            },
        });
    }, [setExercises, setPlans, setSessions, setActiveWorkout, setNutritionDays, setNutritionGoals]);

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
    }, [setExercises, setPlans, setSessions]);

    return (
        <SettingContext.Provider value={{settings, updateSettings, clearAllData, importBackup}}>
            {children}
        </SettingContext.Provider>
    )
}

