import { describe, it, expect, vi } from 'vitest';
import { FITNESS_TOOLS, executeTool } from '../ai/tools.ts';
import type { ToolContext } from '../ai/tools.ts';
import type { Exercise, WorkoutSession, WorkoutPlan } from '../types/workout.types.ts';

vi.mock('../data/storage.ts', () => ({
  generateId: vi.fn(() => `mock-${Math.random().toString(36).slice(2, 7)}`),
}));

const mockExercises: Exercise[] = [
  { id: 'ex1', name: 'Bench Press', equipment: 'barbell', muscleGroups: ['chest'], category: 'compound' },
  { id: 'ex2', name: 'Squat', equipment: 'barbell', muscleGroups: ['legs'], category: 'compound' },
  { id: 'ex3', name: 'Bicep Curl', equipment: 'dumbbell', muscleGroups: ['biceps'], category: 'isolation' },
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
    savePlan: vi.fn(),
    saveExercise: vi.fn(),
    ...overrides,
  };
}

describe('FITNESS_TOOLS', () => {
  it('has 4 tools defined', () => {
    expect(FITNESS_TOOLS).toHaveLength(4);
  });

  it('includes expected tool names', () => {
    const names = FITNESS_TOOLS.map(t => t.name);
    expect(names).toContain('get_exercise_library');
    expect(names).toContain('get_workout_history');
    expect(names).toContain('get_existing_plans');
    expect(names).toContain('create_workout_plan');
  });

  it('create_workout_plan has required fields', () => {
    const tool = FITNESS_TOOLS.find(t => t.name === 'create_workout_plan')!;
    expect(tool.parameters.required).toContain('name');
    expect(tool.parameters.required).toContain('exercises');
  });
});

describe('executeTool', () => {
  describe('get_exercise_library', () => {
    it('returns all exercises without filter', async () => {
      const result = await executeTool({ name: 'get_exercise_library', arguments: {} }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(3);
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

  describe('create_workout_plan', () => {
    it('creates a plan and calls savePlan', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'New Plan',
          description: 'Test plan',
          exercises: [
            { exerciseId: 'ex1', sets: [{ weight: 80, reps: 8, restSeconds: 90 }] },
          ],
        },
      }, ctx);
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.planName).toBe('New Plan');
      expect(ctx.savePlan).toHaveBeenCalledOnce();
    });

    it('returns error when name is missing', async () => {
      const result = await executeTool({
        name: 'create_workout_plan',
        arguments: { exercises: [] },
      }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });

    it('returns error when exercises is not an array', async () => {
      const result = await executeTool({
        name: 'create_workout_plan',
        arguments: { name: 'Plan', exercises: 'invalid' },
      }, makeCtx());
      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });

    it('uses default set values when not provided', async () => {
      const ctx = makeCtx();
      await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'Default Plan',
          exercises: [{ exerciseId: 'ex1', sets: [{}] }],
        },
      }, ctx);
      const savedPlan = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPlan.exercises[0].sets[0].reps).toBe(10);
      expect(savedPlan.exercises[0].sets[0].restSeconds).toBe(90);
    });

    it('tags plan as KI-generiert', async () => {
      const ctx = makeCtx();
      await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'AI Plan',
          exercises: [{ exerciseId: 'ex1', sets: [{ weight: 60, reps: 10 }] }],
        },
      }, ctx);
      const savedPlan = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPlan.tags).toContain('KI-generiert');
    });

    it('creates a missing exercise from name and links it', async () => {
      const ctx = makeCtx();
      const result = await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'Plan with new exercise',
          exercises: [
            { name: 'Face Pull', muscleGroups: ['shoulders'], equipment: 'cable', sets: [{ reps: 12 }] },
          ],
        },
      }, ctx);
      const parsed = JSON.parse(result);
      expect(parsed.createdExercises).toBe(1);

      const saveExercise = ctx.saveExercise as ReturnType<typeof vi.fn>;
      expect(saveExercise).toHaveBeenCalledOnce();
      const newEx = saveExercise.mock.calls[0][0];
      expect(newEx.name).toBe('Face Pull');
      expect(newEx.muscleGroups).toEqual(['shoulders']);
      expect(newEx.equipment).toBe('cable');

      // The plan must reference the freshly created exercise's id
      const savedPlan = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPlan.exercises[0].exerciseId).toBe(newEx.id);
    });

    it('reuses an existing library exercise matched by name', async () => {
      const ctx = makeCtx();
      await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'Reuse Plan',
          exercises: [{ name: 'bench press', sets: [{ reps: 5 }] }],
        },
      }, ctx);
      expect(ctx.saveExercise).not.toHaveBeenCalled();
      const savedPlan = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPlan.exercises[0].exerciseId).toBe('ex1');
    });

    it('creates an exercise when exerciseId does not exist in the library', async () => {
      const ctx = makeCtx();
      await executeTool({
        name: 'create_workout_plan',
        arguments: {
          name: 'Hallucinated id plan',
          exercises: [{ exerciseId: 'does-not-exist', name: 'Cable Crossover', sets: [{ reps: 12 }] }],
        },
      }, ctx);
      expect(ctx.saveExercise).toHaveBeenCalledOnce();
      const newEx = (ctx.saveExercise as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const savedPlan = (ctx.savePlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPlan.exercises[0].exerciseId).toBe(newEx.id);
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
