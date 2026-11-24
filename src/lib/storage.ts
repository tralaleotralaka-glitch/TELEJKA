import type { AppSettings, PostDraft, TelegramBookmark } from '../types';

const KEYS = {
  settings: 'telejka_settings_v1',
  bookmarks: 'telejka_bookmarks_v1',
  drafts: 'telejka_drafts_v1',
  botToken: 'telejka_bot_token_v1',
  botChatId: 'telejka_bot_chat_id_v1',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'night',
  accent: 'blue',
  startScreen: 'hub',
  desktopUserAgent: false,
  doubleBackExit: true,
  showFloatingHubButton: true,
  customWebUrl: 'https://web.telegram.org/k/',
  demoBotMode: true,
};

export const DEFAULT_BOOKMARKS: TelegramBookmark[] = [
  {
    id: 'bm-botfather',
    title: 'BotFather',
    handle: '@BotFather',
    category: 'bot',
    note: 'Создание и настройка ботов Telegram',
    pinned: true,
    createdAt: 1700000001000,
  },
  {
    id: 'bm-telegram',
    title: 'Telegram News',
    handle: '@telegram',
    category: 'channel',
    note: 'Официальные новости и обновления',
    pinned: true,
    createdAt: 1700000002000,
  },
  {
    id: 'bm-tips',
    title: 'Telegram Tips',
    handle: '@TelegramTips',
    category: 'channel',
    note: 'Полезные функции и советы',
    pinned: false,
    createdAt: 1700000003000,
  },
  {
    id: 'bm-durov',
    title: 'Pavel Durov',
    handle: '@durov',
    category: 'channel',
    note: 'Канал основателя Telegram',
    pinned: false,
    createdAt: 1700000004000,
  },
  {
    id: 'bm-webk',
    title: 'Telegram Web K (прямой вход)',
    handle: 'https://web.telegram.org/k/',
    category: 'personal',
    note: 'Быстрый веб-клиент во встроенном WebView',
    pinned: false,
    createdAt: 1700000005000,
  },
];

export const DEFAULT_DRAFTS: PostDraft[] = [
  {
    id: 'draft-welcome',
    title: 'Анонс запуска TELEJKA',
    content: [
      '**TELEJKA v1.0** — удобный Android-хаб для работы с Telegram!',
      '',
      'Что внутри приложения:',
      '• Быстрый запуск __Telegram Web K__ и __Web A__ в нативном WebView',
      '• Редактор постов с поддержкой ||скрытых спойлеров||, `кода` и цитат',
      '• Генератор `t.me` / `tg://` ссылок и QR-кодов',
      '• Консоль [Telegram Bot API](https://core.telegram.org/bots/api) прямо на телефоне',
      '',
      '> Попробуйте нажать на размытый спойлер в предпросмотре — он раскроется так же, как в Telegram.',
    ].join('\n'),
    updatedAt: Date.now(),
  },
];

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function loadSettings(): AppSettings {
  const saved = safeReadJson<Partial<AppSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: AppSettings): void {
  safeWriteJson(KEYS.settings, settings);
}

export function loadBookmarks(): TelegramBookmark[] {
  const saved = safeReadJson<TelegramBookmark[] | null>(KEYS.bookmarks, null);
  if (!Array.isArray(saved)) return DEFAULT_BOOKMARKS;
  return saved;
}

export function saveBookmarks(bookmarks: TelegramBookmark[]): void {
  safeWriteJson(KEYS.bookmarks, bookmarks);
}

export function loadDrafts(): PostDraft[] {
  const saved = safeReadJson<PostDraft[] | null>(KEYS.drafts, null);
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_DRAFTS;
  return saved;
}

export function saveDrafts(drafts: PostDraft[]): void {
  safeWriteJson(KEYS.drafts, drafts);
}

export function loadBotCredentials(): { token: string; chatId: string } {
  try {
    return {
      token: window.localStorage.getItem(KEYS.botToken) ?? '',
      chatId: window.localStorage.getItem(KEYS.botChatId) ?? '',
    };
  } catch {
    return { token: '', chatId: '' };
  }
}

export function saveBotCredentials(token: string, chatId: string): void {
  try {
    if (token) window.localStorage.setItem(KEYS.botToken, token);
    else window.localStorage.removeItem(KEYS.botToken);

    if (chatId) window.localStorage.setItem(KEYS.botChatId, chatId);
    else window.localStorage.removeItem(KEYS.botChatId);
  } catch {
    // Ignore storage errors
  }
}

export interface TelejkaBackupPayload {
  app: 'TELEJKA';
  schemaVersion: 1;
  exportedAt: string;
  settings: AppSettings;
  bookmarks: TelegramBookmark[];
  drafts: PostDraft[];
}

export function createBackupPayload(
  settings: AppSettings,
  bookmarks: TelegramBookmark[],
  drafts: PostDraft[]
): TelejkaBackupPayload {
  return {
    app: 'TELEJKA',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    bookmarks,
    drafts,
  };
}

export function parseBackupPayload(jsonText: string): TelejkaBackupPayload | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<TelejkaBackupPayload>;
    if (parsed.app !== 'TELEJKA' || parsed.schemaVersion !== 1) return null;
    if (!Array.isArray(parsed.bookmarks) || !Array.isArray(parsed.drafts)) return null;
    return {
      app: 'TELEJKA',
      schemaVersion: 1,
      exportedAt: parsed.exportedAt ?? new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      bookmarks: parsed.bookmarks,
      drafts: parsed.drafts.length > 0 ? parsed.drafts : DEFAULT_DRAFTS,
    };
  } catch {
    return null;
  }
}
