/**
 * 受け取ったリクエストボディを OverlayComment にする。
 *
 * **本文はエスケープしない。** `<script>alert(1)</script>` はそのまま
 * 文字列として通す。overlay 側が textContent で挿入するので、
 * ここでエスケープすると画面に `&lt;script&gt;` が出てしまう。
 * XSS の防御は描画層の一箇所に集約する(docs/plan/003)。
 *
 * @typedef {import('../overlay/types.js').OverlayComment} OverlayComment
 */

/** 本文の長さ上限。これを超えたら受け付けない */
export const MAX_TEXT_LENGTH = 500;

/** 送信者名の既定値。未指定のときに使う */
export const DEFAULT_SENDER = 'debug';

/** 送信者名の長さ上限 */
export const MAX_SENDER_LENGTH = 50;

/**
 * リクエストボディから OverlayComment を組み立てる。
 *
 * 形が合わなければ null を返す。呼び出し側は 400 を返す。
 *
 * id はサーバー側で採番する。クライアントが指定した id を信用すると、
 * 既存コメントと同じ id を送られたときに DOM の対応付けが壊れる。
 *
 * @param {unknown} body リクエストボディ(パース済み)
 * @param {object} [options]
 * @param {string} [options.id] 採番済みの id
 * @param {number} [options.now] 受信時刻。テストで固定するため
 * @returns {OverlayComment | null} 形が合わなければ null
 */
export function toOverlayComment(body, options = {}) {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const source = /** @type {Record<string, unknown>} */ (body);

  const text = source.text;
  if (typeof text !== 'string') {
    return null;
  }

  // 空白だけの投稿は弾く。流れても何も見えないため。
  // ただし本文自体は trim せずに送る(前後の空白ごと見た目を確かめたい場合がある)。
  if (text.trim().length === 0) {
    return null;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return null;
  }

  const sender = typeof source.sender === 'string' && source.sender.trim().length > 0
    ? source.sender.slice(0, MAX_SENDER_LENGTH)
    : DEFAULT_SENDER;

  return {
    id: options.id ?? `post-${Date.now()}`,
    sender,
    text,
    timestamp: options.now ?? Date.now(),
  };
}
