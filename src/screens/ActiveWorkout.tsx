import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ActiveWorkout() {
  const {
    activeWorkout,
    updateActiveSet,
    completeSet,
    setExpandedExercise,
    finishWorkout,
    cancelWorkout,
    navigate,
  } = useApp();

  const [elapsed, setElapsed] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number; total: number } | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (!activeWorkout) return;
    const start = new Date(activeWorkout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer?.active) return;
    if (restTimer.seconds <= 0) {
      setRestTimer(null);
      return;
    }
    const id = setTimeout(() => {
      setRestTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
    }, 1000);
    return () => clearTimeout(id);
  }, [restTimer]);

  const handleCompleteSet = useCallback((exerciseIndex: number) => {
    const ex = activeWorkout?.exercises[exerciseIndex];
    if (!ex) return;
    completeSet(exerciseIndex);
    // Start rest timer
    const nextSetIdx = ex.loggedSets.length;
    const restSeconds = ex.targetSets[nextSetIdx]?.restSeconds ?? ex.targetSets[ex.targetSets.length - 1]?.restSeconds ?? 90;
    if (restSeconds > 0 && ex.loggedSets.length < ex.targetSets.length - 1) {
      setRestTimer({ active: true, seconds: restSeconds, total: restSeconds });
    }
  }, [activeWorkout, completeSet]);

  if (!activeWorkout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '64px' }}>fitness_center</span>
        <p className="text-on-surface-variant text-sm tracking-widest uppercase">Kein aktives Training</p>
        <button
          onClick={() => navigate({ screen: 'plans' })}
          className="kinetic-gradient text-on-primary px-8 py-4 rounded-xl font-bold tracking-widest uppercase active:scale-95 transition-all"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Plan wählen
        </button>
      </div>
    );
  }

  const exercises = activeWorkout.exercises;
  const expanded = activeWorkout.expandedIndex;
  const totalSets = exercises.reduce((s, e) => s + e.targetSets.length, 0);
  const doneSets = exercises.reduce((s, e) => s + e.loggedSets.length, 0);
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex flex-col w-full"
        style={{ background: 'rgba(14, 14, 14, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(32, 32, 31, 0.8)' }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-surface-container-high">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex justify-between items-center px-4 py-3">
          <div>
            <p className="text-xs font-black tracking-widest text-primary uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              LOCALIFT
            </p>
            <p className="text-sm font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {activeWorkout.planName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#20201f', border: '1px solid rgba(72, 72, 71, 0.1)' }}>
              <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>timer</span>
              <span className="text-xs font-bold text-on-surface tabular-nums" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {formatTimer(elapsed)}
              </span>
            </div>
            {/* Sets progress */}
            <div className="text-xs font-bold text-on-surface-variant">
              {doneSets}/{totalSets}
            </div>
            {/* Finish */}
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="px-3 py-1.5 rounded-lg flex items-center justify-center"
              style={{ border: '1px solid rgba(255, 110, 132, 0.3)', background: 'rgba(255, 110, 132, 0.05)' }}
            >
              <span className="text-xs font-black text-error uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Beenden
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-3 pb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant px-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Übungen
        </h3>

        {/* Rest Timer */}
        {restTimer && (
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: 'rgba(149, 170, 255, 0.08)', border: '1px solid rgba(149, 170, 255, 0.15)' }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">PAUSE</p>
                <p className="text-2xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatTimer(restTimer.seconds)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setRestTimer(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant bg-surface-container uppercase tracking-wider"
            >
              Überspringen
            </button>
          </div>
        )}

        {exercises.map((ex, exIdx) => {
          const isExpanded = expanded === exIdx;
          const allDone = ex.loggedSets.length >= ex.targetSets.length;
          const currentSetIdx = ex.loggedSets.length;

          return (
            <div
              key={ex.planExerciseId}
              className="rounded-xl overflow-hidden"
              style={{
                border: isExpanded ? '1px solid rgba(149, 170, 255, 0.2)' : '1px solid rgba(72, 72, 71, 0.2)',
                background: isExpanded ? 'rgba(149, 170, 255, 0.03)' : 'rgba(26, 26, 26, 0.2)',
              }}
            >
              {/* Exercise Header */}
              <button
                className="w-full text-left p-4 flex justify-between items-center transition-all"
                style={isExpanded ? { borderBottom: '1px solid rgba(149, 170, 255, 0.1)', background: 'rgba(149, 170, 255, 0.05)' } : {}}
                onClick={() => setExpandedExercise(isExpanded ? -1 : exIdx)}
              >
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-base font-bold tracking-tight ${isExpanded ? 'text-on-surface' : allDone ? 'text-primary' : 'text-on-surface opacity-60'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {ex.exerciseName}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium" style={{ opacity: 0.6 }}>
                    {ex.loggedSets.length}/{ex.targetSets.length} Sätze
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {allDone ? (
                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ) : isExpanded ? (
                    <span className="text-xs font-black text-primary uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Aktiv</span>
                  ) : (
                    <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {exIdx > expanded ? 'Nächste' : '—'}
                    </span>
                  )}
                  <span
                    className="material-symbols-outlined text-outline transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                  >
                    expand_more
                  </span>
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Volume summary */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      {ex.targetSets[0] && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Ziel</span>
                          <span className="text-sm font-bold italic text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {ex.targetSets[0].weight}kg × {ex.targetSets[0].reps}
                          </span>
                        </div>
                      )}
                      {ex.loggedSets.length > 0 && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase text-on-surface-variant tracking-widest">Volumen</span>
                          <span className="text-sm font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {Math.round(ex.loggedSets.reduce((s, ls) => s + ls.weight * ls.reps, 0)).toLocaleString('de')} kg
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-black text-on-surface leading-none tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      SATZ {Math.min(currentSetIdx + 1, ex.targetSets.length)}
                      <span className="text-on-surface opacity-40 font-black">/{ex.targetSets.length}</span>
                    </span>
                  </div>

                  {/* Sets log */}
                  <div className="space-y-2">
                    {/* Completed sets */}
                    {ex.loggedSets.map((ls, lsIdx) => (
                      <div
                        key={lsIdx}
                        className="flex items-center gap-3 p-3 rounded-xl opacity-60"
                        style={{ background: 'rgba(32, 32, 31, 0.4)', borderLeft: '2px solid rgba(149, 170, 255, 0.4)' }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(149, 170, 255, 0.2)' }}>
                          <span className="text-xs font-black text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{lsIdx + 1}</span>
                        </div>
                        <div className="flex-grow flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ls.weight}</span>
                            <span className="text-xs text-on-surface-variant font-bold uppercase">kg</span>
                            <span className="mx-2 text-outline">×</span>
                            <span className="text-lg font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ls.reps}</span>
                          </div>
                          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                      </div>
                    ))}

                    {/* Active set */}
                    {!allDone && (
                      <div
                        className="flex flex-col p-4 rounded-xl"
                        style={{ background: '#1a1a1a', borderLeft: '4px solid #95aaff', boxShadow: '0 0 0 1px rgba(149, 170, 255, 0.1)' }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-black text-on-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {currentSetIdx + 1}
                            </span>
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Aktiver Satz
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                          {/* Weight */}
                          <div
                            className="flex items-center rounded-xl p-1.5"
                            style={{ background: '#20201f', border: '1px solid rgba(72, 72, 71, 0.1)' }}
                          >
                            <button
                              className="w-9 h-9 flex items-center justify-center rounded active:scale-90 transition-transform bg-surface-container-lowest"
                              onClick={() => updateActiveSet(exIdx, 'weight', Math.max(0, ex.currentWeight - 2.5))}
                            >
                              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: '18px' }}>remove</span>
                            </button>
                            <div className="flex-grow flex flex-col items-center">
                              <input
                                className="w-full bg-transparent text-center text-2xl font-black text-on-surface border-none p-0 focus:outline-none"
                                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                type="number"
                                value={ex.currentWeight}
                                onChange={e => updateActiveSet(exIdx, 'weight', Number(e.target.value))}
                                min={0}
                                step={2.5}
                              />
                              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest -mt-1">kg</span>
                            </div>
                            <button
                              className="w-9 h-9 flex items-center justify-center rounded active:scale-90 transition-transform bg-surface-container-lowest"
                              onClick={() => updateActiveSet(exIdx, 'weight', ex.currentWeight + 2.5)}
                            >
                              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: '18px' }}>add</span>
                            </button>
                          </div>

                          {/* Reps */}
                          <div
                            className="flex items-center rounded-xl p-1.5"
                            style={{ background: '#20201f', border: '1px solid rgba(72, 72, 71, 0.1)' }}
                          >
                            <button
                              className="w-9 h-9 flex items-center justify-center rounded active:scale-90 transition-transform bg-surface-container-lowest"
                              onClick={() => updateActiveSet(exIdx, 'reps', Math.max(1, ex.currentReps - 1))}
                            >
                              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: '18px' }}>remove</span>
                            </button>
                            <div className="flex-grow flex flex-col items-center">
                              <input
                                className="w-full bg-transparent text-center text-2xl font-black text-on-surface border-none p-0 focus:outline-none"
                                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                type="number"
                                value={ex.currentReps}
                                onChange={e => updateActiveSet(exIdx, 'reps', Number(e.target.value))}
                                min={1}
                              />
                              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest -mt-1">Wdh.</span>
                            </div>
                            <button
                              className="w-9 h-9 flex items-center justify-center rounded active:scale-90 transition-transform bg-surface-container-lowest"
                              onClick={() => updateActiveSet(exIdx, 'reps', ex.currentReps + 1)}
                            >
                              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: '18px' }}>add</span>
                            </button>
                          </div>
                        </div>

                        {/* Complete Set */}
                        <button
                          onClick={() => handleCompleteSet(exIdx)}
                          className="w-full py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all duration-200 kinetic-gradient"
                          style={{ boxShadow: '0 4px 20px -5px rgba(149, 170, 255, 0.3)' }}
                        >
                          <span className="text-base font-black text-on-primary uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Satz abschließen
                          </span>
                          <span className="material-symbols-outlined text-on-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </button>
                      </div>
                    )}

                    {/* Upcoming sets preview */}
                    {!allDone && ex.targetSets.slice(currentSetIdx + 1, currentSetIdx + 3).map((ts, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl opacity-40"
                        style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(72, 72, 71, 0.1)' }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-surface-container-high">
                          <span className="text-xs font-black text-on-surface-variant" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {currentSetIdx + 2 + i}
                          </span>
                        </div>
                        <div className="flex-grow grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-high rounded-lg">
                            <span className="text-sm font-bold text-on-surface opacity-60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {ts.weight}kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-high rounded-lg">
                            <span className="text-sm font-bold text-on-surface opacity-60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {ts.reps} Wdh.
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {allDone && (
                      <div className="text-center py-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          ✓ Alle Sätze abgeschlossen
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary stats during workout */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Sätze', value: `${doneSets}/${totalSets}` },
            { label: 'Zeit', value: formatTimer(elapsed) },
            { label: 'Übungen', value: `${exercises.filter(e => e.loggedSets.length >= e.targetSets.length).length}/${exercises.length}` },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-xs font-bold text-outline uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Background glows */}
      <div className="fixed top-1/4 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(149, 170, 255, 0.05)', filter: 'blur(80px)' }} />
      <div className="fixed bottom-12 -left-12 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(149, 170, 255, 0.05)', filter: 'blur(100px)' }} />

      {/* Finish Confirm Dialog */}
      {showFinishConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-8 space-y-6" style={{ background: '#1a1a1a' }}>
            <div className="text-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                TRAINING BEENDEN?
              </h2>
              <p className="text-on-surface-variant text-sm mt-2">
                {doneSets} von {totalSets} Sätzen · {formatTimer(elapsed)}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={finishWorkout}
                className="w-full py-4 rounded-xl text-on-primary font-black text-base tracking-widest uppercase active:scale-95 transition-all kinetic-gradient"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Training speichern
              </button>
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="w-full py-4 rounded-xl text-on-surface font-bold text-sm tracking-widest uppercase bg-surface-container"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Weitertrainieren
              </button>
              <button
                onClick={() => { setShowFinishConfirm(false); setShowCancelConfirm(true); }}
                className="w-full py-3 text-error font-bold text-xs tracking-widest uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Training abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Dialog */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-8 space-y-6" style={{ background: '#1a1a1a' }}>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight text-error" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                WIRKLICH ABBRECHEN?
              </h2>
              <p className="text-on-surface-variant text-sm mt-2">Alle Fortschritte gehen verloren.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={cancelWorkout}
                className="w-full py-4 rounded-xl font-black text-base tracking-widest uppercase active:scale-95 transition-all text-error"
                style={{ background: 'rgba(255, 110, 132, 0.1)', border: '1px solid rgba(255, 110, 132, 0.3)', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Ja, abbrechen
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-4 rounded-xl text-on-surface font-bold text-sm tracking-widest uppercase bg-surface-container"
              >
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
