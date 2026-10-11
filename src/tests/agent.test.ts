import { beforeEach, describe, it, expect, vi } from 'vitest';
import { extractToolCall } from '../ai/tool-parsing.ts';
import { runAgent } from '../ai/agent.ts';
import type { ToolContext } from '../ai/tools.ts';

const completionQueue = vi.hoisted(() => ({
  values: [] as string[],
}));

vi.mock('../ai/wllama-service.ts', () => ({
  runCompletion: vi.fn(async (_prompt: string, options?: {
    onToken?: (piece: string, fullText: string) => boolean | void;
  }) => {
    const text = completionQueue.values.shift() ?? 'Fertig.';
    options?.onToken?.(text, text);
    return text;
  }),
}));

vi.mock('../data/storage.ts', () => ({
  generateId: vi.fn(() => 'mock-message-id'),
}));

beforeEach(() => {
  completionQueue.values = [];
  vi.clearAllMocks();
});

describe('extractToolCall', () => {
  it('parses a properly tagged tool call', () => {
    const r = extractToolCall('<tool_call>{"name":"get_exercise_library","arguments":{}}</tool_call>');
    expect(r).toEqual({ name: 'get_exercise_library', arguments: {} });
  });

  it('parses a tool call wrapped in a ```json fence', () => {
    const text = 'Hier:\n```json\n{"name":"create_workout_plan","arguments":{"name":"Push"}}\n```';
    expect(extractToolCall(text)).toEqual({
      name: 'create_workout_plan',
      arguments: { name: 'Push' },
    });
  });

  it('parses bare JSON without any wrapper (common small-model output)', () => {
    const r = extractToolCall('{"name":"add_exercise_to_plan","arguments":{"planId":"p1","exerciseId":"ex1"}}');
    expect(r?.name).toBe('add_exercise_to_plan');
    expect(r?.arguments).toEqual({ planId: 'p1', exerciseId: 'ex1' });
  });

  it('defaults arguments to {} when missing', () => {
    expect(extractToolCall('{"name":"get_existing_plans"}')).toEqual({
      name: 'get_existing_plans',
      arguments: {},
    });
  });

  it('handles nested braces in arguments', () => {
    const r = extractToolCall(
      '<tool_call>{"name":"add_exercise_to_plan","arguments":{"planId":"p1","sets":[{"weight":80,"reps":8}]}}</tool_call>',
    );
    expect(r?.name).toBe('add_exercise_to_plan');
    expect((r?.arguments as { sets: unknown[] }).sets).toHaveLength(1);
  });

  it('ignores braces inside string values', () => {
    const r = extractToolCall('{"name":"create_workout_plan","arguments":{"name":"Plan {A}"}}');
    expect((r?.arguments as { name: string }).name).toBe('Plan {A}');
  });

  it('returns null for plain prose', () => {
    expect(extractToolCall('Das ist nur eine normale Antwort ohne Tool.')).toBeNull();
  });

  it('returns null for a truncated (unbalanced) JSON object', () => {
    expect(extractToolCall('{"name":"create_workout_plan","arguments":{"name":"Pu')).toBeNull();
  });
});

describe('runAgent', () => {
  it('guards against repeated identical get_exercise_library calls', async () => {
    completionQueue.values = [
      '<tool_call>{"name":"get_exercise_library","arguments":{}}</tool_call>',
      '<tool_call>{"name":"get_exercise_library","arguments":{}}</tool_call>',
      'Fertig.',
    ];

    const callbacks = {
      onVisibleToken: vi.fn(),
      onToolStart: vi.fn(),
      onToolDone: vi.fn(),
    };
    const ctx: ToolContext = {
      exercises: [
        { id: 'ex1', name: 'Bench Press', equipment: 'barbell', muscleGroups: ['chest'], category: 'compound' },
      ],
      sessions: [],
      plans: [],
      savePlan: vi.fn(() => 'plan-id'),
      saveExercise: vi.fn(),
      addExerciseToPlan: vi.fn(() => 'plan-exercise-id'),
      updatePlanExerciseSets: vi.fn(),
      getPlanById: vi.fn(),
    };

    const result = await runAgent('Erstelle einen Plan', [], ctx, callbacks);

    expect(result.message.content).toBe('Fertig.');
    expect(result.message.toolInvocations).toEqual([
      { name: 'get_exercise_library', success: true },
      { name: 'get_exercise_library', success: false },
    ]);
    expect(callbacks.onToolStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onToolDone).toHaveBeenNthCalledWith(1, 'get_exercise_library', true);
    expect(callbacks.onToolDone).toHaveBeenNthCalledWith(2, 'get_exercise_library', false);
  });
});
