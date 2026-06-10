import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';
import BottomNav from './BottomNav';
import AiToast from './AiToast.tsx';
import { LayoutContext } from '../contexts/LayoutContext';
import { useStableLayoutContext } from '../contexts/LayoutContext';
import type { HeaderConfig } from '../contexts/LayoutContext';

const MAIN_TABS = new Set(['/', '/plans', '/calories', '/history', '/settings']);
// Routes that render their own full-screen header — suppress the global one to avoid stacked sticky headers.
const OWN_HEADER_ROUTES = new Set(['/workout']);

export default function Layout() {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({});
  const location = useLocation();
  const showNav = MAIN_TABS.has(location.pathname);
  const showHeader = !OWN_HEADER_ROUTES.has(location.pathname);
  const contextValue = useStableLayoutContext(setHeaderConfig);

  return (
    <LayoutContext.Provider value={contextValue}>
      {showHeader && <Header {...headerConfig} />}
      <Outlet />
      {showNav && <BottomNav />}
      <AiToast />
    </LayoutContext.Provider>
  );
}
