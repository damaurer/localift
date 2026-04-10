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
    let stopRequested = false;

    await runCompletion(fullPrompt, {
      maxTokens: 1024,
      temperature: 0.7,
      onToken: (piece, fullText) => {
        generatedInThisCall = fullText;

        if (stopRequested) return false;

        if (!toolCallDetected) {
          const toolStart = fullText.indexOf(TOOL_OPEN);
          if (toolStart === -1) {
            // Still generating regular text → stream to UI
            callbacks.onVisibleToken(piece);
            visibleText = fullText;
          } else {
            // Tool call beginning detected – show text up to the tag, then stop streaming
            const newVisible = fullText.substring(0, toolStart);
            if (newVisible.length > visibleText.length) {
              callbacks.onVisibleToken(newVisible.substring(visibleText.length));
              visibleText = newVisible;
            }
            toolCallDetected = true;
          }
        }

        // Once inside a tool call, wait for the closing tag, then abort
        if (toolCallDetected && fullText.includes(TOOL_CLOSE)) {
          stopRequested = true;
          return false;
        }
      },
    });

    // ── No tool call → generation is complete ─────────────────────────────
    if (!toolCallDetected) {
      // Append any trailing text we haven't streamed yet
      if (generatedInThisCall.length > visibleText.length) {
        const tail = generatedInThisCall.substring(visibleText.length);
        callbacks.onVisibleToken(tail);
        visibleText = generatedInThisCall;
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
