import React from 'react';
import type {StorageEstimate} from '../../notifications';

interface StorageUsageProps {
    storageInfo: StorageEstimate | null;
}

const StorageUsage: React.FC<StorageUsageProps> = ({ storageInfo }) => {
    if (!storageInfo) return null;

    return (
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
    );
};

export default StorageUsage;
