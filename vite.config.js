import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SIGNATURE_SERVER = 'http://localhost:3000';

/**
 * 起動時に開く URL を一覧で出す。
 *
 * Vite の既定表示は root の URL だけで、実際に開くのは
 * /src/zoom/ と /src/debug/ なので、そのまま貼れる形で出す。
 */
function printLinks() {
  return {
    name: 'print-links',
    configureServer(server) {
      const origin = `http://localhost:${server.config.server.port}`;

      server.httpServer?.once('listening', () => {
        // Vite 自身の起動メッセージが出たあとに表示する
        setTimeout(() => {
          console.log('');
          console.log('  Zoom に参加(このタブを開いている間だけ流れる):');
          console.log(`    ${origin}/src/zoom/`);
          console.log('  手動でコメントを投稿:');
          console.log(`    ${origin}/src/debug/`);
          console.log('');
        }, 100);
      });
    },
  };
}

export default defineConfig({
  // root はプロジェクト直下。src/zoom/ と src/overlay/ の両方を配信するため。
  //
  // 以前は root: 'src/zoom' だったが、それだと overlay をブラウザで開けない。
  // 開発中の URL は以下になる。
  //   Zoom SDK クライアント: http://localhost:5173/src/zoom/
  //   overlay:               http://localhost:5173/src/overlay/
  root: '.',
  plugins: [react(), printLinks()],
  server: {
    port: 5173,
    // Zoom タブを自動で開くのは npm run dev のときだけ。
    //
    // npm start では Electron の隠しウィンドウが Zoom に繋ぐので、
    // ブラウザのタブは要らない(package.json の scripts を参照)。
    // 開発中は状況が見えるほうがよいのでブラウザで開く。
    //
    // overlay は Electron が表示するのでブラウザでは開かない。
    // /debug は常用しないので手で開く。
    open: process.env.OPEN_ZOOM_TAB === '1' ? '/src/zoom/' : false,
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
