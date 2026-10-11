// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExerciseContext } from '../contexts/exercise/ExerciseContext.tsx';
import { usePlanContext } from '../contexts/plan/PlanContext.tsx';
import { useWorkoutContext } from '../contexts/workout/WorkoutContext.tsx';
import { useNutritionContext } from '../contexts/nutrition/NutritionContext.tsx';
import { useSettingsContext } from '../contexts/settings/SettingsContext.tsx';
import { useAiContext } from '../contexts/ai/AiContext.tsx';
import { useLayoutContext } from '../contexts/LayoutContext.tsx';

describe('Context hooks throw without provider', () => {
  it('useExerciseContext throws', () => {
    expect(() => renderHook(() => useExerciseContext())).toThrow('useExerciseContext must be used within an ExerciseProvider');
  });

  it('usePlanContext throws', () => {
    expect(() => renderHook(() => usePlanContext())).toThrow('usePlanContext must be used within a PlanProvider');
  });

  it('useWorkoutContext throws', () => {
    expect(() => renderHook(() => useWorkoutContext())).toThrow('useWorkoutContext must be used within a WorkoutProvider');
  });

  it('useNutritionContext throws', () => {
    expect(() => renderHook(() => useNutritionContext())).toThrow('useNutritionContext must be used within a NutritionProvider');
  });

  it('useSettingsContext throws', () => {
    expect(() => renderHook(() => useSettingsContext())).toThrow('useSettingsContext must be used within a SettingsProvider');
  });

  it('useAiContext throws', () => {
    expect(() => renderHook(() => useAiContext())).toThrow('useAiContext must be used inside AiProvider');
  });

  it('useLayoutContext throws', () => {
    expect(() => renderHook(() => useLayoutContext())).toThrow('useLayoutContext must be used within a Layout');
  });
});
