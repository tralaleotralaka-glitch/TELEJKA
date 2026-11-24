import React, { useRef } from 'react';
import {
  Palette,
  Smartphone,
  Download,
  Upload,
  Trash2,
  Cpu,
  Check,
  MonitorSmartphone,
} from 'lucide-react';
import type {
  AccentPalette,
  AppSettings,
  PostDraft,
  StartScreenMode,
  TelegramBookmark,
  ThemeMode,
} from '../types';
import {
  clearNativeCache,
  getNativeBuildInfo,
  triggerHapticTick,
} from '../lib/nativeBridge';
import { createBackupPayload, parseBackupPayload } from '../lib/storage';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  bookmarks: TelegramBookmark[];
  drafts: PostDraft[];
  onRestoreBackup: (data: {
    settings: AppSettings;
    bookmarks: TelegramBookmark[];
    drafts: PostDraft[];
  }) => void;
  onNotify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
}

const THEMES: { id: ThemeMode; label: string; swatch: string; desc: string }[] = [
  { id: 'night', label: 'Ночная синяя', swatch: '#17212B', desc: 'Классическая Telegram' },
  { id: 'day', label: 'Светлая', swatch: '#F2F5F8', desc: 'Дневной режим' },
  { id: 'oled', label: 'OLED Чёрная', swatch: '#000000', desc: 'Максимум контраста' },
];

const ACCENTS: { id: AccentPalette; label: string; color: string }[] = [
  { id: 'blue', label: 'Telegram Blue', color: '#2AABEE' },
  { id: 'emerald', label: 'Изумруд', color: '#20C997' },
  { id: 'violet', label: 'Индиго', color: '#845EF7' },
  { id: 'coral', label: 'Коралл', color: '#FF6B6B' },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  bookmarks,
  drafts,
  onRestoreBackup,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const buildInfo = getNativeBuildInfo();

  const handleExportBackup = () => {
    const payload = createBackupPayload(settings, bookmarks, drafts);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telejka-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Резервная копия JSON сохранена');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackupPayload(String(reader.result ?? ''));
      if (!parsed) {
        onNotify('Неверный формат файла резервной копии TELEJKA', 'warning');
        return;
      }
      onRestoreBackup({
        settings: parsed.settings,
        bookmarks: parsed.bookmarks,
        drafts: parsed.drafts,
      });
      onNotify('Данные успешно восстановлены из резервной копии');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearCache = () => {
    triggerHapticTick();
    const ok = clearNativeCache();
    if (ok) {
      onNotify('Кэш Android WebView очищен');
    } else {
      onNotify('В веб-превью кэш управляется браузером (в APK очищается кэш WebView)', 'info');
    }
  };

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <section className="tg-card rounded-3xl p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Оформление TELEJKA</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Тема синхронизируется со статус-баром Android APK
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {THEMES.map((item) => {
            const active = settings.theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateSettings({ theme: item.id })}
                className="tg-elevated rounded-2xl p-3.5 text-left flex items-center gap-3 cursor-pointer transition-all"
                style={active ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent-soft)' } : undefined}
              >
                <span
                  className="w-9 h-9 rounded-xl border border-white/15 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: item.swatch }}
                >
                  {active && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: item.id === 'day' ? '#141b24' : '#ffffff' }}
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{item.label}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <div className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            Акцентный цвет
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((item) => {
              const active = settings.accent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ accent: item.id })}
                  className="tg-elevated rounded-xl px-3.5 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer"
                  style={active ? { borderColor: item.color } : undefined}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Native Android WebView Settings */}
      <section className="tg-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Параметры Android WebView (APK)</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Управляют поведением встроенного Telegram-клиента в APK
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Стартовый экран при запуске APK
          </label>
          <select
            value={settings.startScreen}
            onChange={(e) =>
              onUpdateSettings({ startScreen: e.target.value as StartScreenMode })
            }
            className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
          >
            <option value="hub">Хаб TELEJKA (закладки и инструменты)</option>
            <option value="web_k">Сразу открывать Telegram Web K</option>
            <option value="web_a">Сразу открывать Telegram Web A</option>
          </select>
        </div>

        <div className="space-y-3 pt-1">
          {[
            {
              key: 'desktopUserAgent' as const,
              title: 'Десктопный User-Agent в WebView',
              desc: 'Запрашивает полную компьютерную версию Telegram Web (удобно на планшетах)',
            },
            {
              key: 'showFloatingHubButton' as const,
              title: 'Панель быстрого возврата в Хаб',
              desc: 'Показывает компактную панель управления поверх Telegram WebView',
            },
            {
              key: 'doubleBackExit' as const,
              title: 'Подтверждение выхода по двойному «Назад»',
              desc: 'Защищает от случайного закрытия приложения при навигации жестами',
            },
          ].map((item) => (
            <label
              key={item.key}
              className="tg-elevated rounded-2xl p-3.5 flex items-center justify-between gap-4 cursor-pointer"
            >
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={(e) => onUpdateSettings({ [item.key]: e.target.checked })}
                className="w-5 h-5 rounded accent-sky-500 shrink-0"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleClearCache}
          className="tg-btn-secondary rounded-xl px-4 py-2.5 text-xs font-medium flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Очистить кэш Android WebView</span>
        </button>
      </section>

      {/* Backup & Restore */}
      <section className="tg-card rounded-3xl p-5 space-y-3.5">
        <h3 className="text-base font-semibold">Резервная копия данных</h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Экспортируйте закладки, черновики постов и настройки в JSON (токен бота в бэкап не
          включается в целях безопасности).
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="tg-btn-primary rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Скачать бэкап JSON</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="tg-btn-secondary rounded-xl px-4 py-2.5 text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Восстановить из файла</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </section>

      {/* APK Build Metadata */}
      <section className="tg-card rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">О сборке Android APK</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {buildInfo.engine}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="tg-elevated rounded-2xl p-3">
            <div style={{ color: 'var(--text-muted)' }}>Package ID</div>
            <div className="font-mono font-semibold mt-1">{buildInfo.packageId}</div>
          </div>
          <div className="tg-elevated rounded-2xl p-3">
            <div style={{ color: 'var(--text-muted)' }}>Версия</div>
            <div className="font-mono font-semibold mt-1">
              v{buildInfo.versionName} ({buildInfo.versionCode})
            </div>
          </div>
          <div className="tg-elevated rounded-2xl p-3">
            <div style={{ color: 'var(--text-muted)' }}>Android API</div>
            <div className="font-mono font-semibold mt-1">
              {buildInfo.androidSdk ? `API ${buildInfo.androidSdk}` : 'Min 24 / Target 35'}
            </div>
          </div>
          <div className="tg-elevated rounded-2xl p-3">
            <div style={{ color: 'var(--text-muted)' }}>Среда</div>
            <div className="font-semibold mt-1 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>{buildInfo.isNativeAndroid ? 'Android APK' : 'Web Preview'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
