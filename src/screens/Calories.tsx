import { useState, useMemo } from 'react';

import { useHeader } from '../contexts/LayoutContext';
import type { MealType } from '../types/nutrition.types';
import {useNutritionContext} from "../contexts/nutrition/NutritionContext.tsx";

const MEAL_LABELS: Record<MealType, string> = {
  fruehstueck: 'Frühstück',
  mittagessen: 'Mittagessen',
  abendessen: 'Abendessen',
  snack: 'Snack',
};

const MEAL_ICONS: Record<MealType, string> = {
  fruehstueck: 'wb_sunny',
  mittagessen: 'lunch_dining',
  abendessen: 'dinner_dining',
  snack: 'nutrition',
};

const MEAL_ORDER: MealType[] = ['fruehstueck', 'mittagessen', 'abendessen', 'snack'];

const WATER_STEPS = [250, 500, 750, 1000];

interface QuickAddState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  mealType: MealType;
}

const EMPTY_FORM: QuickAddState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  mealType: 'snack',
};

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Calories() {
  useHeader({}, []);
  const {
    nutritionGoals, getTodayNutrition,
    addFoodEntry, removeFoodEntry, updateWater,
  } = useNutritionContext();

  const todayNutrition = getTodayNutrition();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<QuickAddState>(EMPTY_FORM);
  const [showGoals, setShowGoals] = useState(false);

  const totals = useMemo(() => {
    return todayNutrition.entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayNutrition]);

  const remaining = Math.max(0, nutritionGoals.calories - totals.calories);
  const caloriePct = Math.min(1, totals.calories / nutritionGoals.calories);
  const RING_R = 90;
  const CIRC = 2 * Math.PI * RING_R;

  const waterPct = Math.min(1, todayNutrition.waterMl / nutritionGoals.waterMl);

  function handleAddEntry() {
    const cal = parseInt(form.calories) || 0;
    if (!form.name.trim() || cal <= 0) return;
    addFoodEntry({
      name: form.name.trim(),
      calories: cal,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
      mealType: form.mealType,
    });
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  }

  function handleAddWater(ml: number) {
    const today = todayDateStr();
    updateWater(today, Math.min(nutritionGoals.waterMl, todayNutrition.waterMl + ml));
  }

  const entriesByMeal = useMemo(() => {
    const map: Record<MealType, typeof todayNutrition.entries> = {
      fruehstueck: [],
      mittagessen: [],
      abendessen: [],
      snack: [],
    };
    todayNutrition.entries.forEach(e => map[e.mealType].push(e));
    return map;
  }, [todayNutrition]);

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto space-y-8">

        {/* Page heading */}
        <section className="space-y-1 pt-4">
          <span
            className="text-xs font-bold tracking-widest text-primary uppercase"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Kalorien Tracking
          </span>
          <h1
            className="text-5xl font-bold tracking-tighter leading-none"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            FUEL THE<br />ENGINE
          </h1>
        </section>

        {/* Progress Ring + Sub-stats */}
        <section className="bg-surface-container-low rounded-xl relative overflow-hidden py-10 flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50 pointer-events-none" />

          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={RING_R} fill="none" stroke="#262626" strokeWidth="12" />
              <circle
                cx="100" cy="100" r={RING_R}
                fill="none"
                stroke="url(#kineticGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${caloriePct * CIRC} ${CIRC}`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
              <defs>
                <linearGradient id="kineticGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3766ff" />
                  <stop offset="100%" stopColor="#95aaff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center z-10">
              <span
                className="block text-xs font-bold tracking-widest text-primary uppercase mb-1"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Verbleibend
              </span>
              <span
                className="block text-6xl font-bold tracking-tighter text-on-surface"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {remaining.toLocaleString('de')}
              </span>
              <span className="block text-base text-outline font-bold uppercase tracking-widest">kcal</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6 text-center w-full max-w-xs px-4">
            {[
              { label: 'Ziel', value: nutritionGoals.calories.toLocaleString('de') },
              { label: 'Gegessen', value: totals.calories.toLocaleString('de') },
              { label: 'Übrig', value: remaining.toLocaleString('de'), accent: true },
            ].map(stat => (
              <div key={stat.label}>
                <span
                  className={`block text-xl font-bold ${stat.accent ? 'text-primary' : 'text-on-surface'}`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {stat.value}
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-outline font-bold mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Macros */}
        <section className="bg-surface-container-high rounded-xl p-6 shadow-2xl shadow-black/20">
          <h2
            className="text-sm font-bold tracking-widest text-on-surface uppercase mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Makronährstoffe
          </h2>
          <div className="space-y-6">
            {[
              { label: 'Protein', value: totals.protein, goal: nutritionGoals.protein, color: '#95aaff', gradFrom: '#3766ff', gradTo: '#95aaff' },
              { label: 'Kohlenhydrate', value: totals.carbs, goal: nutritionGoals.carbs, color: '#ffaced', gradFrom: '#ffaced', gradTo: '#ffaced' },
              { label: 'Fette', value: totals.fat, goal: nutritionGoals.fat, color: '#ffffff', gradFrom: '#ffffff', gradTo: '#adaaaa' },
            ].map(macro => {
              const pct = Math.min(100, Math.round((macro.value / macro.goal) * 100));
              return (
                <div key={macro.label}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span
                        className="text-2xl font-bold text-on-surface"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {Math.round(macro.value)}
                      </span>
                      <span className="text-xs text-outline font-bold ml-1 uppercase">
                        / {macro.goal}g
                      </span>
                    </div>
                    <span
                      className="text-sm font-bold uppercase tracking-widest"
                      style={{ color: macro.color, fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {macro.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#000000' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${macro.gradFrom}, ${macro.gradTo})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hydration */}
        <section
          className="bg-surface-container rounded-xl p-5 flex items-center justify-between"
          style={{ borderLeft: '4px solid #95aaff' }}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span
              className="material-symbols-outlined text-primary text-2xl shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              water_drop
            </span>
            <div className="min-w-0">
              <h3
                className="text-sm font-bold tracking-widest text-on-surface uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Hydration
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(72,72,71,0.4)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${waterPct * 100}%`, background: 'linear-gradient(90deg, #3766ff, #95aaff)' }}
                  />
                </div>
                <span className="text-xs font-bold text-primary whitespace-nowrap">
                  {(todayNutrition.waterMl / 1000).toFixed(1)}L / {(nutritionGoals.waterMl / 1000).toFixed(1)}L
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 ml-3">
            {WATER_STEPS.map(ml => (
              <button
                key={ml}
                onClick={() => handleAddWater(ml)}
                disabled={todayNutrition.waterMl >= nutritionGoals.waterMl}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-90 disabled:opacity-30"
                style={{ background: 'rgba(149,170,255,0.15)', color: '#95aaff' }}
                title={`+${ml}ml`}
              >
                +{ml >= 1000 ? '1L' : `${ml}`}
              </button>
            ))}
          </div>
        </section>

        {/* Daily Timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-bold tracking-tight uppercase"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Tages-Timeline
            </h2>
            <span
              className="text-[10px] font-bold tracking-widest text-outline uppercase"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MEAL_ORDER.map(mealType => {
              const entries = entriesByMeal[mealType];
              const mealCal = entries.reduce((s, e) => s + e.calories, 0);
              return (
                <div
                  key={mealType}
                  className="bg-surface-container-low rounded-xl p-4 hover:bg-surface-container transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className="text-[10px] tracking-widest text-primary uppercase font-bold"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {MEAL_LABELS[mealType]}
                    </span>
                    <span
                      className="material-symbols-outlined text-outline-variant"
                      style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                    >
                      {MEAL_ICONS[mealType]}
                    </span>
                  </div>

                  {entries.length > 0 ? (
                    <div className="space-y-1.5">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-on-surface truncate flex-1">
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-outline font-bold">{entry.calories}</span>
                            <button
                              onClick={() => removeFoodEntry(entry.id)}
                              className="w-5 h-5 flex items-center justify-center rounded-full transition-all active:scale-90 opacity-40 hover:opacity-100"
                              style={{ color: '#ff6e84' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1.5 flex justify-between items-center" style={{ borderTop: '1px solid rgba(72,72,71,0.15)' }}>
                        <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Gesamt</span>
                        <span
                          className="text-base font-bold text-on-surface"
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {mealCal} <span className="text-[10px] font-normal text-outline">kcal</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setForm(f => ({ ...f, mealType }));
                        setShowAddModal(true);
                      }}
                      className="w-full mt-1 flex flex-col items-center justify-center py-4 rounded-lg group transition-all"
                      style={{ border: '1.5px dashed rgba(72,72,71,0.3)' }}
                    >
                      <span
                        className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors"
                        style={{ fontSize: '20px' }}
                      >
                        add
                      </span>
                      <span className="text-[10px] text-outline font-bold uppercase tracking-widest mt-1 group-hover:text-primary transition-colors">
                        Eintragen
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Daily Progress Anchor */}
        <section
          className="p-6 rounded-xl relative overflow-hidden"
          style={{ border: '1px solid rgba(149,170,255,0.2)', background: 'linear-gradient(90deg, rgba(149,170,255,0.05), transparent)' }}
        >
          <div className="absolute top-0 right-0 p-4 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'rgba(149,170,255,0.1)', fontVariationSettings: "'FILL' 1" }}>monitoring</span>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tagesfortschritt</p>
            <div className="flex items-end gap-2">
              <span
                className="text-4xl font-bold tracking-tighter"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {totals.calories.toLocaleString('de')}
              </span>
              <span className="text-xs text-outline font-bold mb-1.5 uppercase">
                / {nutritionGoals.calories.toLocaleString('de')} kcal
              </span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${caloriePct * 100}%`, background: '#95aaff' }}
              />
            </div>
          </div>
        </section>

        {/* Goals shortcut */}
        <section>
          <button
            onClick={() => setShowGoals(v => !v)}
            className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>
                track_changes
              </span>
              <div className="text-left">
                <span className="font-bold text-lg block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Ziele anpassen</span>
                <p className="text-xs text-on-surface-variant">Kalorien- & Makroziele</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform" style={{ transform: showGoals ? 'rotate(90deg)' : 'none' }}>
              chevron_right
            </span>
          </button>
          {showGoals && <GoalsEditor goals={nutritionGoals} />}
        </section>

      </main>

      {/* FAB */}
      <button
        onClick={() => { setForm(EMPTY_FORM); setShowAddModal(true); }}
        className="fixed z-40 flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          bottom: '96px',
          right: '24px',
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #95aaff, #3766ff)',
          color: '#00247e',
          borderRadius: '14px',
          boxShadow: '0 8px 32px -4px rgba(55,102,255,0.5)',
        }}
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl p-6 space-y-6"
            style={{ background: '#1a1a1a', border: '1px solid rgba(149,170,255,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Eintrag hinzufügen
              </h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(72,72,71,0.3)' }}>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Bezeichnung</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Hähnchenbrust"
                className="w-full bg-surface-container-high rounded-xl py-4 px-4 text-on-surface font-bold tracking-wide placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                autoFocus
              />
            </div>

            {/* Macro inputs */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { key: 'calories' as const, label: 'Kalorien', accent: true },
                { key: 'protein' as const, label: 'Protein (G)' },
                { key: 'carbs' as const, label: 'Kohlenhydrate (G)' },
                { key: 'fat' as const, label: 'Fette (G)' },
              ].map(({ key, label, accent }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-transparent border-none p-0 text-5xl font-bold focus:outline-none focus:ring-0 placeholder:text-surface-container-highest"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      color: accent ? '#95aaff' : '#ffffff',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Meal type selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Mahlzeit</label>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_ORDER.map(mt => (
                  <button
                    key={mt}
                    onClick={() => setForm(f => ({ ...f, mealType: mt }))}
                    className="py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-90"
                    style={
                      form.mealType === mt
                        ? { background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e' }
                        : { background: '#262626', color: '#adaaaa' }
                    }
                  >
                    {MEAL_LABELS[mt].slice(0, mt === 'mittagessen' || mt === 'abendessen' ? 6 : 8)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAddEntry}
              disabled={!form.name.trim() || !form.calories}
              className="w-full py-4 rounded-xl font-bold tracking-widest uppercase text-sm active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e' }}
            >
              Eintrag speichern
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function GoalsEditor({ goals }: { goals: import('../types/nutrition.types.ts').NutritionGoals }) {
  const { updateNutritionGoals } = useNutritionContext();
  const [local, setLocal] = useState(goals);

  function handleSave() {
    updateNutritionGoals(local);
  }

  return (
    <div className="mt-3 bg-surface-container-low rounded-xl p-5 space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {(
          [
            { key: 'calories' as const, label: 'Kalorien (kcal)' },
            { key: 'protein' as const, label: 'Protein (g)' },
            { key: 'carbs' as const, label: 'Kohlenhydrate (g)' },
            { key: 'fat' as const, label: 'Fette (g)' },
            { key: 'waterMl' as const, label: 'Wasser (ml)' },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">{label}</label>
            <input
              type="number"
              min="0"
              value={local[key]}
              onChange={e => setLocal(l => ({ ...l, [key]: parseInt(e.target.value) || 0 }))}
              className="w-full bg-surface-container-high rounded-xl py-3 px-3 text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-xl transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl font-bold tracking-widest uppercase text-sm active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e' }}
      >
        Ziele speichern
      </button>
    </div>
  );
}
