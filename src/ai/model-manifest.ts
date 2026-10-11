/**
 * Remote model manifest.
 *
 * The public GitHub repo hosts a `model.json` on the main branch that names
 * the GGUF model the app should use:
 *
 *   { "url": "https://huggingface.co/<org>/<repo>/resolve/main/<file>.gguf" }
 *
 * On every app start (when online) the PWA fetches this file. If the URL
 * differs from the locally configured one, the new model is downloaded from
 * HuggingFace and replaces the old one.
 */

export const MODEL_MANIFEST_URL =
  'https://raw.githubusercontent.com/damaurer/localift/main/model.json';

const MANIFEST_TIMEOUT_MS = 5000;

export interface ModelManifest {
  url: string;
}

export function isValidModelUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && parsed.hostname === 'huggingface.co'
      && parsed.pathname.toLowerCase().endsWith('.gguf');
  } catch {
    return false;
  }
}

/**
 * Returns the model URL from the remote manifest, or null when offline,
 * on network/parse errors, or when the manifest is invalid.
 */
export async function fetchRemoteModelUrl(
  manifestUrl: string = MODEL_MANIFEST_URL,
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS);

  try {
    const res = await fetch(manifestUrl, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ModelManifest>;
    return isValidModelUrl(data.url) ? data.url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
