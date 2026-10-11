import { beforeEach, describe, it, expect, vi } from 'vitest';
import { FITNESS_TOOLS, executeTool } from '../ai/tools.ts';
import type { ToolContext } from '../ai/tools.ts';
import type { Exercise, WorkoutSession, WorkoutPlan } from '../types/workout.types.ts';

vi.mock('../data/storage.ts', () => ({
  generateId: vi.fn(() => `mock-${Math.random().toString(36).slice(2, 7)}`),
}));

const generateWorkoutPlan = vi.hoisted(() => vi.fn());
vi.mock('../ai/plan-generator.ts', () => ({ generateWorkoutPlan }));

const mockExercises: Exercise[] = [
  { id: 'ex1', name: 'Bench Press', equipment: 'barbell', muscleGroups: ['chest'], category: 'compound' },
  { id: 'ex2', name: 'Squat', equipment: 'barbell', muscleGroups: ['legs'], category: 'compound' },
  { id: 'ex3', name: 'Bicep Curl', equipment: 'dumbbell', muscleGroups: ['biceps'], category: 'isolation' },
  { id: 'ex4', name: 'Cable Row', equipment: 'cable', muscleGroups: ['back', 'biceps'], category: 'pull', tags: ['row'] },
];

const mockSessions: WorkoutSession[] = [
  {
    id: 's1', planId: 'p1', planName: 'Push', startedAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T11:00:00Z', durationSeconds: 3600,
    exercises: [{
      exerciseId: 'ex1', exerciseName: 'Bench Press',
      loggedSets: [{ weight: 80, reps: 8, completedAt: '2024-01-01T10:05:00Z' }],
    }],
  },
];

const mockPlans: WorkoutPlan[] = [
  {
    id: 'p1', name: 'Push', description: 'Push day', tags: [], exercises: [],
    estimatedDuration: 60, createdAt: '2024-01-01', updatedAt: '2024-01-01',
  },
];

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
  return {
    exercises: mockExercises,
    sessions: mockSessions,
    plans: mockPlans,
    savePlan: vi.fn((plan) => plan.id ?? 'new-plan-id'),
    saveExercise: vi.fn(),
    addExerciseToPlan: vi.fn(() => 'pe1'),
    updatePlanExerciseSets: vi.fn(),
    getPlanById: vi.fn((id: string) => mockPlans.find(p => p.id === id)),
    ...overrides,
  };
}

describe('FITNESS_TOOLS', () => {
  it('has 6 tools defined', () => {
    expect(FITNESS_TOOLS).toHaveLength(6);
  });

  it('includes expected tool names', () => {
    const names = FITNESS_TOOLS.map(t => t.name);
    expect(names).toContain('get_exercise_library');
    expect(names).toContain('create_exercise');
    expect(names).toContain('get_workout_history');
    expect(names).toContain('get_existing_plans');
    expect(names).toContain('generate_workout_plan');
    expect(names).toContain('add_exercise_to_plan');
  });

  it('generate_workout_plan only requires the goal', () => {
    const tool = FITNESS_TOOLS.find(t => t.name === 'generate_workout_plan')!;
    expect(tool.parameters.required).toEqual(['goal']);
  });

  it('add_exercise_to_plan requires planId', () => {
    const tool = FITNESS_TOOLS.find(t => t.name === 'add_exercise_to_plan')!;
    expect(tool.parameters.required).toContain('planId');
  });
});

describe('executeTool', () => {
  describe('get_exercise_library', () => {
    it('returns all exercises without filter', async () => {
      const result = await executeTool({ name: 'get_exercise_library', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(4);
      expect(parsed[0]).toHaveProperty('id', 'ex1');
    });

    it('filters by muscle group', async () => {
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: { muscleGroup: 'chest' } },
        makeCtx(),
      );
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Bench Press');
    });

    it('filters by search query', async () => {
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: { query: 'row' } },
        makeCtx(),
      );
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Cable Row');
    });

    it('combines muscle group and equipment filters', async () => {
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: { muscleGroup: 'biceps', equipment: 'cable' } },
        makeCtx(),
      );
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Cable Row');
    });

    it('respects a custom search limit', async () => {
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: { query: 'compound', limit: 1 } },
        makeCtx(),
      );
      expect(JSON.parse(result)).toHaveLength(1);
    });

    it('returns empty array for non-matching filter', async () => {
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: { muscleGroup: 'glutes' } },
        makeCtx(),
      );
      expect(JSON.parse(result)).toHaveLength(0);
    });

    it('limits to 50 exercises', async () => {
      const manyExercises = Array.from({ length: 60 }, (_, i) => ({
        id: `ex${i}`, name: `Ex ${i}`, equipment: 'barbell' as const,
        muscleGroups: ['chest' as const], category: 'compound',
      }));
      const result = await executeTool(
        { name: 'get_exercise_library', arguments: {} },
        makeCtx({ exercises: manyExercises }),
      );
      expect(JSON.parse(result)).toHaveLength(50);
    });

    it('matches English muscle groups against the German library names', async () => {
      const german = [
        { id: 'g1', name: 'Bankdrücken', equipment: 'barbell', muscleGroups: ['Brust', 'Trizeps'], category: 'Drücken' },
        { id: 'g2', name: 'Kniebeuge', equipment: 'barbell', muscleGroups: ['Oberschenkel', 'Gesäß'], category: 'Beine' },
      ] as unknown as Exercise[];
      const ctx = makeCtx({ exercises: german });

      const chest = JSON.parse(await executeTool({ name: 'get_exercise_library', arguments: { muscleGroup: 'chest' } }, ctx));
      expect(chest.map((e: Exercise) => e.id)).toEqual(['g1']);

      const legs = JSON.parse(await executeTool({ name: 'get_exercise_library', arguments: { muscleGroup: 'Oberschenkel' } }, ctx));
      expect(legs.map((e: Exercise) => e.id)).toEqual(['g2']);
    });

    it('matches multi-word queries word by word and ranks by matches', async () => {
      const result = JSON.parse(await executeTool(
        { name: 'get_exercise_library', arguments: { query: 'row back cable' } },
        makeCtx(),
      ));
      expect(result[0].name).toBe('Cable Row');
      expect(result.map((e: Exercise) => e.name)).not.toContain('Squat');
    });

    it('finds push exercises in the bundled exercises.json', async () => {
      const { readFileSync } = await import('node:fs');
      const bundled = JSON.parse(readFileSync('public/exercises.json', 'utf8')).exercises as Exercise[];
      const ctx = makeCtx({ exercises: bundled });

      const chest = JSON.parse(await executeTool({ name: 'get_exercise_library', arguments: { muscleGroup: 'chest' } }, ctx));
      expect(chest.length).toBeGreaterThan(0);

      const push = JSON.parse(await executeTool(
        { name: 'get_exercise_library', arguments: { query: 'push chest shoulders triceps' } },
        ctx,
      ));
      expect(push.length).toBeGreaterThan(5);
    });
  });

  describe('create_exercise', () => {
    it('creates a custom exercise', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'create_exercise',
        arguments: {
          name: 'Bulgarian Split Squat',
          muscleGroups: ['legs', 'glutes', 'invalid'],
          equipment: 'dumbbell',
          category: 'Legs',
          tags: ['unilateral'],
          description: 'Rear foot elevated split squat.',
        },
      }, ctx);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe(true);
      expect(ctx.saveExercise).toHaveBeenCalledOnce();
      const saved = (ctx.saveExercise as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.name).toBe('Bulgarian Split Squat');
      expect(saved.muscleGroups).toEqual(['legs', 'glutes']);
      expect(saved.equipment).toBe('dumbbell');
    });

    it('reuses an existing exercise by name', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'create_exercise',
        arguments: { name: 'bench press' },
      }, ctx);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe(false);
      expect(parsed.exerciseId).toBe('ex1');
      expect(ctx.saveExercise).not.toHaveBeenCalled();
    });

    it('returns error when name is missing', async () => {
      const result = await executeTool({
        name: 'create_exercise',
        arguments: { equipment: 'cable' },
      }, makeCtx());
      expect(JSON.parse(result).error).toBeDefined();
    });
  });

  describe('get_workout_history', () => {
    it('returns sessions with default limit', async () => {
      const result = await executeTool({ name: 'get_workout_history', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].planName).toBe('Push');
    });

    it('respects limit parameter', async () => {
      const result = await executeTool(
        { name: 'get_workout_history', arguments: { limit: 1 } },
        makeCtx(),
      );
      expect(JSON.parse(result)).toHaveLength(1);
    });

    it('caps limit at 20', async () => {
      const manySessions = Array.from({ length: 25 }, (_, i) => ({
        id: `s${i}`, planId: 'p1', planName: 'Plan', startedAt: '2024-01-01',
        completedAt: '2024-01-01', durationSeconds: 3600, exercises: [],
      }));
      const result = await executeTool(
        { name: 'get_workout_history', arguments: { limit: 100 } },
        makeCtx({ sessions: manySessions }),
      );
      expect(JSON.parse(result)).toHaveLength(20);
    });

    it('calculates total volume per exercise', async () => {
      const result = await executeTool({ name: 'get_workout_history', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed[0].exercises[0].totalVolumeKg).toBe(640); // 80 * 8
    });
  });

  describe('get_existing_plans', () => {
    it('returns plan summaries', async () => {
      const result = await executeTool({ name: 'get_existing_plans', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Push');
      expect(parsed[0]).toHaveProperty('exerciseCount');
    });
  });

  describe('generate_workout_plan', () => {
    beforeEach(() => generateWorkoutPlan.mockReset());

    it('generates the whole plan in one call and saves it', async () => {
      generateWorkoutPlan.mockResolvedValueOnce({
        name: 'Push A',
        description: 'Brust, Schultern, Trizeps',
        exercises: [
          { exerciseId: 'ex1', sets: 4, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex3', sets: 3, reps: 12, restSeconds: 60 },
        ],
      });
      const ctx = makeCtx();
      const result = JSON.parse(await executeTool({
        name: 'generate_workout_plan',
        arguments: { goal: 'Push-Tag', muscleGroups: ['chest'], equipment: ['barbell'], exerciseCount: 2 },
      }, ctx));

      expect(generateWorkoutPlan).toHaveBeenCalledWith(
        { goal: 'Push-Tag', muscleGroups: ['chest'], equipment: ['barbell'], exerciseCount: 2 },
        mockExercises,
      );
      expect(result).toMatchObject({ success: true, planName: 'Push A', exercises: ['Bench Press 4x8', 'Bicep Curl 3x12'] });

      const saved = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.tags).toContain('KI-generiert');
      expect(saved.exercises.map((e: { exerciseId: string }) => e.exerciseId)).toEqual(['ex1', 'ex3']);
      expect(saved.exercises[0].sets).toHaveLength(4);
      expect(saved.exercises[0].sets[0]).toMatchObject({ reps: 8, restSeconds: 120 });
    });

    it('returns an error when the goal is missing', async () => {
      const result = JSON.parse(await executeTool({ name: 'generate_workout_plan', arguments: {} }, makeCtx()));
      expect(result.error).toBeDefined();
      expect(generateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('reports generator failures as tool errors', async () => {
      generateWorkoutPlan.mockRejectedValueOnce(new Error('kaputt'));
      const ctx = makeCtx();
      const result = JSON.parse(await executeTool({ name: 'generate_workout_plan', arguments: { goal: 'Beine' } }, ctx));
      expect(result.error).toContain('kaputt');
      expect(ctx.savePlan).not.toHaveBeenCalled();
    });
  });

  describe('add_exercise_to_plan', () => {
    it('adds an existing library exercise and sets its sets', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'add_exercise_to_plan',
        arguments: { planId: 'p1', exerciseId: 'ex1', sets: [{ weight: 80, reps: 8 }] },
      }, ctx);
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.added).toBe('Bench Press');
      expect(parsed.exerciseCount).toBe(1); // mock plan started with 0 exercises
      expect(ctx.addExerciseToPlan).toHaveBeenCalledWith('p1', 'ex1');
      expect(ctx.updatePlanExerciseSets).toHaveBeenCalledOnce();
      const setsArg = (ctx.updatePlanExerciseSets as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(setsArg[0].weight).toBe(80);
      expect(setsArg[0].reps).toBe(8);
    });

    it('creates a missing exercise from name and links it', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'add_exercise_to_plan',
        arguments: {
          planId: 'p1', name: 'Face Pull', muscleGroups: ['shoulders'],
          equipment: 'cable', sets: [{ reps: 12 }],
        },
      }, ctx);
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.added).toBe('Face Pull');
      expect(parsed.createdExercise).toBe(true);
      expect(ctx.saveExercise).toHaveBeenCalledOnce();
    });

    it('returns error when planId is missing', async () => {
      const result = await executeTool({
        name: 'add_exercise_to_plan', arguments: { exerciseId: 'ex1' },
      }, makeCtx());
      expect(JSON.parse(result).error).toBeDefined();
    });

    it('returns error when neither exerciseId nor name is given', async () => {
      const result = await executeTool({
        name: 'add_exercise_to_plan', arguments: { planId: 'p1' },
      }, makeCtx());
      expect(JSON.parse(result).error).toBeDefined();
    });

    it('returns error when the plan does not exist', async () => {
      const result = await executeTool({
        name: 'add_exercise_to_plan', arguments: { planId: 'nope', exerciseId: 'ex1' },
      }, makeCtx({ getPlanById: () => undefined }));
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain('Kein Plan');
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const result = await executeTool({ name: 'unknown_tool', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain('Unbekanntes Tool');
    });
  });
});
