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

/** LFM2/LFM2.5 wrap native tool calls in these special tokens. */
export const LFM_CALL_START = '<|tool_call_start|>';
export const LFM_CALL_END = '<|tool_call_end|>';

/** Formats a call in LFM's Python-like syntax: `name(key=value, …)`. */
export function formatPythonicCall(call: AiToolCall): string {
  const args = Object.entries(call.arguments)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ');
  return `${call.name}(${args})`;
}

/**
 * Parses a Python-style tool call such as `[get_workout_history(limit=5)]`.
 * LFM models write this syntax; when they forget the special tokens around it
 * llama.cpp leaves it in the visible text. The whole text must be the call and
 * the name must be a known tool, so ordinary prose is never mistaken for one.
 */
export function extractPythonicToolCall(text: string, knownTools: string[]): AiToolCall | null {
  const body = text.split(LFM_CALL_START).join('').split(LFM_CALL_END).join('').trim();
  const match = /^\[?\s*([A-Za-z_]\w*)\s*\(([\s\S]*)\)\s*\]?$/.exec(body);
  if (!match || !knownTools.includes(match[1])) return null;

  const args: Record<string, unknown> = {};
  for (const part of splitTopLevel(match[2])) {
    const eq = part.indexOf('=');
    if (eq <= 0) return null;
    const key = part.slice(0, eq).trim();
    if (!/^[A-Za-z_]\w*$/.test(key)) return null;
    args[key] = parsePythonValue(part.slice(eq + 1).trim());
  }
  return { name: match[1], arguments: args };
}

/** Splits `a=1, b=[1, 2], c="x,y"` at commas outside brackets and strings. */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '[' || c === '{' || c === '(') {
      depth++;
    } else if (c === ']' || c === '}' || c === ')') {
      depth--;
    } else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts.map(p => p.trim()).filter(Boolean);
}

/** Converts a Python literal (True/None, 'single quotes') to JSON and parses it. */
function parsePythonValue(raw: string): unknown {
  let json = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"' || c === "'") {
      let value = '';
      let j = i + 1;
      for (; j < raw.length && raw[j] !== c; j++) {
        if (raw[j] === '\\' && j + 1 < raw.length) {
          j++;
          value += raw[j] === 'n' ? '\n' : raw[j] === 't' ? '\t' : raw[j];
        } else {
          value += raw[j];
        }
      }
      json += JSON.stringify(value);
      i = j;
    } else if (/[A-Za-z]/.test(c)) {
      const word = /^[A-Za-z_]\w*/.exec(raw.slice(i))![0];
      json += word === 'True' ? 'true' : word === 'False' ? 'false' : word === 'None' ? 'null' : word;
      i += word.length - 1;
    } else {
      json += c;
    }
  }
  try {
    return JSON.parse(json);
  } catch {
    return raw.replace(/^["']|["']$/g, '');
  }
}
