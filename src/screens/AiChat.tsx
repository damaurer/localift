import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useHeader } from '../contexts/LayoutContext';
import { useAiContext } from '../contexts/ai/AiContext.tsx';
import { useSettingsContext } from '../contexts/settings/SettingsContext.tsx';

const QUICK_ACTIONS = [
  { label: 'Plan analysieren', icon: 'tune', prompt: 'Analysiere bitte meine letzten Trainingseinheiten und gib mir Feedback zu meinem Fortschritt.' },
  { label: 'Trainingstipp', icon: 'lightbulb', prompt: 'Gib mir einen hilfreichen Tipp für mein heutiges Training.' },
  { label: 'Regeneration', icon: 'self_improvement', prompt: 'Was empfiehlst du mir für eine optimale Regeneration nach intensivem Training?' },
  { label: 'Neuer Plan', icon: 'event_note', prompt: 'Erstelle mir einen ausgewogenen Trainingsplan für die nächsten 4 Wochen.' },
];

export default function AiChat() {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const {
    messages,
    isGenerating,
    generatingContext,
    activeToolName,
    modelStatus,
    sendMessage,
    clearChat,
    installModel,
    downloadProgress,
  } = useAiContext();

  const planIsRunning = isGenerating && generatingContext === 'plan';

  useHeader(
    {
      showBack: true,
      title: 'LOCALLIFT AI',
      subtitle: modelStatus === 'ready'
        ? (isGenerating ? (activeToolName ? `⚙ ${activeToolName}…` : 'Schreibt…') : 'Bereit')
        : undefined,
      rightContent: modelStatus === 'ready' ? (
        <button
          onClick={clearChat}
          className="text-on-surface-variant hover:text-on-surface transition-colors active:scale-90"
          title="Chat leeren"
        >
          <span className="material-symbols-outlined text-base">delete_sweep</span>
        </button>
      ) : undefined,
    },
    [modelStatus, isGenerating, activeToolName, clearChat],
  );

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI not enabled guard — navigate in effect to avoid render-time side effect
  useEffect(() => {
    if (!settings.aiTrainer.enabled) {
      navigate('/settings');
    }
  }, [settings.aiTrainer.enabled, navigate]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  if (!settings.aiTrainer.enabled) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating || modelStatus !== 'ready') return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // ── Model not loaded state ─────────────────────────────────────────────────
  if (modelStatus !== 'ready') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Ambient glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-[120px]"
            style={{ background: 'rgba(149,170,255,0.05)' }} />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-[120px]"
            style={{ background: 'rgba(55,102,255,0.05)' }} />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32 pt-20">
          <div className="w-full max-w-sm space-y-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)' }}>
              <span className="material-symbols-outlined text-4xl" style={{
                color: '#00247e',
                fontVariationSettings: "'FILL' 1"
              }}>psychology</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                LOCALLIFT AI
              </p>
              <h2 className="text-3xl font-black tracking-tighter"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Kein Modell geladen
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {modelStatus === 'error'
                  ? 'Das Modell konnte nicht geladen werden. Überprüfe die Modell-URL in den Einstellungen.'
                  : 'Installiere das KI-Modell in den Einstellungen um den Chat zu starten.'}
              </p>
            </div>

            {/* Progress bar during download/loading */}
            {(modelStatus === 'downloading' || modelStatus === 'loading') && (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-black italic tracking-tighter"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {modelStatus === 'downloading'
                      ? `${Math.round(downloadProgress * 100)}`
                      : '100'}
                    <span className="text-primary-dim">%</span>
                  </span>
                  <span className="text-xs uppercase tracking-widest text-on-surface-variant">
                    {modelStatus === 'downloading' ? 'Herunterladen' : 'Wird geladen…'}
                  </span>
                </div>
                <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: modelStatus === 'loading' ? '100%' : `${downloadProgress * 100}%`,
                      background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                    }}
                  />
                </div>
                {modelStatus === 'downloading' && (
                  <p className="text-xs text-on-surface-variant">
                    Das Modell wird beim nächsten Start aus dem Cache geladen.
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {(modelStatus === 'idle' || modelStatus === 'error') && (
              <div className="space-y-3">
                <button
                  onClick={installModel}
                  className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                    color: '#00247e',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                >
                  Modell installieren
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  style={{ background: 'rgba(72,72,71,0.3)' }}
                >
                  Einstellungen öffnen
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Main chat UI ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-[120px]"
          style={{ background: 'rgba(149,170,255,0.05)' }} />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-[120px]"
          style={{ background: 'rgba(55,102,255,0.05)' }} />
      </div>

      {/* Messages */}
      <main className="flex-1 pt-20 pb-44 px-4 max-w-2xl mx-auto w-full flex flex-col">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(149,170,255,0.1)' }}>
              <span className="material-symbols-outlined text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LOCALLIFT AI</p>
            <p className="text-on-surface-variant text-sm max-w-xs leading-relaxed">
              Dein persönlicher Trainer. Frag mich nach Trainingstipps, Fortschrittsanalysen oder lass mich einen Plan für dich erstellen.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
              {/* Avatar row */}
              <div className={`flex items-center gap-3 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)' }}>
                    <span className="material-symbols-outlined text-sm"
                      style={{ color: '#00247e', fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-surface-bright">
                    <span className="material-symbols-outlined text-sm text-on-surface">person</span>
                  </div>
                )}
                <span className="font-black text-[10px] tracking-widest uppercase"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: msg.role === 'assistant' ? '#95aaff' : '#ffffff',
                  }}>
                  {msg.role === 'assistant' ? 'LOCALLIFT AI' : 'DU'}
                </span>
                <span className="text-[10px] text-outline">{formatTimestamp(msg.timestamp)}</span>
              </div>

              {/* Bubble */}
              <div
                className="rounded-xl p-4 text-sm leading-relaxed"
                style={msg.role === 'assistant'
                  ? {
                    background: '#20201f',
                    borderLeft: '2px solid #95aaff',
                    color: '#ffffff',
                    whiteSpace: 'pre-wrap',
                  }
                  : {
                    background: '#2c2c2c',
                    color: '#ffffff',
                    whiteSpace: 'pre-wrap',
                  }}
              >
                {msg.content || (msg.isStreaming ? '' : '…')}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
                    style={{ background: '#95aaff' }} />
                )}
              </div>
            </div>
          ))}

          {/* Tool-execution indicator */}
          {isGenerating && activeToolName && (
            <div className="flex items-center gap-3 max-w-[88%]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(149,170,255,0.15)' }}>
                <span className="material-symbols-outlined text-sm text-primary animate-spin">sync</span>
              </div>
              <div className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary"
                style={{ background: 'rgba(149,170,255,0.08)', borderLeft: '2px solid rgba(149,170,255,0.3)' }}>
                ⚙ {activeToolName.replace(/_/g, ' ')}…
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </main>

      {/* Input area (sticky) */}
      <div className="fixed bottom-0 left-0 w-full px-4 pb-28"
        style={{ background: 'linear-gradient(to top, #0e0e0e 60%, transparent)' }}>
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Busy banner — plan generator is running */}
          {planIsRunning && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(149,170,255,0.08)', border: '1px solid rgba(149,170,255,0.2)' }}>
              <span className="material-symbols-outlined text-primary text-base animate-spin">sync</span>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                KI erstellt gerade einen Trainingsplan…
              </p>
            </div>
          )}

          {/* Quick action chips */}
          {messages.length === 0 && !planIsRunning && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => {
                    if (!isGenerating && modelStatus === 'ready') {
                      sendMessage(a.prompt);
                    }
                  }}
                  className="whitespace-nowrap px-4 py-2.5 rounded-xl text-white text-xs font-bold tracking-widest uppercase transition-all active:scale-95 flex items-center gap-2 shrink-0"
                  style={{ background: '#262626' }}
                >
                  <span className="material-symbols-outlined text-primary text-base">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'rgba(149,170,255,0.1)' }} />
            <div className="relative flex items-center rounded-2xl p-2"
              style={{ background: '#20201f', border: '1px solid rgba(72,72,71,0.1)' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nachricht an LOCALLIFT AI…"
                disabled={isGenerating}
                className="flex-1 bg-transparent border-none focus:outline-none text-on-surface text-sm px-3 py-3 placeholder:text-outline/50"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)' }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: '#00247e' }}>send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
