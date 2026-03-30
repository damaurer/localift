import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import type { PlanExercise } from '../types';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

const TAGS = ['Kraft', 'Hypertrophie', 'Ausdauer', 'Mobilität', 'Ganzkörper', 'Oberkörper', 'Unterkörper', 'Push', 'Pull', 'Beine'];

interface PlanDetailProps {
  planId: string | null;
}

export default function PlanDetail({ planId }: PlanDetailProps) {
  const { plans, exercises, savePlan, addExerciseToPlan, removeExerciseFromPlan, getExerciseById, navigate, startWorkout } = useApp();

  const existing = planId ? plans.find(p => p.id === planId) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [exCategory, setExCategory] = useState<string | null>(null);
  const [exEquipment, setExEquipment] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [nameShake, setNameShake] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Live plan state: if editing, use plan from context
  const livePlan = planId ? plans.find(p => p.id === planId) : null;

  // currentPlanId: after first save, we have an id
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(planId);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setTags(existing.tags);
    }
  }, [planId]);

  const handleSaveMeta = () => {
    if (!name.trim()) return;
    const id = savePlan({
      id: currentPlanId ?? undefined,
      name: name.trim(),
      description,
      tags,
      exercises: livePlan?.exercises ?? [],
      estimatedDuration: estimateDuration(livePlan?.exercises ?? []),
    });
    setCurrentPlanId(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  function estimateDuration(exs: PlanExercise[]): number {
    return exs.reduce((sum, ex) => {
      const sets = ex.sets.length;
      const restPerSet = ex.sets[0]?.restSeconds ?? 90;
      return sum + sets * (45 + restPerSet) / 60;
    }, 0);
  }

  const allCategories = [...new Set(exercises.map(e => e.category))].sort();
  const allEquipment = [...new Set(exercises.map(e => e.equipment))].sort();

  const filteredExercises = exercises.filter(ex => {
    if (exCategory && ex.category !== exCategory) return false;
    if (exEquipment && ex.equipment !== exEquipment) return false;
    if (!exSearch) return true;
    const q = exSearch.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.category.toLowerCase().includes(q) ||
      ex.muscleGroups.some(m => m.toLowerCase().includes(q)) ||
      ex.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleAddExercise = (exerciseId: string) => {
    if (!currentPlanId) {
      // Save plan first
      if (!name.trim()) return;
      const id = savePlan({
        name: name.trim(),
        description,
        tags,
        exercises: [],
        estimatedDuration: 0,
      });
      setCurrentPlanId(id);
      addExerciseToPlan(id, exerciseId);
    } else {
      addExerciseToPlan(currentPlanId, exerciseId);
    }
    setShowExercisePicker(false);
    setExSearch('');
    setExCategory(null);
    setExEquipment(null);
  };

  const currentExercises = livePlan?.exercises.sort((a, b) => a.order - b.order) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header
        showBack
        title={planId ? 'Plan bearbeiten' : 'Neuer Plan'}
        rightContent={currentPlanId && currentExercises.length > 0 ? (
          <button
            onClick={() => startWorkout(currentPlanId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-on-primary text-xs font-bold uppercase tracking-widest"
            style={{ background: 'linear-gradient(135deg, #95aaff 0%, #3766ff 100%)' }}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            Starten
          </button>
        ) : undefined}
      />

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        {/* Plan Meta */}
        <section className="space-y-5">
          <div className="space-y-4">
            <div className="relative">
              <label
                className="absolute -top-1 left-0 text-xs font-extrabold tracking-widest uppercase transition-colors"
                style={{ fontFamily: 'Manrope, sans-serif', color: nameShake ? '#95aaff' : undefined }}
              >
                {nameShake ? '← Planname eingeben' : 'Planname'}
              </label>
              <input
                ref={nameInputRef}
                className="w-full bg-transparent border-none p-0 pt-5 text-5xl font-bold text-on-surface focus:outline-none transition-all"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  animation: nameShake ? 'shake 0.35s ease' : undefined,
                }}
                placeholder="MEIN PLAN"
                value={name}
                onChange={e => { setName(e.target.value); if (nameShake) setNameShake(false); }}
                onBlur={handleSaveMeta}
              />
            </div>

            <textarea
              className="w-full bg-surface-container-low rounded-xl p-4 text-sm text-on-surface placeholder:text-outline focus:outline-none resize-none"
              placeholder="Beschreibung (optional)"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={handleSaveMeta}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-3">Tags</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                    setTimeout(handleSaveMeta, 0);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    tags.includes(tag)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Exercise List */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-bold tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              ÜBUNGEN
            </h2>
            <span className="text-xs font-bold text-on-surface-variant tracking-widest uppercase">
              {currentExercises.length} Gesamt
            </span>
          </div>

          {currentExercises.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-xl" style={{ borderColor: 'rgba(72, 72, 71, 0.3)' }}>
              <p className="text-on-surface-variant text-sm">Noch keine Übungen hinzugefügt</p>
            </div>
          )}

          {currentExercises.map((pe, idx) => {
            const ex = getExerciseById(pe.exerciseId);
            if (!ex) return null;
            return (
              <div
                key={pe.id}
                className={`rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group ${
                  idx % 2 === 0 ? 'bg-surface-container-high' : 'bg-surface-container-low'
                }`}
                style={{ borderLeft: idx % 2 === 0 ? '3px solid rgba(55, 102, 255, 0.4)' : 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-4xl font-black italic text-surface-bright opacity-20 absolute top-3 right-6 pointer-events-none select-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {ex.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">{ex.category} · {ex.muscleGroups.slice(0, 2).join(', ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate({ screen: 'exercise-config', planId: currentPlanId!, planExerciseId: pe.id })}
                      className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
                      title="Konfigurieren"
                    >
                      <span className="material-symbols-outlined text-base">tune</span>
                    </button>
                    <button
                      onClick={() => currentPlanId && removeExerciseFromPlan(currentPlanId, pe.id)}
                      className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                      title="Entfernen"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>

                {/* Sets summary */}
                <div className="flex gap-3">
                  <div className="px-3 py-1.5 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant">
                    {pe.sets.length} Sätze
                  </div>
                  {pe.sets[0] && (
                    <div className="px-3 py-1.5 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant">
                      {pe.sets[0].weight}kg × {pe.sets[0].reps}
                    </div>
                  )}
                  <button
                    onClick={() => navigate({ screen: 'exercise-config', planId: currentPlanId!, planExerciseId: pe.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary uppercase tracking-wider"
                    style={{ background: 'rgba(149, 170, 255, 0.1)' }}
                  >
                    Konfigurieren
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Exercise Button */}
          <div className="space-y-2">
            <button
              onClick={() => {
                if (!name.trim()) {
                  setNameShake(true);
                  setTimeout(() => setNameShake(false), 400);
                  nameInputRef.current?.focus();
                  nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
                handleSaveMeta();
                setShowExercisePicker(true);
              }}
              className={`w-full py-6 rounded-xl flex items-center justify-center gap-2 transition-all ${
                name.trim()
                  ? 'group hover:border-primary cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ border: `2px dashed ${name.trim() ? 'rgba(72, 72, 71, 0.3)' : 'rgba(72, 72, 71, 0.15)'}` }}
            >
              <span className={`material-symbols-outlined transition-colors ${name.trim() ? 'text-on-surface-variant group-hover:text-primary' : 'text-on-surface-variant'}`}>
                add_circle
              </span>
              <span
                className={`text-sm font-bold tracking-widest uppercase transition-colors ${name.trim() ? 'text-on-surface-variant group-hover:text-primary' : 'text-on-surface-variant'}`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Übung hinzufügen
              </span>
            </button>
            {!name.trim() && (
              <p className="text-center text-xs text-primary font-bold tracking-widest uppercase" style={{ opacity: 0.7 }}>
                Zuerst Planname eingeben
              </p>
            )}
          </div>
        </section>

        {/* Save button */}
        <div>
          <button
            onClick={handleSaveMeta}
            className="w-full py-5 rounded-xl text-on-primary font-black text-lg tracking-widest uppercase active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #95aaff 0%, #3766ff 100%)', boxShadow: '0 4px 20px -5px rgba(149, 170, 255, 0.3)', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {saved ? '✓ GESPEICHERT' : 'PLAN SPEICHERN'}
          </button>
        </div>
      </main>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowExercisePicker(false); setExSearch(''); setExCategory(null); setExEquipment(null); } }}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl overflow-hidden"
            style={{ background: '#131313', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ÜBUNG WÄHLEN
              </h2>
              <button onClick={() => setShowExercisePicker(false)}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="px-6 pb-3 space-y-3">
              {/* Search */}
              <div className="bg-surface-container rounded-xl flex items-center gap-3 px-4 py-3">
                <span className="material-symbols-outlined text-outline">search</span>
                <input
                  className="bg-transparent text-xs tracking-widest uppercase w-full placeholder:text-outline text-on-surface focus:outline-none"
                  placeholder="NAME, MUSKEL, TAG..."
                  value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
                  autoFocus
                />
                {exSearch && (
                  <button onClick={() => setExSearch('')}>
                    <span className="material-symbols-outlined text-outline text-base">close</span>
                  </button>
                )}
              </div>

              {/* Category filter */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setExCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    !exCategory ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >Alle</button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setExCategory(exCategory === cat ? null : cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                      exCategory === cat ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >{cat}</button>
                ))}
              </div>

              {/* Equipment filter */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setExEquipment(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    !exEquipment ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >Alles</button>
                {allEquipment.map(eq => (
                  <button
                    key={eq}
                    onClick={() => setExEquipment(exEquipment === eq ? null : eq)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                      exEquipment === eq ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container text-on-surface-variant opacity-60'
                    }`}
                  >{eq}</button>
                ))}
              </div>

              <p className="text-xs text-on-surface-variant" style={{ opacity: 0.5 }}>
                {filteredExercises.length} Übungen
              </p>
            </div>

            <div className="overflow-y-auto px-6 pb-8 hide-scrollbar space-y-2">
              {filteredExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleAddExercise(ex.id)}
                  className="w-full p-4 rounded-xl flex items-start justify-between bg-surface-container hover:bg-surface-container-high transition-colors text-left"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ex.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{ex.category} · {ex.muscleGroups.slice(0, 2).join(', ')}</p>
                    {ex.description && (
                      <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2" style={{ opacity: 0.6 }}>{ex.description}</p>
                    )}
                    {ex.tags && ex.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ex.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-surface-container-high rounded text-xs text-on-surface-variant" style={{ opacity: 0.7 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-on-surface-variant px-2 py-1 bg-surface-container-high rounded-full">
                      {ex.equipment}
                    </span>
                    <span className="material-symbols-outlined text-primary text-base">add</span>
                  </div>
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-on-surface-variant text-sm">Keine Übungen gefunden</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
