import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiContext } from '../contexts/ai/AiContext.tsx';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * AI Trainer button for the bottom navigation bar.
 *
 * Shimmer colors:
 *  - Active (generating):           app primary gradient (blue)
 *  - Error:                       reddish glow
 *  - Needs user action (idle/downloading/loading): yellowish glow
 *
 * Short press  → navigate to /chat
 * Long press   → speech-to-text (held while pressed)
 */
export default function AiNavButton() {
  const navigate = useNavigate();
  const { modelStatus, modelError, isGenerating } = useAiContext();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);

  // ── Determine shimmer state ───────────────────────────────────────────────
  const hasError = modelStatus === 'error' || !!modelError;

  let shimmerClass = '';
  if (hasError) shimmerClass = 'ai-nav-shimmer ai-nav-shimmer--error';
  else if (isGenerating) shimmerClass = 'ai-nav-shimmer ai-nav-shimmer--active';

  // ── Speech-to-text helpers ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const W = window as any;
    const SpeechRecognitionCtor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: { results: Iterable<{ 0: { transcript: string } }> }) => {
      const transcript = Array.from(event.results)
        .map((r: { 0: { transcript: string } }) => r[0].transcript)
        .join(' ');
      if (transcript.trim()) {
        navigate('/chat', { state: { voiceInput: transcript.trim() } });
      }
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [navigate]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // ── Press handlers ────────────────────────────────────────────────────────
  const handlePressDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      startListening();
    }, 500);
  }, [startListening]);

  const handlePressUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      stopListening();
    }
    if (!isLongPress.current) {
      navigate('/chat');
    }
  }, [navigate, stopListening]);

  const handlePressLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      stopListening();
    }
  }, [stopListening]);

  return (
    <button
      type="button"
      className={`relative p-3 transition-all duration-200 active:scale-90 text-on-surface-variant hover:text-on-surface ${shimmerClass}`}
      aria-label="AI Trainer"
      onPointerDown={handlePressDown}
      onPointerUp={handlePressUp}
      onPointerLeave={handlePressLeave}
      onContextMenu={e => e.preventDefault()}
    >
      <span className="material-symbols-outlined flex items-center justify-center relative z-10">
        neurology
      </span>
    </button>
  );
}
