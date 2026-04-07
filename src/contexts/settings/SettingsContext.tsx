import type {AppSettings} from "../../types/app.types.ts";
import type {Exercise, WorkoutPlan, WorkoutSession} from "../../types/workout.types.ts";
import {createContext, useContext} from "react";

export interface SettingsContextValue {
    settings: AppSettings;
    updateSettings: (patch: Partial<AppSettings>) => void;
    clearAllData: () => void;
    importBackup: (data: {
        plans?: WorkoutPlan[];
        sessions?: WorkoutSession[];
        exercises?: Exercise[];
        exportDate?: string;
    }) => void;
}


export const SettingContext = createContext<SettingsContextValue | null>(null);

export function useSettingsContext() {
    const context = useContext(SettingContext);
    if (!context) {
        throw new Error('useSettingsContext must be used within an SettingsProvider');
    }
    return context;
}