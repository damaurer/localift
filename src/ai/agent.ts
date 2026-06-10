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

import type { AiMessage, AiToolCall } from '../types/ai.types.ts';
import type { ToolContext } from './tools.ts';
import { executeTool, FITNESS_TOOLS } from './tools.ts';
import { buildSystemPrompt, formatChatPrompt } from './prompts.ts';
import { runCompletion } from './wllama-service.ts';
import { generateId } from '../data/storage.ts';

const TOOL_OPEN = '<tool_call>';
const TOOL_CLOSE = '</tool_call>';
const RESULT_OPEN = '<tool_result>';
const RESULT_CLOSE = '</tool_result>';
/** ChatML end-of-turn marker — model output past this point is not for the user. */
const IM_END = '<|im_end|>';
const MAX_ITERATIONS = 6;

export interface AgentCallbacks {
  /** Called with the newly decoded token (only visible text, no XML markup) */
  onVisibleToken: (piece: string) => void;
  /** Called when a tool call starts; toolName is e.g. "get_exercise_library" */
  onToolStart: (toolName: string) => void;
  /** Called after the tool has finished executing */
  onToolDone: () => void;
}

export interface AgentResult {
  message: AiMessage;
  /** Set when create_workout_plan succeeded */
  createdPlanName?: string;
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

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
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
      temperature: 0.7,
      onToken: (_piece, fullText) => {
        generatedInThisCall = fullText;

        if (stopRequested) return false;

        if (!toolCallDetected) {
          const toolStart = fullText.indexOf(TOOL_OPEN);
          const endStart = fullText.indexOf(IM_END);

          // Determine how far we may safely stream. We must NOT emit any
          // trailing characters that could turn out to be the start of a
          // <tool_call> or <|im_end|> marker (these almost always span
          // several tokens), because the UI can only append – never retract.
          let safeEnd: number;
          if (endStart !== -1 && (toolStart === -1 || endStart < toolStart)) {
            // Model ended its turn before any tool call → stop after this text
            safeEnd = endStart;
            endOfTurn = true;
          } else if (toolStart !== -1) {
            safeEnd = toolStart;
            toolCallDetected = true;
          } else {
            safeEnd =
              fullText.length -
              Math.max(
                pendingPrefixLen(fullText, TOOL_OPEN),
                pendingPrefixLen(fullText, IM_END),
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

        // Once inside a tool call, wait for the closing tag, then abort
        if (toolCallDetected && fullText.includes(TOOL_CLOSE)) {
          stopRequested = true;
          return false;
        }
      },
    });

    // ── Model signalled end-of-turn → done ────────────────────────────────
    if (endOfTurn) break;

    // ── No tool call → generation is complete ─────────────────────────────
    if (!toolCallDetected) {
      // Flush any text held back by the partial-tag guard (a lone "<tool"
      // that never completed into a real tag is safe to show now).
      if (generatedInThisCall.length > emittedLen) {
        const tail = generatedInThisCall.substring(emittedLen);
        callbacks.onVisibleToken(tail);
        visibleText += tail;
      }
      break;
    }

    // ── Extract and execute the tool call ─────────────────────────────────
    const toolCallMatch = generatedInThisCall.match(
      new RegExp(`${escapeRegex(TOOL_OPEN)}([\\s\\S]*?)${escapeRegex(TOOL_CLOSE)}`),
    );

    if (!toolCallMatch) {
      // Malformed XML – fall back gracefully
      const errNote = '\n\n[Tool-Aufruf konnte nicht verarbeitet werden]';
      callbacks.onVisibleToken(errNote);
      visibleText += errNote;
      break;
    }

    let toolCall: AiToolCall;
    try {
      toolCall = JSON.parse(toolCallMatch[1].trim()) as AiToolCall;
    } catch {
      const errNote = '\n\n[Tool-JSON ungültig]';
      callbacks.onVisibleToken(errNote);
      visibleText += errNote;
      break;
    }

    callbacks.onToolStart(toolCall.name);
    const toolResult = await executeTool(toolCall, toolCtx);
    callbacks.onToolDone();

    // Track plan creation for UI feedback
    if (toolCall.name === 'create_workout_plan') {
      try {
        const parsed = JSON.parse(toolResult) as { planName?: string };
        if (parsed.planName) createdPlanName = parsed.planName;
      } catch { /* ignore */ }
    }

    // Extend the prompt so the model can read the tool result and continue
    // its answer within the SAME assistant turn.
    fullPrompt +=
      generatedInThisCall +
      `\n${RESULT_OPEN}\n${toolResult}\n${RESULT_CLOSE}\n`;
  }

  return {
    message: {
      id: generateId(),
      role: 'assistant',
      content: visibleText.trim(),
      timestamp: new Date().toISOString(),
    },
    createdPlanName,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
