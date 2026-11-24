import type { BotInlineButton } from '../types';

export interface BotApiResult<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  demo?: boolean;
}

export interface BotUserInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface BotUpdateItem {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    from?: {
      id: number;
      first_name?: string;
      username?: string;
    };
  };
}

export interface SendMessageOptions {
  chatId: string;
  text: string;
  parseMode: 'HTML' | 'MarkdownV2' | 'NONE';
  disableNotification: boolean;
  disableWebPagePreview: boolean;
  buttons: BotInlineButton[];
}

const TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{20,}$/;

export function isValidBotTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token.trim());
}

async function callTelegramBotApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>
): Promise<BotApiResult<T>> {
  const cleanToken = token.trim();
  if (!isValidBotTokenFormat(cleanToken)) {
    return {
      ok: false,
      error_code: 400,
      description: 'Неверный формат токена. Ожидается вид 123456789:AAH... (выдаётся в @BotFather)',
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json()) as BotApiResult<T>;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Сетевая ошибка при запросе к api.telegram.org';
    return {
      ok: false,
      error_code: 0,
      description: `Не удалось подключиться к Telegram Bot API: ${message}`,
    };
  }
}

export async function fetchBotMe(token: string, demoMode: boolean): Promise<BotApiResult<BotUserInfo>> {
  if (demoMode) {
    return {
      ok: true,
      demo: true,
      result: {
        id: 7194820312,
        is_bot: true,
        first_name: 'TELEJKA Demo Bot',
        username: 'telejka_demo_bot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
      },
    };
  }
  return callTelegramBotApi<BotUserInfo>(token, 'getMe');
}

export async function fetchBotUpdates(
  token: string,
  demoMode: boolean
): Promise<BotApiResult<BotUpdateItem[]>> {
  if (demoMode) {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      ok: true,
      demo: true,
      result: [
        {
          update_id: 948201101,
          message: {
            message_id: 412,
            date: nowSec - 180,
            text: '/start',
            chat: {
              id: 512849021,
              type: 'private',
              first_name: 'Алексей',
              username: 'alex_telejka',
            },
            from: {
              id: 512849021,
              first_name: 'Алексей',
              username: 'alex_telejka',
            },
          },
        },
        {
          update_id: 948201102,
          message: {
            message_id: 413,
            date: nowSec - 45,
            text: 'Привет! Проверяем chat_id для публикаций.',
            chat: {
              id: -1001987654321,
              type: 'supergroup',
              title: 'TELEJKA Тестовый канал',
              username: 'telejka_channel',
            },
            from: {
              id: 512849021,
              first_name: 'Алексей',
              username: 'alex_telejka',
            },
          },
        },
      ],
    };
  }
  return callTelegramBotApi<BotUpdateItem[]>(token, 'getUpdates', { limit: 10 });
}

export async function fetchWebhookInfo(
  token: string,
  demoMode: boolean
): Promise<BotApiResult<Record<string, unknown>>> {
  if (demoMode) {
    return {
      ok: true,
      demo: true,
      result: {
        url: '',
        has_custom_certificate: false,
        pending_update_count: 2,
        max_connections: 40,
      },
    };
  }
  return callTelegramBotApi<Record<string, unknown>>(token, 'getWebhookInfo');
}

export async function sendBotMessage(
  token: string,
  options: SendMessageOptions,
  demoMode: boolean
): Promise<BotApiResult<Record<string, unknown>>> {
  const chatId = options.chatId.trim();
  const text = options.text.trim();

  if (!chatId) {
    return { ok: false, error_code: 400, description: 'Укажите chat_id или @username канала' };
  }
  if (!text) {
    return { ok: false, error_code: 400, description: 'Введите текст сообщения для отправки' };
  }

  const validButtons = options.buttons
    .filter((btn) => btn.text.trim() && /^https?:\/\//i.test(btn.url.trim()))
    .map((btn) => [{ text: btn.text.trim(), url: btn.url.trim() }]);

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_notification: options.disableNotification,
    link_preview_options: { is_disabled: options.disableWebPagePreview },
  };

  if (options.parseMode !== 'NONE') {
    payload.parse_mode = options.parseMode;
  }
  if (validButtons.length > 0) {
    payload.reply_markup = { inline_keyboard: validButtons };
  }

  if (demoMode) {
    return {
      ok: true,
      demo: true,
      result: {
        message_id: Math.floor(1000 + Math.random() * 8999),
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: chatId.startsWith('@') ? 'channel' : 'private' },
        text,
        parse_mode: options.parseMode,
        inline_buttons_count: validButtons.length,
      },
    };
  }

  return callTelegramBotApi<Record<string, unknown>>(token, 'sendMessage', payload);
}
