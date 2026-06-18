// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext.tsx';
import { LayoutContext } from '../contexts/LayoutContext.tsx';
import { PlanContext } from '../contexts/plan/PlanContext.tsx';
import type { PlanContextValue } from '../contexts/plan/PlanContext.tsx';
import { ExerciseContext } from '../contexts/exercise/ExerciseContext.tsx';
import type { ExerciseContextValue } from '../contexts/exercise/ExerciseContext.tsx';
import type { Exercise } from '../types/workout.types.ts';
import { WorkoutContext } from '../contexts/workout/WorkoutContext.tsx';
import type { WorkoutContextValue } from '../contexts/workout/WorkoutContext.tsx';
import { SettingContext } from '../contexts/settings/SettingsContext.tsx';
import type { SettingsContextValue } from '../contexts/settings/SettingsContext.tsx';
import PlanDetail from '../screens/PlanDetail.tsx';

const mockExercises = [
  {
    id: 'ex1',
    name: 'Bankdrücken',
    category: 'Brust',
    equipment: 'barbell' as const,
    muscleGroups: ['Brust', 'Trizeps'],
    description: '',
    tags: [],
  },
];

function createWrapper(path = '/plans/new') {
  const planCtx: PlanContextValue = {
    plans: [],
    setPlans: vi.fn(),
    savePlan: vi.fn().mockReturnValue('plan-1'),
    deletePlan: vi.fn(),
    getPlanById: vi.fn(),
    updatePlanExerciseSets: vi.fn(),
    addExerciseToPlan: vi.fn(),
    removeExerciseFromPlan: vi.fn(),
    reorderPlanExercises: vi.fn(),
  };

  const exerciseCtx: ExerciseContextValue = {
    exercises: mockExercises as Exercise[],
    setExercises: vi.fn(),
    addExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
    getExerciseById: (id: string) => mockExercises.find(e => e.id === id) as Exercise | undefined,
    syncExercisesWithRepo: vi.fn().mockResolvedValue([]),
    importExercises: vi.fn().mockResolvedValue(undefined),
  };

  const workoutCtx: WorkoutContextValue = {
    sessions: [],
    setSessions: vi.fn(),
    activeWorkout: null,
    setActiveWorkout: vi.fn(),
    startWorkout: vi.fn(),
    updateActiveSet: vi.fn(),
    completeSet: vi.fn(),
    setExpandedExercise: vi.fn(),
    finishWorkout: vi.fn(),
    cancelWorkout: vi.fn(),
    getSessionById: vi.fn(),
  };

  const settingsCtx: SettingsContextValue = {
    settings: {
      weightUnit: 'kg',
      language: 'de',
      theme: 'dark',
      reminderEnabled: false,
      reminderTime: '09:00',
      reminderDays: [false, false, false, false, false, false, false],
      vibration: true,
      aiTrainer: { enabled: false, modelUrl: '' },
    },
    updateSettings: vi.fn(),
    clearAllData: vi.fn(),
    importBackup: vi.fn(),
  };

  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider language="de">
        <LayoutContext.Provider value={{ setHeaderConfig: vi.fn() }}>
          <SettingContext.Provider value={settingsCtx}>
            <PlanContext.Provider value={planCtx}>
              <ExerciseContext.Provider value={exerciseCtx}>
                <WorkoutContext.Provider value={workoutCtx}>
                  <Routes>
                    <Route path="/plans/:planId" element={children} />
                  </Routes>
                </WorkoutContext.Provider>
              </ExerciseContext.Provider>
            </PlanContext.Provider>
          </SettingContext.Provider>
        </LayoutContext.Provider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('PlanDetail – Two-section layout', () => {
  it('shows step 1 and step 2 indicators', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    expect(screen.getByText(/Schritt 1/i)).toBeDefined();
    expect(screen.getByText(/Schritt 2/i)).toBeDefined();
  });

  it('shows the lock overlay on exercises section when name is empty', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    expect(screen.getByText(/Plannamen ein, um Übungen freizuschalten/i)).toBeDefined();
  });

  it('exercises section is visually locked (pointer-events-none) when name is empty', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const section = screen.getByTestId('step-exercises');
    expect(section.className).toContain('pointer-events-none');
  });

  it('removes the lock overlay after entering a plan name', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const nameInput = screen.getByPlaceholderText('MEIN PLAN');
    fireEvent.change(nameInput, { target: { value: 'Push Day' } });

    expect(screen.queryByText(/Plannamen ein, um Übungen freizuschalten/i)).toBeNull();
    const section = screen.getByTestId('step-exercises');
    expect(section.className).not.toContain('pointer-events-none');
  });

  it('shows check_circle on step 1 after name is entered', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    // No checkmark initially
    expect(screen.queryByText('check_circle')).toBeNull();

    const nameInput = screen.getByPlaceholderText('MEIN PLAN');
    fireEvent.change(nameInput, { target: { value: 'Leg Day' } });

    expect(screen.getByText('check_circle')).toBeDefined();
  });

  it('disables the add-exercise button when plan name is empty', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const addBtn = screen.getByRole('button', { name: /Übung hinzufügen/i });
    expect((addBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables the add-exercise button after entering a plan name', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const nameInput = screen.getByPlaceholderText('MEIN PLAN');
    fireEvent.change(nameInput, { target: { value: 'Mein Trainingsplan' } });

    const addBtn = screen.getByRole('button', { name: /Übung hinzufügen/i });
    expect((addBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not open the exercise picker when clicking add-exercise with empty name', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const addBtn = screen.getByRole('button', { name: /Übung hinzufügen/i });
    fireEvent.click(addBtn);

    expect(screen.queryByText(/Übung wählen/i)).toBeNull();
  });

  it('opens the exercise picker when clicking add-exercise with a name entered', () => {
    const Wrapper = createWrapper();
    render(<PlanDetail />, { wrapper: Wrapper });

    const nameInput = screen.getByPlaceholderText('MEIN PLAN');
    fireEvent.change(nameInput, { target: { value: 'Push Day' } });

    const addBtn = screen.getByRole('button', { name: /Übung hinzufügen/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Übung wählen/i)).toBeDefined();
  });
});
