import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nContext.tsx';
import { LayoutContext } from './contexts/LayoutContext.tsx';
import { SettingContext } from './contexts/settings/SettingsContext.tsx';
import type { AppSettings } from './types/app.types.ts';
import { vi } from 'vitest';

const DEFAULT_TEST_SETTINGS: AppSettings = {
  weightUnit: 'kg',
  language: 'de',
  theme: 'dark',
  reminderEnabled: false,
  reminderTime: '07:00',
  reminderDays: [true, true, true, true, true, false, false],
  vibration: true,
  aiTrainer: { enabled: false, modelUrl: '' },
};

function SettingsMock({ children }: { children: ReactNode }) {
  return (
    <SettingContext.Provider value={{
      settings: DEFAULT_TEST_SETTINGS,
      updateSettings: vi.fn(),
      clearAllData: vi.fn(),
      importBackup: vi.fn(),
    }}>
      {children}
    </SettingContext.Provider>
  );
}

export function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider language="de">
        <SettingsMock>
          <LayoutContext.Provider value={{ setHeaderConfig: vi.fn() }}>
            {children}
          </LayoutContext.Provider>
        </SettingsMock>
      </I18nProvider>
    </MemoryRouter>
  );
}

export function createTestWrapper(path = '/') {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider language="de">
        <SettingsMock>
          <LayoutContext.Provider value={{ setHeaderConfig: vi.fn() }}>
            {children}
          </LayoutContext.Provider>
        </SettingsMock>
      </I18nProvider>
    </MemoryRouter>
  );
}
