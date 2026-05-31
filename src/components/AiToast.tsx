import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAiContext } from '../contexts/ai/AiContext.tsx';
import { useSettingsContext } from '../contexts/settings/SettingsContext.tsx';
import { useTranslation } from '../i18n/I18nContext.tsx';

interface ToastData {
  type: 'success' | 'error';
  title: string;
  description?: string;
}

/**
 * Shows toast notifications for AI events when the user is NOT on /chat.
 *
 * - AI finishes generating → success toast
 * - AI error → error toast
 */
export default function AiToast() {
  const { isGenerating, modelError, modelStatus } = useAiContext();
  const { settings } = useSettingsContext();
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslation();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const prevGenerating = useRef(isGenerating);
  const prevError = useRef(modelError);
  const isOnChat = location.pathname === '/chat';

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }, []);

  // Track generation completion
  useEffect(() => {
    if (prevGenerating.current && !isGenerating && !isOnChat) {
      setToast({
        type: 'success',
        title: t.aiToast.responseReady,
        description: t.aiToast.responseReadyDesc,
      });
      setVisible(true);
    }
    prevGenerating.current = isGenerating;
  }, [isGenerating, isOnChat, t]);

  // Track error changes
  useEffect(() => {
    if (modelError && modelError !== prevError.current && !isOnChat) {
      setToast({
        type: 'error',
        title: t.aiToast.aiError,
        description: modelError,
      });
      setVisible(true);
    }
    prevError.current = modelError;
  }, [modelError, isOnChat, t]);

  // Hide toast when navigating to chat
  useEffect(() => {
    if (isOnChat && toast) {
      dismiss();
    }
  }, [isOnChat, toast, dismiss]);

  if (!settings.aiTrainer.enabled || !toast) return null;

  const isError = toast.type === 'error';
  const borderColor = isError ? 'rgba(255, 110, 132, 0.4)' : 'rgba(149, 170, 255, 0.4)';
  const bgColor = isError ? 'rgba(255, 110, 132, 0.08)' : 'rgba(149, 170, 255, 0.08)';
  const iconColor = isError ? '#ff6e84' : '#95aaff';
  const icon = isError ? 'error' : 'neurology';
  // Only show error status indicator for actual model errors
  const statusColor = isError && modelStatus === 'error' ? '#ff6e84' : '#95aaff';

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-[100] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className="rounded-2xl p-4 backdrop-blur-xl flex items-start gap-3 shadow-lg"
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${iconColor}20` }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: statusColor }}
            />
            <p className="text-sm font-bold tracking-tight text-on-surface truncate">
              {toast.title}
            </p>
          </div>
          {toast.description && (
            <p className="text-xs text-on-surface-variant line-clamp-2">
              {toast.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => { dismiss(); navigate('/chat'); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
              style={{
                background: isError ? 'rgba(255, 110, 132, 0.15)' : 'rgba(149, 170, 255, 0.15)',
                color: isError ? '#ff6e84' : '#95aaff',
              }}
            >
              {t.aiToast.openChat}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {t.aiToast.dismiss}
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
