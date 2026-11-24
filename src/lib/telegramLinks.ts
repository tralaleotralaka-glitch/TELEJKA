export interface BuiltTelegramLink {
  httpsUrl: string;
  tgUrl: string;
  displayLabel: string;
  isValid: boolean;
  error?: string;
}

export function cleanUsername(input: string): string {
  let value = input.trim();
  value = value.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|telegram\.dog)\//i, '');
  value = value.replace(/^@+/, '');
  value = value.split(/[?#]/)[0] ?? '';
  value = value.replace(/\/+$/, '');
  return value;
}

export function buildUsernameLink(
  rawUsername: string,
  options?: { startParam?: string; postId?: string; text?: string }
): BuiltTelegramLink {
  const cleaned = cleanUsername(rawUsername);
  if (!cleaned) {
    return {
      httpsUrl: '',
      tgUrl: '',
      displayLabel: '',
      isValid: false,
      error: 'Введите @username канала, пользователя или бота',
    };
  }

  const parts = cleaned.split('/');
  const username = parts[0];
  const postFromPath = parts[1];

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    return {
      httpsUrl: '',
      tgUrl: '',
      displayLabel: '',
      isValid: false,
      error: 'Username должен содержать 3–32 символа: латиница, цифры или _',
    };
  }

  const postId = (options?.postId?.trim() || postFromPath || '').replace(/[^0-9]/g, '');
  const startParam = options?.startParam?.trim() ?? '';
  const textParam = options?.text?.trim() ?? '';

  const query = new URLSearchParams();
  if (startParam) query.set('start', startParam);
  if (textParam) query.set('text', textParam);

  const path = postId ? `${username}/${postId}` : username;
  const qs = query.toString();
  const httpsUrl = `https://t.me/${path}${qs ? `?${qs}` : ''}`;

  const tgQuery = new URLSearchParams({ domain: username });
  if (postId) tgQuery.set('post', postId);
  if (startParam) tgQuery.set('start', startParam);
  if (textParam) tgQuery.set('text', textParam);
  const tgUrl = `tg://resolve?${tgQuery.toString()}`;

  return {
    httpsUrl,
    tgUrl,
    displayLabel: postId ? `@${username} / пост #${postId}` : `@${username}`,
    isValid: true,
  };
}

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  // Russian 8XXXXXXXXXX convenience -> +7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }
  return `+${digits}`;
}

export function buildPhoneLink(rawPhone: string, prefilledText?: string): BuiltTelegramLink {
  const normalized = normalizePhoneNumber(rawPhone);
  const digitsOnly = normalized.replace(/\D/g, '');

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      httpsUrl: '',
      tgUrl: '',
      displayLabel: '',
      isValid: false,
      error: 'Введите корректный номер телефона (от 7 до 15 цифр)',
    };
  }

  const text = prefilledText?.trim() ?? '';
  const query = text ? `?${new URLSearchParams({ text }).toString()}` : '';
  const httpsUrl = `https://t.me/${normalized}${query}`;

  const tgParams = new URLSearchParams({ phone: digitsOnly });
  if (text) tgParams.set('text', text);
  const tgUrl = `tg://resolve?${tgParams.toString()}`;

  return {
    httpsUrl,
    tgUrl,
    displayLabel: normalized,
    isValid: true,
  };
}

export function buildShareLink(url: string, text?: string): BuiltTelegramLink {
  const cleanUrl = url.trim();
  const cleanText = text?.trim() ?? '';

  if (!cleanUrl && !cleanText) {
    return {
      httpsUrl: '',
      tgUrl: '',
      displayLabel: '',
      isValid: false,
      error: 'Укажите URL или текст для кнопки «Поделиться»',
    };
  }

  const params = new URLSearchParams();
  if (cleanUrl) params.set('url', cleanUrl);
  if (cleanText) params.set('text', cleanText);

  const qs = params.toString();
  return {
    httpsUrl: `https://t.me/share/url?${qs}`,
    tgUrl: `tg://msg_url?${qs}`,
    displayLabel: cleanUrl || cleanText.slice(0, 42),
    isValid: true,
  };
}

export function buildProxyLink(
  server: string,
  port: string,
  secret: string
): BuiltTelegramLink {
  const host = server.trim();
  const portNum = Number(port.trim());
  const sec = secret.trim();

  if (!host || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535 || !sec) {
    return {
      httpsUrl: '',
      tgUrl: '',
      displayLabel: '',
      isValid: false,
      error: 'Укажите сервер, порт (1–65535) и secret для MTProto-прокси',
    };
  }

  const params = new URLSearchParams({
    server: host,
    port: String(portNum),
    secret: sec,
  });
  const qs = params.toString();

  return {
    httpsUrl: `https://t.me/proxy?${qs}`,
    tgUrl: `tg://proxy?${qs}`,
    displayLabel: `MTProto ${host}:${portNum}`,
    isValid: true,
  };
}

export function resolveBookmarkTarget(handle: string): {
  httpsUrl: string;
  webKUrl: string;
  isWebClientUrl: boolean;
} {
  const trimmed = handle.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const isWebClientUrl = /^https?:\/\/web\.telegram\.org/i.test(trimmed);
    return {
      httpsUrl: trimmed,
      webKUrl: isWebClientUrl ? trimmed : trimmed,
      isWebClientUrl,
    };
  }

  const cleaned = cleanUsername(trimmed);
  if (cleaned) {
    return {
      httpsUrl: `https://t.me/${cleaned}`,
      webKUrl: `https://web.telegram.org/k/#@${cleaned.split('/')[0]}`,
      isWebClientUrl: false,
    };
  }

  return {
    httpsUrl: 'https://web.telegram.org/k/',
    webKUrl: 'https://web.telegram.org/k/',
    isWebClientUrl: true,
  };
}
