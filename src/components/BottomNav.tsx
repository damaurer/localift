import { useApp } from '../context';
import type { NavTab, AppRoute } from '../types';

const NAV_ITEMS: { tab: NavTab; icon: string; label: string; route: AppRoute }[] = [
  { tab: 'dashboard', icon: 'grid_view', label: 'Home', route: { screen: 'dashboard' } },
  { tab: 'plans', icon: 'event_note', label: 'Pläne', route: { screen: 'plans' } },
  { tab: 'history', icon: 'history', label: 'Verlauf', route: { screen: 'history' } },
  { tab: 'settings', icon: 'settings', label: 'Einstellungen', route: { screen: 'settings' } },
];

function getActiveTab(route: AppRoute): NavTab | null {
  switch (route.screen) {
    case 'dashboard': return 'dashboard';
    case 'plans':
    case 'plan-detail':
    case 'exercise-config': return 'plans';
    case 'history':
    case 'history-detail': return 'history';
    case 'settings': return 'settings';
    default: return null;
  }
}

export default function BottomNav() {
  const { route, navigate } = useApp();
  const activeTab = getActiveTab(route);

  return (
    <nav
      className="fixed bottom-5 left-0 right-0 z-50 flex justify-around items-center mx-auto max-w-md px-4 py-2 w-[90%]"
      style={{
        background: 'rgba(32, 32, 31, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        boxShadow: '0 0 32px 0 rgba(255,255,255,0.06)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => navigate(item.route)}
            className={`p-3 transition-all duration-200 active:scale-90 ${
              isActive
                ? 'bg-primary text-on-primary rounded-xl scale-110'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            aria-label={item.label}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : undefined }}
            >
              {item.icon}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
