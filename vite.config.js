import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SIGNATURE_SERVER = 'http://localhost:3000';

export default defineConfig({
  // フロントは src/zoom/ 配下。ここを Vite の root にする
  root: 'src/zoom',
  plugins: [react()],
  server: {
    port: 5173,
    // Client Secret を扱う /config だけ Express へ回す。
    // Secret はブラウザに出さず、署名済み JWT だけが返る。
    proxy: {
      '/config': SIGNATURE_SERVER,
    },
  },
});
