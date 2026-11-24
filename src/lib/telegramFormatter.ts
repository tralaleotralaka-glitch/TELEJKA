export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'italic'; children: InlineToken[] }
  | { type: 'underline'; children: InlineToken[] }
  | { type: 'strike'; children: InlineToken[] }
  | { type: 'spoiler'; children: InlineToken[] }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

export type BlockNode =
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'blockquote'; lines: InlineToken[][] }
  | { type: 'codeblock'; language: string; code: string }
  | { type: 'blank' };

const INLINE_PATTERN =
  /(`[^`\n]+`)|(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([\s\S]+?)\*\*)|(__([\s\S]+?)__)|(\+\+([\s\S]+?)\+\+)|(~~([\s\S]+?)~~)|(\|\|([\s\S]+?)\|\|)/g;

export function parseInlineTokens(line: string, depth = 0): InlineToken[] {
  if (!line || depth > 4) {
    return line ? [{ type: 'text', text: line }] : [];
  }

  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  const regex = new RegExp(INLINE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      tokens.push({ type: 'code', text: match[1].slice(1, -1) });
    } else if (match[2] && match[3] && match[4]) {
      tokens.push({ type: 'link', text: match[3], url: match[4] });
    } else if (match[5] && match[6] !== undefined) {
      tokens.push({ type: 'bold', children: parseInlineTokens(match[6], depth + 1) });
    } else if (match[7] && match[8] !== undefined) {
      tokens.push({ type: 'italic', children: parseInlineTokens(match[8], depth + 1) });
    } else if (match[9] && match[10] !== undefined) {
      tokens.push({ type: 'underline', children: parseInlineTokens(match[10], depth + 1) });
    } else if (match[11] && match[12] !== undefined) {
      tokens.push({ type: 'strike', children: parseInlineTokens(match[12], depth + 1) });
    } else if (match[13] && match[14] !== undefined) {
      tokens.push({ type: 'spoiler', children: parseInlineTokens(match[14], depth + 1) });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', text: line.slice(lastIndex) });
  }

  return tokens;
}

export function parseTelegramPost(input: string): BlockNode[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```lang
    if (line.trimStart().startsWith('```')) {
      const language = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing ```
      blocks.push({ type: 'codeblock', language, code: codeLines.join('\n') });
      continue;
    }

    // Blockquote lines starting with >
    if (/^>\s?/.test(line)) {
      const quoteLines: InlineToken[][] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        const stripped = lines[i].replace(/^>\s?/, '');
        quoteLines.push(parseInlineTokens(stripped));
        i += 1;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    if (line.trim() === '') {
      blocks.push({ type: 'blank' });
      i += 1;
      continue;
    }

    blocks.push({ type: 'paragraph', tokens: parseInlineTokens(line) });
    i += 1;
  }

  return blocks;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineToHtml(tokens: InlineToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
          return escapeHtml(token.text);
        case 'bold':
          return `<b>${inlineToHtml(token.children)}</b>`;
        case 'italic':
          return `<i>${inlineToHtml(token.children)}</i>`;
        case 'underline':
          return `<u>${inlineToHtml(token.children)}</u>`;
        case 'strike':
          return `<s>${inlineToHtml(token.children)}</s>`;
        case 'spoiler':
          return `<tg-spoiler>${inlineToHtml(token.children)}</tg-spoiler>`;
        case 'code':
          return `<code>${escapeHtml(token.text)}</code>`;
        case 'link':
          return `<a href="${escapeHtml(token.url)}">${escapeHtml(token.text)}</a>`;
      }
    })
    .join('');
}

export function toTelegramHtml(input: string): string {
  const blocks = parseTelegramPost(input);
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'blank':
          return '';
        case 'paragraph':
          return inlineToHtml(block.tokens);
        case 'blockquote':
          return `<blockquote>${block.lines.map(inlineToHtml).join('\n')}</blockquote>`;
        case 'codeblock': {
          const langAttr = block.language ? ` class="language-${escapeHtml(block.language)}"` : '';
          return `<pre><code${langAttr}>${escapeHtml(block.code)}</code></pre>`;
        }
      }
    })
    .join('\n');
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function escapeMarkdownV2Code(text: string): string {
  return text.replace(/([`\\])/g, '\\$1');
}

function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([)\\])/g, '\\$1');
}

function inlineToMarkdownV2(tokens: InlineToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
          return escapeMarkdownV2(token.text);
        case 'bold':
          return `*${inlineToMarkdownV2(token.children)}*`;
        case 'italic':
          return `_${inlineToMarkdownV2(token.children)}_`;
        case 'underline':
          return `__${inlineToMarkdownV2(token.children)}__`;
        case 'strike':
          return `~${inlineToMarkdownV2(token.children)}~`;
        case 'spoiler':
          return `||${inlineToMarkdownV2(token.children)}||`;
        case 'code':
          return `\`${escapeMarkdownV2Code(token.text)}\``;
        case 'link':
          return `[${escapeMarkdownV2(token.text)}](${escapeMarkdownV2Url(token.url)})`;
      }
    })
    .join('');
}

export function toTelegramMarkdownV2(input: string): string {
  const blocks = parseTelegramPost(input);
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'blank':
          return '';
        case 'paragraph':
          return inlineToMarkdownV2(block.tokens);
        case 'blockquote':
          return block.lines.map((line) => `>${inlineToMarkdownV2(line)}`).join('\n');
        case 'codeblock':
          return `\`\`\`${block.language}\n${escapeMarkdownV2Code(block.code)}\n\`\`\``;
      }
    })
    .join('\n');
}

function inlineToPlain(tokens: InlineToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
        case 'code':
          return token.text;
        case 'link':
          return `${token.text} (${token.url})`;
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strike':
        case 'spoiler':
          return inlineToPlain(token.children);
      }
    })
    .join('');
}

export function toPlainText(input: string): string {
  const blocks = parseTelegramPost(input);
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'blank':
          return '';
        case 'paragraph':
          return inlineToPlain(block.tokens);
        case 'blockquote':
          return block.lines.map((line) => `| ${inlineToPlain(line)}`).join('\n');
        case 'codeblock':
          return block.code;
      }
    })
    .join('\n');
}

export function countTelegramCharacters(input: string): number {
  return toPlainText(input).length;
}
