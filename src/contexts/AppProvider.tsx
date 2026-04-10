import type {ReactNode} from "react";
import {ExerciseProvider} from "./exercise/ExerciseProvider.tsx";
import {SettingsProvider} from "./settings/SettingsProvider.tsx";
import {PlanProvider} from "./plan/PlanProvider.tsx";
import {WorkoutProvider} from "./workout/WorkoutProvider.tsx";
import {NutritionProvider} from "./nutrition/NutritionProvider.tsx";
import {AiProvider} from "./ai/AiProvider.tsx";

export function AppProvider({children}: { children: ReactNode }) {
    return (
        <ExerciseProvider>
            <PlanProvider>
                <WorkoutProvider>
                    <NutritionProvider>
                        <SettingsProvider>
                            {/* AiProvider is innermost so it can access all other contexts */}
                            <AiProvider>
                                {children}
                            </AiProvider>
                        </SettingsProvider>
                    </NutritionProvider>
                </WorkoutProvider>
            </PlanProvider>
        </ExerciseProvider>
    )
}