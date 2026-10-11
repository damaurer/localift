import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../ai/prompts.ts';
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

  it('names the available tools (schemas are passed natively)', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('test_tool');
  });

  it('includes system instructions in German', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('Locallift AI');
    expect(prompt).toContain('Deutsch');
  });

  it('spells out schemas and the <tool_call> format in text mode', () => {
    const prompt = buildSystemPrompt(tools, 'text');
    expect(prompt).toContain('A test tool');
    expect(prompt).toContain('Pflichtfelder: param1');
    expect(prompt).toContain('<tool_call>');
  });

  it('does not hard-code a model-specific tool call format', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt).not.toContain('<tool_call>');
    expect(prompt).not.toContain('<|im_start|>');
  });

  it('handles tools without required fields', () => {
    const toolsNoReq: AiTool[] = [{
      name: 'no_req',
      description: 'No required',
      parameters: { type: 'object', properties: {} },
    }];
    const prompt = buildSystemPrompt(toolsNoReq);
    expect(prompt).toContain('no_req');
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
