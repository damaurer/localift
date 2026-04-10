import {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';

import { useHeader } from '../contexts/LayoutContext';
import {requestPermission, getPermission, getStorageEstimate} from '../notifications';
import {storage} from '../data/storage.ts';
import type {StorageEstimate} from '../notifications';
import {useSettingsContext} from "../contexts/settings/SettingsContext.tsx";
import {useWorkoutContext} from "../contexts/workout/WorkoutContext.tsx";
import {useExerciseContext} from "../contexts/exercise/ExerciseContext.tsx";
import {usePlanContext} from "../contexts/plan/PlanContext.tsx";
import {useAiContext} from "../contexts/ai/AiContext.tsx";
import {DEFAULT_MODEL_URL} from "../ai/wllama-config.ts";

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const GITHUB_ISSUES_URL = 'https://github.com/damaurer/localift/issues';

export default function Settings() {
    useHeader({}, []);
    const navigate = useNavigate();
    const {settings, updateSettings, clearAllData, importBackup} = useSettingsContext();
    const {sessions} = useWorkoutContext();
    const {exercises} = useExerciseContext();
    const {plans} = usePlanContext();
    const {modelStatus, downloadProgress, modelError, loadedModelUrl, installModel, swapModel} = useAiContext();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [aiModelUrlInput, setAiModelUrlInput] = useState('');
    const [showExportSuccess, setShowExportSuccess] = useState(false);
    const [showImportSuccess, setShowImportSuccess] = useState(false);
    const [showImportError, setShowImportError] = useState(false);
    const [notifPermission, setNotifPermission] = useState(() => getPermission());
    const [storageInfo, setStorageInfo] = useState<StorageEstimate | null>(null);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
    const [feedbackSkipDialog, setFeedbackSkipDialog] = useState(false);
    const importInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        getStorageEstimate().then(setStorageInfo);
    }, []);

    const handleFeedbackClick = async () => {
        const skip = await storage.getFeedbackSkip();
        if (skip) {
            window.open(GITHUB_ISSUES_URL, '_blank', 'noopener,noreferrer');
        } else {
            setFeedbackSkipDialog(false);
            setShowFeedbackDialog(true);
        }
    };

    const handleFeedbackConfirm = async () => {
        if (feedbackSkipDialog) {
            await storage.saveFeedbackSkip(true);
        }
        setShowFeedbackDialog(false);
        window.open(GITHUB_ISSUES_URL, '_blank', 'noopener,noreferrer');
    };

    const handleRequestPermission = async () => {
        const result = await requestPermission();
        setNotifPermission(result);
        if (result === 'granted' && !settings.reminderEnabled) {
            updateSettings({reminderEnabled: true});
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({reminderTime: e.target.value});
    };

    const toggleDay = (idx: number) => {
        const next = [...settings.reminderDays];
        next[idx] = !next[idx];
        updateSettings({reminderDays: next});
    };

    const handleClearAll = () => {
        clearAllData();
        navigate('/');
    };

    const handleExport = () => {
        const data = {
            exportDate: new Date().toISOString(),
            plans,
            sessions,
            exercises,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `localift-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 2000);
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';

        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as {
                exportDate?: string;
                plans?: unknown;
                sessions?: unknown;
                exercises?: unknown;
            };

            if (
                !parsed ||
                (!Array.isArray(parsed.plans) && !Array.isArray(parsed.sessions) && !Array.isArray(parsed.exercises))
            ) {
                throw new Error('Ungültiges Backup-Format');
            }

            importBackup({
                exportDate: parsed.exportDate,
                plans: Array.isArray(parsed.plans) ? parsed.plans as never : undefined,
                sessions: Array.isArray(parsed.sessions) ? parsed.sessions as never : undefined,
                exercises: Array.isArray(parsed.exercises) ? parsed.exercises as never : undefined,
            });

            setShowImportSuccess(true);
            setTimeout(() => setShowImportSuccess(false), 2000);
        } catch (error) {
            console.error('Import failed:', error);
            setShowImportError(true);
            setTimeout(() => setShowImportError(false), 2500);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="pt-20 pb-32 px-6 max-w-2xl mx-auto">
                <section className="mb-10">
                    <h1 className="text-5xl font-bold tracking-tighter mb-2"
                        style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                        Settings
                    </h1>
                    <p className="text-on-surface-variant font-medium opacity-60">Deine Localift-Einstellungen</p>
                </section>

                {/* Stats summary */}
                <section className="mb-8 grid grid-cols-3 gap-3">
                    {[
                        {label: 'Einheiten', value: sessions.length},
                        {label: 'Pläne', value: plans.length},
                        {label: 'Übungen', value: exercises.length},
                    ].map(stat => (
                        <div key={stat.label} className="bg-surface-container rounded-xl p-4 text-center">
                            <p className="text-2xl font-black text-primary"
                               style={{fontFamily: 'Space Grotesk, sans-serif'}}>{stat.value}</p>
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
                  style={{
                      color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff',
                      fontVariationSettings: "'FILL' 1"
                  }}
              >
                {notifPermission === 'denied' ? 'notifications_off' : 'notifications'}
              </span>
                            <div className="text-left">
                                <p className="font-bold text-sm" style={{
                                    fontFamily: 'Space Grotesk, sans-serif',
                                    color: notifPermission === 'denied' ? '#ff6e84' : '#95aaff'
                                }}>
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
                                    <span
                                        className="material-symbols-outlined text-on-surface-variant text-base">storage</span>
                                    <span
                                        className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lokaler Speicher</span>
                                </div>
                                <span
                                    className="text-xs font-bold text-primary">{storageInfo.usedMB} / {storageInfo.quotaMB} MB</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden"
                                 style={{background: 'rgba(72,72,71,0.3)'}}>
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
                            <p className="text-xs text-on-surface-variant mt-1.5" style={{opacity: 0.6}}>
                                {storageInfo.percentUsed}% belegt · Daten werden lokal gesichert
                            </p>
                        </div>
                    </section>
                )}

                {/* Workout Reminders */}
                <section className="mb-10">
                    <div
                        className="bg-surface-container rounded-xl p-6 relative overflow-hidden group"
                        style={{boxShadow: 'none'}}
                    >
                        <div
                            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{background: 'rgba(149, 170, 255, 0.1)'}}/>

                        <div className="flex items-center justify-between mb-7">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                     style={{background: 'rgba(149, 170, 255, 0.1)'}}>
                                    <span className="material-symbols-outlined text-primary text-2xl"
                                          style={{fontVariationSettings: "'FILL' 1"}}>alarm</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold"
                                        style={{fontFamily: 'Space Grotesk, sans-serif'}}>Erinnerungen</h2>
                                    <p className="text-on-surface-variant text-sm">Tägliche Trainingshinweise</p>
                                </div>
                            </div>
                            {/* Toggle */}
                            <button
                                onClick={() => {
                                    if (!settings.reminderEnabled && notifPermission !== 'granted') {
                                        handleRequestPermission();
                                    } else {
                                        updateSettings({reminderEnabled: !settings.reminderEnabled});
                                    }
                                }}
                                className="relative inline-flex items-center cursor-pointer"
                            >
                                <div
                                    className="w-14 h-7 rounded-full transition-colors duration-200 relative"
                                    style={{background: settings.reminderEnabled ? '#3766ff' : '#262626'}}
                                >
                                    <div
                                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                                        style={{transform: settings.reminderEnabled ? 'translateX(calc(100% + 4px))' : 'translateX(4px)'}}
                                    />
                                </div>
                            </button>
                        </div>

                        {settings.reminderEnabled && (
                            <div className="space-y-6">
                                {/* Time picker */}
                                <div className="flex items-end justify-between pb-5"
                                     style={{borderBottom: '1px solid rgba(72, 72, 71, 0.1)'}}>
                                    <div className="flex flex-col gap-1">
                                        <span
                                            className="text-xs uppercase tracking-widest font-bold text-primary">Uhrzeit</span>
                                        <input
                                            type="time"
                                            value={settings.reminderTime}
                                            onChange={handleTimeChange}
                                            className="bg-transparent border-none text-5xl font-black text-on-surface focus:outline-none"
                                            style={{fontFamily: 'Space Grotesk, sans-serif', colorScheme: 'dark'}}
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
                                                ? {
                                                    background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                                                    color: '#00247e'
                                                }
                                                : {background: '#262626', color: '#adaaaa'}
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

                {/* ── KI Trainer ──────────────────────────────────────────── */}
                <section className="mb-10">
                    <h3 className="text-xs uppercase tracking-widest text-on-surface-variant mb-5 ml-1"
                        style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                        KI Trainer
                    </h3>

                    <div className="bg-surface-container rounded-xl p-6 relative overflow-hidden group"
                         style={{boxShadow: 'none'}}>
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
                             style={{background: 'rgba(149,170,255,0.08)'}}/>

                        {/* Header row */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                     style={{background: settings.aiTrainer.enabled
                                         ? 'linear-gradient(135deg, #95aaff, #3766ff)'
                                         : 'rgba(149,170,255,0.1)'}}>
                                    <span className="material-symbols-outlined text-2xl"
                                          style={{
                                              color: settings.aiTrainer.enabled ? '#00247e' : '#95aaff',
                                              fontVariationSettings: "'FILL' 1"
                                          }}>psychology</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold"
                                        style={{fontFamily: 'Space Grotesk, sans-serif'}}>KI Trainer</h2>
                                    <p className="text-on-surface-variant text-sm">Lokales Sprachmodell (WASM)</p>
                                </div>
                            </div>
                            {/* Enable toggle */}
                            <button
                                onClick={() => updateSettings({
                                    aiTrainer: {...settings.aiTrainer, enabled: !settings.aiTrainer.enabled}
                                })}
                                className="relative inline-flex items-center cursor-pointer"
                            >
                                <div className="w-14 h-7 rounded-full transition-colors duration-200 relative"
                                     style={{background: settings.aiTrainer.enabled ? '#3766ff' : '#262626'}}>
                                    <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                                         style={{transform: settings.aiTrainer.enabled ? 'translateX(calc(100% + 4px))' : 'translateX(4px)'}}/>
                                </div>
                            </button>
                        </div>

                        {settings.aiTrainer.enabled && (
                            <div className="space-y-5">
                                {/* Model status badge */}
                                <div className="flex items-center gap-3 pb-5"
                                     style={{borderBottom: '1px solid rgba(72,72,71,0.1)'}}>
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                                        background: modelStatus === 'ready' ? '#4ade80'
                                            : modelStatus === 'error' ? '#ff6e84'
                                            : modelStatus === 'downloading' || modelStatus === 'loading' ? '#95aaff'
                                            : '#767575',
                                        boxShadow: modelStatus === 'ready' ? '0 0 8px rgba(74,222,128,0.6)'
                                            : modelStatus === 'downloading' || modelStatus === 'loading' ? '0 0 8px rgba(149,170,255,0.6)'
                                            : 'none',
                                    }}/>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold block" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                                            {modelStatus === 'ready' ? 'Modell bereit'
                                                : modelStatus === 'downloading' ? `Download… ${Math.round(downloadProgress * 100)}%`
                                                : modelStatus === 'loading' ? 'Wird geladen…'
                                                : modelStatus === 'error' ? 'Fehler beim Laden'
                                                : 'Nicht installiert'}
                                        </span>
                                        {loadedModelUrl && (
                                            <span className="text-xs text-on-surface-variant truncate block" style={{opacity: 0.6}}>
                                                {loadedModelUrl.split('/').pop()}
                                            </span>
                                        )}
                                    </div>
                                    {(modelStatus === 'downloading' || modelStatus === 'loading') && (
                                        <div className="w-24 h-1 rounded-full overflow-hidden shrink-0"
                                             style={{background: '#262626'}}>
                                            <div className="h-full rounded-full transition-all duration-300"
                                                 style={{
                                                     width: modelStatus === 'loading' ? '100%' : `${downloadProgress * 100}%`,
                                                     background: 'linear-gradient(135deg, #95aaff, #3766ff)'
                                                 }}/>
                                        </div>
                                    )}
                                </div>

                                {/* Error message */}
                                {modelError && (
                                    <div className="px-4 py-3 rounded-xl text-xs font-bold text-error"
                                         style={{background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)'}}>
                                        {modelError}
                                    </div>
                                )}

                                {/* Model URL input — only editable when not loaded */}
                                {modelStatus !== 'ready' && (
                                    <div className="space-y-2">
                                        <span className="text-xs uppercase tracking-widest font-bold text-primary">
                                            Modell-URL
                                        </span>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={aiModelUrlInput || settings.aiTrainer.modelUrl}
                                                onChange={e => setAiModelUrlInput(e.target.value)}
                                                placeholder={DEFAULT_MODEL_URL}
                                                className="flex-1 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none"
                                                style={{
                                                    background: '#131313',
                                                    border: '1px solid rgba(72,72,71,0.2)',
                                                    fontFamily: 'Manrope, sans-serif',
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const url = aiModelUrlInput.trim() || settings.aiTrainer.modelUrl;
                                                    updateSettings({aiTrainer: {...settings.aiTrainer, modelUrl: url}});
                                                    setAiModelUrlInput('');
                                                }}
                                                className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shrink-0 transition-all active:scale-95"
                                                style={{background: '#262626', color: '#adaaaa'}}
                                            >
                                                Speichern
                                            </button>
                                        </div>
                                        <p className="text-xs text-on-surface-variant leading-relaxed" style={{opacity: 0.6}}>
                                            GGUF-Datei von HuggingFace oder einem anderen CORS-fähigen Server. Das Modell wird beim ersten Start heruntergeladen und im Browser-Cache gespeichert.
                                        </p>
                                    </div>
                                )}

                                {/* Install button */}
                                {(modelStatus === 'idle' || modelStatus === 'error') && (
                                    <button
                                        onClick={installModel}
                                        className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
                                        style={{
                                            background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                                            color: '#00247e',
                                            fontFamily: 'Space Grotesk, sans-serif',
                                        }}
                                    >
                                        Modell installieren
                                    </button>
                                )}

                                {modelStatus === 'ready' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate('/chat')}
                                            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                            style={{background: 'rgba(149,170,255,0.1)', color: '#95aaff'}}
                                        >
                                            <span className="material-symbols-outlined text-base"
                                                  style={{fontVariationSettings: "'FILL' 1"}}>psychology</span>
                                            Chat öffnen
                                        </button>
                                        <button
                                            onClick={() => { void swapModel(); }}
                                            className="py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-transform shrink-0"
                                            style={{background: 'rgba(72,72,71,0.3)', color: '#adaaaa'}}
                                            title="Modell wechseln"
                                        >
                                            <span className="material-symbols-outlined text-base">swap_horiz</span>
                                            Wechseln
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* General Settings */}
                <section className="space-y-4 mb-10">
                    <h3 className="text-xs uppercase tracking-widest text-on-surface-variant mb-5 ml-1"
                        style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                        App & Daten
                    </h3>

                    {/* Weight Unit */}
                    <div className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-on-surface-variant">straighten</span>
                            <div>
                                <span className="font-bold text-lg"
                                      style={{fontFamily: 'Space Grotesk, sans-serif'}}>Gewichtseinheit</span>
                                <p className="text-xs text-on-surface-variant mt-0.5">Für alle Gewichtsanzeigen</p>
                            </div>
                        </div>
                        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                            {(['kg', 'lbs'] as const).map(unit => (
                                <button
                                    key={unit}
                                    onClick={() => updateSettings({weightUnit: unit})}
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
                            <span className="font-bold text-lg"
                                  style={{fontFamily: 'Space Grotesk, sans-serif'}}>Vibration</span>
                        </div>
                        <button
                            onClick={() => updateSettings({vibration: !settings.vibration})}
                            className="relative inline-flex items-center cursor-pointer"
                        >
                            <div
                                className="w-12 h-6 rounded-full transition-colors duration-200 relative"
                                style={{background: settings.vibration ? '#3766ff' : '#262626'}}
                            >
                                <div
                                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                                    style={{transform: settings.vibration ? 'translateX(calc(100% + 2px))' : 'translateX(2px)'}}
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
                            <span
                                className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">download</span>
                            <div className="text-left">
                <span className="font-bold text-lg block" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {showExportSuccess ? '✓ Exportiert!' : 'Daten exportieren'}
                </span>
                                <p className="text-xs text-on-surface-variant">JSON-Backup herunterladen</p>
                            </div>
                        </div>
                        <span
                            className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
                    </button>

                    {/* Import */}
                    <input
                        ref={importInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={handleImportFileChange}
                    />
                    <button
                        onClick={handleImportClick}
                        className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <span
                                className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">upload</span>
                            <div className="text-left">
                <span className="font-bold text-lg block" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {showImportSuccess ? '✓ Importiert!' : 'Daten importieren'}
                </span>
                                <p className="text-xs text-on-surface-variant">
                                    {showImportError ? 'Import fehlgeschlagen' : 'JSON-Backup auswählen'}
                                </p>
                            </div>
                        </div>
                        <span
                            className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
                    </button>

                    {/* Feedback */}
                    <button
                        onClick={handleFeedbackClick}
                        className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <span
                                className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">bug_report</span>
                            <div className="text-left">
                                <span className="font-bold text-lg block"
                                      style={{fontFamily: 'Space Grotesk, sans-serif'}}>Feedback & Probleme</span>
                                <p className="text-xs text-on-surface-variant">Fehler melden oder Wünsche äußern</p>
                            </div>
                        </div>
                        <span
                            className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
                    </button>
                </section>

                {/* Danger zone */}
                <section>
                    {showClearConfirm ? (
                        <div className="rounded-xl p-5 space-y-4" style={{
                            background: 'rgba(255, 110, 132, 0.05)',
                            border: '1px solid rgba(255, 110, 132, 0.2)'
                        }}>
                            <p className="text-sm text-on-surface font-bold text-center">Alle Daten unwiderruflich
                                löschen?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClearAll}
                                    className="flex-1 py-3 rounded-xl text-xs font-black text-error uppercase tracking-widest"
                                    style={{background: 'rgba(255, 110, 132, 0.1)'}}
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
                            style={{
                                background: 'rgba(255, 110, 132, 0.05)',
                                border: '1px solid rgba(72, 72, 71, 0.05)'
                            }}
                        >
                            <div className="flex items-center gap-3 text-error">
                                <span className="material-symbols-outlined">delete_forever</span>
                                <span className="font-bold text-lg uppercase tracking-widest"
                                      style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  Alle Daten löschen
                </span>
                            </div>
                        </button>
                    )}
                </section>

                {/* App Info */}
                <section className="mt-10 text-center pb-4">
                    <p className="text-xs font-bold tracking-widest text-on-surface-variant uppercase"
                       style={{opacity: 0.4}}>
                        LOCALIFT v1.0.0 · Offline-first PWA
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1" style={{opacity: 0.3}}>
                        Keine Server · Keine Profile · Deine Daten
                    </p>
                </section>
            </main>

            {/* Feedback Dialog */}
            {showFeedbackDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    style={{background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'}}
                    onClick={() => setShowFeedbackDialog(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
                        style={{background: '#1a1a1a', border: '1px solid rgba(149,170,255,0.15)'}}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                 style={{background: 'rgba(149,170,255,0.1)'}}>
                                <span className="material-symbols-outlined text-primary text-2xl"
                                      style={{fontVariationSettings: "'FILL' 1"}}>bug_report</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-lg"
                                    style={{fontFamily: 'Space Grotesk, sans-serif'}}>Feedback & Probleme</h2>
                                <p className="text-xs text-on-surface-variant">Wie kann ich helfen?</p>
                            </div>
                        </div>

                        <p className="text-sm text-on-surface-variant leading-relaxed">
                            Feedback und Fehlerberichte werden ausschließlich über <span
                            className="text-primary font-bold">GitHub Issues</span> entgegengenommen. Dort kannst du
                            Bugs melden, Ideen einreichen und den Status deiner Anfrage verfolgen.
                        </p>

                        <p className="text-sm font-medium text-on-surface">
                            Möchtest du die GitHub-Issues-Seite jetzt öffnen?
                        </p>

                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                    background: feedbackSkipDialog ? 'linear-gradient(135deg, #95aaff, #3766ff)' : 'transparent',
                                    border: feedbackSkipDialog ? 'none' : '2px solid rgba(149,170,255,0.35)',
                                }}
                            >
                                {feedbackSkipDialog && (
                                    <span className="material-symbols-outlined text-white" style={{
                                        fontSize: '14px',
                                        fontVariationSettings: "'FILL' 1, 'wght' 700"
                                    }}>check</span>
                                )}
                            </div>
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={feedbackSkipDialog}
                                onChange={e => setFeedbackSkipDialog(e.target.checked)}
                            />
                            <span className="text-xs text-on-surface-variant">Nicht mehr anzeigen – direkt zu GitHub weiterleiten</span>
                        </label>

                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setShowFeedbackDialog(false)}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-on-surface-variant uppercase tracking-widest"
                                style={{background: 'rgba(72,72,71,0.3)'}}
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleFeedbackConfirm}
                                className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest"
                                style={{background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e'}}
                            >
                                Ja, öffnen
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
