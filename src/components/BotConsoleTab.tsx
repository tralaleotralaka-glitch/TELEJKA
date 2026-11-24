import React, { useEffect, useState } from 'react';
import {
  Bot,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Webhook,
  Plus,
  Trash2,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { AppSettings, BotApiLogEntry, BotInlineButton } from '../types';
import {
  fetchBotMe,
  fetchBotUpdates,
  fetchWebhookInfo,
  sendBotMessage,
  type BotUpdateItem,
  type BotUserInfo,
} from '../lib/botApi';
import { loadBotCredentials, saveBotCredentials } from '../lib/storage';
import { triggerHapticTick } from '../lib/nativeBridge';

interface BotConsoleTabProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  incomingDraftHtml: string | null;
  onClearIncomingDraft: () => void;
  onNotify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
}

export const BotConsoleTab: React.FC<BotConsoleTabProps> = ({
  settings,
  onUpdateSettings,
  incomingDraftHtml,
  onClearIncomingDraft,
  onNotify,
}) => {
  const initialCreds = loadBotCredentials();
  const [token, setToken] = useState(initialCreds.token);
  const [showToken, setShowToken] = useState(false);
  const [chatId, setChatId] = useState(initialCreds.chatId || '@telejka_channel');

  const [messageText, setMessageText] = useState(
    '<b>Привет из TELEJKA!</b>\nТестовое сообщение через Telegram Bot API.'
  );
  const [parseMode, setParseMode] = useState<'HTML' | 'MarkdownV2' | 'NONE'>('HTML');
  const [disableNotification, setDisableNotification] = useState(false);
  const [disablePreview, setDisablePreview] = useState(false);
  const [buttons, setButtons] = useState<BotInlineButton[]>([]);

  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [botInfo, setBotInfo] = useState<BotUserInfo | null>(null);
  const [updates, setUpdates] = useState<BotUpdateItem[]>([]);
  const [logs, setLogs] = useState<BotApiLogEntry[]>([]);

  useEffect(() => {
    saveBotCredentials(token, chatId);
  }, [token, chatId]);

  useEffect(() => {
    if (incomingDraftHtml !== null) {
      setMessageText(incomingDraftHtml);
      setParseMode('HTML');
      onClearIncomingDraft();
    }
  }, [incomingDraftHtml, onClearIncomingDraft]);

  const appendLog = (
    method: string,
    ok: boolean,
    summary: string,
    payload: unknown,
    demo: boolean
  ) => {
    setLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        method,
        ok,
        demo,
        summary,
        payload,
      },
      ...prev.slice(0, 14),
    ]);
  };

  const handleGetMe = async () => {
    setLoadingMethod('getMe');
    triggerHapticTick();
    const res = await fetchBotMe(token, settings.demoBotMode);
    setLoadingMethod(null);
    if (res.ok && res.result) {
      setBotInfo(res.result);
      appendLog(
        'getMe',
        true,
        `Подключён @${res.result.username ?? res.result.first_name}`,
        res,
        Boolean(res.demo)
      );
      onNotify(`Бот найден: @${res.result.username ?? res.result.first_name}`);
    } else {
      appendLog('getMe', false, res.description ?? 'Ошибка запроса', res, false);
      onNotify(res.description ?? 'Ошибка getMe', 'warning');
    }
  };

  const handleGetUpdates = async () => {
    setLoadingMethod('getUpdates');
    triggerHapticTick();
    const res = await fetchBotUpdates(token, settings.demoBotMode);
    setLoadingMethod(null);
    if (res.ok && Array.isArray(res.result)) {
      setUpdates(res.result);
      appendLog(
        'getUpdates',
        true,
        `Получено обновлений: ${res.result.length}`,
        res,
        Boolean(res.demo)
      );
      onNotify(`Загружено обновлений: ${res.result.length}`);
    } else {
      appendLog('getUpdates', false, res.description ?? 'Ошибка', res, false);
      onNotify(res.description ?? 'Ошибка getUpdates', 'warning');
    }
  };

  const handleWebhookInfo = async () => {
    setLoadingMethod('getWebhookInfo');
    triggerHapticTick();
    const res = await fetchWebhookInfo(token, settings.demoBotMode);
    setLoadingMethod(null);
    appendLog(
      'getWebhookInfo',
      res.ok,
      res.ok ? 'Информация о webhook получена' : res.description ?? 'Ошибка',
      res,
      Boolean(res.demo)
    );
    onNotify(
      res.ok ? 'Статус Webhook добавлен в журнал' : res.description ?? 'Ошибка getWebhookInfo',
      res.ok ? 'success' : 'warning'
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMethod('sendMessage');
    triggerHapticTick();
    const res = await sendBotMessage(
      token,
      {
        chatId,
        text: messageText,
        parseMode,
        disableNotification,
        disableWebPagePreview: disablePreview,
        buttons,
      },
      settings.demoBotMode
    );
    setLoadingMethod(null);
    if (res.ok) {
      appendLog(
        'sendMessage',
        true,
        `Отправлено в ${chatId}${res.demo ? ' (Демо)' : ''}`,
        res,
        Boolean(res.demo)
      );
      onNotify(res.demo ? 'Сообщение отправлено (Демо-режим)' : `Отправлено в ${chatId}`);
    } else {
      appendLog('sendMessage', false, res.description ?? 'Ошибка отправки', res, false);
      onNotify(res.description ?? 'Ошибка отправки', 'warning');
    }
  };

  const addButtonRow = () => {
    setButtons((prev) => [
      ...prev,
      { id: `btn-${Date.now()}`, text: 'Открыть канал', url: 'https://t.me/telegram' },
    ]);
  };

  const updateButtonRow = (id: string, patch: Partial<BotInlineButton>) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeButtonRow = (id: string) => {
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Mode & Credentials Card */}
      <section className="tg-card rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Консоль Telegram Bot API</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Токен хранится только локально на вашем устройстве
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onUpdateSettings({ demoBotMode: !settings.demoBotMode })}
            className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            style={
              settings.demoBotMode
                ? { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
            }
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{settings.demoBotMode ? 'Демо-режим: ВКЛ' : 'Боевой API (Live)'}</span>
          </button>
        </div>

        {!settings.demoBotMode && (
          <div className="space-y-2">
            <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
              Bot Token (из @BotFather)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="tg-input w-full rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {token && (
                <button
                  type="button"
                  onClick={() => {
                    setToken('');
                    setBotInfo(null);
                    onNotify('Токен очищен', 'info');
                  }}
                  className="tg-btn-secondary rounded-xl px-3 text-xs text-rose-400 cursor-pointer"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>
        )}

        {settings.demoBotMode && (
          <div
            className="rounded-2xl px-4 py-3 text-xs flex items-start gap-2.5"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--text-primary)' }}
          >
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <span>
              Включён безопасный <strong>Демо-режим</strong> — вы можете протестировать{' '}
              <code>getMe</code>, <code>getUpdates</code> и <code>sendMessage</code> без реального
              токена. Переключите на «Боевой API», чтобы подключить своего бота из @BotFather.
            </span>
          </div>
        )}

        {/* Quick API Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={handleGetMe}
            className="tg-btn-secondary rounded-xl py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>{loadingMethod === 'getMe' ? 'Запрос...' : 'Проверить бота (getMe)'}</span>
          </button>
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={handleGetUpdates}
            className="tg-btn-secondary rounded-xl py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>
              {loadingMethod === 'getUpdates' ? 'Загрузка...' : 'Входящие (getUpdates)'}
            </span>
          </button>
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={handleWebhookInfo}
            className="tg-btn-secondary rounded-xl py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Webhook className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>
              {loadingMethod === 'getWebhookInfo' ? 'Запрос...' : 'Статус Webhook'}
            </span>
          </button>
        </div>

        {/* Bot Info Summary */}
        {botInfo && (
          <div className="tg-elevated rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-sm">{botInfo.first_name}</span>{' '}
              {botInfo.username && (
                <span style={{ color: 'var(--accent)' }}>@{botInfo.username}</span>
              )}
              <span className="ml-2 font-mono opacity-70">ID: {botInfo.id}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
                Группы: {botInfo.can_join_groups ? 'Да' : 'Нет'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400">
                Inline: {botInfo.supports_inline_queries ? 'Да' : 'Нет'}
              </span>
            </div>
          </div>
        )}

        {/* Recent Updates with one-click chat_id selection */}
        {updates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Найденные чаты из getUpdates (нажмите, чтобы подставить chat_id):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {updates.map((upd) => {
                const msg = upd.message;
                if (!msg) return null;
                const title =
                  msg.chat.title ||
                  msg.chat.first_name ||
                  (msg.chat.username ? `@${msg.chat.username}` : String(msg.chat.id));
                return (
                  <button
                    key={upd.update_id}
                    type="button"
                    onClick={() => {
                      setChatId(String(msg.chat.id));
                      onNotify(`Подставлен chat_id: ${msg.chat.id}`);
                    }}
                    className="tg-elevated rounded-2xl p-3 text-left hover:border-sky-400/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{title}</span>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
                        {msg.chat.id}
                      </span>
                    </div>
                    {msg.text && (
                      <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>
                        {msg.text}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Send Message Form */}
      <form onSubmit={handleSendMessage} className="tg-card rounded-3xl p-5 space-y-4">
        <h3 className="text-base font-semibold">Отправка сообщения (sendMessage)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              chat_id или @username канала
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890 или @mychannel"
              className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Форматирование (parse_mode)
            </label>
            <select
              value={parseMode}
              onChange={(e) => setParseMode(e.target.value as 'HTML' | 'MarkdownV2' | 'NONE')}
              className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
            >
              <option value="HTML">HTML (&lt;b&gt;, &lt;i&gt;, &lt;tg-spoiler&gt;)</option>
              <option value="MarkdownV2">MarkdownV2</option>
              <option value="NONE">Без форматирования</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Текст сообщения
          </label>
          <textarea
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Введите текст сообщения..."
            className="tg-input w-full rounded-2xl p-3.5 text-sm leading-relaxed"
          />
        </div>

        {/* Inline Buttons Builder */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Inline-кнопки под постом ({buttons.length})
            </span>
            <button
              type="button"
              onClick={addButtonRow}
              className="tg-btn-secondary rounded-xl px-2.5 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить кнопку</span>
            </button>
          </div>

          {buttons.map((btn) => (
            <div key={btn.id} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={btn.text}
                onChange={(e) => updateButtonRow(btn.id, { text: e.target.value })}
                placeholder="Текст кнопки"
                className="tg-input flex-1 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="url"
                value={btn.url}
                onChange={(e) => updateButtonRow(btn.id, { url: e.target.value })}
                placeholder="https://..."
                className="tg-input flex-1 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => removeButtonRow(btn.id)}
                className="tg-btn-secondary rounded-xl px-2.5 py-2 text-rose-400 cursor-pointer flex items-center justify-center"
                title="Удалить кнопку"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Checkboxes & Submit */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={disableNotification}
                onChange={(e) => setDisableNotification(e.target.checked)}
                className="rounded accent-sky-500"
              />
              <span>Без звука</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={disablePreview}
                onChange={(e) => setDisablePreview(e.target.checked)}
                className="rounded accent-sky-500"
              />
              <span>Без превью ссылок</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loadingMethod !== null}
            className="tg-btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loadingMethod === 'sendMessage' ? 'Отправка...' : 'Отправить'}</span>
          </button>
        </div>
      </form>

      {/* API Response Log */}
      {logs.length > 0 && (
        <section className="tg-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Журнал ответов API</h3>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs cursor-pointer hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Очистить
            </button>
          </div>

          <div className="space-y-2.5">
            {logs.map((entry) => (
              <details key={entry.id} className="tg-elevated rounded-2xl p-3.5">
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none">
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-mono text-xs font-semibold">{entry.method}</span>
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {entry.summary}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString('ru-RU')}
                  </span>
                </summary>
                <pre
                  className="mt-3 rounded-xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                >
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
