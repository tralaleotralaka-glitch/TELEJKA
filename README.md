# TELEJKA — Telegram Hub & Android APK

**TELEJKA** — гибридное Android-приложение (Capacitor 7 + нативный Android WebView + React/TypeScript/Tailwind) для удобной работы с Telegram. Работает одновременно как **полноценный Android APK** и как **веб-приложение**.

## Возможности

- **Telegram Web Хаб (встроенный Android WebView)**
  - Быстрый запуск **Telegram Web K** и **Telegram Web A** или собственного URL/зеркала прямо внутри нативного Android WebView (`TelegramWebActivity`).
  - Сохранение cookies и сессий, загрузка файлов (фото/документы), скачивание вложений через системный `DownloadManager`, поддержка ссылок `t.me` и `tg://`, переключение Mobile/Desktop User-Agent, панель быстрого возврата в хаб.
  - Быстрый диалог без сохранения контакта (по номеру телефона `+7...` / `8...` или `@username`).
  - Офлайн-закладки каналов, ботов и чатов с закреплением, поиском и фильтрацией.
- **Редактор постов (Post Studio)**
  - Форматирование для Telegram: **жирный**, *курсив*, подчёркнутый, зачёркнутый, **интерактивные спойлеры**, моноширинный код, блоки кода, цитаты и ссылки.
  - Живой предпросмотр в виде сообщения Telegram с кликабельными спойлерами.
  - Счётчики лимитов (4096 для текста / 1024 для подписи к медиа), копирование в **Telegram HTML**, **MarkdownV2** и чистый текст, сохранение черновиков.
- **Генератор ссылок `t.me` / `tg://` и QR-кодов**
  - Генерация ссылок на пользователей/каналы/посты, номера телефонов, кнопки «Поделиться» и MTProto-прокси.
  - Встроенный генератор QR-кодов с экспортом в PNG.
- **Консоль Telegram Bot API**
  - Проверка бота (`getMe`), просмотр обновлений (`getUpdates` с подстановкой `chat_id` в один тап), статус Webhook (`getWebhookInfo`) и отправка сообщений (`sendMessage`) с конструктором Inline-кнопок.
  - Встроенный безопасный **Демо-режим** для тестирования без токена.
- **Оформление и настройки APK**
  - 3 темы: **Ночная синяя**, **Светлая**, **OLED Чёрная** + 4 акцентных цвета (синхронизируются со статус-баром Android).
  - Экспорт/импорт резервной копии данных в JSON.

## Быстрый старт (Веб-версия)

```bash
npm install
npm run dev
```

Проверка сборки и тестов:

```bash
npm run build
npm test
```

## Сборка Android APK

### 1. Автоматическая сборка через GitHub Actions (рекомендуется)

В репозитории настроен workflow `.github/workflows/build-apk.yml`. При каждом пуше или ручном запуске (`Actions → Build TELEJKA Android APK → Run workflow`) GitHub Actions автоматически собирает:
- `TELEJKA-v1.0.0-debug.apk`
- `TELEJKA-v1.0.0-release.apk`

Готовые `.apk` файлы доступны в разделе **Artifacts** (`TELEJKA-APK`) выполненного запуска.

Для подписи release APK собственным ключом добавьте в GitHub Secrets:
- `TELEJKA_KEYSTORE_BASE64` — ваш `.jks` файл в base64
- `TELEJKA_KEYSTORE_PASSWORD`
- `TELEJKA_KEY_ALIAS`
- `TELEJKA_KEY_PASSWORD`

### 2. Локальная сборка на компьютере (JDK 21 + Android SDK 35)

```bash
chmod +x scripts/build-apk.sh
./scripts/build-apk.sh debug
# или для release:
./scripts/build-apk.sh release
```

Либо откройте папку `android/` в **Android Studio** и нажмите **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Структура проекта

- `src/` — исходный код веб-интерфейса (React 19 + TypeScript + Tailwind CSS v4)
- `android/` — нативный Android-проект (Capacitor 7, `MainActivity.java`, `TelegramWebActivity.java`, адаптивные иконки TELEJKA, Gradle 8.11)
- `.github/workflows/build-apk.yml` — CI/CD автосборка `.apk`
- `scripts/build-apk.sh` — скрипт локальной сборки `.apk`
