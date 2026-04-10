export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /** True while the AI is still streaming tokens for this message */
  isStreaming?: boolean;
}

/**
 * Runtime status of the local WASM model.
 * - idle:        No model loaded yet
 * - downloading: Model GGUF file is being fetched from URL
 * - loading:     WASM + model weights are being initialized in memory
 * - ready:       Model is in memory and ready for inference
 * - error:       Loading or inference failed
 */
export type AiModelStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

/** Tool definition passed to the model's system prompt */
export interface AiTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

/** A parsed tool call extracted from the model's output */
export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** Step shown in the plan-generation progress UI */
export interface AiPlanStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  status: 'pending' | 'active' | 'done';
}
