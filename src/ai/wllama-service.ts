/**
 * Singleton wrapper around the wllama v3 WebAssembly inference engine.
 *
 * Only one Wllama instance is kept alive for the lifetime of the page.
 * Call loadModel() before runChatCompletion(); call unloadModel() to free memory.
 *
 * Prompts are rendered with the model's own Jinja chat template and tool calls
 * are parsed natively by llama.cpp, so models with different chat formats
 * (ChatML, Gemma, LFM, …) can be swapped without code changes.
 */

import { Wllama, WllamaAbortError } from '@wllama/wllama';
import type { ChatCompletionMessage, ChatCompletionTool } from '@wllama/wllama';
import { WLLAMA_CONFIG_PATHS } from './wllama-config.ts';
import type { AiTool, AiToolCall } from '../types/ai.types.ts';

export type ChatMessage = ChatCompletionMessage;

let instance: Wllama | null = null;
let _modelLoaded = false;
let _loadingPromise: Promise<void> | null = null;
let _nativeToolsSupported = true;

/**
 * Thrown when llama.cpp cannot build the tool-call grammar for the loaded
 * model's chat template. Callers should fall back to a text tool protocol.
 */
export class NativeToolsUnsupportedError extends Error {
  constructor() {
    super('Native tool calling is not supported by this model');
    this.name = 'NativeToolsUnsupportedError';
  }
}

/** Thrown when llama.cpp cannot build the grammar for a `jsonSchema` request. */
export class GrammarUnsupportedError extends Error {
  constructor() {
    super('Grammar-constrained output is not supported by this model');
    this.name = 'GrammarUnsupportedError';
  }
}

function getInstance(): Wllama {
  if (!instance) {
    instance = new Wllama(WLLAMA_CONFIG_PATHS, {
      suppressNativeLog: true,
      logger: {
        log: () => {},
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    });
  }
  return instance;
}

export async function loadModel(
  modelUrl: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  // Prevent concurrent loads which cause "Entry already exists" Cache API errors
  if (_loadingPromise) {
    return _loadingPromise;
  }

  const doLoad = async () => {
    const wllama = getInstance();
    _modelLoaded = false;
    _nativeToolsSupported = true;

    await wllama.loadModelFromUrl(modelUrl, {
      n_ctx: 4096,
      jinja: true,
      useCache: true,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
        onProgress(total > 0 ? loaded / total : 0);
      },
    });

    _modelLoaded = true;
  };

  _loadingPromise = doLoad().finally(() => {
    _loadingPromise = null;
  });

  return _loadingPromise;
}

export function isModelLoaded(): boolean {
  return _modelLoaded;
}

/** False once native tool calling failed for the currently loaded model. */
export function supportsNativeTools(): boolean {
  return _nativeToolsSupported;
}

export interface ChatCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  /** Tools offered to the model; calls come back parsed in `toolCalls`. */
  tools?: AiTool[];
  /**
   * JSON schema the output must follow (grammar-constrained by llama.cpp).
   * Throws GrammarUnsupportedError when the grammar cannot be built.
   */
  jsonSchema?: Record<string, unknown>;
  /** Streamed visible text. Return false to stop generation early. */
  onToken?: (piece: string, fullText: string) => boolean | void;
}

export interface ChatCompletionResult {
  /** Visible assistant text (native tool-call markup is already removed). */
  text: string;
  /** Natively parsed tool calls, in the order the model emitted them. */
  toolCalls: AiToolCall[];
}

function toChatTool(tool: AiTool): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function runChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  if (!instance || !_modelLoaded) {
    throw new Error('Kein Modell geladen. Bitte zuerst ein Modell installieren.');
  }

  const controller = new AbortController();
  let text = '';
  const pendingCalls: { name: string; arguments: string }[] = [];

  try {
    await instance.createChatCompletion({
      messages,
      stream: true,
      abortSignal: controller.signal,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      top_p: 0.95,
      tools: options.tools?.length ? options.tools.map(toChatTool) : undefined,
      tool_choice: options.tools?.length ? 'auto' : undefined,
      response_format: options.jsonSchema
        ? { type: 'json_schema', json_schema: { name: 'output', schema: options.jsonSchema, strict: true } }
        : undefined,
      // Hybrid reasoning models (Qwen3 & co.) would otherwise think out loud
      // before every answer — far too slow for in-browser inference.
      chat_template_kwargs: { enable_thinking: false },
      onData: chunk => {
        const delta = chunk.choices[0]?.delta;
        if (!delta) return;

        for (const call of delta.tool_calls ?? []) {
          const entry = (pendingCalls[call.index] ??= { name: '', arguments: '' });
          if (call.function?.name) entry.name += call.function.name;
          if (call.function?.arguments) entry.arguments += call.function.arguments;
        }

        if (delta.content) {
          text += delta.content;
          if (options.onToken?.(delta.content, text) === false) {
            controller.abort();
          }
        }
      },
    });
  } catch (err) {
    if (err instanceof Error && /parse grammar/i.test(err.message)) {
      if (options.jsonSchema) throw new GrammarUnsupportedError();
      if (options.tools?.length) {
        _nativeToolsSupported = false;
        throw new NativeToolsUnsupportedError();
      }
    }
    if (!(err instanceof WllamaAbortError) && !controller.signal.aborted) throw err;
  }

  return {
    text,
    toolCalls: pendingCalls
      .filter(call => call?.name)
      .map(call => ({ name: call.name, arguments: parseToolArguments(call.arguments) })),
  };
}

/** Remove a previously downloaded model from the browser cache (best effort). */
export async function deleteCachedModel(modelUrl: string): Promise<void> {
  try {
    await getInstance().cacheManager.delete(modelUrl);
  } catch (err) {
    console.warn('[wllama] could not delete cached model:', err);
  }
}

export async function unloadModel(): Promise<void> {
  if (instance) {
    try { await instance.exit(); } catch { /* ignore */ }
    instance = null;
    _modelLoaded = false;
  }
}
