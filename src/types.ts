export type AppTab = 'hub' | 'posts' | 'links' | 'bots' | 'settings';

export type ThemeMode = 'night' | 'day' | 'oled';

export type AccentPalette = 'blue' | 'emerald' | 'violet' | 'coral';

export type StartScreenMode = 'hub' | 'web_k' | 'web_a';

export type BookmarkCategory = 'channel' | 'bot' | 'chat' | 'personal';

export interface TelegramBookmark {
  id: string;
  title: string;
  handle: string; // @username, t.me/..., or https://...
  category: BookmarkCategory;
  note?: string;
  pinned?: boolean;
  createdAt: number;
}

export interface PostDraft {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentPalette;
  startScreen: StartScreenMode;
  desktopUserAgent: boolean;
  doubleBackExit: boolean;
  showFloatingHubButton: boolean;
  customWebUrl: string;
  demoBotMode: boolean;
}

export interface NativeBuildInfo {
  isNativeAndroid: boolean;
  packageId: string;
  versionName: string;
  versionCode: number;
  androidSdk: number | null;
  engine: string;
}

export interface TelejkaNativeBridge {
  openTelegramWeb: (url: string, title: string, desktopUa: boolean, showHubButton: boolean) => void;
  openExternalUrl: (url: string) => void;
  saveNativePrefs: (jsonPrefs: string) => void;
  clearWebViewCache: () => boolean;
  getBuildInfo: () => string;
  vibrateShort?: () => void;
}

declare global {
  interface Window {
    TelejkaNative?: TelejkaNativeBridge;
  }
}

export interface BotInlineButton {
  id: string;
  text: string;
  url: string;
}

export interface BotApiLogEntry {
  id: string;
  timestamp: number;
  method: string;
  ok: boolean;
  demo: boolean;
  summary: string;
  payload: unknown;
}
