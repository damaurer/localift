/**
 * Agentic inference loop.
 *
 * Drives the back-and-forth between the LLM and the tool executor:
 *   1. Format prompt (system + history + user message)
 *   2. Run completion, streaming tokens to the UI
 *   3. Detect <tool_call> tags in the generated text
 *   4. If a tool call is found → execute it, inject <tool_result>, continue
 *   5. Repeat up to MAX_ITERATIONS, then return the final visible response
 *
 * The "visible" text (shown to the user) excludes all XML tool-call markup.
 */

import type { AiMessage, AiToolInvocation } from '../types/ai.types.ts';
import type { ToolContext } from './tools.ts';
import { executeTool, FITNESS_TOOLS } from './tools.ts';
import { buildSystemPrompt, formatChatPrompt } from './prompts.ts';
import { extractFirstJsonObject, extractToolCall } from './tool-parsing.ts';
import { runCompletion } from './wllama-service.ts';
import { generateId } from '../data/storage.ts';

const TOOL_OPEN = '<tool_call>';
const TOOL_CLOSE = '</tool_call>';
const RESULT_OPEN = '<tool_result>';
const RESULT_CLOSE = '</tool_result>';
/** Markdown code fence — small models often wrap tool JSON in ```json … ```. */
const FENCE = '```';
/** ChatML end-of-turn marker — model output past this point is not for the user. */
const IM_END = '<|im_end|>';
/**
 * Plans are built incrementally (one exercise per tool call), so a single turn
 * can legitimately run many tool calls — keep the ceiling generous.
 */
const MAX_ITERATIONS = 24;
/** Rough char budget to stay within the model's context window (n_ctx 4096). */
const MAX_PROMPT_CHARS = 14000;

export interface AgentCallbacks {
  /** Called with the newly decoded token (only visible text, no XML markup) */
  onVisibleToken: (piece: string) => void;
  /** Called when a tool call starts; toolName is e.g. "get_exercise_library" */
  onToolStart: (toolName: string) => void;
  /** Called after the tool has finished executing (success = no error result) */
  onToolDone: (toolName: string, success: boolean) => void;
}

export interface AgentResult {
  message: AiMessage;
  /** Set when create_workout_plan succeeded */
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
  const systemPrompt = buildSystemPrompt(FITNESS_TOOLS);
  const historySlice = chatHistory.map(m => ({ role: m.role, content: m.content }));

  // fullPrompt accumulates context across tool-call iterations (all within
  // the *same* assistant turn in ChatML).
  let fullPrompt = formatChatPrompt(systemPrompt, historySlice, userMessage);

  // visibleText is what we show in the UI (tool XML stripped out).
  let visibleText = '';
  let createdPlanName: string | undefined;
  // Every tool the agent ran this turn — surfaced in the chat as chips.
  const toolInvocations: AiToolInvocation[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Stop before we overflow the context window. Plans are already saved
    // incrementally, so an early stop still leaves a usable result. The first
    // iteration always runs so a turn never produces an empty response.
    if (iteration > 0 && fullPrompt.length > MAX_PROMPT_CHARS) break;

    let generatedInThisCall = '';
    let toolCallDetected = false;
    let endOfTurn = false;
    let stopRequested = false;
    // How much of THIS completion's text we have already streamed to the UI.
    // Reset every iteration because runCompletion only returns the newly
    // generated continuation, not the accumulated prompt.
    let emittedLen = 0;

    await runCompletion(fullPrompt, {
      maxTokens: 1024,
      temperature: 0.4,
      onToken: (_piece, fullText) => {
        generatedInThisCall = fullText;

        if (stopRequested) return false;

        if (!toolCallDetected && !endOfTurn) {
          // A tool call may arrive in several shapes (the local model is not
          // reliable about the <tool_call> wrapper): a proper tag, a ```json
          // fence, or bare JSON. Any of these means "stop streaming as text".
          const tcOpen = fullText.indexOf(TOOL_OPEN);
          const fenceAt = fullText.indexOf(FENCE);
          const imEnd = fullText.indexOf(IM_END);
          const leadBrace = fullText.trimStart().startsWith('{')
            ? fullText.indexOf('{')
            : -1;

          const indicators = [tcOpen, fenceAt, leadBrace].filter(i => i !== -1);
          const toolAt = indicators.length ? Math.min(...indicators) : -1;

          // Determine how far we may safely stream. We must NOT emit any
          // trailing characters that could turn out to be the start of a
          // tool-call marker (these span several tokens) since the UI can only
          // append – never retract.
          let safeEnd: number;
          if (imEnd !== -1 && (toolAt === -1 || imEnd < toolAt)) {
            // Model ended its turn before any tool call → stop after this text
            safeEnd = imEnd;
            endOfTurn = true;
          } else if (toolAt !== -1) {
            safeEnd = toolAt;
            toolCallDetected = true;
          } else {
            safeEnd =
              fullText.length -
              Math.max(
                pendingPrefixLen(fullText, TOOL_OPEN),
                pendingPrefixLen(fullText, IM_END),
                pendingPrefixLen(fullText, FENCE),
              );
          }

          if (safeEnd > emittedLen) {
            const delta = fullText.substring(emittedLen, safeEnd);
            callbacks.onVisibleToken(delta);
            visibleText += delta; // accumulate across iterations
            emittedLen = safeEnd;
          }

          if (endOfTurn) {
            stopRequested = true;
            return false;
          }
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

    // ── Model signalled end-of-turn → done ────────────────────────────────
    if (endOfTurn) break;

    // ── No tool call → generation is complete ─────────────────────────────
    if (!toolCallDetected) {
      // Flush any text held back by the partial-tag guard.
      if (generatedInThisCall.length > emittedLen) {
        const tail = generatedInThisCall.substring(emittedLen);
        callbacks.onVisibleToken(tail);
        visibleText += tail;
      }
      break;
    }

    // ── Extract and execute the tool call (robust to messy formatting) ────
    const toolCall = extractToolCall(generatedInThisCall);
    if (!toolCall) {
      const errNote = '\n\n[Tool-Aufruf konnte nicht verarbeitet werden]';
      callbacks.onVisibleToken(errNote);
      visibleText += errNote;
      break;
    }

    callbacks.onToolStart(toolCall.name);
    const toolResult = await executeTool(toolCall, toolCtx);
    const success = isToolSuccess(toolResult);
    toolInvocations.push({ name: toolCall.name, success });
    callbacks.onToolDone(toolCall.name, success);

    // Track plan creation for UI feedback (last created plan wins).
    if (toolCall.name === 'create_workout_plan') {
      try {
        const parsed = JSON.parse(toolResult) as { planName?: string };
        if (parsed.planName) createdPlanName = parsed.planName;
      } catch { /* ignore */ }
    }

    // Continue the SAME assistant turn: keep any prose the model wrote, then a
    // normalised tool-call block + its result. Normalising keeps the growing
    // prompt small and well-formed regardless of how the model emitted it.
    const prose = generatedInThisCall.substring(0, emittedLen);
    fullPrompt +=
      prose +
      `${TOOL_OPEN}${JSON.stringify(toolCall)}${TOOL_CLOSE}\n` +
      `${RESULT_OPEN}\n${toolResult}\n${RESULT_CLOSE}\n`;
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
