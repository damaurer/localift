import { describe, it, expect } from 'vitest';
import { extractToolCall } from '../ai/tool-parsing.ts';

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
