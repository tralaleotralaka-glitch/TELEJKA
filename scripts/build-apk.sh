#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-debug}"

echo "==> TELEJKA APK Builder (mode: ${MODE})"

if ! command -v node >/dev/null 2>&1; then
  echo "Ошибка: Node.js не найден. Установите Node.js 20+." >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Ошибка: Java (JDK 21) не найдена. Установите JDK 21 (например, Adoptium Temurin 21)." >&2
  exit 1
fi

echo "==> 1/3 Установка зависимостей, тесты и сборка веб-приложения..."
npm install
npm test
npm run build

echo "==> 2/3 Синхронизация Capacitor Android..."
npx cap sync android

echo "==> 3/3 Компиляция APK через Gradle..."
cd android
chmod +x gradlew

if [ "${MODE}" = "release" ]; then
  ./gradlew assembleRelease
  APK_PATH="$(ls -1 app/build/outputs/apk/release/*.apk | head -n 1)"
else
  ./gradlew assembleDebug
  APK_PATH="$(ls -1 app/build/outputs/apk/debug/*.apk | head -n 1)"
fi

echo ""
echo "✅ APK успешно собран: android/${APK_PATH}"
ls -lh "${APK_PATH}"
