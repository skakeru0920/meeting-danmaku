/**
 * コメントの供給源。
 *
 * overlay は供給源を知らない。Zoom から来ても debug 画面から来ても
 * 同じ形(OverlayComment)で届く。差し替えられるようにするための境界。
 *
 * JS にインターフェース構文は無いので @typedef で形だけ決める。
 * 抽象クラスを作って継承させることはしない
 * (docs/decisions/ の「抽象化しすぎない。まず動かす」)。
 */

/** @typedef {import('./types.js').OverlayComment} OverlayComment */

/**
 * コメントを受け取る側のコールバック。
 *
 * @callback CommentListener
 * @param {OverlayComment} comment
 * @returns {void}
 */

/**
 * @typedef {object} CommentSource
 * @property {(listener: CommentListener) => void} start 供給を開始する
 * @property {() => void} stop 供給を止める
 */

/** ダミーの本文。順に使い回す */
const DUMMY_TEXTS = [
  'こんにちは',
  '888888',
  'テスト投稿です',
  'いいですね',
  'wwwwwwww',
  '聞こえてます',
  'なるほど',
  'This is a comment',
  '質問です。この部分もう一度お願いします',
  '👏👏👏',
];

/** ダミーを吐く既定の間隔(ms) */
export const DEFAULT_INTERVAL_MS = 700;

/**
 * 一定間隔でダミーの OverlayComment を吐く供給源。
 *
 * Zoom に繋がずに overlay の見た目を確かめるためのもの。
 * T-009 の /debug 画面が入っても、こちらは自動で流し続ける用途で残る。
 *
 * @implements {CommentSource}
 */
export class DebugCommentSource {
  /**
   * @param {object} [options]
   * @param {number} [options.intervalMs] 吐く間隔
   * @param {string[]} [options.texts] 本文。順に使い回す
   */
  constructor(options = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.texts = options.texts ?? DUMMY_TEXTS;

    /** 何件目か。本文の選択と id に使う */
    this.count = 0;

    /**
     * 動作中の timer。止まっているときは null
     * @type {ReturnType<typeof setInterval> | null}
     */
    this.timer = null;
  }

  /**
   * 供給を開始する。
   *
   * 既に動いている場合は何もしない。二重に start して
   * timer が二本走るのを防ぐ。
   *
   * @param {CommentListener} listener
   */
  start(listener) {
    if (this.timer !== null) {
      return;
    }

    this.timer = setInterval(() => {
      listener(this.createComment());
    }, this.intervalMs);
  }

  /** 供給を止める。止まっている場合は何もしない */
  stop() {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * ダミーのコメントを 1 件作る。
   *
   * @returns {OverlayComment}
   */
  createComment() {
    const index = this.count;
    this.count += 1;

    return {
      id: `debug-${index}`,
      sender: `user${index % 5}`,
      text: this.texts[index % this.texts.length],
      timestamp: Date.now(),
    };
  }
}
