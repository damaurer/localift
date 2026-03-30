import { useState, useEffect } from 'react';
import { useApp } from '../context';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { requestPermission, getPermission, getStorageEstimate } from '../notifications';
import type { StorageEstimate } from '../notifications';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Settings() {
  const { settings, updateSettings, clearAllData, sessions, plans, exercises } = useApp();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => getPermission());
  const [storageInfo, setStorageInfo] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setNotifPermission(result);
    if (result === 'granted' && !settings.reminderEnabled) {
      updateSettings({ reminderEnabled: true });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ reminderTime: e.target.value });
  };

  const toggleDay = (idx: number) => {
    const next = [...settings.reminderDays];
    next[idx] = !next[idx];
    updateSettings({ reminderDays: next });
  };

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      plans: JSON.parse(localStorage.getItem('localift_plans') ?? '[]'),
      sessions: JSON.parse(localStorage.getItem('localift_sessions') ?? '[]'),
      exercises: JSON.parse(localStorage.getItem('localift_exercises') ?? '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localift-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto">
        <section className="mb-10">
          <h1 className="text-5xl font-bold tracking-tighter mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Settings
          </h1>
          <p className="text-on-surface-variant font-medium opacity-60">Deine Localift-Einstellungen</p>
        </section>

        {/* Stats summary */}
        <section className="mb-8 grid grid-cols-3 gap-3">
          {[
            { label: 'Einheiten', value: sessions.length },
            { label: 'Pläne', value: plans.length },
            { label: 'Übungen', value: exercises.length },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</p>
              <p className="text-xs text-outline font-bold uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Notification Permission Banner */}
        {notifPermission !== 'granted' && (
          <section className="mb-6">
            <button
              onClick={handleRequestPermission}
              disabled={notifPermission === 'denied'}
              className="w-full rounded-xl p-4 flex items-center gap-4 transition-colors"
              style={{
                background: notifPermission === 'denied'
                  ? 'rgba(255, 110, 132, 0.05)'
                  : 'rgba(149, 170, 255, 0.08)',
                border: notifPermission === 'denied'
                  ? '1px solid rgba(255, 110, 132, 0.2)'
                  : '1px solid rgba(149, 170, 255, 0.2)',
              }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff', fontVariationSettings: "'FILL' 1" }}
              >
                {notifPermission === 'denied' ? 'notifications_off' : 'notifications'}
              </span>
              <div className="text-left">
                <p className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff' }}>
                  {notifPermission === 'denied' ? 'Benachrichtigungen blockiert' : 'Benachrichtigungen aktivieren'}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {notifPermission === 'denied'
                    ? 'In den Browser-Einstellungen entsperren'
                    : 'Erlaubnis erteilen für Erinnerungen & Abschluss-Alerts'}
                </p>
              </div>
              {notifPermission === 'default' && (
                <span className="material-symbols-outlined text-primary ml-auto">chevron_right</span>
              )}
            </button>
          </section>
        )}

        {/* Storage Usage */}
        {storageInfo && (
          <section className="mb-6">
            <div className="bg-surface-container rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">storage</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lokaler Speicher</span>
                </div>
                <span className="text-xs font-bold text-primary">{storageInfo.usedMB} / {storageInfo.quotaMB} MB</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(72,72,71,0.3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${storageInfo.percentUsed}%`,
                    background: storageInfo.percentUsed > 80
                      ? 'linear-gradient(90deg, #ff6e84, #ff3d55)'
                      : 'linear-gradient(90deg, #95aaff, #3766ff)',
                  }}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1.5" style={{ opacity: 0.6 }}>
                {storageInfo.percentUsed}% belegt · Daten werden lokal gesichert
              </p>
            </div>
          </section>
        )}

        {/* Workout Reminders */}
        <section className="mb-10">
          <div
            className="bg-surface-container rounded-xl p-6 relative overflow-hidden group"
            style={{ boxShadow: 'none' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'rgba(149, 170, 255, 0.1)' }} />

            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(149, 170, 255, 0.1)' }}>
                  <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>alarm</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Erinnerungen</h2>
                  <p className="text-on-surface-variant text-sm">Tägliche Trainingshinweise</p>
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() => {
                  if (!settings.reminderEnabled && notifPermission !== 'granted') {
                    handleRequestPermission();
                  } else {
                    updateSettings({ reminderEnabled: !settings.reminderEnabled });
                  }
                }}
                className="relative inline-flex items-center cursor-pointer"
              >
                <div
                  className="w-14 h-7 rounded-full transition-colors duration-200 relative"
                  style={{ background: settings.reminderEnabled ? '#3766ff' : '#262626' }}
                >
                  <div
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: settings.reminderEnabled ? 'translateX(calc(100% + 4px))' : 'translateX(4px)' }}
                  />
                </div>
              </button>
            </div>

            {settings.reminderEnabled && (
              <div className="space-y-6">
                {/* Time picker */}
                <div className="flex items-end justify-between pb-5" style={{ borderBottom: '1px solid rgba(72, 72, 71, 0.1)' }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest font-bold text-primary">Uhrzeit</span>
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={handleTimeChange}
                      className="bg-transparent border-none text-5xl font-black text-on-surface focus:outline-none"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Day selector */}
                <div className="grid grid-cols-7 gap-2">
                  {DAY_LABELS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(i)}
                      className="aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-90"
                      style={settings.reminderDays[i]
                        ? { background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e' }
                        : { background: '#262626', color: '#adaaaa' }
                      }
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* General Settings */}
        <section className="space-y-4 mb-10">
          <h3 className="text-xs uppercase tracking-widest text-on-surface-variant mb-5 ml-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            App & Daten
          </h3>

          {/* Weight Unit */}
          <div className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">straighten</span>
              <div>
                <span className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Gewichtseinheit</span>
                <p className="text-xs text-on-surface-variant mt-0.5">Für alle Gewichtsanzeigen</p>
              </div>
            </div>
            <div className="flex gap-1 bg-surface-container rounded-xl p-1">
              {(['kg', 'lbs'] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => updateSettings({ weightUnit: unit })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    settings.weightUnit === unit
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Vibration */}
          <div className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">vibration</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Vibration</span>
            </div>
            <button
              onClick={() => updateSettings({ vibration: !settings.vibration })}
              className="relative inline-flex items-center cursor-pointer"
            >
              <div
                className="w-12 h-6 rounded-full transition-colors duration-200 relative"
                style={{ background: settings.vibration ? '#3766ff' : '#262626' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                  style={{ transform: settings.vibration ? 'translateX(calc(100% + 2px))' : 'translateX(2px)' }}
                />
              </div>
            </button>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">download</span>
              <div className="text-left">
                <span className="font-bold text-lg block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {showExportSuccess ? '✓ Exportiert!' : 'Daten exportieren'}
                </span>
                <p className="text-xs text-on-surface-variant">JSON-Backup herunterladen</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
          </button>
        </section>

        {/* Danger zone */}
        <section>
          {showClearConfirm ? (
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255, 110, 132, 0.05)', border: '1px solid rgba(255, 110, 132, 0.2)' }}>
              <p className="text-sm text-on-surface font-bold text-center">Alle Daten unwiderruflich löschen?</p>
              <div className="flex gap-3">
                <button
                  onClick={clearAllData}
                  className="flex-1 py-3 rounded-xl text-xs font-black text-error uppercase tracking-widest"
                  style={{ background: 'rgba(255, 110, 132, 0.1)' }}
                >
                  Ja, alles löschen
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-surface-container rounded-xl text-xs font-bold text-on-surface-variant uppercase tracking-widest"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full hover:bg-error transition-colors group flex items-center justify-center p-5 rounded-xl"
              style={{ background: 'rgba(255, 110, 132, 0.05)', border: '1px solid rgba(72, 72, 71, 0.05)' }}
            >
              <div className="flex items-center gap-3 text-error">
                <span className="material-symbols-outlined">delete_forever</span>
                <span className="font-bold text-lg uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Alle Daten löschen
                </span>
              </div>
            </button>
          )}
        </section>

        {/* App Info */}
        <section className="mt-10 text-center pb-4">
          <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase" style={{ opacity: 0.4 }}>
            LOCALIFT v1.0.0 · Offline-first PWA
          </p>
          <p className="text-xs text-on-surface-variant mt-1" style={{ opacity: 0.3 }}>
            Keine Server · Keine Profile · Deine Daten
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
