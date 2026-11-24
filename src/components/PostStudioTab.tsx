import React, { useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  EyeOff,
  Code,
  FileCode2,
  Quote,
  Link2,
  Copy,
  Share2,
  Plus,
  Trash2,
  Send,
  CheckCheck,
} from 'lucide-react';
import type { PostDraft } from '../types';
import {
  countTelegramCharacters,
  parseTelegramPost,
  toPlainText,
  toTelegramHtml,
  toTelegramMarkdownV2,
  type InlineToken,
} from '../lib/telegramFormatter';
import { copyTextToClipboard, openExternalLink, triggerHapticTick } from '../lib/nativeBridge';

interface PostStudioTabProps {
  drafts: PostDraft[];
  activeDraftId: string;
  onSelectDraft: (id: string) => void;
  onSaveDrafts: (next: PostDraft[]) => void;
  onSendToBotConsole: (htmlText: string) => void;
  onNotify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
}

const QUICK_EMOJIS = ['🚀', '🔥', '✅', '⚡', '📢', '📌', '💡', '🎯', '👀', '👉', '❤️', '🎉'];

const InlineRenderer: React.FC<{
  tokens: InlineToken[];
  revealedSpoilers: Record<string, boolean>;
  onToggleSpoiler: (key: string) => void;
  pathPrefix: string;
}> = ({ tokens, revealedSpoilers, onToggleSpoiler, pathPrefix }) => (
  <>
    {tokens.map((token, idx) => {
      const key = `${pathPrefix}-${idx}`;
      switch (token.type) {
        case 'text':
          return <React.Fragment key={key}>{token.text}</React.Fragment>;
        case 'bold':
          return (
            <strong key={key} className="font-bold">
              <InlineRenderer
                tokens={token.children}
                revealedSpoilers={revealedSpoilers}
                onToggleSpoiler={onToggleSpoiler}
                pathPrefix={key}
              />
            </strong>
          );
        case 'italic':
          return (
            <em key={key} className="italic">
              <InlineRenderer
                tokens={token.children}
                revealedSpoilers={revealedSpoilers}
                onToggleSpoiler={onToggleSpoiler}
                pathPrefix={key}
              />
            </em>
          );
        case 'underline':
          return (
            <span key={key} className="underline underline-offset-2">
              <InlineRenderer
                tokens={token.children}
                revealedSpoilers={revealedSpoilers}
                onToggleSpoiler={onToggleSpoiler}
                pathPrefix={key}
              />
            </span>
          );
        case 'strike':
          return (
            <span key={key} className="line-through opacity-85">
              <InlineRenderer
                tokens={token.children}
                revealedSpoilers={revealedSpoilers}
                onToggleSpoiler={onToggleSpoiler}
                pathPrefix={key}
              />
            </span>
          );
        case 'spoiler': {
          const revealed = Boolean(revealedSpoilers[key]);
          return (
            <span
              key={key}
              role="button"
              tabIndex={0}
              title={revealed ? 'Скрыть спойлер' : 'Нажмите, чтобы раскрыть спойлер'}
              onClick={() => onToggleSpoiler(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSpoiler(key);
                }
              }}
              className={revealed ? 'tg-spoiler-revealed' : 'tg-spoiler-hidden'}
            >
              <InlineRenderer
                tokens={token.children}
                revealedSpoilers={revealedSpoilers}
                onToggleSpoiler={onToggleSpoiler}
                pathPrefix={key}
              />
            </span>
          );
        }
        case 'code':
          return (
            <code
              key={key}
              className="px-1.5 py-0.5 rounded font-mono text-[0.86em]"
              style={{ backgroundColor: 'var(--code-bg)' }}
            >
              {token.text}
            </code>
          );
        case 'link':
          return (
            <a
              key={key}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 font-medium"
              style={{ color: '#6ec5ff' }}
            >
              {token.text}
            </a>
          );
      }
    })}
  </>
);

export const PostStudioTab: React.FC<PostStudioTabProps> = ({
  drafts,
  activeDraftId,
  onSelectDraft,
  onSaveDrafts,
  onSendToBotConsole,
  onNotify,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [exportPreviewMode, setExportPreviewMode] = useState<'none' | 'html' | 'mdv2'>('none');

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === activeDraftId) ?? drafts[0],
    [drafts, activeDraftId]
  );

  const blocks = useMemo(
    () => parseTelegramPost(activeDraft?.content ?? ''),
    [activeDraft?.content]
  );

  const charCount = useMemo(
    () => countTelegramCharacters(activeDraft?.content ?? ''),
    [activeDraft?.content]
  );

  const htmlOutput = useMemo(
    () => toTelegramHtml(activeDraft?.content ?? ''),
    [activeDraft?.content]
  );

  const mdv2Output = useMemo(
    () => toTelegramMarkdownV2(activeDraft?.content ?? ''),
    [activeDraft?.content]
  );

  const updateActiveDraft = (patch: Partial<PostDraft>) => {
    if (!activeDraft) return;
    onSaveDrafts(
      drafts.map((d) =>
        d.id === activeDraft.id ? { ...d, ...patch, updatedAt: Date.now() } : d
      )
    );
  };

  const applyWrap = (prefix: string, suffix: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el || !activeDraft) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = activeDraft.content;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    updateActiveDraft({ content: next });

    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el || !activeDraft) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = activeDraft.content;
    const selected = value.slice(start, end) || 'Текст цитаты';
    const quoted = selected
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    const next = `${value.slice(0, start)}${quoted}${value.slice(end)}`;
    updateActiveDraft({ content: next });
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!activeDraft) return;
    if (!el) {
      updateActiveDraft({ content: `${activeDraft.content}${emoji}` });
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = activeDraft.content;
    const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    updateActiveDraft({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCreateDraft = () => {
    const created: PostDraft = {
      id: `draft-${Date.now()}`,
      title: `Черновик #${drafts.length + 1}`,
      content: '',
      updatedAt: Date.now(),
    };
    onSaveDrafts([created, ...drafts]);
    onSelectDraft(created.id);
    onNotify('Создан новый черновик');
  };

  const handleDeleteDraft = (id: string) => {
    if (drafts.length <= 1) {
      updateActiveDraft({ content: '', title: 'Новый пост' });
      onNotify('Черновик очищен', 'info');
      return;
    }
    const remaining = drafts.filter((d) => d.id !== id);
    onSaveDrafts(remaining);
    if (activeDraft?.id === id && remaining[0]) {
      onSelectDraft(remaining[0].id);
    }
    onNotify('Черновик удалён', 'info');
  };

  const handleCopy = async (mode: 'html' | 'mdv2' | 'plain') => {
    if (!activeDraft) return;
    triggerHapticTick();
    const content =
      mode === 'html'
        ? htmlOutput
        : mode === 'mdv2'
          ? mdv2Output
          : toPlainText(activeDraft.content);
    const ok = await copyTextToClipboard(content);
    const label =
      mode === 'html' ? 'Telegram HTML' : mode === 'mdv2' ? 'MarkdownV2' : 'текст';
    onNotify(ok ? `Скопировано как ${label}` : 'Не удалось скопировать');
  };

  const handleShare = () => {
    if (!activeDraft?.content.trim()) {
      onNotify('Сначала напишите текст поста', 'warning');
      return;
    }
    const text = toPlainText(activeDraft.content);
    openExternalLink(`https://t.me/share/url?${new URLSearchParams({ text }).toString()}`);
  };

  const toggleSpoiler = (key: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const nowTime = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, []);

  if (!activeDraft) return null;

  return (
    <div className="space-y-5">
      {/* Draft Selector Strip */}
      <section className="tg-card rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 pb-0.5">
          {drafts.map((draft) => {
            const active = draft.id === activeDraft.id;
            return (
              <div
                key={draft.id}
                className="inline-flex items-center rounded-xl overflow-hidden shrink-0"
                style={
                  active
                    ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                }
              >
                <button
                  type="button"
                  onClick={() => onSelectDraft(draft.id)}
                  className="px-3 py-1.5 text-xs font-medium cursor-pointer max-w-[160px] truncate"
                >
                  {draft.title || 'Без названия'}
                </button>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    title="Удалить черновик"
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="pr-2 pl-1 py-1.5 opacity-75 hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCreateDraft}
          className="tg-btn-secondary rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Новый черновик</span>
        </button>
      </section>

      {/* Main Split Editor + Telegram Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left: Editor Card */}
        <section className="tg-card rounded-3xl p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={activeDraft.title}
              onChange={(e) => updateActiveDraft({ title: e.target.value })}
              placeholder="Название черновика..."
              className="tg-input rounded-xl px-3 py-1.5 text-sm font-semibold flex-1"
            />
            <div className="text-xs font-mono shrink-0" style={{ color: charCount > 4096 ? '#f87171' : 'var(--text-secondary)' }}>
              {charCount} / 4096
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { icon: Bold, label: 'Жирный', action: () => applyWrap('**', '**', 'жирный') },
              { icon: Italic, label: 'Курсив', action: () => applyWrap('__', '__', 'курсив') },
              { icon: Underline, label: 'Подчёркнутый', action: () => applyWrap('++', '++', 'текст') },
              { icon: Strikethrough, label: 'Зачёркнутый', action: () => applyWrap('~~', '~~', 'текст') },
              { icon: EyeOff, label: 'Спойлер', action: () => applyWrap('||', '||', 'скрытый текст') },
              { icon: Code, label: 'Моноширинный', action: () => applyWrap('`', '`', 'код') },
              {
                icon: FileCode2,
                label: 'Блок кода',
                action: () => applyWrap('```ts\n', '\n```', 'console.log("TELEJKA");'),
              },
              { icon: Quote, label: 'Цитата', action: () => applyLinePrefix('> ') },
              {
                icon: Link2,
                label: 'Ссылка',
                action: () => applyWrap('[', '](https://t.me/)', 'текст ссылки'),
              },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                type="button"
                title={label}
                onClick={action}
                className="tg-btn-secondary rounded-xl px-2.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={11}
            value={activeDraft.content}
            onChange={(e) => updateActiveDraft({ content: e.target.value })}
            placeholder="Напишите пост для Telegram... Используйте панель форматирования выше."
            className="tg-input w-full rounded-2xl p-3.5 text-sm leading-relaxed font-sans resize-y"
          />

          {/* Quick Emoji Strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-base flex items-center justify-center shrink-0 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Character Limit Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span style={{ color: charCount > 1024 ? '#fbbf24' : 'var(--text-muted)' }}>
              Подпись к фото/видео: {charCount} / 1024 {charCount > 1024 ? '(превышено)' : '• ОК'}
            </span>
            <span style={{ color: charCount > 4096 ? '#f87171' : 'var(--text-muted)' }}>
              Текстовый пост: {charCount <= 4096 ? 'ОК' : 'превышен лимит!'}
            </span>
          </div>

          {/* Export Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy('html')}
              className="tg-btn-primary rounded-xl px-3 py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopy('mdv2')}
              className="tg-btn-secondary rounded-xl px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>MarkdownV2</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopy('plain')}
              className="tg-btn-secondary rounded-xl px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Текст</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="tg-btn-secondary flex-1 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Поделиться в Telegram</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSendToBotConsole(htmlOutput);
                onNotify('Пост передан в консоль Bot API (формат HTML)');
              }}
              className="tg-btn-secondary flex-1 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>Отправить через Бота</span>
            </button>
          </div>
        </section>

        {/* Right: Interactive Telegram Chat Preview */}
        <section className="tg-card rounded-3xl overflow-hidden">
          <div
            className="px-5 py-3.5 flex items-center justify-between border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-sm font-semibold">Предпросмотр в Telegram</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Спойлеры кликабельны прямо здесь
              </p>
            </div>
            <div className="flex gap-1">
              {(['none', 'html', 'mdv2'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExportPreviewMode(mode)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer"
                  style={
                    exportPreviewMode === mode
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
                  }
                >
                  {mode === 'none' ? 'Пузырь' : mode === 'html' ? 'HTML' : 'MDv2'}
                </button>
              ))}
            </div>
          </div>

          {exportPreviewMode === 'none' ? (
            <div className="tg-chat-wallpaper p-4 sm:p-6 min-h-[340px] flex flex-col justify-end">
              <div className="flex justify-end">
                <div
                  className="rounded-2xl rounded-br-sm px-4 py-3 max-w-[92%] shadow-md text-sm leading-relaxed break-words space-y-1.5"
                  style={{
                    backgroundColor: 'var(--bubble-out)',
                    color: 'var(--bubble-out-text)',
                  }}
                >
                  {blocks.length === 0 || !activeDraft.content.trim() ? (
                    <span className="opacity-60 italic">Начните вводить текст поста...</span>
                  ) : (
                    blocks.map((block, idx) => {
                      if (block.type === 'blank') {
                        return <div key={idx} className="h-2" />;
                      }
                      if (block.type === 'codeblock') {
                        return (
                          <pre
                            key={idx}
                            className="rounded-xl p-3 font-mono text-xs overflow-x-auto"
                            style={{ backgroundColor: 'var(--code-bg)' }}
                          >
                            {block.language && (
                              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                                {block.language}
                              </div>
                            )}
                            <code>{block.code}</code>
                          </pre>
                        );
                      }
                      if (block.type === 'blockquote') {
                        return (
                          <blockquote
                            key={idx}
                            className="rounded-r-lg pl-3 pr-2 py-1.5 border-l-[3px] text-[0.94em]"
                            style={{
                              borderColor: 'var(--accent)',
                              backgroundColor: 'rgba(255,255,255,0.06)',
                            }}
                          >
                            {block.lines.map((lineTokens, lineIdx) => (
                              <div key={lineIdx}>
                                <InlineRenderer
                                  tokens={lineTokens}
                                  revealedSpoilers={revealedSpoilers}
                                  onToggleSpoiler={toggleSpoiler}
                                  pathPrefix={`q-${idx}-${lineIdx}`}
                                />
                              </div>
                            ))}
                          </blockquote>
                        );
                      }
                      return (
                        <p key={idx} className="m-0">
                          <InlineRenderer
                            tokens={block.tokens}
                            revealedSpoilers={revealedSpoilers}
                            onToggleSpoiler={toggleSpoiler}
                            pathPrefix={`p-${idx}`}
                          />
                        </p>
                      );
                    })
                  )}

                  <div
                    className="flex items-center justify-end gap-1 text-[11px] pt-1"
                    style={{ color: 'var(--bubble-meta)' }}
                  >
                    <span>{nowTime}</span>
                    <CheckCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <pre
                className="rounded-2xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
              >
                {exportPreviewMode === 'html' ? htmlOutput : mdv2Output}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
