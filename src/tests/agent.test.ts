import { beforeEach, describe, it, expect, vi } from 'vitest';
import { extractPythonicToolCall, extractToolCall } from '../ai/tool-parsing.ts';
import { isPlanRequest, runAgent } from '../ai/agent.ts';
import type { ToolContext } from '../ai/tools.ts';

const completionQueue = vi.hoisted(() => ({
  values: [] as (string | { text?: string; toolCalls: { name: string; arguments: Record<string, unknown> }[] })[],
  messages: [] as unknown[][],
  toolsPassed: [] as boolean[],
  failNativeOnce: false,
  historyStyle: 'template' as 'template' | 'lfm' | 'inline',
}));

vi.mock('../ai/wllama-service.ts', () => ({
  NativeToolsUnsupportedError: class NativeToolsUnsupportedError extends Error {},
  supportsNativeTools: () => true,
  getToolHistoryStyle: () => completionQueue.historyStyle,
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
  completionQueue.historyStyle = 'template';
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

describe('extractPythonicToolCall', () => {
  const tools = ['get_workout_history', 'get_exercise_library', 'generate_workout_plan'];

  it('parses an LFM call written as plain text', () => {
    expect(extractPythonicToolCall('[get_workout_history(limit=5)]', tools)).toEqual({
      name: 'get_workout_history',
      arguments: { limit: 5 },
    });
  });

  it('parses strings, lists and Python literals', () => {
    const r = extractPythonicToolCall(
      `<|tool_call_start|>[generate_workout_plan(goal='Push, schwer', muscleGroups=["chest", "triceps"], strict=True, note=None)]<|tool_call_end|>`,
      tools,
    );
    expect(r).toEqual({
      name: 'generate_workout_plan',
      arguments: { goal: 'Push, schwer', muscleGroups: ['chest', 'triceps'], strict: true, note: null },
    });
  });

  it('parses calls without arguments', () => {
    expect(extractPythonicToolCall('get_workout_history()', tools)).toEqual({ name: 'get_workout_history', arguments: {} });
  });

  it('ignores unknown names and prose', () => {
    expect(extractPythonicToolCall('[print(x=1)]', tools)).toBeNull();
    expect(extractPythonicToolCall('Ruf get_workout_history(limit=5) auf, dann sehen wir weiter.', tools)).toBeNull();
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

    const result = await runAgent('Welche Übungen habe ich?', [], ctx, callbacks);

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

  it('writes the tool call into the assistant content for LFM templates', async () => {
    completionQueue.historyStyle = 'lfm';
    completionQueue.values = [
      { toolCalls: [{ name: 'get_workout_history', arguments: { limit: 5 } }] },
      'Du hast noch nicht trainiert.',
    ];
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };

    const result = await runAgent('Was habe ich trainiert?', [], ctx, callbacks);

    expect(result.message.content).toBe('Du hast noch nicht trainiert.');
    const followUp = completionQueue.messages[1] as { role: string; content: string }[];
    expect(followUp.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(followUp[2].content).toBe('<|tool_call_start|>[get_workout_history(limit=5)]<|tool_call_end|>');
  });

  it('runs a Python-style call the model wrote as visible text', async () => {
    completionQueue.values = ['[get_existing_plans()]', 'Du hast noch keine Pläne.'];
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };

    const result = await runAgent('Welche Pläne habe ich?', [], ctx, callbacks);

    expect(result.message.toolInvocations).toEqual([{ name: 'get_existing_plans', success: true }]);
    expect(result.message.content).toBe('Du hast noch keine Pläne.');
  });

  it('stops a model that keeps repeating the same tool call', async () => {
    const call = { toolCalls: [{ name: 'get_workout_history', arguments: {} }] };
    completionQueue.values = [call, call, call, call];
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };

    const result = await runAgent('Was habe ich trainiert?', [], ctx, callbacks);

    expect(completionQueue.messages).toHaveLength(3);
    expect(callbacks.onToolStart).toHaveBeenCalledTimes(1);
    expect(result.message.content).toBe('Erledigt.');
  });

  it('drops the oldest chat history when it would overflow the context', async () => {
    completionQueue.values = ['Antwort.'];
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };
    const history = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant',
      content: `${i} ${'x'.repeat(400)}`,
      timestamp: '',
    }));

    await runAgent('Und jetzt?', history, ctx, callbacks);

    const sent = completionQueue.messages[0] as { role: string; content: string }[];
    expect(sent.length).toBeLessThan(history.length + 2);
    expect(sent[1].role).toBe('user');
    expect(sent[sent.length - 2].content).toBe(history[19].content);
    expect(sent[sent.length - 1].content).toBe('Und jetzt?');
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

describe('isPlanRequest', () => {
  it.each([
    'Erstelle mir einen Push-Trainingsplan für Muskelaufbau.',
    'Ich bin Anfänger und trainiere zu Hause ohne Geräte. Erstelle mir ein Ganzkörper-Workout.',
    'Mach mir einen Beintag für Kraft.',
    'Ich brauche einen Pull-Tag für Muskelaufbau.',
    'Gib mir einen Trainingsplan für 3 Tage.',
  ])('detects "%s"', message => {
    expect(isPlanRequest(message)).toBe(true);
  });

  it.each([
    'Wie oft pro Woche sollte ich als Anfänger trainieren?',
    'Gib mir einen Tipp für den Beintag.',
    'Was hältst du von meinem Trainingsplan?',
    'Wie schütze ich beim Kreuzheben meinen unteren Rücken?',
    'Erstelle mir einen Push/Pull/Beine Split.',
  ])('ignores "%s"', message => {
    expect(isPlanRequest(message)).toBe(false);
  });
});

describe('runAgent plan requests', () => {
  it('routes a plan request straight to generate_workout_plan and lets the model summarize', async () => {
    completionQueue.values = ['Dein Beintag ist fertig.'];
    const spy = vi.spyOn(await import('../ai/tools.ts'), 'executeTool').mockResolvedValueOnce(
      JSON.stringify({ success: true, planId: 'p1', planName: 'Beintag', exercises: ['Kniebeuge 3x8'] }),
    );
    const ctx = {
      exercises: [], sessions: [], plans: [],
      savePlan: vi.fn(), saveExercise: vi.fn(), addExerciseToPlan: vi.fn(), updatePlanExerciseSets: vi.fn(), getPlanById: vi.fn(),
    } as unknown as ToolContext;
    const callbacks = { onVisibleToken: vi.fn(), onToolStart: vi.fn(), onToolDone: vi.fn() };

    const result = await runAgent('Erstelle mir einen Beintag.', [], ctx, callbacks);

    expect(spy.mock.calls[0][0]).toEqual({
      name: 'generate_workout_plan',
      arguments: { goal: 'Erstelle mir einen Beintag.', userRequest: 'Erstelle mir einen Beintag.' },
    });
    expect(completionQueue.messages).toHaveLength(1);
    expect(result.createdPlanName).toBe('Beintag');
    expect(result.message.content).toBe('Dein Beintag ist fertig.');
  });
});
