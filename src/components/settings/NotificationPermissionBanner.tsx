import React from 'react';

interface NotificationPermissionBannerProps {
    notifPermission: NotificationPermission | 'default';
    handleRequestPermission: () => Promise<void>;
}

const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
    notifPermission,
    handleRequestPermission,
}) => {
    if (notifPermission === 'granted') return null;

    return (
        <section className="mb-6">
            <button
                onClick={handleRequestPermission}
                disabled={notifPermission === 'denied'}
                className="w-full rounded-xl p-4 flex items-center gap-4 transition-colors"
                style={{
                    background: notifPermission === 'denied'
                        ? 'rgba(255, 110, 132, 0.05)'
                        : 'rgba(149, 170, 255, 0.08)',
                    border: notifPermission === 'denied'
                        ? '1px solid rgba(255, 110, 132, 0.2)'
                        : '1px solid rgba(149, 170, 255, 0.2)',
                }}
            >
                <span
                    className="material-symbols-outlined text-2xl"
                    style={{
                        color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff',
                        fontVariationSettings: "'FILL' 1"
                    }}
                >
                    {notifPermission === 'denied' ? 'notifications_off' : 'notifications'}
                </span>
                <div className="text-left">
                    <p className="font-bold text-sm" style={{
                        fontFamily: 'Space Grotesk, sans-serif',
                        color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff'
                    }}>
                        {notifPermission === 'denied' ? 'Benachrichtigungen blockiert' : 'Benachrichtigungen aktivieren'}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {notifPermission === 'denied'
                            ? 'In den Browser-Einstellungen entsperren'
                            : 'Erlaubnis erteilen für Erinnerungen & Abschluss-Alerts'}
                    </p>
                </div>
                {notifPermission === 'default' && (
                    <span className="material-symbols-outlined text-primary ml-auto">chevron_right</span>
                )}
            </button>
        </section>
    );
};

export default NotificationPermissionBanner;
