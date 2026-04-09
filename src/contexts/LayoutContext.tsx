import { createContext, useContext, useEffect, useMemo } from 'react';
import type { DependencyList, ReactNode } from 'react';

export interface HeaderConfig {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightContent?: ReactNode;
}

interface LayoutContextValue {
  setHeaderConfig: (config: HeaderConfig) => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within a Layout');
  return ctx;
}

/** Set the Header config for the current screen. Re-runs when deps change. */
export function useHeader(config: HeaderConfig, deps: DependencyList = []) {
  const { setHeaderConfig } = useLayoutContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setHeaderConfig(config); }, deps);
}

/** Stable context value — only re-creates when setHeaderConfig identity changes (never). */
export function useStableLayoutContext(setHeaderConfig: (c: HeaderConfig) => void) {
  return useMemo(() => ({ setHeaderConfig }), [setHeaderConfig]);
}
