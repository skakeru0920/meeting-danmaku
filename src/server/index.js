import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Broadcaster } from './broadcast.js';
import { toOverlayComment, MAX_TEXT_LENGTH } from './comment.js';
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

// /comment が JSON を受けるため。本文の上限は toOverlayComment 側でも見るが、
// 巨大なボディをパースする前に切りたいので limit も入れておく。
app.use(express.json({ limit: '64kb' }));

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

/** POST /comment で採番する連番。id の一意性のためだけに使う */
let postedCount = 0;

/**
 * /debug 画面から投稿されたコメントを受け取る。
 *
 * **dev-only。** 認証は付けていない。誰でも投稿できるので、
 * 開発機の外へ公開しない。
 */
app.post('/comment', (req, res) => {
  const comment = toOverlayComment(req.body, { id: `post-${postedCount}` });

  if (comment === null) {
    res.status(400).json({
      error: `text は 1〜${MAX_TEXT_LENGTH} 文字の文字列で送ってください`,
    });
    return;
  }

  postedCount += 1;
  broadcaster.broadcast(comment);

  res.status(202).json({ id: comment.id, delivered: broadcaster.size });
});

// express.json() が壊れた JSON で投げる SyntaxError を JSON にして返す。
// 既定のハンドラだとスタックトレースが HTML で返り、パスが漏れる。
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON として読めません' });
    return;
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`signature server: http://localhost:${PORT}`);
  console.log(`ミーティング番号: ${ZOOM_MEETING_NUMBER}`);

  // ダミーの自動投稿は --debug-source を付けたときだけ。
  //
  // 既定では止めている。実際の Zoom コメントを確認するときに混ざると
  // 見分けがつかないため。見た目の調整をするときに付ける。
  // 手動投稿は /src/debug/ から行える(フラグに関係なく使える)。
  if (process.argv.includes('--debug-source')) {
    const source = new DebugCommentSource();
    source.start((comment) => broadcaster.broadcast(comment));
    console.log('DebugCommentSource を開始した(--debug-source)');
  }
});
