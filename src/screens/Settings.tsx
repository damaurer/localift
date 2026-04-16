import {useState, useEffect, useRef} from 'react';
import ConsentModal from '../components/ConsentModal';
import {useNavigate} from 'react-router-dom';

import { useHeader } from '../contexts/LayoutContext';
import {getPermission, getStorageEstimate} from '../notifications';
import {storage} from '../data/storage.ts';
import type {StorageEstimate} from '../notifications';
import {useSettingsContext} from "../contexts/settings/SettingsContext.tsx";
import {useWorkoutContext} from "../contexts/workout/WorkoutContext.tsx";
import {useExerciseContext} from "../contexts/exercise/ExerciseContext.tsx";
import {usePlanContext} from "../contexts/plan/PlanContext.tsx";
import {useAiContext} from "../contexts/ai/AiContext.tsx";
import {requestPermission} from '../notifications';

// New sub-components
import StatsSummary from '../components/settings/StatsSummary';
import NotificationPermissionBanner from '../components/settings/NotificationPermissionBanner';
import StorageUsage from '../components/settings/StorageUsage';
import WorkoutReminders from '../components/settings/WorkoutReminders';
import AiTrainerSettings from '../components/settings/AiTrainerSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import DangerZone from '../components/settings/DangerZone';
import FeedbackDialog from '../components/settings/FeedbackDialog';

const GITHUB_ISSUES_URL = 'https://github.com/damaurer/localift/issues';

export default function Settings() {
    useHeader({}, []);
    const navigate = useNavigate();
    const {settings, updateSettings, clearAllData, importBackup} = useSettingsContext();
    const {sessions} = useWorkoutContext();
    const {exercises} = useExerciseContext();
    const {plans} = usePlanContext();
    const {modelStatus, downloadProgress, modelError, loadedModelUrl} = useAiContext();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showExportSuccess, setShowExportSuccess] = useState(false);
    const [showImportSuccess, setShowImportSuccess] = useState(false);
    const [showImportError, setShowImportError] = useState(false);
    const [notifPermission, setNotifPermission] = useState(() => getPermission());
    const [storageInfo, setStorageInfo] = useState<StorageEstimate | null>(null);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
    const [feedbackSkipDialog, setFeedbackSkipDialog] = useState(false);
    const [showConsentInfo, setShowConsentInfo] = useState(false);
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

                <StatsSummary
                    sessionsCount={sessions.length}
                    plansCount={plans.length}
                    exercisesCount={exercises.length}
                />

                <NotificationPermissionBanner
                    notifPermission={notifPermission}
                    handleRequestPermission={handleRequestPermission}
                />

                <StorageUsage storageInfo={storageInfo} />

                <WorkoutReminders
                    reminderEnabled={settings.reminderEnabled}
                    reminderTime={settings.reminderTime}
                    reminderDays={settings.reminderDays}
                    notifPermission={notifPermission}
                    handleRequestPermission={handleRequestPermission}
                    updateSettings={updateSettings}
                />

                <AiTrainerSettings
                    aiTrainer={settings.aiTrainer}
                    modelStatus={modelStatus}
                    downloadProgress={downloadProgress}
                    modelError={modelError}
                    loadedModelUrl={loadedModelUrl}
                    updateSettings={updateSettings}
                />

                <GeneralSettings
                    weightUnit={settings.weightUnit}
                    vibration={settings.vibration}
                    showExportSuccess={showExportSuccess}
                    showImportSuccess={showImportSuccess}
                    showImportError={showImportError}
                    updateSettings={updateSettings}
                    handleExport={handleExport}
                    handleImportClick={handleImportClick}
                    handleFeedbackClick={handleFeedbackClick}
                    setShowConsentInfo={setShowConsentInfo}
                />

                {showConsentInfo && <ConsentModal onClose={() => setShowConsentInfo(false)} />}

                <DangerZone
                    showClearConfirm={showClearConfirm}
                    setShowClearConfirm={setShowClearConfirm}
                    handleClearAll={handleClearAll}
                />

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

            <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFileChange}
            />

            {showFeedbackDialog && (
                <FeedbackDialog
                    feedbackSkipDialog={feedbackSkipDialog}
                    setFeedbackSkipDialog={setFeedbackSkipDialog}
                    setShowFeedbackDialog={setShowFeedbackDialog}
                    handleFeedbackConfirm={handleFeedbackConfirm}
                />
            )}
        </div>
    );
}
