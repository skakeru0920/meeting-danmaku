import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

function setStatus(text) {
  statusEl.textContent = text;
}

/** devtools を開かなくても payload を読めるように画面にも出す */
function appendLog(label, payload) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  // チャット本文が入る。innerHTML は使わない(XSS 防止)
  entry.textContent = `[${label}] ${JSON.stringify(payload, null, 2)}`;
  logEl.prepend(entry);
}

async function main() {
  const config = await fetch('/config').then((r) => r.json());

  const client = ZoomMtgEmbedded.createClient();

  await client.init({
    zoomAppRoot: document.getElementById('meetingSDKElement'),
    language: 'ja-JP',
    patchJsMedia: true,
  });

  // T-002 の本体。payload をそのまま出して構造を確かめる。
  // Everyone / DM の判別条件は、ここで得た実データを見て T-003 で決める。
  client.on('chat-on-message', (payload) => {
    console.log('chat-on-message', payload);
    appendLog('chat', payload);
  });

  // 参加者リストにどう出るかを確認するため(未確認事項の 1 つ)
  client.on('user-added', (payload) => {
    console.log('user-added', payload);
    appendLog('user-added', payload);
  });

  client.on('connection-change', (payload) => {
    console.log('connection-change', payload);
    setStatus(`接続状態: ${JSON.stringify(payload)}`);
  });

  setStatus(`ミーティング ${config.meetingNumber} へ参加中…`);

  await client.join({
    signature: config.signature,
    meetingNumber: config.meetingNumber,
    password: config.password,
    userName: 'Comment Overlay',
  });

  // チャット受信専用なので音声を切りたい。
  //
  // ただし 2026-09-05 時点では、これを呼んでも参加者リスト上は
  // マイク ON のままだった(Icebox の「SDK クライアントのマイクを OFF にする」)。
  // 何も喋らなければ実害は出ていないため、この Plan では追わない。
  // 発表者と同じ Mac で動かすとハウリングの恐れがあるので、
  // T-011(実際の画面共有で通しで確認する)の前に決着させる。
  try {
    await client.stopAudio();
    console.log('stopAudio 完了(ただし参加者リスト上は ON のままだった)');
  } catch (error) {
    console.warn('stopAudio に失敗', error);
  }

  setStatus(`参加しました。別の参加者から Everyone 宛に投稿してください`);
}

main().catch((error) => {
  // SDK のエラーは message を持たないオブジェクトで来ることがあるので、
  // 中身をそのまま出す。原因の切り分けに要る。
  console.error('join failed', error);
  appendLog('error', error);
  setStatus(`エラー: ${error?.reason ?? error?.message ?? JSON.stringify(error)}`);
});
