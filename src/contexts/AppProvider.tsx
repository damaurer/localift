import type {ReactNode} from "react";
import {ExerciseProvider} from "./exercise/ExerciseProvider.tsx";
import {SettingsProvider} from "./settings/SettingsProvider.tsx";
import {PlanProvider} from "./plan/PlanProvider.tsx";
import {WorkoutProvider} from "./workout/WorkoutProvider.tsx";
import {NutritionProvider} from "./nutrition/NutritionProvider.tsx";

export function AppProvider({children}: { children: ReactNode }) {
    return (
        <ExerciseProvider>
            <PlanProvider>
                <WorkoutProvider>
                    <NutritionProvider>
                        <SettingsProvider>
                            {children}
                        </SettingsProvider>
                    </NutritionProvider>
                </WorkoutProvider>
            </PlanProvider>
        </ExerciseProvider>
    )
}