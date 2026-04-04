export type MealType = 'fruehstueck' | 'mittagessen' | 'abendessen' | 'snack';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
  mealType: MealType;
}

export interface NutritionDay {
  date: string; // YYYY-MM-DD
  entries: FoodEntry[];
  waterMl: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}
