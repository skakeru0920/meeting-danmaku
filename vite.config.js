import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SIGNATURE_SERVER = 'http://localhost:3000';

export default defineConfig({
  // root はプロジェクト直下。src/zoom/ と src/overlay/ の両方を配信するため。
  //
  // 以前は root: 'src/zoom' だったが、それだと overlay をブラウザで開けない。
  // 開発中の URL は以下になる。
  //   Zoom SDK クライアント: http://localhost:5173/src/zoom/
  //   overlay:               http://localhost:5173/src/overlay/
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    // Client Secret を扱う /config だけ Express へ回す。
    // Secret はブラウザに出さず、署名済み JWT だけが返る。
    proxy: {
      '/config': SIGNATURE_SERVER,
      // overlay へコメントを配る SSE。1 件ずつ流れることは確認済み
      '/events': { target: SIGNATURE_SERVER, changeOrigin: true },
      // /debug 画面からの投稿先(dev-only)
      '/comment': SIGNATURE_SERVER,
    },
  },
  test: {
    // overlay の DOM 操作をテストするため。ロジック側は DOM を知らないが、
    // 描画部のテストで document を使う。
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
