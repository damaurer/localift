export interface AiTrainerSettings {
  /** Whether the AI Trainer feature is enabled */
  enabled: boolean;
  /**
   * GGUF model URL to download and run locally via WebAssembly.
   * Must be a publicly accessible URL (HuggingFace raw file, CDN, etc.).
   * The browser caches the file after first download.
   *
   */
  modelUrl: string;
}

export interface AppSettings {
  weightUnit: 'kg' | 'lbs';
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDays: boolean[];
  vibration: boolean;
  aiTrainer: AiTrainerSettings;
}

export type NavTab = 'dashboard' | 'plans' | 'calories' | 'settings' | 'chat';
