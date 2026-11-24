import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  FileEdit,
  QrCode,
  Bot,
  Settings,
  Smartphone,
  Globe,
} from 'lucide-react';
import type { AppSettings, AppTab, PostDraft, TelegramBookmark } from './types';
import {
  loadBookmarks,
  loadDrafts,
  loadSettings,
  saveBookmarks,
  saveDrafts,
  saveSettings,
} from './lib/storage';
import { isNativeAndroid, syncNativeSettings } from './lib/nativeBridge';
import { TelejkaLogo } from './components/TelejkaLogo';
import { TelegramHubTab } from './components/TelegramHubTab';
import { PostStudioTab } from './components/PostStudioTab';
import { LinksQrTab } from './components/LinksQrTab';
import { BotConsoleTab } from './components/BotConsoleTab';
import { SettingsTab } from './components/SettingsTab';
import { Toast, type ToastMessage } from './components/Toast';

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'hub', label: 'Telegram Хаб', shortLabel: 'Хаб', icon: Send },
  { id: 'posts', label: 'Редактор постов', shortLabel: 'Посты', icon: FileEdit },
  { id: 'links', label: 'Ссылки и QR', shortLabel: 'QR', icon: QrCode },
  { id: 'bots', label: 'Консоль ботов', shortLabel: 'Боты', icon: Bot },
  { id: 'settings', label: 'Настройки APK', shortLabel: 'Опции', icon: Settings },
];

const THEME_META_COLORS: Record<AppSettings['theme'], string> = {
  night: '#0E1621',
  day: '#EFF2F6',
  oled: '#000000',
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('hub');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [bookmarks, setBookmarks] = useState<TelegramBookmark[]>(() => loadBookmarks());
  const [drafts, setDrafts] = useState<PostDraft[]>(() => loadDrafts());
  const [activeDraftId, setActiveDraftId] = useState<string>(() => loadDrafts()[0]?.id ?? '');
  const [incomingBotHtml, setIncomingBotHtml] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const nativeAndroid = isNativeAndroid();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-accent', settings.accent);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', THEME_META_COLORS[settings.theme]);
    }

    saveSettings(settings);
    syncNativeSettings(settings);
  }, [settings]);

  const notify = useCallback(
    (text: string, tone: 'success' | 'info' | 'warning' = 'success') => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ id: Date.now(), text, tone });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 3200);
    },
    []
  );

  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSaveBookmarks = useCallback((next: TelegramBookmark[]) => {
    setBookmarks(next);
    saveBookmarks(next);
  }, []);

  const handleSaveDrafts = useCallback((next: PostDraft[]) => {
    setDrafts(next);
    saveDrafts(next);
  }, []);

  const handleSendToBotConsole = useCallback((htmlText: string) => {
    setIncomingBotHtml(htmlText);
    setActiveTab('bots');
  }, []);

  const handleRestoreBackup = useCallback(
    (data: { settings: AppSettings; bookmarks: TelegramBookmark[]; drafts: PostDraft[] }) => {
      setSettings(data.settings);
      setBookmarks(data.bookmarks);
      saveBookmarks(data.bookmarks);
      setDrafts(data.drafts);
      saveDrafts(data.drafts);
      if (data.drafts[0]) {
        setActiveDraftId(data.drafts[0].id);
      }
    },
    []
  );

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* Desktop Left Navigation Sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 border-r sticky top-0 h-screen p-4 justify-between"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-1">
            <TelejkaLogo size={40} className="shrink-0 shadow-md rounded-xl" />
            <div className="min-w-0">
              <div className="font-bold text-lg tracking-tight leading-none">TELEJKA</div>
              <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                Telegram Hub & APK
              </div>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Основная навигация">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="w-full rounded-2xl px-3.5 py-3 text-sm font-medium flex items-center gap-3 cursor-pointer transition-all"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--accent-soft)',
                          color: 'var(--accent)',
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="tg-elevated rounded-2xl p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            {nativeAndroid ? (
              <Smartphone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            ) : (
              <Globe className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            )}
            <span>{nativeAndroid ? 'Android APK' : 'Веб-превью APK'}</span>
          </div>
          <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Package: <span className="font-mono">ru.telejka.app</span>
            <br />
            v1.0.0 • Capacitor WebView
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Mobile/Header Bar */}
        <header
          className="sticky top-0 z-30 border-b backdrop-blur-md safe-top"
          style={{
            backgroundColor: 'var(--bg-nav)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TelejkaLogo size={30} className="md:hidden shrink-0 rounded-lg" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  {currentNav.label}
                </h1>
              </div>
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: nativeAndroid ? '#20c997' : 'var(--accent)' }}
              />
              <span>{nativeAndroid ? 'APK Native' : 'TELEJKA v1.0'}</span>
            </div>
          </div>
        </header>

        {/* Active Tab View */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
          {activeTab === 'hub' && (
            <TelegramHubTab
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              bookmarks={bookmarks}
              onSaveBookmarks={handleSaveBookmarks}
              onNotify={notify}
            />
          )}

          {activeTab === 'posts' && (
            <PostStudioTab
              drafts={drafts}
              activeDraftId={activeDraftId}
              onSelectDraft={setActiveDraftId}
              onSaveDrafts={handleSaveDrafts}
              onSendToBotConsole={handleSendToBotConsole}
              onNotify={notify}
            />
          )}

          {activeTab === 'links' && <LinksQrTab onNotify={notify} />}

          {activeTab === 'bots' && (
            <BotConsoleTab
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              incomingDraftHtml={incomingBotHtml}
              onClearIncomingDraft={() => setIncomingBotHtml(null)}
              onNotify={notify}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              bookmarks={bookmarks}
              drafts={drafts}
              onRestoreBackup={handleRestoreBackup}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Мобильная навигация"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-lg safe-bottom"
        style={{
          backgroundColor: 'var(--bg-nav)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="grid grid-cols-5 px-1.5 pt-1.5">
          {NAV_ITEMS.map(({ id, shortLabel, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl cursor-pointer transition-colors"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-none">{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toast toast={toast} />
    </div>
  );
};
export default App;
