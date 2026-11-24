import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AtSign,
  Phone,
  Share2,
  Shield,
  Copy,
  ExternalLink,
  Download,
  QrCode,
} from 'lucide-react';
import {
  buildPhoneLink,
  buildProxyLink,
  buildShareLink,
  buildUsernameLink,
} from '../lib/telegramLinks';
import { copyTextToClipboard, openExternalLink, triggerHapticTick } from '../lib/nativeBridge';

interface LinksQrTabProps {
  onNotify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
}

type GeneratorMode = 'username' | 'phone' | 'share' | 'proxy';

export const LinksQrTab: React.FC<LinksQrTabProps> = ({ onNotify }) => {
  const [mode, setMode] = useState<GeneratorMode>('username');

  // Username fields
  const [username, setUsername] = useState('@telegram');
  const [postId, setPostId] = useState('');
  const [startParam, setStartParam] = useState('');
  const [userText, setUserText] = useState('');

  // Phone fields
  const [phone, setPhone] = useState('+7 999 123-45-67');
  const [phoneText, setPhoneText] = useState('Привет!');

  // Share fields
  const [shareUrl, setShareUrl] = useState('https://t.me/telegram');
  const [shareText, setShareText] = useState('Посмотри этот канал');

  // Proxy fields
  const [proxyServer, setProxyServer] = useState('');
  const [proxyPort, setProxyPort] = useState('443');
  const [proxySecret, setProxySecret] = useState('');

  const [qrTarget, setQrTarget] = useState<'https' | 'tg'>('https');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const built = useMemo(() => {
    switch (mode) {
      case 'username':
        return buildUsernameLink(username, { postId, startParam, text: userText });
      case 'phone':
        return buildPhoneLink(phone, phoneText);
      case 'share':
        return buildShareLink(shareUrl, shareText);
      case 'proxy':
        return buildProxyLink(proxyServer, proxyPort, proxySecret);
    }
  }, [
    mode,
    username,
    postId,
    startParam,
    userText,
    phone,
    phoneText,
    shareUrl,
    shareText,
    proxyServer,
    proxyPort,
    proxySecret,
  ]);

  const activeQrString = qrTarget === 'https' ? built.httpsUrl : built.tgUrl;

  useEffect(() => {
    let cancelled = false;
    if (!built.isValid || !activeQrString) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(activeQrString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0e1621',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [built.isValid, activeQrString]);

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    triggerHapticTick();
    const ok = await copyTextToClipboard(value);
    onNotify(ok ? `Скопировано (${label})` : 'Не удалось скопировать');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `telejka-qr-${mode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('QR-код сохранён в PNG');
  };

  const modes: { id: GeneratorMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'username', label: '@Username', icon: AtSign },
    { id: 'phone', label: 'Телефон', icon: Phone },
    { id: 'share', label: 'Поделиться', icon: Share2 },
    { id: 'proxy', label: 'MTProto', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Mode Switcher */}
      <section className="tg-card rounded-3xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {modes.map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className="rounded-2xl px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                style={
                  active
                    ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Inputs */}
        <section className="tg-card rounded-3xl p-5 lg:col-span-7 space-y-4">
          <h3 className="text-base font-semibold">Параметры ссылки</h3>

          {mode === 'username' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Имя пользователя, канала или бота
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@channel или https://t.me/channel"
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Номер поста в канале (необяз.)
                  </label>
                  <input
                    type="text"
                    value={postId}
                    onChange={(e) => setPostId(e.target.value)}
                    placeholder="Например, 145"
                    className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Параметр ?start= для бота (необяз.)
                  </label>
                  <input
                    type="text"
                    value={startParam}
                    onChange={(e) => setStartParam(e.target.value)}
                    placeholder="promo2026"
                    className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Предзаполненный текст сообщения (необяз.)
                </label>
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Здравствуйте! Пишу по поводу..."
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {mode === 'phone' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Номер телефона (формат +7... или 8...)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 123-45-67"
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Начальный текст сообщения (необяз.)
                </label>
                <input
                  type="text"
                  value={phoneText}
                  onChange={(e) => setPhoneText(e.target.value)}
                  placeholder="Привет!"
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {mode === 'share' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Ссылка, которой нужно поделиться
                </label>
                <input
                  type="url"
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Сопроводительный текст
                </label>
                <textarea
                  rows={3}
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Текст к ссылке..."
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {mode === 'proxy' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Сервер (хост или IP)
                  </label>
                  <input
                    type="text"
                    value={proxyServer}
                    onChange={(e) => setProxyServer(e.target.value)}
                    placeholder="proxy.example.com"
                    className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Порт
                  </label>
                  <input
                    type="number"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(e.target.value)}
                    placeholder="443"
                    className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Secret (hex / base64)
                </label>
                <input
                  type="text"
                  value={proxySecret}
                  onChange={(e) => setProxySecret(e.target.value)}
                  placeholder="ee00000000000000000000000000000000..."
                  className="tg-input w-full rounded-xl px-3.5 py-2.5 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* Generated Outputs */}
          <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
            {!built.isValid ? (
              <p className="text-sm text-amber-400">{built.error}</p>
            ) : (
              <>
                <div className="tg-elevated rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Веб-ссылка (t.me)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(built.httpsUrl, 't.me')}
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                        title="Копировать"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openExternalLink(built.httpsUrl)}
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                        title="Открыть"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-mono break-all" style={{ color: 'var(--accent)' }}>
                    {built.httpsUrl}
                  </div>
                </div>

                <div className="tg-elevated rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Нативный Deep-Link (tg://)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(built.tgUrl, 'tg://')}
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                        title="Копировать"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openExternalLink(built.tgUrl)}
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                        title="Открыть в Telegram"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-mono break-all opacity-90">
                    {built.tgUrl}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* QR Code Card */}
        <section className="tg-card rounded-3xl p-5 lg:col-span-5 flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold">QR-код ссылки</span>
            </div>
            <div className="flex gap-1">
              {(['https', 'tg'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQrTarget(t)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer"
                  style={
                    qrTarget === t
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                  }
                >
                  {t === 'https' ? 't.me' : 'tg://'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-lg flex items-center justify-center w-60 h-60">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR-код для ${built.displayLabel}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500 px-4">
                Заполните корректные данные для генерации QR-кода
              </span>
            )}
          </div>

          {built.isValid && (
            <div className="text-xs font-medium truncate max-w-full" style={{ color: 'var(--text-secondary)' }}>
              {built.displayLabel}
            </div>
          )}

          <div className="w-full grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!qrDataUrl}
              onClick={handleDownloadQr}
              className="tg-btn-primary rounded-xl py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать PNG</span>
            </button>
            <button
              type="button"
              disabled={!built.isValid}
              onClick={() => openExternalLink(activeQrString)}
              className="tg-btn-secondary rounded-xl py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Открыть</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
