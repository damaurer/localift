/**
 * Singleton wrapper around the wllama v2 WebAssembly inference engine.
 *
 * Only one Wllama instance is kept alive for the lifetime of the page.
 * Call loadModel() before runCompletion(); call unloadModel() to free memory.
 */

import { Wllama } from '@wllama/wllama';
import { WLLAMA_CONFIG_PATHS } from './wllama-config.ts';

let instance: Wllama | null = null;
let _modelLoaded = false;

function getInstance(): Wllama {
  if (!instance) {
    instance = new Wllama(WLLAMA_CONFIG_PATHS, {
      suppressNativeLog: true,
      logger: {
        debug: () => {},
        log: () => {},
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
  const wllama = getInstance();
  _modelLoaded = false;

  await wllama.loadModelFromUrl(modelUrl, {
    n_ctx: 4096,
    useCache: true,
    progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
      onProgress(total > 0 ? loaded / total : 0);
    },
  });

  _modelLoaded = true;
}

export function isModelLoaded(): boolean {
  return _modelLoaded;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  onToken?: (piece: string, fullText: string) => boolean | void;
}

export async function runCompletion(
  prompt: string,
  options: CompletionOptions = {},
): Promise<string> {
  if (!instance || !_modelLoaded) {
    throw new Error('Kein Modell geladen. Bitte zuerst ein Modell installieren.');
  }

  const result = await instance.createCompletion(prompt, {
    nPredict: options.maxTokens ?? 1024,
    sampling: {
      temp: options.temperature ?? 0.7,
      top_p: 0.95,
    },
    onNewToken: (
      _token: number,
      piece: Uint8Array,
      currentText: string,
      optionals: { abortSignal: () => void },
    ) => {
      if (options.onToken) {
        const pieceStr = new TextDecoder().decode(piece);
        const shouldContinue = options.onToken(pieceStr, currentText);
        if (shouldContinue === false) {
          optionals.abortSignal();
        }
      }
    },
  });

  return result;
}

export async function unloadModel(): Promise<void> {
  if (instance) {
    try { await instance.exit(); } catch { /* ignore */ }
    instance = null;
    _modelLoaded = false;
  }
}
