import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const APK_FILE_NAME = 'TELEJKA-v1.0.0-release.apk';
const APK_PATH = path.resolve(process.cwd(), 'releases', APK_FILE_NAME);

function handleApkMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  const urlPath = (req.url ?? '').split('?')[0];

  if (urlPath === '/api/apk-status') {
    const exists = fs.existsSync(APK_PATH);
    const sizeBytes = exists ? fs.statSync(APK_PATH).size : 0;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        available: exists && sizeBytes > 0,
        fileName: APK_FILE_NAME,
        sizeBytes,
        downloadUrl: './TELEJKA.apk',
      })
    );
    return;
  }

  if (urlPath === '/TELEJKA.apk' || urlPath === `/download/${APK_FILE_NAME}`) {
    if (!fs.existsSync(APK_PATH)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('APK file is not prepared yet.');
      return;
    }
    const stat = fs.statSync(APK_PATH);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${APK_FILE_NAME}"`);
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(APK_PATH).pipe(res);
    return;
  }

  next();
}

function telejkaApkDownloadPlugin(): Plugin {
  return {
    name: 'telejka-apk-download',
    configureServer(server) {
      server.middlewares.use(handleApkMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApkMiddleware);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), telejkaApkDownloadPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
