/**
 * wllama v3 WebAssembly path configuration for Vite.
 *
 * Since v3.1 wllama ships a single WASM binary that switches between
 * single-thread, multi-thread and WebGPU at runtime.
 *
 * The `?url` import instructs Vite to copy the WASM file into the build
 * output directory and return its hashed public URL at bundle time.
 *
 * vite.config.ts must include:
 *   assetsInclude: ['**\/*.wasm'],
 *   optimizeDeps: { exclude: ['@wllama/wllama'] }
 *
 * Multi-thread requires COOP + COEP response headers (not available on GitHub
 * Pages); WebGPU is used automatically when the browser supports it.
 */

import type { AssetsPathConfig } from '@wllama/wllama';

import wllamaWasm from '@wllama/wllama/esm/wasm/wllama.wasm?url';

export const WLLAMA_CONFIG_PATHS: AssetsPathConfig = {
  default: wllamaWasm,
};

/**
 * Default GGUF model URL (LFM2.5-1.2B-Instruct Q4_K_M, ~730 MB) — used until
 * the remote manifest (model.json, see model-manifest.ts) names another one.
 * The browser caches the file after the first download; subsequent loads are instant.
 */
export const DEFAULT_MODEL_URL =
  'https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/resolve/main/LFM2.5-1.2B-Instruct-Q4_K_M.gguf';
