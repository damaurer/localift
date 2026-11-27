import type {Exercise, WorkoutPlan, WorkoutSession} from '../types/workout.types.ts';
import type {NutritionDay, NutritionGoals} from '../types/nutrition.types.ts';
import type {AppSettings} from '../types/app.types.ts';

/** Kennung der Sicherungsdatei; Fassung 1 (bis 11/2026) hatte weder Kennung noch Version. */
export const BACKUP_FORMAT = 'localift-backup';
/** Fassung 2: zusätzlich Einstellungen und Ernährung (für den Umzug nach Gymprint). */
export const BACKUP_VERSION = 2;

export interface BackupData {
    plans: WorkoutPlan[];
    sessions: WorkoutSession[];
    exercises: Exercise[];
    settings: AppSettings;
    nutritionDays: NutritionDay[];
    nutritionGoals: NutritionGoals;
}

export interface Backup extends BackupData {
    format: typeof BACKUP_FORMAT;
    version: typeof BACKUP_VERSION;
    exportDate: string;
}

/** Inhalt der Sicherung `localift-backup-JJJJ-MM-TT.json`. */
export function buildBackup(data: BackupData, now: Date = new Date()): Backup {
    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportDate: now.toISOString(),
        plans: data.plans,
        sessions: data.sessions,
        exercises: data.exercises,
        settings: data.settings,
        nutritionDays: data.nutritionDays,
        nutritionGoals: data.nutritionGoals,
    };
}

/** Dateiname der Sicherung mit dem UTC-Datum. */
export function backupFileName(now: Date = new Date()): string {
    return `localift-backup-${now.toISOString().split('T')[0]}.json`;
}
