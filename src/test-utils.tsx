import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nContext.tsx';
import { LayoutContext } from './contexts/LayoutContext.tsx';
import { vi } from 'vitest';

export function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider language="de">
        <LayoutContext.Provider value={{ setHeaderConfig: vi.fn() }}>
          {children}
        </LayoutContext.Provider>
      </I18nProvider>
    </MemoryRouter>
  );
}

export function createTestWrapper(path = '/') {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider language="de">
        <LayoutContext.Provider value={{ setHeaderConfig: vi.fn() }}>
          {children}
        </LayoutContext.Provider>
      </I18nProvider>
    </MemoryRouter>
  );
}
