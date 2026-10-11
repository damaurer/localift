### Build & Run

- **Install dependencies**: `pnpm install` (pnpm only — never npm/yarn; version pinned via `packageManager`)
- **Dev server**: `pnpm dev` (Vite with HTTPS via `mkcert`, host `0.0.0.0`)
- **Production build**: `pnpm build` (runs `tsc -b && vite build`)
- **Preview build**: `pnpm preview`
- **Lint**: `pnpm lint`
- The `VITE_BASE_URL` env var controls the base path (defaults to `/`; set by CI for GitHub Pages).
- COOP/COEP headers are configured in `vite.config.ts` for both `server` and `preview` — required by the WASM-based AI trainer (`@wllama/wllama`).
- `@wllama/wllama` is excluded from `optimizeDeps` and has a custom `paths` mapping in `tsconfig.app.json` to use its pre-compiled ESM declarations.

### Testing

Vitest and `@testing-library/react` are installed as dev dependencies. No special config file is needed — Vitest picks up the Vite config automatically.

**Run all tests:**
```
pnpm test
```

**Run in watch mode:**
```
pnpm exec vitest
```

**Run a specific test file:**
```
pnpm exec vitest run src/data/storage.test.ts
```

**Adding tests:** Place test files next to the source file using the `*.test.ts` / `*.test.tsx` naming convention. For React component tests, use `jsdom` environment via a `// @vitest-environment jsdom` comment at the top of the file or by adding `test: { environment: 'jsdom' }` to `vite.config.ts`.

**Example unit test** (`src/data/storage.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { calcTotalVolume, calcTotalSets, generateId } from './storage.ts';

describe('calcTotalVolume', () => {
  it('sums weight × reps across all sets and exercises', () => {
    const exercises = [
      { loggedSets: [{ weight: 100, reps: 5 }, { weight: 80, reps: 8 }] },
      { loggedSets: [{ weight: 60, reps: 10 }] },
    ];
    expect(calcTotalVolume(exercises)).toBe(1740);
  });
});

describe('calcTotalSets', () => {
  it('counts total logged sets', () => {
    const exercises = [
      { loggedSets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      { loggedSets: [{ weight: 0, reps: 0 }] },
    ];
    expect(calcTotalSets(exercises)).toBe(3);
  });
});

describe('generateId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});
```

### Code Style

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` enabled.
- Use `type` keyword for type-only imports (enforced by `verbatimModuleSyntax`): `import type { Foo } from '...'`.
- Include `.ts`/`.tsx` extensions in import paths (enabled by `allowImportingTsExtensions`).
- ESLint config uses `typescript-eslint` recommended rules plus `react-hooks` and `react-refresh` plugins.
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config` file — config is in CSS).
- React 19 with `react-router-dom` v7 for routing.
- PWA uses `injectManifest` strategy with a custom service worker at `src/sw.ts` (Workbox).

### Project Architecture

- `src/data/db.ts` — IndexedDB wrapper (low-level get/set/delete).
- `src/data/storage.ts` — Storage facade over IndexedDB + localStorage; pure utility functions (`calcTotalVolume`, `calcTotalSets`, `generateId`).
- `src/types/` — Shared TypeScript type definitions (`workout.types.ts`, `nutrition.types.ts`, `app.types.ts`).
- `src/ai/` — AI trainer integration using `@wllama/wllama` (GGUF models via WebAssembly).
- `src/contexts/` — React context providers (e.g., `AiContext.tsx`).
- `src/components/` — Reusable UI components.
- `src/screens/` — Page-level screen components.
- UI language in the app is German.
