import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, formatChatPrompt, PLAN_GENERATOR_PROMPT } from '../ai/prompts.ts';
import type { AiTool } from '../types/ai.types.ts';

describe('buildSystemPrompt', () => {
  const tools: AiTool[] = [
    {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'A param' },
        },
        required: ['param1'],
      },
    },
  ];

  it('includes tool name and description', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('test_tool');
    expect(prompt).toContain('A test tool');
  });

  it('includes required fields', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('Pflichtfelder: param1');
  });

  it('includes system instructions in German', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('Locallift AI');
    expect(prompt).toContain('Deutsch');
  });

  it('includes tool call format instructions', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('<tool_call>');
    expect(prompt).toContain('</tool_call>');
  });

  it('handles tools without required fields', () => {
    const toolsNoReq: AiTool[] = [{
      name: 'no_req',
      description: 'No required',
      parameters: { type: 'object', properties: {} },
    }];
    const prompt = buildSystemPrompt(toolsNoReq);
    expect(prompt).toContain('no_req');
    expect(prompt).not.toContain('Pflichtfelder');
  });

  it('handles multiple tools', () => {
    const multiTools: AiTool[] = [
      { name: 'tool_a', description: 'Tool A', parameters: { type: 'object', properties: {} } },
      { name: 'tool_b', description: 'Tool B', parameters: { type: 'object', properties: {} } },
    ];
    const prompt = buildSystemPrompt(multiTools);
    expect(prompt).toContain('tool_a');
    expect(prompt).toContain('tool_b');
  });
});

describe('formatChatPrompt', () => {
  it('formats a basic prompt with system, history, and user message', () => {
    const result = formatChatPrompt('System prompt', [], 'Hello');
    expect(result).toContain('<|im_start|>system\nSystem prompt\n<|im_end|>');
    expect(result).toContain('<|im_start|>user\nHello\n<|im_end|>');
    expect(result).toContain('<|im_start|>assistant\n');
  });

  it('includes history messages', () => {
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
    ];
    const result = formatChatPrompt('sys', history, 'Next');
    expect(result).toContain('<|im_start|>user\nHi\n<|im_end|>');
    expect(result).toContain('<|im_start|>assistant\nHello!\n<|im_end|>');
    expect(result).toContain('<|im_start|>user\nNext\n<|im_end|>');
  });

  it('ends with assistant start tag', () => {
    const result = formatChatPrompt('sys', [], 'msg');
    expect(result).toMatch(/<\|im_start\|>assistant\n$/);
  });
});

describe('PLAN_GENERATOR_PROMPT', () => {
  it('includes the user goal', () => {
    const prompt = PLAN_GENERATOR_PROMPT('Muskelaufbau');
    expect(prompt).toContain('Muskelaufbau');
  });

  it('mentions get_exercise_library', () => {
    const prompt = PLAN_GENERATOR_PROMPT('test');
    expect(prompt).toContain('get_exercise_library');
  });

  it('mentions create_workout_plan', () => {
    const prompt = PLAN_GENERATOR_PROMPT('test');
    expect(prompt).toContain('create_workout_plan');
  });
});
