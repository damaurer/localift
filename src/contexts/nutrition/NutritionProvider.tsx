import {type ReactNode, useCallback, useState} from "react";
import {NutritionContext} from "./NutritionContext.tsx";
import type {FoodEntry, MealType, NutritionDay, NutritionGoals} from "../../types/nutrition.types.ts";
import {generateId, storage} from "../../storage.ts";

export function NutritionProvider({ children }: { children: ReactNode }) {

    const [nutritionDays, setNutritionDays] = useState<NutritionDay[]>([]);
    const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(() => {
        return {
            calories: 2500,
            protein: 180,
            carbs: 280,
            fat: 75,
            waterMl: 3000,
        };
    });

    const getTodayNutrition = useCallback((): NutritionDay => {
        const today = new Date().toISOString().split('T')[0];
        return nutritionDays.find(d => d.date === today) ?? { date: today, entries: [], waterMl: 0 };
    }, [nutritionDays]);

    const addFoodEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'loggedAt'> & { mealType: MealType }) => {
        const today = new Date().toISOString().split('T')[0];
        const newEntry: FoodEntry = { ...entry, id: generateId(), loggedAt: new Date().toISOString() };
        setNutritionDays(prev => {
            const idx = prev.findIndex(d => d.date === today);
            let next: NutritionDay[];
            if (idx >= 0) {
                next = prev.map((d, i) => i === idx ? { ...d, entries: [...d.entries, newEntry] } : d);
            } else {
                next = [...prev, { date: today, entries: [newEntry], waterMl: 0 }];
            }
            storage.saveNutritionDays(next);
            return next;
        });
    }, []);

    const removeFoodEntry = useCallback((entryId: string) => {
        setNutritionDays(prev => {
            const next = prev.map(d => {
                if(d.entries.some(e => e.id === entryId)) {
                    return { ...d, entries: d.entries.filter(e => e.id !== entryId) }
                }
                return d;
            });
            storage.saveNutritionDays(next);
            return next;
        });
    }, []);

    const updateWater = useCallback((date: string, waterMl: number) => {
        setNutritionDays(prev => {
            const idx = prev.findIndex(d => d.date === date);
            let next: NutritionDay[];
            if (idx >= 0) {
                next = prev.map((d, i) => i === idx ? { ...d, waterMl } : d);
            } else {
                next = [...prev, { date, entries: [], waterMl }];
            }
            storage.saveNutritionDays(next);
            return next;
        });
    }, []);

    const updateNutritionGoals = useCallback((goals: NutritionGoals) => {
        setNutritionGoals(goals);
        storage.saveNutritionGoals(goals);
    }, []);


    return (
        <NutritionContext.Provider value={{
            setNutritionDays, setNutritionGoals,
            nutritionDays, nutritionGoals,
            getTodayNutrition, addFoodEntry, removeFoodEntry, updateWater, updateNutritionGoals
        }}>
            {children}
        </NutritionContext.Provider>
    )
}