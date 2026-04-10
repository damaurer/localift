import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';
import BottomNav from './BottomNav';
import { LayoutContext } from '../contexts/LayoutContext';
import { useStableLayoutContext } from '../contexts/LayoutContext';
import type { HeaderConfig } from '../contexts/LayoutContext';

const MAIN_TABS = new Set(['/', '/plans', '/calories', '/history', '/settings']);

export default function Layout() {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({});
  const location = useLocation();
  const showNav = MAIN_TABS.has(location.pathname);
  const contextValue = useStableLayoutContext(setHeaderConfig);

  return (
    <LayoutContext.Provider value={contextValue}>
      <Header {...headerConfig} />
      <Outlet />
      {showNav && <BottomNav />}
    </LayoutContext.Provider>
  );
}
