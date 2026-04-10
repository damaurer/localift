/**
 * AiPlanGenerator – KI-gestützte Trainingsplan-Erstellung
 *
 * Design follows the Locallift Monolith system (ki_plan_erstellung/code.html).
 * Accessible from the Plans screen via the "KI Plan" button.
 *
 * Flow:
 *  1. User describes their goal (free text input)
 *  2. Screen shows animated generation steps (analyze → structure → finalize)
 *  3. Agent calls get_exercise_library, then create_workout_plan
 *  4. On success: redirect to Plans screen and show result
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAiContext } from '../contexts/ai/AiContext.tsx';
import { useSettingsContext } from '../contexts/settings/SettingsContext.tsx';
import { useHeader } from '../contexts/LayoutContext';
import type { AiPlanStep } from '../types/ai.types.ts';

const INITIAL_STEPS: AiPlanStep[] = [
  {
    id: 'analyze',
    label: 'Statistiken analysieren',
    description: 'Verfügbare Übungen und Trainingsverlauf werden ausgewertet.',
    icon: 'analytics',
    status: 'pending',
  },
  {
    id: 'structure',
    label: 'Blöcke strukturieren',
    description: 'Hypertrophie- und Kraftphasen werden sequenziert…',
    icon: 'grid_view',
    status: 'pending',
  },
  {
    id: 'finalize',
    label: 'Zeitplan finalisieren',
    description: 'Intensität wird auf deine Regenerationsfenster abgestimmt.',
    icon: 'calendar_today',
    status: 'pending',
  },
];

type GeneratorState = 'input' | 'generating' | 'done' | 'error';

export default function AiPlanGenerator() {
  const navigate = useNavigate();
  const { settings } = useSettingsContext();
  const { modelStatus, isGenerating, generatingContext, generatePlan, installModel, downloadProgress } = useAiContext();

  const chatIsRunning = isGenerating && generatingContext === 'chat';

  const [goal, setGoal] = useState('');
  const [state, setState] = useState<GeneratorState>('input');
  const [steps, setSteps] = useState<AiPlanStep[]>(INITIAL_STEPS);
  const [resultName, setResultName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useHeader({ showBack: true, title: 'KI Plan' }, []);

  // Guard
  useEffect(() => {
    if (!settings.aiTrainer.enabled) {
      navigate('/settings');
    }
  }, [settings.aiTrainer.enabled, navigate]);

  if (!settings.aiTrainer.enabled) return null;

  const advanceStep = (stepId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId);
      return prev.map((s, i) => ({
        ...s,
        status:
          i < idx ? 'done' :
          i === idx ? 'active' :
          'pending',
      }));
    });
  };

  const handleGenerate = async () => {
    if (!goal.trim() || isGenerating || modelStatus !== 'ready') return;

    setState('generating');
    setProgress(0);
    setErrorMsg(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' })));

    // Simulate step progression while the agent works
    advanceStep('analyze');
    setProgress(20);

    const stepTimer = setTimeout(() => {
      advanceStep('structure');
      setProgress(55);
    }, 3000);

    const stepTimer2 = setTimeout(() => {
      advanceStep('finalize');
      setProgress(80);
    }, 7000);

    try {
      const createdName = await generatePlan(goal.trim());
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
      setProgress(100);

      if (createdName) {
        setResultName(createdName);
        setState('done');
      } else {
        // Agent ran but no plan was created (model gave advice without creating plan)
        setResultName(null);
        setState('done');
      }
    } catch (err) {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setState('error');
    }
  };

  // ── Model not ready ────────────────────────────────────────────────────────
  if (modelStatus !== 'ready') {
    const isDownloading = modelStatus === 'downloading' || modelStatus === 'loading';
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(149,170,255,0.1)' }} />
          <div className="absolute bottom-1/4 -right-24 w-64 h-64 rounded-full blur-[100px]"
            style={{ background: 'rgba(55,102,255,0.1)' }} />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)' }}>
              <span className="material-symbols-outlined text-4xl"
                style={{ color: '#00247e', fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
            <h2 className="text-3xl font-black tracking-tighter"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {isDownloading ? 'Modell wird geladen…' : 'Modell erforderlich'}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {isDownloading
                ? 'Das KI-Modell wird heruntergeladen und vorbereitet. Dies dauert beim ersten Start etwas länger.'
                : 'Installiere das KI-Modell in den Einstellungen um Trainingspläne zu generieren.'}
            </p>

            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-black italic tracking-tighter"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {modelStatus === 'loading' ? '100' : Math.round(downloadProgress * 100)}
                    <span className="text-primary-dim">%</span>
                  </span>
                  <span className="text-xs uppercase tracking-widest text-on-surface-variant">
                    {modelStatus === 'loading' ? 'Initialisierung' : 'Download'}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: '#262626' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: modelStatus === 'loading' ? '100%' : `${downloadProgress * 100}%`,
                      background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                    }} />
                </div>
              </div>
            )}

            {(modelStatus === 'idle' || modelStatus === 'error') && (
              <div className="space-y-3">
                <button
                  onClick={installModel}
                  className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e', fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Modell installieren
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  style={{ background: 'rgba(72,72,71,0.3)' }}
                >
                  Einstellungen
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Result / done state ────────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(149,170,255,0.1)' }} />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(149,170,255,0.1)', border: '1px solid rgba(149,170,255,0.3)' }}>
              <span className="material-symbols-outlined text-4xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Abgeschlossen</p>
              <h2 className="text-3xl font-black tracking-tighter"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {resultName ? 'Plan erstellt!' : 'Analyse abgeschlossen'}
              </h2>
              {resultName && (
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Der Plan <span className="text-primary font-bold">„{resultName}"</span> wurde
                  erfolgreich erstellt und ist in deinen Plänen verfügbar.
                </p>
              )}
              {!resultName && (
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Die KI hat geantwortet. Falls kein Plan erstellt wurde, öffne den Chat für
                  eine detailliertere Anfrage.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/plans')}
                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {resultName ? 'Zu meinen Plänen' : 'Pläne öffnen'}
              </button>
              <button
                onClick={() => { setState('input'); setGoal(''); setResultName(null); }}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                style={{ background: 'rgba(72,72,71,0.3)' }}
              >
                Neuen Plan erstellen
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Generating state ───────────────────────────────────────────────────────
  if (state === 'generating') {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Ambient glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(149,170,255,0.1)' }} />
          <div className="absolute bottom-1/4 -right-24 w-64 h-64 rounded-full blur-[100px]"
            style={{ background: 'rgba(55,102,255,0.1)' }} />
        </div>

        <main className="pt-20 pb-32 px-6 flex flex-col items-center">
          <div className="w-full max-w-xl">
            {/* Hero text */}
            <div className="mb-12 space-y-3">
              <span className="font-black uppercase tracking-[0.3em] text-sm text-primary block"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Protocol Initialization</span>
              <h2 className="text-5xl font-black tracking-tighter leading-none"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ENGINEERING<br />
                <span style={{ color: '#2c2c2c' }}>YOUR EDGE.</span>
              </h2>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-12 gap-3 mb-10">
              {/* Status card */}
              <div className="col-span-8 rounded-xl p-6 relative overflow-hidden"
                style={{ background: '#1a1a1a' }}>
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined" style={{ fontSize: '72px' }}>psychology</span>
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Plan wird generiert
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed max-w-[200px]">
                      Die KI analysiert deine Übungen und erstellt einen individuellen Plan.
                    </p>
                  </div>
                  <div className="mt-6 space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-4xl font-black italic tracking-tighter"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {progress}<span className="text-primary-dim">%</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Optimierung</span>
                    </div>
                    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: '#262626' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #95aaff, #3766ff)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Energy card */}
              <div className="col-span-4 rounded-xl p-5 flex flex-col justify-between"
                style={{ background: '#20201f', border: '1px solid rgba(149,170,255,0.05)' }}>
                <span className="material-symbols-outlined text-primary text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Status</p>
                  <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    AKTIV
                  </p>
                </div>
              </div>
            </div>

            {/* Sequential steps */}
            <div className="space-y-5">
              {steps.map((step, idx) => (
                <div key={step.id}
                  className={`flex items-center gap-5 transition-opacity duration-500 ${step.status === 'pending' ? 'opacity-35' : 'opacity-100'}`}>
                  <div className="relative flex items-center justify-center shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
                      style={step.status === 'done'
                        ? { border: '1px solid #95aaff', background: 'rgba(149,170,255,0.1)' }
                        : step.status === 'active'
                          ? { border: '1px solid #3766ff', background: '#262626', animation: 'pulse 2s infinite' }
                          : { border: '1px solid rgba(72,72,71,0.2)', background: '#131313' }}
                    >
                      {step.status === 'done'
                        ? <span className="material-symbols-outlined text-primary text-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        : <span className="material-symbols-outlined text-lg"
                          style={{ color: step.status === 'active' ? '#3766ff' : '#767575' }}>{step.icon}</span>
                      }
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="absolute top-11 w-px h-5 opacity-30"
                        style={{ background: step.status === 'done' ? '#95aaff' : '#262626' }} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-base uppercase tracking-tight"
                      style={{
                        fontFamily: 'Space Grotesk, sans-serif',
                        color: step.status === 'active' ? '#95aaff' : step.status === 'done' ? '#ffffff' : '#767575',
                      }}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {step.status === 'active' ? <em>{step.description}</em> : step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Input state (default) ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: 'rgba(149,170,255,0.1)' }} />
        <div className="absolute bottom-1/4 -right-24 w-64 h-64 rounded-full blur-[100px]"
          style={{ background: 'rgba(55,102,255,0.1)' }} />
      </div>

      <main className="pt-20 pb-32 px-6 max-w-xl mx-auto">
        {/* Hero */}
        <div className="mb-12 space-y-3">
          <span className="font-black uppercase tracking-[0.3em] text-sm text-primary block"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LOCALLIFT AI</span>
          <h2 className="text-5xl font-black tracking-tighter leading-none"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ENGINEERING<br />
            <span style={{ color: '#2c2c2c' }}>YOUR EDGE.</span>
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
            Beschreibe dein Ziel. Die KI analysiert deine Übungsbibliothek und erstellt einen maßgeschneiderten Trainingsplan.
          </p>
        </div>

        {/* Goal suggestions */}
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Schnellauswahl</p>
          <div className="flex flex-wrap gap-2">
            {[
              '3-Tage Kraft für Anfänger',
              'Push/Pull/Legs Split',
              'Ganzkörper Hypertrophie',
              '4-Tage Upper/Lower',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setGoal(suggestion)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background: goal === suggestion
                    ? 'linear-gradient(135deg, #95aaff, #3766ff)'
                    : 'rgba(38,38,38,1)',
                  color: goal === suggestion ? '#00247e' : '#adaaaa',
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Goal input */}
        <div className="space-y-4 mb-8">
          <div className="relative group">
            <div className="absolute inset-0 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
              style={{ background: 'rgba(149,170,255,0.08)' }} />
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="z.B. Erstelle mir einen 4-Tage Hypertrophieplan mit Fokus auf Brust und Rücken…"
              rows={4}
              className="relative w-full rounded-xl p-5 text-sm text-on-surface focus:outline-none resize-none placeholder:text-outline/50 leading-relaxed"
              style={{
                background: '#20201f',
                border: '1px solid rgba(72,72,71,0.1)',
                fontFamily: 'Manrope, sans-serif',
              }}
            />
          </div>

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-error"
              style={{ background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)' }}>
              {errorMsg}
            </div>
          )}

          {chatIsRunning && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(149,170,255,0.08)', border: '1px solid rgba(149,170,255,0.2)' }}>
              <span className="material-symbols-outlined text-primary text-base animate-spin">sync</span>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                KI ist gerade im Chat aktiv…
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!goal.trim() || isGenerating}
            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #95aaff, #3766ff)',
              color: '#00247e',
              fontFamily: 'Space Grotesk, sans-serif',
              boxShadow: '0 0 32px rgba(149,170,255,0.2)',
            }}
          >
            <span className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            Plan generieren
          </button>
        </div>

        {/* Info */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: '#1a1a1a' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Wie es funktioniert</p>
          </div>
          <div className="space-y-2">
            {[
              { icon: 'database', text: 'Die KI nutzt ausschließlich Übungen aus deiner Bibliothek' },
              { icon: 'lock', text: 'Alles läuft lokal auf deinem Gerät – keine Cloud' },
              { icon: 'edit', text: 'Den Plan kannst du danach manuell anpassen' },
            ].map(item => (
              <div key={item.icon} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-outline text-base shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
