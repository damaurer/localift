/**
 * Tool-call extraction helpers.
 *
 * Kept dependency-free (no wllama / model imports) so they are cheap to unit
 * test and can be reused by the agent loop.
 *
 * Small local models are unreliable about the exact `<tool_call>` wrapper, so
 * these helpers recognise a tool call in several shapes: a proper tag, a
 * ```json fence, or bare JSON.
 */

import type { AiToolCall } from '../types/ai.types.ts';

const TOOL_OPEN = '<tool_call>';

/**
 * Returns the first balanced `{…}` JSON object substring in `s`, or null when
 * none is complete (e.g. the model was cut off mid-object). String contents
 * (including escaped quotes) are handled so braces inside strings don't count.
 */
export function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Robustly extracts a tool call from model output. Tries each shape and
 * validates that the parsed object has a string `name`. Returns null when no
 * valid tool call is present (plain prose, or a truncated object).
 */
export function extractToolCall(text: string): AiToolCall | null {
  const tryParse = (chunk: string): AiToolCall | null => {
    const json = extractFirstJsonObject(chunk);
    if (!json) return null;
    try {
      const obj = JSON.parse(json) as Partial<AiToolCall>;
      if (obj && typeof obj.name === 'string') {
        return { name: obj.name, arguments: obj.arguments ?? {} };
      }
    } catch { /* fall through */ }
    return null;
  };

  // 1. Properly tagged <tool_call>…</tool_call>
  const tagged = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  if (tagged) {
    const r = tryParse(tagged[1]);
    if (r) return r;
  }
  // 2. Opening tag without a close (truncated tag)
  const open = text.indexOf(TOOL_OPEN);
  if (open !== -1) {
    const r = tryParse(text.slice(open + TOOL_OPEN.length));
    if (r) return r;
  }
  // 3. Markdown ```json fence
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const r = tryParse(fenced[1]);
    if (r) return r;
  }
  // 4. Bare JSON anywhere in the text
  return tryParse(text);
}
