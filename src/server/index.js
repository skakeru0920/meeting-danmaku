import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';

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

app.listen(PORT, () => {
  console.log(`signature server: http://localhost:${PORT}`);
  console.log(`ミーティング番号: ${ZOOM_MEETING_NUMBER}`);
});
