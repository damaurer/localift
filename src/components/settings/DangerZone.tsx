import React from 'react';

interface DangerZoneProps {
    showClearConfirm: boolean;
    setShowClearConfirm: (show: boolean) => void;
    handleClearAll: () => void;
}

const DangerZone: React.FC<DangerZoneProps> = ({
    showClearConfirm,
    setShowClearConfirm,
    handleClearAll,
}) => {
    return (
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
                    style={{
                        background: 'rgba(255, 110, 132, 0.05)',
                        border: '1px solid rgba(72, 72, 71, 0.05)'
                    }}
                >
                    <div className="flex items-center gap-3 text-error">
                        <span className="material-symbols-outlined">delete_forever</span>
                        <span className="font-bold text-lg uppercase tracking-widest"
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Alle Daten löschen
                        </span>
                    </div>
                </button>
            )}
        </section>
    );
};

export default DangerZone;
