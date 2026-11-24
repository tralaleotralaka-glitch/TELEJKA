import { Capacitor } from '@capacitor/core';
import type { AppSettings, NativeBuildInfo } from '../types';

export function isNativeAndroid(): boolean {
  return Boolean(window.TelejkaNative) || Capacitor.getPlatform() === 'android';
}

export function getNativeBuildInfo(): NativeBuildInfo {
  if (window.TelejkaNative) {
    try {
      const parsed = JSON.parse(window.TelejkaNative.getBuildInfo()) as Partial<NativeBuildInfo>;
      return {
        isNativeAndroid: true,
        packageId: parsed.packageId ?? 'ru.telejka.app',
        versionName: parsed.versionName ?? '1.0.0',
        versionCode: parsed.versionCode ?? 1,
        androidSdk: typeof parsed.androidSdk === 'number' ? parsed.androidSdk : null,
        engine: parsed.engine ?? 'Android WebView + Capacitor 7',
      };
    } catch {
      // Fallback below
    }
  }

  return {
    isNativeAndroid: Capacitor.getPlatform() === 'android',
    packageId: 'ru.telejka.app',
    versionName: '1.0.0',
    versionCode: 1,
    androidSdk: null,
    engine:
      Capacitor.getPlatform() === 'android'
        ? 'Android WebView + Capacitor 7'
        : 'Web Preview (APK-ready Hybrid)',
  };
}

export function syncNativeSettings(settings: AppSettings): void {
  if (window.TelejkaNative) {
    try {
      window.TelejkaNative.saveNativePrefs(
        JSON.stringify({
          startScreen: settings.startScreen,
          desktopUserAgent: settings.desktopUserAgent,
          doubleBackExit: settings.doubleBackExit,
          showFloatingHubButton: settings.showFloatingHubButton,
          theme: settings.theme,
          customWebUrl: settings.customWebUrl,
        })
      );
    } catch {
      // Ignore bridge errors
    }
  }
}

export function openTelegramInClient(
  url: string,
  title: string,
  settings: AppSettings
): 'native_webview' | 'browser_tab' {
  if (window.TelejkaNative) {
    window.TelejkaNative.openTelegramWeb(
      url,
      title,
      settings.desktopUserAgent,
      settings.showFloatingHubButton
    );
    return 'native_webview';
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'browser_tab';
}

export function openExternalLink(url: string): void {
  if (window.TelejkaNative) {
    window.TelejkaNative.openExternalUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function clearNativeCache(): boolean {
  if (window.TelejkaNative) {
    try {
      return window.TelejkaNative.clearWebViewCache();
    } catch {
      return false;
    }
  }
  return false;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to textarea copy below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function triggerHapticTick(): void {
  if (window.TelejkaNative?.vibrateShort) {
    try {
      window.TelejkaNative.vibrateShort();
      return;
    } catch {
      // Ignore
    }
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore
    }
  }
}
