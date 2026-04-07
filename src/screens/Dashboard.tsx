import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { calcTotalVolume, calcTotalSets } from '../storage';
import type {WorkoutSession} from "../types/workout.types.ts";
import {useWorkoutContext} from "../contexts/workout/WorkoutContext.tsx";
import {usePlanContext} from "../contexts/plan/PlanContext.tsx";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} MIN`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { plans } = usePlanContext();
  const { sessions, activeWorkout, startWorkout } = useWorkoutContext();

  const lastSession = useMemo(
    () => sessions.find(s => !!s.completedAt),
    [sessions]
  );

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(s => new Date(s.startedAt).toDateString() === today && s.completedAt);
    const totalVolume = todaySessions.reduce((sum, s) => sum + calcTotalVolume(s.exercises), 0);
    const totalSets = todaySessions.reduce((sum, s) => sum + calcTotalSets(s.exercises), 0);
    const totalDuration = todaySessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
    return { count: todaySessions.length, totalVolume, totalSets, totalDuration };
  }, [sessions]);

  const handleQuickStart = (id: string, prevSession?: WorkoutSession) => {
    startWorkout(id, prevSession);
    navigate('/workout');
  };

  const streak = useMemo(() => {
    let count = 0;
    const dates = new Set(sessions.filter(s => s.completedAt).map(s => new Date(s.startedAt).toDateString()));
    const d = new Date();
    while (dates.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [sessions]);

  const recentPlans = plans.slice(0, 3);

  const weekActivity = useMemo(() => {
    const result: boolean[] = Array(7).fill(false);
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      result[i] = sessions.some(s => s.completedAt && new Date(s.startedAt).toDateString() === d.toDateString());
    }
    return result;
  }, [sessions]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        rightContent={activeWorkout ? (
          <button
            onClick={() => navigate('/workout')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-on-primary text-xs font-bold uppercase tracking-widest animate-pulse"
            style={{ background: 'linear-gradient(135deg, #95aaff 0%, #3766ff 100%)' }}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
            Aktiv
          </button>
        ) : undefined}
      />

      <main className="px-6 pt-20 pb-32 space-y-8 max-w-2xl mx-auto">
        {/* Daily Progress */}
        <section className="space-y-5">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span
                className="text-xs font-bold tracking-widest text-outline uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Heute
              </span>
              <h2
                className="text-4xl font-bold tracking-tighter"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {todayStats.count === 0 ? 'BEREIT' : `${todayStats.count}× TRAINING`}
              </h2>
            </div>
            <div className="text-right">
              <span
                className="text-3xl font-bold text-primary"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {streak > 0 ? `${streak}🔥` : '—'}
              </span>
              {streak > 0 && <p className="text-xs text-outline uppercase tracking-wider mt-1">Streak</p>}
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Volume Card */}
            <div className="col-span-2 bg-surface-container-low rounded-xl relative overflow-hidden p-6 flex flex-col justify-end" style={{ minHeight: '140px' }}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {todayStats.totalVolume > 0 ? Math.round(todayStats.totalVolume).toLocaleString('de') : '—'}
                  </span>
                  {todayStats.totalVolume > 0 && (
                    <span className="text-lg font-bold text-outline" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>KG</span>
                  )}
                </div>
                <p className="text-xs tracking-widest text-primary font-bold uppercase mt-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Gesamtvolumen
                </p>
              </div>
            </div>

            <div className="bg-surface-container-high rounded-xl p-5 space-y-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {todayStats.totalDuration > 0 ? formatDuration(todayStats.totalDuration) : '—'}
                </span>
              </div>
              <p className="text-xs font-bold tracking-widest text-outline uppercase">Dauer</p>
            </div>

            <div className="bg-surface-container-high rounded-xl p-5 space-y-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {todayStats.totalSets > 0 ? todayStats.totalSets : '—'}
                </span>
              </div>
              <p className="text-xs font-bold tracking-widest text-outline uppercase">Sätze</p>
            </div>
          </div>

          {/* Week Activity */}
          <div className="flex gap-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full h-2 rounded-full transition-all ${weekActivity[i] ? 'bg-primary' : 'bg-surface-container-high'}`}
                />
                <span className="text-xs text-outline font-bold">{day}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        {!activeWorkout ? (
          <section className="space-y-3">
            {lastSession && plans.find(p => p.id === lastSession.planId) ? (
              <>
                <button
                  onClick={() => handleQuickStart(lastSession.planId, lastSession)}
                  className="w-full kinetic-gradient text-on-primary px-6 py-5 rounded-xl flex items-center gap-4 active:scale-95 transition-all text-left"
                  style={{ boxShadow: '0 20px 40px -15px rgba(55, 102, 255, 0.4)' }}
                >
                  <span
                    className="material-symbols-outlined text-3xl shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >play_arrow</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-widest uppercase opacity-70">Training Starten</p>
                    <p className="text-xl font-black tracking-tight truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {lastSession.planName.toUpperCase()}
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {lastSession.exercises.length} Übungen · letzte Gewichte vorgeladen
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/plans')}
                  className="w-full text-primary text-xs font-bold tracking-widest uppercase text-center py-1 hover:opacity-70 transition-opacity"
                >
                  Anderen Plan starten →
                </button>
              </>
            ) : plans.length > 0 ? (
              <button
                onClick={() => navigate('/plans')}
                className="w-full kinetic-gradient text-on-primary py-6 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                style={{ boxShadow: '0 20px 40px -15px rgba(55, 102, 255, 0.4)' }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  WORKOUT STARTEN
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/plans/new')}
                className="w-full kinetic-gradient text-on-primary py-6 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                style={{ boxShadow: '0 20px 40px -15px rgba(55, 102, 255, 0.4)' }}
              >
                <span className="material-symbols-outlined text-2xl">add</span>
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  ERSTEN PLAN ERSTELLEN
                </span>
              </button>
            )}
          </section>
        ) : (
          <section>
            <button
              onClick={() => navigate('/workout')}
              className="w-full py-6 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all border"
              style={{ borderColor: 'rgba(149, 170, 255, 0.4)', background: 'rgba(149, 170, 255, 0.05)' }}
            >
              <span className="material-symbols-outlined text-primary text-2xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <div className="text-left">
                <p className="text-xs text-primary font-bold uppercase tracking-widest">Aktives Training</p>
                <p className="text-lg font-bold text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {activeWorkout.planName}
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface ml-auto">chevron_right</span>
            </button>
          </section>
        )}

        {/* My Plans */}
        {recentPlans.length > 0 && (
          <section className="space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MEINE PLÄNE</h3>
              <button
                onClick={() => navigate('/plans')}
                className="text-primary text-xs font-bold tracking-widest uppercase hover:opacity-70 transition-opacity"
              >
                Alle anzeigen
              </button>
            </div>
            <div className="space-y-3">
              {recentPlans.map(plan => (
                <div
                  key={plan.id}
                  className="group relative overflow-hidden rounded-xl bg-surface-container-low p-5 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {plan.name.toUpperCase()}
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold tracking-widest text-outline uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fitness_center</span>
                        {plan.exercises.length} Übungen
                      </span>
                      {plan.tags[0] && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          <span className="text-xs font-bold tracking-widest text-primary uppercase">{plan.tags[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickStart(plan.id)}
                    className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary hover:border-primary transition-colors group"
                  >
                    <span className="material-symbols-outlined text-on-surface group-hover:text-on-primary">play_arrow</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LETZTE EINHEITEN</h3>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-1 text-primary text-xs font-bold tracking-widest uppercase hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                Verlauf
              </button>
            </div>
            {sessions.slice(0, 3).map(session => (
              <button
                key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full group relative bg-surface-container hover:bg-surface-container-high transition-all duration-300 p-5 rounded-xl overflow-hidden text-left"
                style={{ borderLeft: '3px solid rgba(55, 102, 255, 0.5)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-on-surface-variant font-bold text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {new Date(session.startedAt).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <h3 className="text-xl font-bold text-on-surface leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {session.planName}
                    </h3>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">Dauer</span>
                    <p className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {session.durationSeconds ? formatDuration(session.durationSeconds) : '—'}
                    </p>
                  </div>
                  <div className="border-l border-surface-container-high pl-4">
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">Volumen</span>
                    <p className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {Math.round(calcTotalVolume(session.exercises)).toLocaleString('de')} kg
                    </p>
                  </div>
                  <div className="border-l border-surface-container-high pl-4">
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">Sätze</span>
                    <p className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {calcTotalSets(session.exercises)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {/* Empty state */}
        {plans.length === 0 && sessions.length === 0 && (
          <section className="text-center py-12">
            <div className="w-20 h-20 rounded-xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(149, 170, 255, 0.1)' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>fitness_center</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Willkommen bei LOCALIFT</h3>
            <p className="text-on-surface-variant text-sm mb-8">Erstelle deinen ersten Trainingsplan und leg los.</p>
            <button
              onClick={() => navigate('/plans/new')}
              className="kinetic-gradient text-on-primary px-8 py-4 rounded-xl font-bold tracking-widest uppercase active:scale-95 transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Plan erstellen
            </button>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
