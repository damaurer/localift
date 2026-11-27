import {describe, expect, it} from 'vitest';
import {BACKUP_FORMAT, BACKUP_VERSION, backupFileName, buildBackup} from '../data/backup.ts';
import type {AppSettings} from '../types/app.types.ts';

const settings: AppSettings = {
    weightUnit: 'lbs',
    language: 'en',
    theme: 'light',
    reminderEnabled: true,
    reminderTime: '18:30',
    reminderDays: [true, false, true, false, true, false, false],
    vibration: true,
    aiTrainer: {enabled: false, debugOutput: false, modelUrl: 'https://example.org/model.gguf'},
};

describe('buildBackup', () => {
    it('marks the file as version 2 and includes settings and nutrition', () => {
        const now = new Date('2026-11-27T10:15:00Z');
        const backup = buildBackup({
            plans: [],
            sessions: [],
            exercises: [],
            settings,
            nutritionDays: [{date: '2026-11-26', entries: [], waterMl: 1500}],
            nutritionGoals: {calories: 2200, protein: 150, carbs: 250, fat: 70, waterMl: 2500},
        }, now);

        expect(backup.format).toBe(BACKUP_FORMAT);
        expect(backup.version).toBe(BACKUP_VERSION);
        expect(backup.exportDate).toBe('2026-11-27T10:15:00.000Z');
        expect(backup.settings.weightUnit).toBe('lbs');
        expect(backup.nutritionDays).toHaveLength(1);
        expect(backup.nutritionGoals.calories).toBe(2200);
        // Fassung 1 kannte diese Schlüssel schon; ältere Importe lesen Fassung 2 weiter
        expect(Object.keys(backup)).toEqual(expect.arrayContaining(['exportDate', 'plans', 'sessions', 'exercises']));
    });

    it('names the file after the UTC date', () => {
        expect(backupFileName(new Date('2026-11-27T23:30:00Z'))).toBe('localift-backup-2026-11-27.json');
    });
});
