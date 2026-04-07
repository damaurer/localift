import type {FoodEntry, MealType, NutritionDay, NutritionGoals} from "../../types/nutrition.types.ts";
import {createContext, type Dispatch, type SetStateAction, useContext} from "react";

export interface NutritionContextValue {
    nutritionDays: NutritionDay[];
    setNutritionDays: Dispatch<SetStateAction<NutritionDay[]>>;
    nutritionGoals: NutritionGoals;
    setNutritionGoals: Dispatch<SetStateAction<NutritionGoals>>;
    getTodayNutrition: () => NutritionDay;
    addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'loggedAt'> & { mealType: MealType }) => void;
    removeFoodEntry: (entryId: string) => void;
    updateWater: (date: string, waterMl: number) => void;
    updateNutritionGoals: (goals: NutritionGoals) => void;
}

export const NutritionContext = createContext<NutritionContextValue | null>(null);

export function useNutritionContext() {
    const context = useContext(NutritionContext);
    if (!context) {
        throw new Error('useNutritionContext must be used within an NutritionProvider');
    }
    return context;
}