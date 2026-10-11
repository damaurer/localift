import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRemoteModelUrl, isValidModelUrl } from '../ai/model-manifest.ts';

const HF_URL = 'https://huggingface.co/org/repo/resolve/main/model-Q4_0.gguf';

describe('isValidModelUrl', () => {
  it('accepts https HuggingFace GGUF URLs', () => {
    expect(isValidModelUrl(HF_URL)).toBe(true);
  });

  it('rejects other hosts, protocols and file types', () => {
    expect(isValidModelUrl('https://evil.example/model.gguf')).toBe(false);
    expect(isValidModelUrl('http://huggingface.co/org/repo/resolve/main/m.gguf')).toBe(false);
    expect(isValidModelUrl('https://huggingface.co/org/repo/resolve/main/m.bin')).toBe(false);
    expect(isValidModelUrl(42)).toBe(false);
    expect(isValidModelUrl('not a url')).toBe(false);
  });
});

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
}

describe('fetchRemoteModelUrl', () => {
  beforeEach(() => setOnline(true));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the manifest URL when valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: HF_URL }) }));
    await expect(fetchRemoteModelUrl()).resolves.toBe(HF_URL);
  });

  it('returns null for invalid manifests and HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://x.y/z.gguf' }) }));
    await expect(fetchRemoteModelUrl()).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(fetchRemoteModelUrl()).resolves.toBeNull();
  });

  it('returns null on network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchRemoteModelUrl()).resolves.toBeNull();
  });

  it('skips the request when offline', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setOnline(false);
    await expect(fetchRemoteModelUrl()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
