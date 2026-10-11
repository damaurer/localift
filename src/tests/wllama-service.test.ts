import { beforeEach, describe, expect, it, vi } from 'vitest';

const engine = vi.hoisted(() => ({
  failures: [] as string[],
  calls: [] as { cache_prompt?: boolean }[],
}));

vi.mock('@wllama/wllama', () => {
  class WllamaAbortError extends Error {}
  class Wllama {
    cacheManager = { delete: vi.fn() };
    async loadModelFromUrl() {}
    async exit() {}
    async createChatCompletion(params: { cache_prompt?: boolean; onData: (chunk: unknown) => void }) {
      engine.calls.push({ cache_prompt: params.cache_prompt });
      const failure = engine.failures.shift();
      if (failure) throw new Error(failure);
      params.onData({ choices: [{ delta: { content: 'Hallo' } }] });
    }
  }
  return { Wllama, WllamaAbortError };
});
vi.mock('../ai/wllama-config.ts', () => ({ WLLAMA_CONFIG_PATHS: { default: 'wllama.wasm' } }));

const service = await import('../ai/wllama-service.ts');

beforeEach(async () => {
  engine.failures = [];
  engine.calls = [];
  await service.unloadModel();
  await service.loadModel('https://huggingface.co/x/y/resolve/main/m.gguf', () => {});
});

describe('runChatCompletion', () => {
  it('uses the prompt cache by default', async () => {
    const result = await service.runChatCompletion([{ role: 'user', content: 'Hi' }]);
    expect(result.text).toBe('Hallo');
    expect(engine.calls).toEqual([{ cache_prompt: true }]);
  });

  it('retries once without the prompt cache when the context is reported as exceeded', async () => {
    engine.failures = ['Context size has been exceeded.'];
    const result = await service.runChatCompletion([{ role: 'user', content: 'Hi' }]);
    expect(result.text).toBe('Hallo');
    expect(engine.calls).toEqual([{ cache_prompt: true }, { cache_prompt: false }]);
  });

  it('gives up when the retry fails too', async () => {
    engine.failures = ['Context size has been exceeded.', 'Context size has been exceeded.'];
    await expect(service.runChatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Context size');
    expect(engine.calls).toHaveLength(2);
  });

  it('reports unsupported grammars for json schema requests', async () => {
    engine.failures = ['Failed to initialize samplers: failed to parse grammar'];
    await expect(service.runChatCompletion([{ role: 'user', content: 'Hi' }], { jsonSchema: { type: 'object' } }))
      .rejects.toBeInstanceOf(service.GrammarUnsupportedError);
  });
});
