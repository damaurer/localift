export interface AiTrainerSettings {
  /** Whether the AI Trainer feature is enabled */
  enabled: boolean;
  /** Show raw agent completions, tool calls, and tool results in the chat */
  debugOutput: boolean;
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
  language: 'de' | 'en';
  theme: 'dark' | 'light';
  reminderEnabled: boolean;
  reminderTime: string;
  reminderDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  vibration: boolean;
  aiTrainer: AiTrainerSettings;
}

export type NavTab = 'dashboard' | 'plans' | 'calories' | 'settings' | 'chat';

export interface ConsentState {
  accepted: boolean;
  version: string;
  timestamp: number;
}

export const CURRENT_CONSENT_VERSION = '1.0';
