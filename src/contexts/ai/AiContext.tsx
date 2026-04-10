import { createContext, useContext } from 'react';
import type { AiMessage, AiModelStatus } from '../../types/ai.types.ts';

export interface AiContextValue {
  // ── Model state ────────────────────────────────────────────────────────────
  modelStatus: AiModelStatus;
  downloadProgress: number;   // 0–1
  modelError: string | null;

  // ── Chat state ─────────────────────────────────────────────────────────────
  messages: AiMessage[];
  isGenerating: boolean;
  /** Which screen is currently driving generation, or null */
  generatingContext: 'chat' | 'plan' | null;
  /** Name of the currently executing tool, or null */
  activeToolName: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  /** URL of the model that is currently loaded, or null if none */
  loadedModelUrl: string | null;
  /** Download + load the configured model into the WASM runtime */
  installModel: () => Promise<void>;
  /** Unload the current model so a different one can be installed */
  swapModel: () => Promise<void>;
  /** Send a user message and run the agentic loop */
  sendMessage: (content: string) => Promise<void>;
  /** Clear the chat history (model stays loaded) */
  clearChat: () => void;
  /**
   * High-level entry point for the Plan Generator screen.
   * Builds a goal prompt and runs the full agentic loop.
   * Returns the name of the created plan (if any).
   */
  generatePlan: (userGoal: string) => Promise<string | undefined>;
}

export const AiContext = createContext<AiContextValue | null>(null);

export function useAiContext(): AiContextValue {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error('useAiContext must be used inside AiProvider');
  return ctx;
}
