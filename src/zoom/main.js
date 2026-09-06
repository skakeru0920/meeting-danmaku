import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { ZoomCommentSource, isToEveryone } from './comment-source.js';

/**
 * Zoom チャットを overlay へ流す。
 *
 * Meeting SDK はブラウザ前提なので、この部分だけタブの中で動く。
 * 受け取ったコメントは POST /comment でサーバーへ渡し、
 * サーバーが SSE で overlay へ配る。**このタブを閉じると止まる。**
 *
 * DM を流さない判断は comment-source.js が持つ。ここでは表示だけ行う。
 */

const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

/** 画面に残すログの件数。増え続けるとタブが重くなる */
const MAX_LOG_ENTRIES = 50;

function setStatus(text) {
  statusEl.textContent = text;
}

/**
 * 画面にログを 1 行足す。
 *
 * チャット本文が入るので textContent で入れる(innerHTML は使わない)。
 *
 * @param {string} text
 * @param {'sent' | 'skipped' | 'error'} kind
 */
function appendLog(text, kind) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.dataset.kind = kind;
  entry.textContent = text;
  logEl.prepend(entry);

  while (logEl.children.length > MAX_LOG_ENTRIES) {
    logEl.lastChild.remove();
  }
}

/** 送信した件数。画面表示用 */
let sentCount = 0;

/**
 * コメントをサーバーへ送る。
 *
 * 1 件の失敗で購読を止めない。次のコメントは届く。
 *
 * @param {import('../overlay/types.js').OverlayComment} comment
 */
async function post(comment) {
  try {
    const res = await fetch('/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment.text, sender: comment.sender }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      appendLog(`送信できなかった (${res.status}): ${body.error ?? ''}`, 'error');
      return;
    }

    sentCount += 1;
    appendLog(`${comment.sender}: ${comment.text}`, 'sent');
    setStatus(`参加中。${sentCount} 件を overlay へ送った`);
  } catch (error) {
    appendLog(`サーバーに繋がらない: ${error}`, 'error');
  }
}

async function main() {
  const config = await fetch('/config').then((r) => r.json());

  const client = ZoomMtgEmbedded.createClient();

  await client.init({
    zoomAppRoot: document.getElementById('meetingSDKElement'),
    language: 'ja-JP',
    patchJsMedia: true,
  });

  const source = new ZoomCommentSource(client);
  source.start((comment) => post(comment));

  // 捨てた分も見えるようにしておく。DM が流れていないことを目視で確かめるため。
  // 本文は出さない(DM の中身を画面に残さない)。
  client.on('chat-on-message', (payload) => {
    if (!isToEveryone(payload)) {
      appendLog('DM を受信したが流さなかった', 'skipped');
    }
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
  // 2026-09-05 時点で未解決(Icebox の「SDK クライアントのマイクを OFF にする」)。
  // この呼び出し自体は成功するが、参加者リスト上はマイク ON のまま。
  // 待機室にいると 5004 / 'on hold' で失敗するが、待機室を無効にして
  // 成功させても結果は変わらなかったので、待機室は原因ではない。
  // stopAudio が音声接続の停止であって、ミュートとは別の概念らしい。
  // 次に試すなら client.mute(true)。
  //
  // 何も喋らなければ実害が出ていないためこの Plan では追わない。ただし
  // 発表者と同じ Mac で動かすとハウリングの恐れがあるので、
  // T-011(実際の画面共有で通しで確認する)の前に決着させる。
  try {
    await client.stopAudio();
    console.log('stopAudio 完了(ただし参加者リスト上は ON のまま)');
  } catch (error) {
    console.warn('stopAudio に失敗', error);
  }

  setStatus('参加しました。Everyone 宛のチャットが overlay に流れる');
}

main().catch((error) => {
  // SDK のエラーは message を持たないオブジェクトで来ることがあるので、
  // 中身をそのまま出す。原因の切り分けに要る。
  console.error('join failed', error);
  appendLog(`エラー: ${JSON.stringify(error)}`, 'error');
  setStatus(`エラー: ${error?.reason ?? error?.message ?? JSON.stringify(error)}`);
});
