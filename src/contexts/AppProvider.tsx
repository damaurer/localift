import type {ReactNode} from "react";
import {ExerciseProvider} from "./exercise/ExerciseProvider.tsx";
import {SettingsProvider} from "./settings/SettingsProvider.tsx";
import {PlanProvider} from "./plan/PlanProvider.tsx";
import {WorkoutProvider} from "./workout/WorkoutProvider.tsx";
import {NutritionProvider} from "./nutrition/NutritionProvider.tsx";
import {AiProvider} from "./ai/AiProvider.tsx";
import {I18nProvider} from "../i18n/I18nContext.tsx";
import {useSettingsContext} from "./settings/SettingsContext.tsx";

function I18nBridge({children}: { children: ReactNode }) {
    const {settings} = useSettingsContext();
    return <I18nProvider language={settings.language}>{children}</I18nProvider>;
}

export function AppProvider({children}: { children: ReactNode }) {
    return (
        <ExerciseProvider>
            <PlanProvider>
                <WorkoutProvider>
                    <NutritionProvider>
                        <SettingsProvider>
                            <I18nBridge>
                                <AiProvider>
                                    {children}
                                </AiProvider>
                            </I18nBridge>
                        </SettingsProvider>
                    </NutritionProvider>
                </WorkoutProvider>
            </PlanProvider>
        </ExerciseProvider>
    )
}