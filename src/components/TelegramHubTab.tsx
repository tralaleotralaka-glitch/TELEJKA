import React, { useMemo, useState } from 'react';
import {
  Send,
  Globe,
  Plus,
  Search,
  Pin,
  Trash2,
  Copy,
  ExternalLink,
  Smartphone,
  Bot,
  Megaphone,
  MessageCircle,
  Bookmark,
  PhoneCall,
  Sparkles,
  X,
} from 'lucide-react';
import type { AppSettings, BookmarkCategory, TelegramBookmark } from '../types';
import {
  copyTextToClipboard,
  isNativeAndroid,
  openTelegramInClient,
  triggerHapticTick,
} from '../lib/nativeBridge';
import { buildPhoneLink, buildUsernameLink, resolveBookmarkTarget } from '../lib/telegramLinks';

interface TelegramHubTabProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  bookmarks: TelegramBookmark[];
  onSaveBookmarks: (next: TelegramBookmark[]) => void;
  onNotify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
}

const CATEGORY_LABELS: Record<BookmarkCategory | 'all', string> = {
  all: 'Все',
  channel: 'Каналы',
  bot: 'Боты',
  chat: 'Чаты',
  personal: 'Личное',
};

const CATEGORY_ICONS: Record<BookmarkCategory, React.FC<{ className?: string }>> = {
  channel: Megaphone,
  bot: Bot,
  chat: MessageCircle,
  personal: Bookmark,
};

export const TelegramHubTab: React.FC<TelegramHubTabProps> = ({
  settings,
  onUpdateSettings,
  bookmarks,
  onSaveBookmarks,
  onNotify,
}) => {
  const nativeAndroid = isNativeAndroid();

  const [customUrlInput, setCustomUrlInput] = useState(settings.customWebUrl);
  const [quickDirectInput, setQuickDirectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<BookmarkCategory | 'all'>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newCategory, setNewCategory] = useState<BookmarkCategory>('channel');
  const [newNote, setNewNote] = useState('');

  const handleOpenWeb = (url: string, title: string) => {
    triggerHapticTick();
    const target = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const mode = openTelegramInClient(target, title, settings);
    if (mode === 'browser_tab') {
      onNotify(`Открыто «${title}» в новой вкладке (в Android APK открывается во встроенном WebView)`, 'info');
    }
  };

  const handleOpenCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customUrlInput.trim();
    if (!cleaned) {
      onNotify('Введите HTTPS-адрес Telegram Web или зеркала', 'warning');
      return;
    }
    const normalized = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    onUpdateSettings({ customWebUrl: normalized });
    setCustomUrlInput(normalized);
    handleOpenWeb(normalized, 'Свой Telegram Web');
  };

  const handleQuickDirectOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickDirectInput.trim();
    if (!raw) {
      onNotify('Введите @username или номер телефона (+7...)', 'warning');
      return;
    }

    const looksLikePhone = /^[+\d][\d\s()-]{6,}$/.test(raw);
    const built = looksLikePhone ? buildPhoneLink(raw) : buildUsernameLink(raw);

    if (!built.isValid) {
      onNotify(built.error ?? 'Проверьте формат адреса', 'warning');
      return;
    }

    handleOpenWeb(built.httpsUrl, built.displayLabel);
    setQuickDirectInput('');
  };

  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...bookmarks]
      .filter((item) => {
        if (activeCategory !== 'all' && item.category !== activeCategory) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.handle.toLowerCase().includes(q) ||
          (item.note ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.createdAt - a.createdAt);
  }, [bookmarks, searchQuery, activeCategory]);

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const handle = newHandle.trim();
    if (!title || !handle) {
      onNotify('Укажите название и @username или ссылку', 'warning');
      return;
    }
    const created: TelegramBookmark = {
      id: `bm-${Date.now()}`,
      title,
      handle,
      category: newCategory,
      note: newNote.trim() || undefined,
      pinned: false,
      createdAt: Date.now(),
    };
    onSaveBookmarks([created, ...bookmarks]);
    setNewTitle('');
    setNewHandle('');
    setNewNote('');
    setIsAddOpen(false);
    onNotify(`Закладка «${title}» сохранена`);
  };

  const handleTogglePin = (id: string) => {
    onSaveBookmarks(
      bookmarks.map((bm) => (bm.id === id ? { ...bm, pinned: !bm.pinned } : bm))
    );
  };

  const handleDeleteBookmark = (id: string, title: string) => {
    onSaveBookmarks(bookmarks.filter((bm) => bm.id !== id));
    onNotify(`Удалено: ${title}`, 'info');
  };

  const handleCopyBookmark = async (bm: TelegramBookmark) => {
    const target = resolveBookmarkTarget(bm.handle);
    const ok = await copyTextToClipboard(target.httpsUrl);
    onNotify(ok ? `Скопировано: ${target.httpsUrl}` : 'Не удалось скопировать ссылку');
  };

  return (
    <div className="space-y-5">
      {/* Hero Launch Card */}
      <section className="tg-card rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-30 blur-2xl"
          style={{ background: 'var(--accent)' }}
        />

        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2.5"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {nativeAndroid ? 'Android WebView активен' : 'Гибридный APK-режим'}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Запуск Telegram Web
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {nativeAndroid
                ? 'Открывается во встроенном Android WebView с сохранением сессии, загрузкой файлов и кнопкой возврата.'
                : 'Выберите версию Telegram Web — в Android APK клиент откроется прямо внутри встроенного WebView.'}
            </p>
          </div>
        </div>

        {/* Web K & Web A Primary Launchers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
          <button
            type="button"
            onClick={() => handleOpenWeb('https://web.telegram.org/k/', 'Telegram Web K')}
            className="tg-btn-primary rounded-2xl p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/18 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight">Telegram Web K</div>
                <div className="text-xs text-white/80 mt-0.5 truncate">
                  Быстрый и лёгкий клиент • Рекомендуется
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/85 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenWeb('https://web.telegram.org/a/', 'Telegram Web A')}
            className="tg-btn-secondary rounded-2xl p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight">Telegram Web A</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  Плавные анимации • Альтернативный движок
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Custom URL / Mirror */}
        <form onSubmit={handleOpenCustomUrl} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Globe
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Свой адрес или зеркало, например https://web.telegram.org/k/"
              className="tg-input w-full rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="tg-btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium shrink-0 cursor-pointer"
          >
            Открыть URL
          </button>
        </form>
      </section>

      {/* Quick Direct Chat (without saving contact) */}
      <section className="tg-card rounded-3xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">Быстрый диалог без контакта</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Напишите по номеру телефона (+7...) или откройте любой @username
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickDirectOpen} className="flex gap-2.5">
          <input
            type="text"
            value={quickDirectInput}
            onChange={(e) => setQuickDirectInput(e.target.value)}
            placeholder="+7 999 123-45-67 или @username"
            className="tg-input flex-1 rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="tg-btn-primary rounded-xl px-4 py-2.5 text-sm shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Открыть</span>
          </button>
        </form>
      </section>

      {/* Bookmarks Section */}
      <section className="tg-card rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Избранные каналы, боты и чаты</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Хранятся офлайн на устройстве • {bookmarks.length} шт.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen((prev) => !prev)}
            className="tg-btn-primary rounded-xl px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
          >
            {isAddOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isAddOpen ? 'Закрыть' : 'Добавить'}</span>
          </button>
        </div>

        {/* Add Bookmark Form */}
        {isAddOpen && (
          <form onSubmit={handleAddBookmark} className="tg-elevated rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название (например, Рабочий чат)"
                className="tg-input rounded-xl px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="@username или https://t.me/..."
                className="tg-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BookmarkCategory)}
                className="tg-input rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="channel">Канал</option>
                <option value="bot">Бот</option>
                <option value="chat">Чат / Группа</option>
                <option value="personal">Личное / Ссылка</option>
              </select>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Короткая заметка (необязательно)"
                className="tg-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="tg-btn-primary rounded-xl px-4 py-2 text-sm cursor-pointer"
              >
                Сохранить закладку
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по закладкам..."
              className="tg-input w-full rounded-xl pl-10 pr-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {(['all', 'channel', 'bot', 'chat', 'personal'] as const).map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                  style={
                    active
                      ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                      : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bookmarks Grid */}
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            Ничего не найдено. Попробуйте изменить фильтр или добавить новую закладку.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredBookmarks.map((bm) => {
              const CategoryIcon = CATEGORY_ICONS[bm.category];
              const target = resolveBookmarkTarget(bm.handle);
              return (
                <div
                  key={bm.id}
                  className="tg-elevated rounded-2xl p-3.5 flex items-center justify-between gap-3 group"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenWeb(target.webKUrl, bm.title)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate">{bm.title}</span>
                        {bm.pinned && (
                          <Pin className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                        )}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--accent)' }}>
                        {bm.handle}
                      </div>
                      {bm.note && (
                        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {bm.note}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Скопировать ссылку"
                      onClick={() => handleCopyBookmark(bm)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title={bm.pinned ? 'Открепить' : 'Закрепить'}
                      onClick={() => handleTogglePin(bm.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      style={{ color: bm.pinned ? 'var(--accent)' : 'var(--text-secondary)' }}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => handleDeleteBookmark(bm.id, bm.title)}
                      className="p-2 rounded-lg hover:bg-rose-500/15 text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
