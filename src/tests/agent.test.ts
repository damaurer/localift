import { beforeEach, describe, it, expect, vi } from 'vitest';
import { extractToolCall } from '../ai/tool-parsing.ts';
import { runAgent } from '../ai/agent.ts';
import type { ToolContext } from '../ai/tools.ts';

const completionQueue = vi.hoisted(() => ({
  values: [] as (string | { text?: string; toolCalls: { name: string; arguments: Record<string, unknown> }[] })[],
  messages: [] as unknown[][],
  toolsPassed: [] as boolean[],
  failNativeOnce: false,
}));

vi.mock('../ai/wllama-service.ts', () => ({
  NativeToolsUnsupportedError: class NativeToolsUnsupportedError extends Error {},
  supportsNativeTools: () => true,
  runChatCompletion: vi.fn(async (messages: unknown[], options?: {
    tools?: unknown[];
    onToken?: (piece: string, fullText: string) => boolean | void;
  }) => {
    completionQueue.messages.push(structuredClone(messages));
    completionQueue.toolsPassed.push(Boolean(options?.tools?.length));
    if (completionQueue.failNativeOnce && options?.tools?.length) {
      completionQueue.failNativeOnce = false;
      const { NativeToolsUnsupportedError } = await import('../ai/wllama-service.ts');
      throw new NativeToolsUnsupportedError();
    }
    const next = completionQueue.values.shift() ?? 'Fertig.';
    const result = typeof next === 'string' ? { text: next, toolCalls: [] } : { text: next.text ?? '', toolCalls: next.toolCalls };
    if (result.text) options?.onToken?.(result.text, result.text);
    return result;
  }),
}));

vi.mock('../data/storage.ts', () => ({
  generateId: vi.fn(() => 'mock-message-id'),
}));

beforeEach(() => {
  completionQueue.values = [];
  completionQueue.messages = [];
  completionQueue.toolsPassed = [];
  completionQueue.failNativeOnce = false;
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

  it('executes natively parsed tool calls and feeds results back as tool messages', async () => {
    completionQueue.values = [
      { toolCalls: [{ name: 'get_exercise_library', arguments: { muscleGroup: 'chest' } }] },
      'Bankdrücken ist in deiner Bibliothek.',
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

    const result = await runAgent('Welche Brustübungen habe ich?', [], ctx, callbacks);

    expect(result.message.content).toBe('Bankdrücken ist in deiner Bibliothek.');
    expect(result.message.toolInvocations).toEqual([{ name: 'get_exercise_library', success: true }]);

    const secondCall = completionQueue.messages[1] as { role: string; tool_calls?: unknown[]; tool_call_id?: string; content?: string }[];
    expect(secondCall.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(secondCall[2].tool_calls).toHaveLength(1);
    expect(secondCall[3].tool_call_id).toBe('call_0');
    expect(secondCall[3].content).toContain('ex1');
  });

  it('falls back to the <tool_call> text protocol when native tools are unsupported', async () => {
    completionQueue.failNativeOnce = true;
    completionQueue.values = [
      '<tool_call>{"name":"get_existing_plans","arguments":{}}</tool_call>',
      'Du hast noch keine Pläne.',
    ];

    const callbacks = {
      onVisibleToken: vi.fn(),
      onToolStart: vi.fn(),
      onToolDone: vi.fn(),
    };
    const ctx: ToolContext = {
      exercises: [],
      sessions: [],
      plans: [],
      savePlan: vi.fn(() => 'plan-id'),
      saveExercise: vi.fn(),
      addExerciseToPlan: vi.fn(() => 'plan-exercise-id'),
      updatePlanExerciseSets: vi.fn(),
      getPlanById: vi.fn(),
    };

    const result = await runAgent('Welche Pläne habe ich?', [], ctx, callbacks);

    expect(result.message.content).toBe('Du hast noch keine Pläne.');
    expect(result.message.toolInvocations).toEqual([{ name: 'get_existing_plans', success: true }]);
    expect(completionQueue.toolsPassed).toEqual([true, false, false]);

    const retry = completionQueue.messages[1] as { role: string; content: string }[];
    expect(retry[0].content).toContain('<tool_call>');
    const followUp = completionQueue.messages[2] as { role: string; content: string }[];
    expect(followUp.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(followUp[3].content).toContain('<tool_result>');
  });

  it('passes the original user message to generate_workout_plan', async () => {
    completionQueue.values = [
      { toolCalls: [{ name: 'generate_workout_plan', arguments: { goal: 'Ganzkörper' } }] },
      'Fertig.',
    ];
    const spy = vi.spyOn(await import('../ai/tools.ts'), 'executeTool');
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };

    await runAgent('Ganzkörper zu Hause ohne Geräte', [], ctx, callbacks);

    expect(spy.mock.calls[0]?.[0]).toEqual({
      name: 'generate_workout_plan',
      arguments: { goal: 'Ganzkörper', userRequest: 'Ganzkörper zu Hause ohne Geräte' },
    });
  });
});
