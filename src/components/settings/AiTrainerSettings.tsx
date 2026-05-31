import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppSettings } from "../../types/app.types.ts";
import { useTranslation } from "../../i18n/I18nContext.tsx";

interface AiTrainerSettingsProps {
    aiTrainer: {
        enabled: boolean;
        modelUrl: string;
    };
    modelStatus: string;
    downloadProgress: number;
    modelError: string | null;
    loadedModelUrl: string | null;
    updateSettings: (settings: Partial<AppSettings>) => void;
}

const AiTrainerSettings: React.FC<AiTrainerSettingsProps> = ({
    aiTrainer,
    modelStatus,
    downloadProgress,
    modelError,
    loadedModelUrl,
    updateSettings
}) => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [showDesc, setShowDesc] = useState(false);
    const [showColors, setShowColors] = useState(false);

    return (
        <section className="mb-10">
            <h3 className="text-xs uppercase tracking-widest text-on-surface-variant mb-5 ml-1"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t.settings.aiTrainer}
            </h3>

            <div className="bg-surface-container rounded-xl p-6 relative overflow-hidden group"
                 style={{ boxShadow: 'none' }}>
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
                     style={{ background: 'rgba(149,170,255,0.08)' }} />

                {/* Header row */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                             style={{
                                 background: aiTrainer.enabled
                                     ? 'linear-gradient(135deg, #95aaff, #3766ff)'
                                     : 'rgba(149,170,255,0.1)'
                             }}>
                            <span className="material-symbols-outlined text-2xl"
                                  style={{
                                      color: aiTrainer.enabled ? '#00247e' : '#95aaff',
                                      fontVariationSettings: "'FILL' 1"
                                  }}>psychology</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold"
                                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.aiTrainer}</h2>
                            <p className="text-on-surface-variant text-sm">{t.settings.localModel}</p>
                        </div>
                    </div>
                    {/* Enable toggle */}
                    <button
                        onClick={() => updateSettings({
                            aiTrainer: { ...aiTrainer, enabled: !aiTrainer.enabled }
                        })}
                        className="relative inline-flex items-center cursor-pointer"
                    >
                        <div className="w-14 h-7 rounded-full transition-colors duration-200 relative"
                             style={{ background: aiTrainer.enabled ? 'var(--color-secondary)' : 'var(--color-surface-variant)' }}>
                            <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                                 style={{ transform: aiTrainer.enabled ? 'translateX(calc(100% + 4px))' : 'translateX(4px)' }} />
                        </div>
                    </button>
                </div>

                {aiTrainer.enabled && (
                    <div className="space-y-5">
                        {/* Model status badge */}
                        <div className="flex items-center gap-3 pb-5"
                             style={{ borderBottom: '1px solid rgba(72,72,71,0.1)' }}>
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                                background: modelStatus === 'ready' ? '#4ade80'
                                    : modelStatus === 'error' ? '#ff6e84'
                                    : modelStatus === 'downloading' || modelStatus === 'loading' ? '#95aaff'
                                    : '#767575',
                                boxShadow: modelStatus === 'ready' ? '0 0 8px rgba(74,222,128,0.6)'
                                    : modelStatus === 'downloading' || modelStatus === 'loading' ? '0 0 8px rgba(149,170,255,0.6)'
                                    : 'none',
                            }} />
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-bold block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    {modelStatus === 'ready' ? t.settings.modelReady
                                        : modelStatus === 'downloading' ? `${t.settings.downloadProgress} ${Math.round(downloadProgress * 100)}%`
                                        : modelStatus === 'loading' ? t.settings.modelLoading
                                        : modelStatus === 'error' ? t.settings.modelError
                                        : t.common.notInstalled}
                                </span>
                                {loadedModelUrl && (
                                    <span className="text-xs text-on-surface-variant truncate block" style={{ opacity: 0.6 }}>
                                        {loadedModelUrl.split('/').pop()}
                                    </span>
                                )}
                            </div>
                            {(modelStatus === 'downloading' || modelStatus === 'loading') && (
                                <div className="w-24 h-1 rounded-full overflow-hidden shrink-0"
                                     style={{ background: '#262626' }}>
                                    <div className="h-full rounded-full transition-all duration-300"
                                         style={{
                                             width: modelStatus === 'loading' ? '100%' : `${downloadProgress * 100}%`,
                                             background: 'linear-gradient(135deg, #95aaff, #3766ff)'
                                         }} />
                                </div>
                            )}
                        </div>

                        {/* Error message */}
                        {modelError && (
                            <div className="px-4 py-3 rounded-xl text-xs font-bold text-error"
                                 style={{ background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)' }}>
                                {modelError}
                            </div>
                        )}

                        {/* Description toggle */}
                        <button
                            onClick={() => setShowDesc(prev => !prev)}
                            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant w-full active:scale-[0.98] transition-transform"
                            style={{ opacity: 0.7 }}
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200"
                                  style={{ transform: showDesc ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                expand_more
                            </span>
                            {t.settings.aiTrainerDescTitle}
                        </button>

                        {showDesc && (
                            <div className="px-4 py-3 rounded-xl text-sm text-on-surface-variant space-y-2"
                                 style={{ background: 'rgba(149,170,255,0.05)' }}>
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-base mt-0.5" style={{ color: '#95aaff' }}>tips_and_updates</span>
                                    <span>{t.settings.aiTrainerDesc1}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-base mt-0.5" style={{ color: '#95aaff' }}>trending_up</span>
                                    <span>{t.settings.aiTrainerDesc2}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-base mt-0.5" style={{ color: '#95aaff' }}>calendar_month</span>
                                    <span>{t.settings.aiTrainerDesc3}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-base mt-0.5" style={{ color: '#4ade80' }}>lock</span>
                                    <span>{t.settings.aiTrainerDesc4}</span>
                                </div>
                            </div>
                        )}

                        {/* Color scheme toggle */}
                        <button
                            onClick={() => setShowColors(prev => !prev)}
                            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant w-full active:scale-[0.98] transition-transform"
                            style={{ opacity: 0.7 }}
                        >
                            <span className="material-symbols-outlined text-base transition-transform duration-200"
                                  style={{ transform: showColors ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                expand_more
                            </span>
                            {t.settings.aiTrainerColorTitle}
                        </button>

                        {showColors && (
                            <div className="px-4 py-3 rounded-xl text-sm text-on-surface-variant space-y-2"
                                 style={{ background: 'rgba(149,170,255,0.05)' }}>
                                <div className="flex items-start gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                                          style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', boxShadow: '0 0 8px rgba(149,170,255,0.6)' }} />
                                    <span>{t.settings.aiTrainerColorBlue}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                                          style={{ background: '#ff6e84', boxShadow: '0 0 8px rgba(255,110,132,0.6)' }} />
                                    <span>{t.settings.aiTrainerColorRed}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                                          style={{ background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.6)' }} />
                                    <span>{t.settings.aiTrainerColorYellow}</span>
                                </div>
                            </div>
                        )}

                        {modelStatus === 'ready' && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                    style={{ background: 'rgba(149,170,255,0.1)', color: '#95aaff' }}
                                >
                                    <span className="material-symbols-outlined text-base"
                                          style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                    {t.settings.openChat}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default AiTrainerSettings;
