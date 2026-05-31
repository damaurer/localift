import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/I18nContext.tsx';

const DISMISSED_KEY = 'localift_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function isDismissed(): boolean {
  const val = localStorage.getItem(DISMISSED_KEY);
  if (!val) return false;
  return Date.now() - Number(val) < DISMISS_DURATION_MS;
}

function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export default function InstallPrompt() {
  const t = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInstalled() || isDismissed()) return;

    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl shadow-xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start gap-3 p-4">
        <div className="text-3xl select-none">💪</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {t.install.title}
          </p>
          {showIOS ? (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t.install.iosInstructions.split('<bold>').map((part, i) => {
                if (i === 0) return part;
                const [bold, rest] = part.split('</bold>');
                return <span key={i}><span className="font-medium">{bold}</span>{rest}</span>;
              })}
            </p>
          ) : (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t.install.androidDescription}
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={t.common.close}
        >
          ×
        </button>
      </div>
      {!showIOS && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={install}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {t.install.installButton}
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-2 rounded-xl text-sm"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
          >
            {t.install.notNow}
          </button>
        </div>
      )}
    </div>
  );
}
