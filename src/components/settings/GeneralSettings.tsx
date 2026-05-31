import React from 'react';
import type {AppSettings} from "../../types/app.types.ts";
import {useTranslation} from "../../i18n/I18nContext.tsx";
import {AVAILABLE_LANGUAGES, LANGUAGE_LABELS} from "../../i18n/I18nContext.tsx";
import type {Language} from "../../i18n/types.ts";

interface GeneralSettingsProps {
    weightUnit: 'kg' | 'lbs';
    language: Language;
    vibration: boolean;
    showExportSuccess: boolean;
    showImportSuccess: boolean;
    showImportError: boolean;
    updateSettings: (settings: Partial<AppSettings>) => void;
    handleExport: () => void;
    handleImportClick: () => void;
    handleFeedbackClick: () => void;
    setShowConsentInfo: (show: boolean) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    weightUnit,
    language,
    vibration,
    showExportSuccess,
    showImportSuccess,
    showImportError,
    updateSettings,
    handleExport,
    handleImportClick,
    handleFeedbackClick,
    setShowConsentInfo,
}) => {
    const t = useTranslation();

    return (
        <section className="space-y-4 mb-10">
            <h3 className="text-xs uppercase tracking-widest text-on-surface-variant mb-5 ml-1"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t.settings.appAndData}
            </h3>

            {/* Language */}
            <div className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-on-surface-variant">language</span>
                    <div>
                        <span className="font-bold text-lg"
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.language}</span>
                        <p className="text-xs text-on-surface-variant mt-0.5">{t.settings.languageDesc}</p>
                    </div>
                </div>
                <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                    {AVAILABLE_LANGUAGES.map(lang => (
                        <button
                            key={lang}
                            onClick={() => updateSettings({ language: lang })}
                            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest transition-all ${
                                language === lang
                                    ? 'bg-primary text-on-primary'
                                    : 'text-on-surface-variant'
                            }`}
                            aria-pressed={language === lang}
                        >
                            {LANGUAGE_LABELS[lang]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Weight Unit */}
            <div className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-on-surface-variant">straighten</span>
                    <div>
                        <span className="font-bold text-lg"
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.weightUnit}</span>
                        <p className="text-xs text-on-surface-variant mt-0.5">{t.settings.weightUnitDesc}</p>
                    </div>
                </div>
                <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                    {(['kg', 'lbs'] as const).map(unit => (
                        <button
                            key={unit}
                            onClick={() => updateSettings({ weightUnit: unit })}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                                weightUnit === unit
                                    ? 'bg-primary text-on-primary'
                                    : 'text-on-surface-variant'
                            }`}
                            aria-pressed={weightUnit === unit}
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
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.vibration}</span>
                </div>
                <button
                    onClick={() => updateSettings({ vibration: !vibration })}
                    className="relative inline-flex items-center cursor-pointer"
                    role="switch"
                    aria-checked={vibration}
                    aria-label={t.settings.vibration}
                >
                    <div
                        className="w-12 h-6 rounded-full transition-colors duration-200 relative"
                        style={{ background: vibration ? '#3766ff' : '#262626' }}
                    >
                        <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                            style={{ transform: vibration ? 'translateX(calc(100% + 2px))' : 'translateX(2px)' }}
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
                        <span className="font-bold text-lg block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {showExportSuccess ? t.settings.exported : t.settings.exportData}
                        </span>
                        <p className="text-xs text-on-surface-variant">{t.settings.downloadBackup}</p>
                    </div>
                </div>
                <span
                    className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
            </button>

            {/* Import button (actual input is in parent) */}
            <button
                onClick={handleImportClick}
                className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <span
                        className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">upload</span>
                    <div className="text-left">
                        <span className="font-bold text-lg block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {showImportSuccess ? t.settings.imported : t.settings.importData}
                        </span>
                        <p className="text-xs text-on-surface-variant">
                            {showImportError ? t.settings.importFailed : t.settings.selectBackup}
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
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.feedbackAndProblems}</span>
                        <p className="text-xs text-on-surface-variant">{t.settings.reportBugsOrWishes}</p>
                    </div>
                </div>
                <span
                    className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
            </button>

            {/* Datenschutzhinweise */}
            <button
                onClick={() => setShowConsentInfo(true)}
                className="w-full bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl p-5 flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <span
                        className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">privacy_tip</span>
                    <div className="text-left">
                        <span className="font-bold text-lg block"
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.privacyNotice}</span>
                        <p className="text-xs text-on-surface-variant">{t.settings.dataStorageTransparency}</p>
                    </div>
                </div>
                <span
                    className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
            </button>
        </section>
    );
};

export default GeneralSettings;
