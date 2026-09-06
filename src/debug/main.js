/**
 * dev-only のコメント投稿画面。
 *
 * 入力欄の内容を POST /comment へ送るだけ。サーバーが Broadcaster へ流し、
 * SSE で overlay に届く。
 *
 * **本文をそのまま送る。** エスケープもサニタイズもしない。
 * <script>alert(1)</script> が文字列として overlay に流れることを
 * 確かめるのがこの画面の役目のひとつなので、途中で加工しない。
 */

const form = /** @type {HTMLFormElement} */ (document.getElementById('form'));
const textInput = /** @type {HTMLInputElement} */ (document.getElementById('text'));
const senderInput = /** @type {HTMLInputElement} */ (document.getElementById('sender'));
const status = /** @type {HTMLElement} */ (document.getElementById('status'));

/**
 * 送信結果を表示する。
 *
 * **textContent で入れる。** サーバーからのメッセージも投稿内容も
 * innerHTML には渡さない。
 *
 * @param {string} message
 * @param {'ok' | 'error'} kind
 */
function showStatus(message, kind) {
  status.textContent = message;
  status.dataset.kind = kind;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = textInput.value;
  if (text.trim().length === 0) {
    showStatus('本文を入力してください', 'error');
    return;
  }

  try {
    const res = await fetch('/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sender: senderInput.value }),
    });

    const body = await res.json();

    if (!res.ok) {
      showStatus(`送信できなかった: ${body.error ?? res.status}`, 'error');
      return;
    }

    // 連投しやすいように本文だけ消す。名前は残す。
    textInput.value = '';
    textInput.focus();

    showStatus(`送信した(${body.id} / overlay ${body.delivered} 件へ配信)`, 'ok');
  } catch (error) {
    showStatus(`サーバーに繋がらない: ${error}`, 'error');
  }
});
