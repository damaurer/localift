/**
 * Agentic inference loop.
 *
 * Drives the back-and-forth between the LLM and the tool executor:
 *   1. Build the message list (system + history + user message)
 *   2. Run a chat completion and classify it as visible text or a tool call
 *   3. If a tool call is found → execute it, append a tool result, continue
 *   5. Repeat up to MAX_ITERATIONS, then return the final visible response
 *
 * Tool calls are parsed natively by llama.cpp (model-specific format). As a
 * fallback for small models that write the call as plain text, the visible
 * output is also scanned for <tool_call> tags, ```json fences and bare JSON.
 * The "visible" text (shown to the user) excludes all tool-call markup.
 */

import type { AiMessage, AiToolCall, AiToolInvocation } from '../types/ai.types.ts';
import type { ToolContext } from './tools.ts';
import { executeTool, FITNESS_TOOLS } from './tools.ts';
import { buildSystemPrompt, type ToolPromptMode } from './prompts.ts';
import { extractFirstJsonObject, extractToolCall } from './tool-parsing.ts';
import {
  NativeToolsUnsupportedError,
  runChatCompletion,
  supportsNativeTools,
  type ChatMessage,
} from './wllama-service.ts';
import { generateId } from '../data/storage.ts';

const TOOL_OPEN = '<tool_call>';
const TOOL_CLOSE = '</tool_call>';
const RESULT_OPEN = '<tool_result>';
const RESULT_CLOSE = '</tool_result>';
/** Markdown code fence — small models often wrap tool JSON in ```json … ```. */
const FENCE = '```';
/** Stray ChatML end-of-turn marker — model output past this point is not for the user. */
const IM_END = '<|im_end|>';
/**
 * A turn may chain several tool calls (e.g. read history, then generate a
 * plan, then add an exercise) — keep the ceiling generous.
 */
const MAX_ITERATIONS = 12;
/** Rough char budget to stay within the model's context window (n_ctx 4096). */
const MAX_PROMPT_CHARS = 14000;

type AgentStep =
  | { kind: 'final'; text: string }
  | { kind: 'tool'; call: AiToolCall }
  | { kind: 'invalid_tool_call' };

export interface AgentDebugOutput {
  kind: 'completion' | 'tool_call' | 'tool_result' | 'invalid_tool_call' | 'prompt_limit' | 'tool_mode';
  label: string;
  content: string;
}

export interface AgentCallbacks {
  /** Called with visible assistant text (never XML tool markup). */
  onVisibleToken: (piece: string) => void;
  /** Called when a tool call starts; toolName is e.g. "get_exercise_library" */
  onToolStart: (toolName: string) => void;
  /** Called after the tool has finished executing (success = no error result) */
  onToolDone: (toolName: string, success: boolean) => void;
  /** Called with raw agent trace entries when AI debug output is enabled. */
  onDebugOutput?: (output: AgentDebugOutput) => void;
}

export interface AgentResult {
  message: AiMessage;
  /** Set when generate_workout_plan succeeded */
  createdPlanName?: string;
}

/** True when a tool result is NOT an error object (`{"error": ...}`). */
function isToolSuccess(toolResult: string): boolean {
  try {
    const parsed = JSON.parse(toolResult);
    return !(parsed && typeof parsed === 'object' && 'error' in parsed);
  } catch {
    // Non-JSON result still means the tool ran and returned something.
    return true;
  }
}

export async function runAgent(
  userMessage: string,
  chatHistory: AiMessage[],
  toolCtx: ToolContext,
  callbacks: AgentCallbacks,
): Promise<AgentResult> {
  let toolMode: ToolPromptMode = supportsNativeTools() ? 'native' : 'text';
  const systemPrompt = buildSystemPrompt(FITNESS_TOOLS, toolMode);
  // messages accumulates context across tool-call iterations; the model's own
  // chat template renders it into the final prompt.
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  // visibleText is what we show in the UI (tool XML stripped out).
  let visibleText = '';
  let createdPlanName: string | undefined;
  // Every tool the agent ran this turn — surfaced in the chat as chips.
  const toolInvocations: AiToolInvocation[] = [];
  const toolCallCounts = new Map<string, number>();

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Stop before we overflow the context window. Tool results are already
    // applied, so an early stop still leaves a usable result. The first
    // iteration always runs so a turn never produces an empty response.
    const promptChars = countMessageChars(messages);
    if (iteration > 0 && promptChars > MAX_PROMPT_CHARS) {
      callbacks.onDebugOutput?.({
        kind: 'prompt_limit',
        label: `Prompt limit before iteration ${iteration + 1}`,
        content: `Prompt length ${promptChars} exceeded ${MAX_PROMPT_CHARS} characters.`,
      });
      break;
    }

    let step: AgentStep;
    try {
      step = await generateAgentStep(messages, iteration, callbacks, toolMode);
    } catch (err) {
      if (!(err instanceof NativeToolsUnsupportedError) || toolMode === 'text') throw err;
      // The model's chat template has no usable native tool grammar — switch
      // to the text protocol (<tool_call> JSON spelled out in the prompt).
      toolMode = 'text';
      messages[0] = { role: 'system', content: buildSystemPrompt(FITNESS_TOOLS, toolMode) };
      callbacks.onDebugOutput?.({
        kind: 'tool_mode',
        label: 'Tool mode',
        content: 'Native tool calling failed for this model, falling back to the <tool_call> text protocol.',
      });
      step = await generateAgentStep(messages, iteration, callbacks, toolMode);
    }

    // ── No tool call → generation is complete ─────────────────────────────
    if (step.kind === 'final') {
      emitVisible(step.text, callbacks);
      visibleText += step.text;
      break;
    }

    // ── Extract and execute the tool call (robust to messy formatting) ────
    if (step.kind === 'invalid_tool_call') {
      const errNote = '\n\n[Tool-Aufruf konnte nicht verarbeitet werden]';
      callbacks.onDebugOutput?.({
        kind: 'invalid_tool_call',
        label: `Invalid tool call in iteration ${iteration + 1}`,
        content: errNote.trim(),
      });
      callbacks.onVisibleToken(errNote);
      visibleText += errNote;
      break;
    }

    const toolCall = step.call;
    callbacks.onDebugOutput?.({
      kind: 'tool_call',
      label: `Tool call in iteration ${iteration + 1}`,
      content: JSON.stringify(toolCall, null, 2),
    });
    const callSignature = getToolCallSignature(toolCall);
    const previousCallCount = toolCallCounts.get(callSignature) ?? 0;

    if (toolCall.name === 'get_exercise_library' && previousCallCount > 0) {
      toolCallCounts.set(callSignature, previousCallCount + 1);

      if (previousCallCount >= 2) {
        const note =
          '\n\nIch habe die Übungsbibliothek bereits mit denselben Parametern gelesen. ' +
          'Nutze bitte spezifischere Suchparameter oder fahre mit den vorhandenen Treffern fort.';
        callbacks.onVisibleToken(note);
        visibleText += note;
        break;
      }

      const guardResult = JSON.stringify({
        error: 'get_exercise_library wurde in diesem Agent-Durchlauf bereits mit denselben Parametern ausgeführt.',
        hint:
          'Wiederhole denselben Library-Aufruf nicht. Nutze die vorhandenen exercise IDs aus dem vorherigen tool_result. ' +
          'Falls andere Übungen benötigt werden, rufe get_exercise_library mit query, muscleGroup oder equipment spezifischer auf. ' +
          'Für einen neuen Plan rufe generate_workout_plan auf.',
      });
      toolInvocations.push({ name: toolCall.name, success: false });
      callbacks.onToolDone(toolCall.name, false);
      callbacks.onDebugOutput?.({
        kind: 'tool_result',
        label: `Guard result for ${toolCall.name}`,
        content: guardResult,
      });
      appendToolExchange(messages, toolCall, guardResult, iteration, toolMode);
      continue;
    }

    toolCallCounts.set(callSignature, previousCallCount + 1);
    callbacks.onToolStart(toolCall.name);
    // The plan generator also reads the user's own words — small models often
    // drop details like "zu Hause" or "Anfänger" from the goal argument.
    const executedCall = toolCall.name === 'generate_workout_plan'
      ? { ...toolCall, arguments: { ...toolCall.arguments, userRequest: userMessage } }
      : toolCall;
    const toolResult = await executeTool(executedCall, toolCtx);
    const success = isToolSuccess(toolResult);
    toolInvocations.push({ name: toolCall.name, success });
    callbacks.onToolDone(toolCall.name, success);
    callbacks.onDebugOutput?.({
      kind: 'tool_result',
      label: `Tool result for ${toolCall.name}`,
      content: toolResult,
    });

    // Track plan creation for UI feedback (last created plan wins).
    if (success && toolCall.name === 'generate_workout_plan') {
      try {
        const parsed = JSON.parse(toolResult) as { planName?: string };
        if (parsed.planName) createdPlanName = parsed.planName;
      } catch { /* ignore */ }
    }

    // Continue the agent loop with a normalized assistant tool-call turn and
    // a tool-result turn, mirroring LEAP's FunctionCalls -> tool messages flow.
    appendToolExchange(messages, toolCall, toolResult, iteration, toolMode);
  }

  return {
    message: {
      id: generateId(),
      role: 'assistant',
      content: visibleText.trim(),
      timestamp: new Date().toISOString(),
      toolInvocations: toolInvocations.length ? toolInvocations : undefined,
    },
    createdPlanName,
  };
}

async function generateAgentStep(
  messages: ChatMessage[],
  iteration: number,
  callbacks: AgentCallbacks,
  toolMode: ToolPromptMode,
): Promise<AgentStep> {
  let generated = '';
  let toolCallDetected = false;
  let stopRequested = false;

  const completion = await runChatCompletion(messages, {
    maxTokens: 1024,
    temperature: 0.4,
    tools: toolMode === 'native' ? FITNESS_TOOLS : undefined,
    onToken: (_piece, fullText) => {
      generated = fullText;

      if (stopRequested) return false;

      const toolAt = findToolStart(fullText);
      const imEnd = fullText.indexOf(IM_END);

      if (imEnd !== -1 && (toolAt === -1 || imEnd < toolAt)) {
        stopRequested = true;
        return false;
      }

      if (toolAt !== -1) {
        toolCallDetected = true;
      }

      // Once inside a tool call, abort as soon as it is complete (closing
      // tag, end-of-turn marker, or a fully balanced JSON object).
      if (
        toolCallDetected &&
        (fullText.includes(TOOL_CLOSE) ||
          fullText.includes(IM_END) ||
          extractFirstJsonObject(fullText) !== null)
      ) {
        stopRequested = true;
        return false;
      }
    },
  });
  if (!generated) generated = completion.text;

  callbacks.onDebugOutput?.({
    kind: 'completion',
    label: `Raw completion ${iteration + 1}`,
    content: completion.toolCalls.length
      ? `${generated}\n[native tool_calls] ${JSON.stringify(completion.toolCalls)}`
      : generated,
  });

  // Natively parsed tool call (one tool per step — extra calls are dropped).
  if (completion.toolCalls.length) {
    return { kind: 'tool', call: completion.toolCalls[0] };
  }

  if (!toolCallDetected) {
    return { kind: 'final', text: stripAfterEndOfTurn(generated) };
  }

  const call = extractToolCall(generated);
  return call ? { kind: 'tool', call } : { kind: 'invalid_tool_call' };
}

function emitVisible(text: string, callbacks: AgentCallbacks): void {
  const visible = holdBackPartialMarker(text);
  if (visible) callbacks.onVisibleToken(visible);
}

function findToolStart(text: string): number {
  // A tool call may arrive in several shapes (the local model is not reliable
  // about the <tool_call> wrapper): a proper tag, a ```json fence, or bare JSON.
  const tcOpen = text.indexOf(TOOL_OPEN);
  const fenceAt = text.indexOf(FENCE);
  const leadBrace = text.trimStart().startsWith('{') ? text.indexOf('{') : -1;
  const indicators = [tcOpen, fenceAt, leadBrace].filter(i => i !== -1);
  return indicators.length ? Math.min(...indicators) : -1;
}

function stripAfterEndOfTurn(text: string): string {
  const imEnd = text.indexOf(IM_END);
  return imEnd === -1 ? text : text.slice(0, imEnd);
}

function holdBackPartialMarker(text: string): string {
  const unsafeSuffixLen = Math.max(
    pendingPrefixLen(text, TOOL_OPEN),
    pendingPrefixLen(text, IM_END),
    pendingPrefixLen(text, FENCE),
  );
  return unsafeSuffixLen > 0 ? text.slice(0, -unsafeSuffixLen) : text;
}

function appendToolExchange(
  messages: ChatMessage[],
  toolCall: AiToolCall,
  toolResult: string,
  iteration: number,
  toolMode: ToolPromptMode,
): void {
  if (toolMode === 'text') {
    messages.push(
      { role: 'assistant', content: `${TOOL_OPEN}${JSON.stringify(toolCall)}${TOOL_CLOSE}` },
      { role: 'user', content: `${RESULT_OPEN}\n${toolResult}\n${RESULT_CLOSE}` },
    );
    return;
  }

  const toolCallId = `call_${iteration}`;
  messages.push(
    {
      role: 'assistant',
      content: '',
      tool_calls: [{
        id: toolCallId,
        type: 'function',
        function: { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) },
      }],
    },
    { role: 'tool', tool_call_id: toolCallId, content: toolResult },
  );
}

function countMessageChars(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content.length : 0;
    const calls = m.role === 'assistant' && m.tool_calls ? JSON.stringify(m.tool_calls).length : 0;
    return sum + content + calls;
  }, 0);
}

function getToolCallSignature(toolCall: AiToolCall): string {
  return `${toolCall.name}:${stableStringify(toolCall.arguments)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

/**
 * Length of the longest suffix of `s` that is a (proper) prefix of `tag`.
 *
 * Used to hold back trailing characters that could be the beginning of a
 * `<tool_call>` tag still being streamed token-by-token. Returns 0 when no
 * suffix of `s` could grow into `tag`.
 */
function pendingPrefixLen(s: string, tag: string): number {
  const max = Math.min(s.length, tag.length - 1);
  for (let n = max; n > 0; n--) {
    if (s.endsWith(tag.slice(0, n))) return n;
  }
  return 0;
}
