import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Broadcaster } from './broadcast.js';
import { DebugCommentSource } from '../overlay/source.js';

const PORT = Number(process.env.PORT ?? 3000);

const {
  ZOOM_SDK_CLIENT_ID,
  ZOOM_SDK_CLIENT_SECRET,
  ZOOM_MEETING_NUMBER,
  ZOOM_MEETING_PASSWORD,
} = process.env;

// 起動時に足りない設定をまとめて知らせる。1 つずつ落ちると往復が増えるため。
const missing = Object.entries({
  ZOOM_SDK_CLIENT_ID,
  ZOOM_SDK_CLIENT_SECRET,
  ZOOM_MEETING_NUMBER,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`.env に以下が設定されていません: ${missing.join(', ')}`);
  console.error('.env.example をコピーして値を埋めてください。');
  process.exit(1);
}

/**
 * Meeting SDK の JWT を作る。
 *
 * 署名に Client Secret が要るので、必ずサーバー側で作る。
 * ブラウザへ渡すのは署名済みの文字列だけで、Secret 自体は渡さない。
 */
function createSignature(meetingNumber) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 2;

  return jwt.sign(
    {
      appKey: ZOOM_SDK_CLIENT_ID,
      mn: meetingNumber,
      role: 0, // 0 = participant。ホストとして開始しないので 0
      iat,
      exp,
      tokenExp: exp,
    },
    ZOOM_SDK_CLIENT_SECRET,
  );
}

const app = express();

app.get('/config', (req, res) => {
  res.json({
    meetingNumber: ZOOM_MEETING_NUMBER,
    password: ZOOM_MEETING_PASSWORD ?? '',
    signature: createSignature(ZOOM_MEETING_NUMBER),
  });
});

const broadcaster = new Broadcaster();

/**
 * overlay へコメントを配る SSE エンドポイント。
 *
 * WebSocket ではなく SSE にしている。サーバー → overlay の一方向で足りること、
 * 依存を増やさずに済むこと、EventSource が再接続を自前で持っていることが理由。
 * 判断の経緯は docs/plan/003 を参照。
 */
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // nginx などが挟まったときにバッファされると流れなくなるため
    'X-Accel-Buffering': 'no',
  });
  // ヘッダを先に送り切る。これが無いと最初の 1 件まで何も届かない
  res.flushHeaders();

  const remove = broadcaster.add((comment) => {
    res.write(`data: ${JSON.stringify(comment)}\n\n`);
  });

  console.log(`overlay が接続した(接続数: ${broadcaster.size})`);

  req.on('close', () => {
    remove();
    console.log(`overlay が切断した(接続数: ${broadcaster.size})`);
  });
});

app.listen(PORT, () => {
  console.log(`signature server: http://localhost:${PORT}`);
  console.log(`ミーティング番号: ${ZOOM_MEETING_NUMBER}`);

  // T-008 の間はダミーを流し続ける。T-010 で ZoomCommentSource に差し替える。
  const source = new DebugCommentSource();
  source.start((comment) => broadcaster.broadcast(comment));
  console.log('DebugCommentSource を開始した');
});
