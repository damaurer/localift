import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'localift_install_dismissed';

function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInstalled() || localStorage.getItem(DISMISSED_KEY)) return;

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
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
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
            LOCALlift installieren
          </p>
          {showIOS ? (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Tippe auf <span className="font-medium">Teilen</span> <span className="select-none">⎙</span> und dann auf{' '}
              <span className="font-medium">„Zum Home-Bildschirm"</span>, um die App zu installieren.
            </p>
          ) : (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Füge LOCALlift zum Home-Bildschirm hinzu für schnellen Zugriff ohne Browser.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Schließen"
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
            Installieren
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-2 rounded-xl text-sm"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
          >
            Nicht jetzt
          </button>
        </div>
      )}
    </div>
  );
}
