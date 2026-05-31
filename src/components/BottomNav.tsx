import {NavLink, useLocation} from 'react-router-dom';
import type {NavTab} from '../types/app.types.ts';
import {useTranslation} from '../i18n/I18nContext.tsx';
import {useSettingsContext} from '../contexts/settings/SettingsContext.tsx';
import AiNavButton from './AiNavButton.tsx';

export default function BottomNav() {
    const location = useLocation();
    const t = useTranslation();
    const {settings} = useSettingsContext();

    const LEFT_ITEMS: { tab: NavTab; icon: string; label: string; path: string }[] = [
        {tab: 'dashboard', icon: 'grid_view', label: t.nav.home, path: '/'},
        {tab: 'plans', icon: 'event_note', label: t.nav.plans, path: '/plans'},
    ];

    const RIGHT_ITEMS: { tab: NavTab; icon: string; label: string; path: string }[] = [
        {tab: 'calories', icon: 'restaurant', label: t.nav.calories, path: '/calories'},
        {tab: 'settings', icon: 'settings', label: t.nav.settings, path: '/settings'},
    ];

    const ALL_ITEMS = settings.aiTrainer.enabled ? [...LEFT_ITEMS, ...RIGHT_ITEMS] : [
        ...LEFT_ITEMS, ...RIGHT_ITEMS,
    ];

    return (
        <nav
            className="fixed bottom-5 left-0 right-0 z-50 flex justify-around items-center mx-auto max-w-md px-4 py-2 w-[90%]"
            style={{
                background: 'var(--nav-bg, rgba(32, 32, 31, 0.85))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: 'var(--nav-shadow, 0 0 32px 0 rgba(255,255,255,0.06))',
            }}
        >
            <>
                {LEFT_ITEMS.map(item => {
                    const isActive = item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.path);
                    return (
                        <NavLink
                            key={item.tab}
                            to={item.path}
                            className={`p-3 transition-all duration-200 active:scale-90 ${
                                isActive
                                    ? 'bg-primary text-on-primary rounded-xl scale-110'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                <span
                    className="material-symbols-outlined flex items-center justify-center"
                    style={{fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : undefined}}
                >
                  {item.icon}
                </span>
                        </NavLink>
                    );
                })}
                {settings.aiTrainer.enabled && <AiNavButton/>}
                {RIGHT_ITEMS.map(item => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <NavLink
                            key={item.tab}
                            to={item.path}
                            className={`p-3 transition-all duration-200 active:scale-90 ${
                                isActive
                                    ? 'bg-primary text-on-primary rounded-xl scale-110'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                <span
                    className="material-symbols-outlined flex items-center justify-center"
                    style={{fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : undefined}}
                >
                  {item.icon}
                </span>
                        </NavLink>
                    );
                })}
            </>
        </nav>
    );
}
