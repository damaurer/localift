import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useHeader, useLayoutContext } from '../contexts/LayoutContext';
import { calcTotalVolume, calcTotalSets } from '../data/storage.ts';
import {useWorkoutContext} from "../contexts/workout/WorkoutContext.tsx";
import {useTranslation} from "../i18n/I18nContext.tsx";
import {useSettingsContext} from "../contexts/settings/SettingsContext.tsx";
import {getLocale} from "../i18n/I18nContext.tsx";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m} MIN`;
}

function groupByMonth(sessions: ReturnType<typeof useWorkoutContext>['sessions'], locale: string) {
  const groups: Record<string, typeof sessions> = {};
  sessions.forEach(s => {
    const key = new Date(s.startedAt).toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return groups;
}

interface HistoryDetailProps {
  sessionId: string;
}

function HistoryDetail({ sessionId }: HistoryDetailProps) {
  const { sessions } = useWorkoutContext();
  const t = useTranslation();
  const { settings } = useSettingsContext();
  const locale = getLocale(settings.language);
  const session = sessions.find(s => s.id === sessionId);

  useHeader(
    {
      showBack: true,
      title: session?.planName ?? '',
      subtitle: session
        ? new Date(session.startedAt).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
        : '',
    },
    [session?.id],
  );

  if (!session) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-on-surface-variant">{t.history.sessionNotFound}</p>
    </div>
  );

  const totalVolume = calcTotalVolume(session.exercises);
  const totalSets = calcTotalSets(session.exercises);

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: t.common.duration, value: session.durationSeconds ? formatDuration(session.durationSeconds) : '—' },
            { label: t.common.volume, value: totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString(locale)} kg` : '—' },
            { label: t.common.sets, value: String(totalSets) },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-high rounded-xl p-4">
              <p className="text-xs font-black uppercase text-outline tracking-tighter">{stat.label}</p>
              <p className="text-xl font-bold mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Exercise breakdown */}
        <h2 className="text-2xl font-bold tracking-tight mb-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {t.history.exercisesTitle}
        </h2>
        <div className="space-y-4">
          {session.exercises.map((ex, idx) => {
            const volume = ex.loggedSets.reduce((s, ls) => s + ls.weight * ls.reps, 0);
            const bestSet = ex.loggedSets.reduce(
              (best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best),
              ex.loggedSets[0] ?? { weight: 0, reps: 0 }
            );
            return (
              <div
                key={idx}
                className="bg-surface-container rounded-xl p-5"
                style={{ borderLeft: idx % 2 === 0 ? '3px solid rgba(55, 102, 255, 0.4)' : '3px solid rgba(72, 72, 71, 0.3)' }}
              >
                <h3 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {ex.exerciseName}
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.common.sets}</span>
                    <p className="text-base font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ex.loggedSets.length}</p>
                  </div>
                  <div className="border-l border-surface-container-high pl-3">
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.common.volume}</span>
                    <p className="text-base font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{Math.round(volume)} kg</p>
                  </div>
                  <div className="border-l border-surface-container-high pl-3">
                    <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.history.bestSet}</span>
                    <p className="text-base font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {bestSet.weight}×{bestSet.reps}
                    </p>
                  </div>
                </div>
                {/* Sets detail */}
                <div className="flex flex-wrap gap-2">
                  {ex.loggedSets.map((ls, lsIdx) => (
                    <span
                      key={lsIdx}
                      className="px-2.5 py-1 rounded-full text-xs font-bold text-on-surface-variant"
                      style={{ background: '#20201f' }}
                    >
                      {ls.weight}kg×{ls.reps}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function History() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions } = useWorkoutContext();
  const navigate = useNavigate();
  const { setHeaderConfig } = useLayoutContext();
  const t = useTranslation();
  const { settings } = useSettingsContext();
  const locale = getLocale(settings.language);

  useEffect(() => {
    if (!sessionId) setHeaderConfig({});
  }, [sessionId, setHeaderConfig]);

  const grouped = useMemo(() => {
    return groupByMonth(
      [...sessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
      locale
    );
  }, [sessions]);

  // Show detail if navigated there
  if (sessionId) {
    return <HistoryDetail sessionId={sessionId} />;
  }

  const monthEntries = Object.entries(grouped);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-20 px-6 max-w-2xl mx-auto pb-32">
        {sessions.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '64px' }}>history</span>
            <p className="text-on-surface-variant text-sm mt-4 tracking-widest uppercase">
              {t.history.noSessions}
            </p>
          </div>
        ) : (
          monthEntries.map(([month, monthSessions]) => (
            <section key={month} className="mb-10">
              <div className="flex items-center mb-8">
                <h2
                  className="font-black text-4xl tracking-tighter text-surface-container-highest"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {month.split(' ')[0]}
                </h2>
                <span className="text-sm font-bold text-outline ml-3">{month.split(' ')[1]}</span>
                <div className="h-px grow ml-5 bg-surface-container-high" />
              </div>

              <div className="space-y-4">
                {monthSessions.map((session, idx) => {
                  const totalVol = calcTotalVolume(session.exercises);
                  const totalS = calcTotalSets(session.exercises);
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/history/${session.id}`)}
                      className={`w-full group relative transition-all duration-300 p-6 rounded-xl overflow-hidden text-left ${
                        idx % 2 === 0
                          ? 'bg-surface-container hover:bg-surface-container-high'
                          : 'bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                      style={idx === 0 ? { borderLeft: '3px solid rgba(55, 102, 255, 0.5)' } : {}}
                    >
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <p className="text-outline font-bold text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {new Date(session.startedAt).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <h3 className="text-2xl font-bold text-on-surface leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.planName}
                          </h3>
                        </div>
                        <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.common.duration}</span>
                          <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {session.durationSeconds ? formatDuration(session.durationSeconds) : '—'}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-surface-container-high pl-4">
                          <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.common.volume}</span>
                          <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {totalVol > 0 ? `${Math.round(totalVol).toLocaleString(locale)} KG` : '—'}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-surface-container-high pl-4">
                          <span className="text-xs font-black uppercase text-outline tracking-tighter">{t.common.sets}</span>
                          <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {totalS} {t.common.sets.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
