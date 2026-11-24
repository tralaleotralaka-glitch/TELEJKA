import { describe, expect, it } from 'vitest';
import {
  countTelegramCharacters,
  toPlainText,
  toTelegramHtml,
  toTelegramMarkdownV2,
} from '../telegramFormatter';
import {
  buildPhoneLink,
  buildProxyLink,
  buildShareLink,
  buildUsernameLink,
  resolveBookmarkTarget,
} from '../telegramLinks';
import { fetchBotMe, isValidBotTokenFormat, sendBotMessage } from '../botApi';

describe('telegramFormatter', () => {
  it('converts rich inline formatting and spoilers to Telegram HTML with proper escaping', () => {
    const src = '**Bold** __italic__ ++under++ ~~strike~~ ||secret <tag>|| `x < y` [Site](https://t.me/test)';
    const html = toTelegramHtml(src);
    expect(html).toBe(
      '<b>Bold</b> <i>italic</i> <u>under</u> <s>strike</s> <tg-spoiler>secret &lt;tag&gt;</tg-spoiler> <code>x &lt; y</code> <a href="https://t.me/test">Site</a>'
    );
  });

  it('converts blockquotes and fenced code blocks to Telegram HTML', () => {
    const src = '> Первая строка\n> **Вторая**\n```js\nconst a = 1 < 2;\n```';
    const html = toTelegramHtml(src);
    expect(html).toContain('<blockquote>Первая строка\n<b>Вторая</b></blockquote>');
    expect(html).toContain('<pre><code class="language-js">const a = 1 &lt; 2;</code></pre>');
  });

  it('escapes special characters properly in Telegram MarkdownV2', () => {
    const src = '**TELEJKA v1.0** — тест! (проверка) ||спойлер.||';
    const md = toTelegramMarkdownV2(src);
    expect(md).toBe('*TELEJKA v1\\.0* — тест\\! \\(проверка\\) ||спойлер\\.||');
  });

  it('counts plain text characters accurately', () => {
    const src = '**Привет**, ||мир||!';
    expect(toPlainText(src)).toBe('Привет, мир!');
    expect(countTelegramCharacters(src)).toBe(12);
  });
});

describe('telegramLinks', () => {
  it('builds username link with postId and start param', () => {
    const res = buildUsernameLink('https://t.me/durov/250', { startParam: 'ref1' });
    expect(res.isValid).toBe(true);
    expect(res.httpsUrl).toBe('https://t.me/durov/250?start=ref1');
    expect(res.tgUrl).toContain('tg://resolve?');
    expect(res.tgUrl).toContain('domain=durov');
    expect(res.tgUrl).toContain('post=250');
  });

  it('normalizes Russian 8-prefixed phones to +7', () => {
    const res = buildPhoneLink('8 (999) 123-45-67', 'Привет');
    expect(res.isValid).toBe(true);
    expect(res.httpsUrl).toMatch(/^https:\/\/t\.me\/\+79991234567\?text=/);
    expect(res.tgUrl).toContain('phone=79991234567');
  });

  it('builds share and MTProto proxy links', () => {
    const share = buildShareLink('https://t.me/telegram', 'Смотри');
    expect(share.isValid).toBe(true);
    expect(share.httpsUrl).toContain('https://t.me/share/url?');

    const proxy = buildProxyLink('proxy.example.com', '443', 'ee123456');
    expect(proxy.isValid).toBe(true);
    expect(proxy.tgUrl).toBe('tg://proxy?server=proxy.example.com&port=443&secret=ee123456');
  });

  it('resolves bookmark handles to Telegram Web K targets', () => {
    expect(resolveBookmarkTarget('@BotFather').webKUrl).toBe(
      'https://web.telegram.org/k/#@BotFather'
    );
    expect(resolveBookmarkTarget('https://web.telegram.org/a/').isWebClientUrl).toBe(true);
  });
});

describe('botApi', () => {
  it('validates Telegram bot token format', () => {
    expect(isValidBotTokenFormat('123456789:AAH_validTokenString1234567890')).toBe(true);
    expect(isValidBotTokenFormat('invalid-token')).toBe(false);
  });

  it('supports demo mode for getMe and sendMessage', async () => {
    const me = await fetchBotMe('', true);
    expect(me.ok).toBe(true);
    expect(me.demo).toBe(true);
    expect(me.result?.username).toBe('telejka_demo_bot');

    const sent = await sendBotMessage(
      '',
      {
        chatId: '@telejka_channel',
        text: '<b>Test</b>',
        parseMode: 'HTML',
        disableNotification: false,
        disableWebPagePreview: false,
        buttons: [{ id: '1', text: 'Open', url: 'https://t.me/telegram' }],
      },
      true
    );
    expect(sent.ok).toBe(true);
    expect(sent.demo).toBe(true);
  });
});
