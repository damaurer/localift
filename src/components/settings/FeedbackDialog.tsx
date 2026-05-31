import React from 'react';
import {useTranslation} from "../../i18n/I18nContext.tsx";

interface FeedbackDialogProps {
    feedbackSkipDialog: boolean;
    setFeedbackSkipDialog: (skip: boolean) => void;
    setShowFeedbackDialog: (show: boolean) => void;
    handleFeedbackConfirm: () => void;
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
    feedbackSkipDialog,
    setFeedbackSkipDialog,
    setShowFeedbackDialog,
    handleFeedbackConfirm,
}) => {
    const t = useTranslation();
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowFeedbackDialog(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            aria-describedby="feedback-dialog-desc"
        >
            <div
                className="w-full max-w-sm rounded-2xl p-6 space-y-5"
                style={{ background: '#1a1a1a', border: '1px solid rgba(149,170,255,0.15)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: 'rgba(149,170,255,0.1)' }}>
                        <span className="material-symbols-outlined text-primary text-2xl"
                              style={{ fontVariationSettings: "'FILL' 1" }}>bug_report</span>
                    </div>
                    <div>
                        <h2 id="feedback-dialog-title" className="font-bold text-lg"
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.feedback.title}</h2>
                        <p className="text-xs text-on-surface-variant">{t.feedback.subtitle}</p>
                    </div>
                </div>

                <p id="feedback-dialog-desc" className="text-sm text-on-surface-variant leading-relaxed">
                    {t.feedback.description.split('<highlight>').map((part, i) => {
                        if (i === 0) return part;
                        const [highlight, rest] = part.split('</highlight>');
                        return <span key={i}><span className="text-primary font-bold">{highlight}</span>{rest}</span>;
                    })}
                </p>

                <p className="text-sm font-medium text-on-surface">
                    {t.feedback.openGithub}
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
                    <span className="text-xs text-on-surface-variant">{t.feedback.skipCheckbox}</span>
                </label>

                <div className="flex gap-3 pt-1">
                    <button
                        onClick={() => setShowFeedbackDialog(false)}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-on-surface-variant uppercase tracking-widest"
                        style={{ background: 'rgba(72,72,71,0.3)' }}
                    >
                        {t.common.cancel}
                    </button>
                    <button
                        onClick={handleFeedbackConfirm}
                        className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest"
                        style={{ background: 'linear-gradient(135deg, #95aaff, #3766ff)', color: '#00247e' }}
                    >
                        {t.feedback.yesOpen}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackDialog;
