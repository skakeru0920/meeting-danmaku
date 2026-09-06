/**
 * Zoom チャットを OverlayComment に変換して供給する。
 *
 * Zoom 固有の payload はここから先へ出さない。overlay も Broadcaster も
 * Zoom を知らないまま動く。
 *
 * @typedef {import('../overlay/types.js').OverlayComment} OverlayComment
 * @typedef {import('../overlay/source.js').CommentListener} CommentListener
 * @typedef {import('../overlay/source.js').CommentSource} CommentSource
 */

/** Everyone 宛を表す receiver.userId。DM は受信者の実 userId が入る */
export const EVERYONE_USER_ID = 0;

/** 送信者名が取れなかったときの表示名 */
export const UNKNOWN_SENDER = '(不明)';

/**
 * Everyone 宛かどうかを判定する。
 *
 * **`receiver.name` では判定しない。** 表示言語によって変わりうるため、
 * 数値の userId で見る(T-003 で実 payload を観測して確定)。
 *
 * 形が想定と違うものは false を返す。判定できないものを通すと
 * DM が漏れる可能性があるので、迷ったら流さない側へ倒す。
 *
 * @param {unknown} payload chat-on-message の payload
 * @returns {boolean} Everyone 宛なら true
 */
export function isToEveryone(payload) {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const { receiver } = /** @type {Record<string, unknown>} */ (payload);

  if (typeof receiver !== 'object' || receiver === null) {
    return false;
  }

  const { userId } = /** @type {Record<string, unknown>} */ (receiver);

  return userId === EVERYONE_USER_ID;
}

/**
 * Zoom の payload を OverlayComment へ正規化する。
 *
 * **DM は null を返して捨てる。** overlay に DM を流さないという制約は
 * ここ 1 箇所で担保する。
 *
 * @param {unknown} payload chat-on-message の payload
 * @param {object} [options]
 * @param {number} [options.now] timestamp が取れないときの代替。テスト用
 * @returns {OverlayComment | null} 流さないものは null
 */
export function toOverlayComment(payload, options = {}) {
  if (!isToEveryone(payload)) {
    return null;
  }

  const source = /** @type {Record<string, any>} */ (payload);

  const text = source.message;
  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  // 添付ファイルだけの投稿は本文が無いことがある。上の空チェックで落ちる。

  const senderName = source.sender?.name;
  const sender = typeof senderName === 'string' && senderName.length > 0
    ? senderName
    : UNKNOWN_SENDER;

  // id は Zoom のものをそのまま使う。同じコメントの重複を見分けられる。
  const id = typeof source.id === 'string' && source.id.length > 0
    ? source.id
    : `zoom-${options.now ?? Date.now()}`;

  const timestamp = typeof source.timestamp === 'number'
    ? source.timestamp
    : (options.now ?? Date.now());

  return { id, sender, text, timestamp };
}

/**
 * Zoom SDK クライアントの chat-on-message を購読する CommentSource。
 *
 * client は外から受け取る。テストではモックを渡す。
 *
 * @implements {CommentSource}
 */
export class ZoomCommentSource {
  /**
   * @param {{ on: Function, off: Function }} client ZoomMtgEmbedded のクライアント
   */
  constructor(client) {
    this.client = client;

    /**
     * 購読中のハンドラ。止まっているときは null
     * @type {((payload: unknown) => void) | null}
     */
    this.handler = null;
  }

  /**
   * 購読を開始する。
   *
   * 既に購読中なら何もしない。二重に登録すると同じコメントが
   * 2 回流れるため。
   *
   * @param {CommentListener} listener
   */
  start(listener) {
    if (this.handler !== null) {
      return;
    }

    this.handler = (payload) => {
      const comment = toOverlayComment(payload);
      if (comment !== null) {
        listener(comment);
      }
    };

    this.client.on('chat-on-message', this.handler);
  }

  /** 購読を止める。止まっているなら何もしない */
  stop() {
    if (this.handler === null) {
      return;
    }

    this.client.off('chat-on-message', this.handler);
    this.handler = null;
  }
}
