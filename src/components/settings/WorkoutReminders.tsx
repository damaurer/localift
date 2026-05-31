import React, {useState} from 'react';
import {storage} from "../../data/storage.ts";
import type {AppSettings} from "../../types/app.types.ts";
import {useTranslation} from "../../i18n/I18nContext.tsx";

interface WorkoutRemindersProps {
    reminderEnabled: boolean;
    reminderTime: string;
    reminderDays: boolean[];
    notifPermission: NotificationPermission | 'default';
    handleRequestPermission: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => void;
}

const WorkoutReminders: React.FC<WorkoutRemindersProps> = ({
    reminderEnabled,
    reminderTime,
    reminderDays,
    notifPermission,
    handleRequestPermission,
    updateSettings,
}) => {
    const t = useTranslation();
    const DAY_LABELS = [t.days.mo, t.days.tu, t.days.we, t.days.th, t.days.fr, t.days.sa, t.days.su];
    const [time, setTime] = useState(reminderTime);

    const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await storage.clearLastReminder()
        updateSettings({ reminderTime: e.target.value });
    };

    const toggleDay = (idx: number) => {
        const next = [...reminderDays];
        next[idx] = !next[idx];
        updateSettings({ reminderDays: next });
    };

    return (
        <section className="mb-10">
            <div
                className="bg-surface-container rounded-xl p-6 relative overflow-hidden group"
                style={{ boxShadow: 'none' }}
            >
                <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: 'rgba(149, 170, 255, 0.1)' }} />

                <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                             style={{ background: 'rgba(149, 170, 255, 0.1)' }}>
                            <span className="material-symbols-outlined text-primary text-2xl"
                                  style={{ fontVariationSettings: "'FILL' 1" }}>alarm</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold"
                                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.settings.reminders}</h2>
                            <p className="text-on-surface-variant text-sm">{t.settings.dailyTrainingHints}</p>
                        </div>
                    </div>
                    {/* Toggle */}
                    <button
                        onClick={() => {
                            if (!reminderEnabled && notifPermission !== 'granted') {
                                handleRequestPermission();
                            } else {
                                updateSettings({ reminderEnabled: !reminderEnabled });
                            }
                        }}
                        className="relative inline-flex items-center cursor-pointer"
                    >
                        <div
                            className="w-14 h-7 rounded-full transition-colors duration-200 relative"
                            style={{ background: reminderEnabled ? '#3766ff' : '#262626' }}
                        >
                            <div
                                className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200"
                                style={{ transform: reminderEnabled ? 'translateX(calc(100% + 4px))' : 'translateX(4px)' }}
                            />
                        </div>
                    </button>
                </div>

                {reminderEnabled && (
                    <div className="space-y-6">
                        {/* Time picker */}
                        <div className="flex items-end justify-between pb-5"
                             style={{ borderBottom: '1px solid rgba(72, 72, 71, 0.1)' }}>
                            <div className="flex flex-col gap-1">
                                <span
                                    className="text-xs uppercase tracking-widest font-bold text-primary">{t.settings.time}</span>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    onBlur={handleTimeChange}
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
                                    style={reminderDays[i]
                                        ? {
                                            background: 'linear-gradient(135deg, #95aaff, #3766ff)',
                                            color: '#00247e'
                                        }
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
    );
};

export default WorkoutReminders;
