import { useState } from 'react';
import { useApp } from '../context';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function Plans() {
  const { plans, navigate, startWorkout, deletePlan } = useApp();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
        </div>

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
                    onClick={() => navigate({ screen: 'plan-detail', planId: plan.id })}
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => startWorkout(plan.id)}
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
          onClick={() => navigate({ screen: 'plan-detail', planId: null })}
          className="kinetic-gradient w-14 h-14 rounded-xl flex items-center justify-center text-on-primary active:scale-95 transition-transform duration-200"
          style={{ boxShadow: '0 0 32px 0 rgba(149, 170, 255, 0.2)' }}
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
