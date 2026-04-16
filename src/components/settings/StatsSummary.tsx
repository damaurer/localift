import React from 'react';

interface StatsSummaryProps {
    sessionsCount: number;
    plansCount: number;
    exercisesCount: number;
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ sessionsCount, plansCount, exercisesCount }) => {
    return (
        <section className="mb-8 grid grid-cols-3 gap-3">
            {[
                { label: 'Einheiten', value: sessionsCount },
                { label: 'Pläne', value: plansCount },
                { label: 'Übungen', value: exercisesCount },
            ].map(stat => (
                <div key={stat.label} className="bg-surface-container rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-primary"
                       style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</p>
                    <p className="text-xs text-outline font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
            ))}
        </section>
    );
};

export default StatsSummary;
