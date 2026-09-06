/**
 * 接続中のクライアントを覚えておき、全員へ配る。
 *
 * **通信方式を知らない。** SSE でも WebSocket でも、
 * 「1 件受け取って送る関数」を持つものなら何でも扱える。
 * 将来 WebSocket へ移るとき、この部分は書き換えずに済む。
 *
 * @typedef {(comment: import('../overlay/types.js').OverlayComment) => void} SendFn
 */

export class Broadcaster {
  constructor() {
    /**
     * 接続中のクライアント。送信関数だけを持つ。
     * @type {Set<SendFn>}
     */
    this.clients = new Set();
  }

  /** いま繋がっている数 */
  get size() {
    return this.clients.size;
  }

  /**
   * クライアントを登録する。
   *
   * @param {SendFn} send このクライアントへ 1 件送る関数
   * @returns {() => void} 登録を解除する関数。切断時に呼ぶ
   */
  add(send) {
    this.clients.add(send);
    return () => this.clients.delete(send);
  }

  /**
   * 全クライアントへ 1 件配る。
   *
   * 1 つのクライアントへの送信が失敗しても他へは配り続ける。
   * 切断直後などに書き込みが失敗することがあるため、
   * そこで全体を止めない。失敗したクライアントは取り除く。
   *
   * @param {import('../overlay/types.js').OverlayComment} comment
   */
  broadcast(comment) {
    for (const send of this.clients) {
      try {
        send(comment);
      } catch (error) {
        console.warn('配信に失敗したクライアントを切り離す', error);
        this.clients.delete(send);
      }
    }
  }
}
