export interface AppSettings {
  weightUnit: 'kg' | 'lbs';
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDays: boolean[];
  vibration: boolean;
}

export type NavTab = 'dashboard' | 'plans' | 'calories' | 'settings';
