import { useCallback, useEffect, useRef, useState } from 'react';

import type { Translations } from '../i18n/types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ChatInputProps {
  onSend: (text: string) => void;
  isGenerating: boolean;
  modelReady: boolean;
  t: Translations;
}

export default function ChatInput({ onSend, isGenerating, modelReady, t }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');

  const showSendButton = input.trim().length > 0;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isGenerating || !modelReady) return;
    setInput('');
    onSend(text);
  }, [input, isGenerating, modelReady, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = useCallback(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const W = window as any;
    const SpeechRecognitionCtor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    transcriptRef.current = '';
    setRecordingDuration(0);

    recognition.onresult = (event: { results: { length: number; [index: number]: { 0: { transcript: string } } } }) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      // Auto-send transcribed text
      const text = transcriptRef.current.trim();
      if (text) {
        setInput('');
        onSend(text);
      }
    };

    recognition.start();
    setIsRecording(true);

    const start = Date.now();
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - start) / 1000));
    }, 500);
  }, [onSend]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
        style={{ background: 'rgba(149,170,255,0.1)' }} />
      <div className="relative flex items-center rounded-2xl p-2"
        style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant, rgba(72,72,71,0.1))' }}>

        {/* Recording indicator / Text input */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-on-surface font-bold tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
            </span>
            {input ? (
              <span className="text-sm text-on-surface/70 truncate flex-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {input}
              </span>
            ) : (
              <span className="text-xs text-outline uppercase tracking-widest">Aufnahme…</span>
            )}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.aiChat.messagePlaceholder}
            disabled={isGenerating}
            className="flex-1 bg-transparent border-none focus:outline-none text-on-surface text-sm px-3 py-3 placeholder:text-outline/50"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--color-on-surface)' }}
          />
        )}

        {/* Send / Mic button */}
        {showSendButton && !isRecording ? (
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)' }}
          >
            <span className="material-symbols-outlined text-sm" style={{ color: '#00247e' }}>send</span>
          </button>
        ) : (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (!isRecording && !isGenerating) startRecording();
            }}
            onPointerUp={() => {
              if (isRecording) stopRecording();
            }}
            onPointerLeave={() => {
              if (isRecording) stopRecording();
            }}
            disabled={isGenerating}
            className={`w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0 disabled:opacity-40 ${isRecording ? 'animate-pulse' : ''}`}
            style={{ background: isRecording ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)' : 'linear-gradient(135deg, #95aaff, #3766ff)' }}
          >
            <span className="material-symbols-outlined text-sm" style={{ color: isRecording ? '#fff' : '#00247e' }}>mic</span>
          </button>
        )}
      </div>
    </div>
  );
}
