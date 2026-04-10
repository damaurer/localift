/**
 * wllama v2 WebAssembly path configuration for Vite.
 *
 * In wllama v2, only the WASM file paths are required – the library
 * locates the JS glue files automatically relative to the WASM path.
 *
 * The `?url` imports instruct Vite to copy the WASM files into the
 * build output directory and return their hashed public URLs at bundle time.
 *
 * vite.config.ts must include:
 *   assetsInclude: ['**\/*.wasm'],
 *   optimizeDeps: { exclude: ['@wllama/wllama'] }
 *
 * Single-thread mode works on all browsers/hosts without COOP + COEP headers.
 * Enable multi-thread for ~2× inference speed if your deployment sets those headers.
 */

import type { AssetsPathConfig } from '@wllama/wllama';

// Single-thread WASM (universally compatible)
import wllamaWasmST from '@wllama/wllama/esm/single-thread/wllama.wasm?url';
// Multi-thread WASM (faster; requires SharedArrayBuffer + COOP/COEP response headers)
import wllamaWasmMT from '@wllama/wllama/esm/multi-thread/wllama.wasm?url';

export const WLLAMA_CONFIG_PATHS: AssetsPathConfig = {
  'single-thread/wllama.wasm': wllamaWasmST,
  'multi-thread/wllama.wasm': wllamaWasmMT,
};

/**
 * Default GGUF model URL (Qwen2.5-1.5B-Instruct Q4_K_M, ~900 MB).
 * The browser caches the file after the first download; subsequent loads are instant.
 *
 * Smaller alternatives:
 *  ~350 MB  Qwen/Qwen2.5-0.5B-Instruct-GGUF  → qwen2.5-0.5b-instruct-q8_0.gguf
 *  ~700 MB  bartowski/Llama-3.2-1B-Instruct-GGUF → Llama-3.2-1B-Instruct-Q4_K_M.gguf
 */
export const DEFAULT_MODEL_URL =
  'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf';
