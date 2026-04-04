import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { generateId } from '../storage';
import type { SetTemplate } from '../types/workout.types.ts';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ExerciseConfigurator() {
  const { planId, planExerciseId } = useParams<{ planId: string; planExerciseId: string }>();
  const navigate = useNavigate();
  const { plans, sessions, getExerciseById, updatePlanExerciseSets } = useApp();

  const plan = plans.find(p => p.id === planId);
  const planExercise = plan?.exercises.find(pe => pe.id === planExerciseId);
  const exercise = planExercise ? getExerciseById(planExercise.exerciseId) : undefined;

  const [sets, setSets] = useState<SetTemplate[]>(planExercise?.sets ?? []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (planExercise?.sets) setSets(planExercise.sets);
  }, [planExerciseId, planExercise?.sets]);

  // Kinetic Insight: look up last time this exercise was done
  const lastSession = sessions
    .filter(s => s.completedAt && s.exercises.some(e => e.exerciseId === planExercise?.exerciseId))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const lastExercise = lastSession?.exercises.find(e => e.exerciseId === planExercise?.exerciseId);
  const lastBestSet = lastExercise?.loggedSets.reduce(
    (best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best),
    lastExercise.loggedSets[0]
  );

  const updateSet = (idx: number, field: keyof SetTemplate, value: number | string) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets(prev => [...prev, {
      id: generateId(),
      weight: last?.weight ?? 60,
      reps: last?.reps ?? 8,
      restSeconds: last?.restSeconds ?? 90,
    }]);
  };

  const removeSet = (idx: number) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!planId || !planExerciseId) return;
    updatePlanExerciseSets(planId, planExerciseId, sets);
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate(`/plans/${planId}`); }, 800);
  };

  if (!planExercise || !exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Übung nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        showBack
        title={exercise.name}
        subtitle={`${exercise.category} · ${exercise.muscleGroups.slice(0, 2).join(', ')}`}
      />

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto">
        {/* Equipment toggle */}
        <section className="mb-10">
          <div className="flex items-center justify-between p-1 bg-surface-container rounded-xl">
            <div className={`flex-1 py-3 text-center rounded-xl text-sm font-bold tracking-widest uppercase transition-all ${
              exercise.equipment !== 'bodyweight' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant'
            }`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Gerät
            </div>
            <div className={`flex-1 py-3 text-center rounded-xl text-sm font-bold tracking-widest uppercase transition-all ${
              exercise.equipment === 'bodyweight' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant'
            }`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Körpergewicht
            </div>
          </div>
        </section>

        {/* Sets */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-3xl font-bold tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SÄTZE</h2>
            <span className="text-xs font-bold text-on-surface-variant tracking-widest uppercase">Ziel: {sets.length} Sätze</span>
          </div>

          {sets.map((set, idx) => (
            <div
              key={set.id}
              className={`p-6 rounded-xl flex flex-col gap-5 relative overflow-hidden group ${
                idx % 2 === 0 ? 'bg-surface-container-high' : 'bg-surface-container-low'
              }`}
              style={{ borderLeft: idx % 2 === 0 ? '3px solid rgba(55, 102, 255, 0.4)' : 'none' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-4xl font-black italic text-surface-bright opacity-20 select-none"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <button
                  onClick={() => removeSet(idx)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  disabled={sets.length <= 1}
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Weight */}
                <div className="relative flex flex-col">
                  <label className="absolute -top-1 left-0 text-xs font-extrabold text-on-surface-variant tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {exercise.equipment === 'bodyweight' ? 'Zusatz (KG)' : 'Gewicht (KG)'}
                  </label>
                  <input
                    className="w-full bg-transparent border-none p-0 pt-5 text-5xl font-bold text-on-surface focus:outline-none"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    type="number"
                    value={set.weight}
                    onChange={e => updateSet(idx, 'weight', Number(e.target.value))}
                    min={0}
                    step={2.5}
                  />
                </div>
                {/* Reps */}
                <div className="relative flex flex-col">
                  <label className="absolute -top-1 left-0 text-xs font-extrabold text-on-surface-variant tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Wiederh.
                  </label>
                  <input
                    className="w-full bg-transparent border-none p-0 pt-5 text-5xl font-bold text-on-surface focus:outline-none"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    type="number"
                    value={set.reps}
                    onChange={e => updateSet(idx, 'reps', Number(e.target.value))}
                    min={1}
                  />
                </div>
                {/* Rest */}
                <div className="relative flex flex-col">
                  <label className="absolute -top-1 left-0 text-xs font-extrabold text-on-surface-variant tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Pause (S)
                  </label>
                  <input
                    className="w-full bg-transparent border-none p-0 pt-5 text-5xl font-bold text-primary focus:outline-none"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    type="number"
                    value={set.restSeconds}
                    onChange={e => updateSet(idx, 'restSeconds', Number(e.target.value))}
                    min={0}
                    step={15}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Set */}
          <button
            onClick={addSet}
            className="w-full py-6 rounded-xl flex items-center justify-center gap-2 group hover:border-primary transition-colors"
            style={{ border: '2px dashed rgba(72, 72, 71, 0.3)' }}
          >
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">add_circle</span>
            <span className="text-sm font-bold tracking-widest uppercase text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Satz hinzufügen
            </span>
          </button>
        </section>

        {/* Kinetic Insight */}
        {lastBestSet && (
          <section className="mt-10 p-6 rounded-xl" style={{ background: 'rgba(130, 155, 255, 0.1)', border: '1px solid rgba(149, 170, 255, 0.1)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary-container">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  LETZTES TRAINING
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                  Bestes Set: <span className="text-on-surface font-bold">{lastBestSet.weight} kg × {lastBestSet.reps} Wdh.</span>
                  {lastSession && (
                    <> — {new Date(lastSession.startedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</>
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Save */}
        <div className="mt-10">
          <button
            onClick={handleSave}
            className="w-full py-5 rounded-xl text-on-primary font-black text-lg tracking-widest uppercase active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #95aaff 0%, #3766ff 100%)', boxShadow: '0 4px 20px -5px rgba(149, 170, 255, 0.3)', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {saved ? '✓ GESPEICHERT' : 'KONFIGURATION SPEICHERN'}
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
