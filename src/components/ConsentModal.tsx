import { useState } from 'react';
import { storage, needsConsent } from '../data/storage';
import { CURRENT_CONSENT_VERSION } from '../types/app.types';
import { useTranslation } from '../i18n/I18nContext.tsx';

interface ConsentModalProps {
  /** When provided, renders in info-only mode (no checkbox/buttons, shows a close button) */
  onClose?: () => void;
}

export default function ConsentModal({ onClose }: ConsentModalProps = {}) {
  const [visible] = useState(() => onClose ? true : needsConsent());
  const [checked, setChecked] = useState(false);
  const t = useTranslation();

  const INFO_ITEMS = [
    { icon: 'device_hub', text: t.consent.dataLocal },
    { icon: 'cloud_off', text: t.consent.noServer },
    { icon: 'smart_toy', text: t.consent.aiLocal },
    { icon: 'notifications', text: t.consent.remindersOptional },
  ];

  if (!visible) return null;

  function handleAccept() {
    if (!checked) return;
    storage.saveConsent({
      accepted: true,
      version: CURRENT_CONSENT_VERSION,
      timestamp: Date.now(),
    });
    // Force re-render by reloading — simplest approach for a one-time gate
    window.location.reload();
  }

  function handleDecline() {
    // Clear any partial state and show a message; do not proceed
    window.close();
    // Fallback for browsers that block window.close()
    document.body.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0e0e0e;color:#888;font-family:sans-serif;font-size:14px;">${t.consent.closedMessage}</div>`;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl select-none"
              style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}
            >
              💪
            </span>
            <h2
              id="consent-title"
              className="text-lg font-bold flex-1"
              style={{ color: 'var(--color-text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {onClose ? t.consent.privacyTitle : t.consent.welcomeTitle}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}
                aria-label={t.common.close}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <p id="consent-description" className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {onClose
              ? t.consent.infoText
              : t.consent.introText}
          </p>

          {/* Info list */}
          <ul className="space-y-3 mb-5">
            {INFO_ITEMS.map(({ icon, text }) => (
              <li key={icon} className="flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-base mt-0.5 shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {icon}
                </span>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>

          {/* Checkbox — only in consent gate mode */}
          {!onClose && (
            <label
              className="flex items-start gap-3 cursor-pointer rounded-xl p-4 transition-all"
              style={{
                background: checked ? 'rgba(149,170,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${checked ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)'}`,
              }}
            >
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: checked ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${checked ? 'var(--color-primary)' : 'rgba(255,255,255,0.35)'}`,
                  }}
                >
                  {checked && (
                    <span className="material-symbols-outlined" style={{ color: '#0e0e0e', fontSize: '16px', fontVariationSettings: "'wght' 700" }}>
                      check
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {t.consent.checkboxLabel}
              </span>
            </label>
          )}
        </div>

        {/* Actions — only in consent gate mode */}
        {!onClose && (
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <button
              onClick={handleDecline}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.55)',
                border: '1.5px solid rgba(255,255,255,0.15)',
              }}
            >
              {t.consent.decline}
            </button>
            <button
              onClick={handleAccept}
              disabled={!checked}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: checked
                  ? 'linear-gradient(135deg, #95aaff, #3766ff)'
                  : 'rgba(255,255,255,0.06)',
                color: checked ? '#fff' : 'rgba(255,255,255,0.25)',
                border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                boxShadow: checked ? '0 4px 16px rgba(149,170,255,0.35)' : 'none',
                cursor: checked ? 'pointer' : 'not-allowed',
              }}
            >
              {t.consent.confirmAndContinue}
            </button>
          </div>
        )}

        {/* Close button row — only in info-only mode */}
        {onClose && (
          <div className="px-6 pb-6 pt-2">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(149,170,255,0.35)',
              }}
            >
              {t.consent.understood}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
