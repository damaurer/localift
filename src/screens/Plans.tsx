import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { usePlanContext } from '../contexts/plan/PlanContext.tsx';
import { useWorkoutContext } from '../contexts/workout/WorkoutContext.tsx';
import { useExerciseContext } from '../contexts/exercise/ExerciseContext.tsx';
import { generateId } from '../data/storage.ts';
import type { ShareablePlan } from '../types/workout.types.ts';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildShareable(planId: string, plans: ReturnType<typeof usePlanContext>['plans'], exercises: ReturnType<typeof useExerciseContext>['exercises']): ShareablePlan | null {
  const plan = plans.find(p => p.id === planId);
  if (!plan) return null;

  const neededIds = new Set(plan.exercises.map(pe => pe.exerciseId));
  const referencedExercises = exercises.filter(e => neededIds.has(e.id));

  return {
    type: 'localift-plan',
    version: 1,
    plan: {
      name: plan.name,
      description: plan.description,
      tags: plan.tags,
      exercises: plan.exercises,
      estimatedDuration: plan.estimatedDuration,
    },
    exercises: referencedExercises,
  };
}

function parseShareable(text: string): ShareablePlan | null {
  try {
    const data = JSON.parse(text);
    if (data?.type !== 'localift-plan' || data?.version !== 1) return null;
    if (!data.plan?.name || !Array.isArray(data.plan.exercises) || !Array.isArray(data.exercises)) return null;
    return data as ShareablePlan;
  } catch {
    return null;
  }
}

// ─── component ──────────────────────────────────────────────────────────────

export default function Plans() {
  const navigate = useNavigate();
  const { plans, deletePlan, savePlan } = usePlanContext();
  const { startWorkout } = useWorkoutContext();
  const { exercises, importExercises } = useExerciseContext();

  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ShareablePlan | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── check for Web Share Target pending data on mount ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('import') !== 'pending') return;

    // Remove the query param from the URL without a reload
    const clean = window.location.href.replace(/[?&]import=pending/, '');
    window.history.replaceState(null, '', clean);

    caches.open('localift-pending-share').then(async cache => {
      const res = await cache.match('/pending-share');
      if (!res) return;
      const text = await res.text();
      await cache.delete('/pending-share');
      const shareable = parseShareable(text);
      if (shareable) setPendingImport(shareable);
    }).catch(() => { /* cache API unavailable */ });
  }, []);

  // ── share ─────────────────────────────────────────────────────────────────
  const handleShare = async (planId: string) => {
    const shareable = buildShareable(planId, plans, exercises);
    if (!shareable) return;

    const json = JSON.stringify(shareable, null, 2);
    const file = new File([json], `${shareable.plan.name}.localift`, { type: 'application/json' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: shareable.plan.name,
          text: `Trainingsplan: ${shareable.plan.name}`,
          files: [file],
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setShareError('Teilen fehlgeschlagen');
          setTimeout(() => setShareError(null), 3000);
        }
      }
    } else {
      // Fallback: download as file
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ── import from file picker ───────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const shareable = parseShareable(text);
      if (shareable) {
        setPendingImport(shareable);
      } else {
        setShareError('Ungültige Datei');
        setTimeout(() => setShareError(null), 3000);
      }
    };
    reader.readAsText(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  // ── confirm import ────────────────────────────────────────────────────────
  const confirmImport = async () => {
    if (!pendingImport) return;

    await importExercises(pendingImport.exercises);

    savePlan({
      ...pendingImport.plan,
      exercises: pendingImport.plan.exercises.map(ex => ({
        ...ex,
        id: generateId(),
        sets: ex.sets.map(s => ({ ...s, id: generateId() })),
      })),
    });

    setPendingImport(null);
    setImportSuccess(pendingImport.plan.name);
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // ── filter ────────────────────────────────────────────────────────────────
  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto">
        <section className="mb-8">
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            PLÄNE
          </h1>
          <p className="text-on-surface-variant text-sm tracking-widest uppercase">Dein strategisches Framework</p>
        </section>

        {/* Search */}
        <div className="bg-surface-container-low rounded-xl p-1 mb-8 flex items-center">
          <div className="flex-1 px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              className="bg-transparent border-none text-xs tracking-widest uppercase w-full placeholder:text-outline text-on-surface focus:outline-none"
              placeholder="PLAN SUCHEN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <span className="material-symbols-outlined text-outline text-base">close</span>
              </button>
            )}
          </div>
          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 mr-1 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            title="Plan importieren"
          >
            <span className="material-symbols-outlined text-base">file_upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".localift,application/json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Toast notifications */}
        {shareError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-error" style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.3)' }}>
            {shareError}
          </div>
        )}
        {importSuccess && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-primary" style={{ background: 'rgba(149,170,255,0.1)', border: '1px solid rgba(149,170,255,0.3)' }}>
            „{importSuccess}" importiert
          </div>
        )}

        {/* Plan List */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(149, 170, 255, 0.1)' }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>event_note</span>
              </div>
              <p className="text-on-surface-variant text-sm">
                {search ? 'Keine Pläne gefunden' : 'Noch keine Pläne erstellt'}
              </p>
            </div>
          )}

          {filtered.map((plan, idx) => (
            <div
              key={plan.id}
              className={`rounded-xl p-6 relative overflow-hidden group transition-colors duration-300 ${
                idx % 2 === 0 ? 'bg-surface-container-high hover:bg-surface-bright' : 'bg-surface-container-low hover:bg-surface-container-high'
              }`}
              style={{ border: idx % 2 === 0 ? 'none' : '1px solid rgba(72, 72, 71, 0.1)' }}
            >
              {/* Background icon */}
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>fitness_center</span>
              </div>

              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {plan.name}
                  </h2>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">fitness_center</span>
                      <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                        {plan.exercises.length} ÜBUNGEN
                      </span>
                    </div>
                    {plan.estimatedDuration > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-base">timer</span>
                        <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                          {plan.estimatedDuration} MIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleShare(plan.id)}
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                    title="Plan teilen"
                  >
                    <span className="material-symbols-outlined text-base">share</span>
                  </button>
                  <button
                    onClick={() => navigate(`/plans/${plan.id}`)}
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => { startWorkout(plan.id); navigate('/workout'); }}
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {plan.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Delete button */}
              {confirmDelete === plan.id ? (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { deletePlan(plan.id); setConfirmDelete(null); }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-error"
                    style={{ background: 'rgba(255, 110, 132, 0.1)', border: '1px solid rgba(255, 110, 132, 0.3)' }}
                  >
                    Löschen bestätigen
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(plan.id)}
                  className="mt-3 text-xs font-bold text-outline hover:text-error transition-colors uppercase tracking-widest"
                >
                  Plan löschen
                </button>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-50">
        <button
          onClick={() => navigate('/plans/new')}
          className="kinetic-gradient w-14 h-14 rounded-xl flex items-center justify-center text-on-primary active:scale-95 transition-transform duration-200"
          style={{ boxShadow: '0 0 32px 0 rgba(149, 170, 255, 0.2)' }}
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <BottomNav />

      {/* Import confirmation modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 bg-surface-container-high space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(149,170,255,0.15)' }}>
                <span className="material-symbols-outlined text-primary">file_upload</span>
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-0.5">Plan importieren</p>
                <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {pendingImport.plan.name}
                </h3>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">fitness_center</span>
                <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                  {pendingImport.plan.exercises.length} Übungen
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">database</span>
                <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                  {pendingImport.exercises.length} Übungsdefinitionen
                </span>
              </div>
            </div>

            {pendingImport.plan.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingImport.plan.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPendingImport(null)}
                className="flex-1 py-3 bg-surface-container rounded-xl text-sm font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 py-3 kinetic-gradient rounded-xl text-sm font-bold uppercase tracking-widest text-on-primary"
              >
                Importieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
