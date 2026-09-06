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

/**
 * 受け取ったデータが OverlayComment の形をしているか確かめる。
 *
 * サーバーから来たものをそのまま描画へ渡さないための関門。
 * 壊れた 1 件で弾幕全体が止まるのを防ぐ。
 * T-010 で Zoom の実データが流れ始めるときに効く。
 *
 * @param {unknown} value
 * @returns {value is OverlayComment}
 */
export function isOverlayComment(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const c = /** @type {Record<string, unknown>} */ (value);

  return (
    typeof c.id === 'string' &&
    typeof c.sender === 'string' &&
    typeof c.text === 'string' &&
    typeof c.timestamp === 'number'
  );
}

/**
 * サーバーから SSE でコメントを受け取る供給源。
 *
 * 再接続は EventSource に任せている。サーバーが落ちても、
 * 再読み込みしても、勝手に繋ぎ直す。自前のループは持たない。
 *
 * @implements {CommentSource}
 */
export class SseCommentSource {
  /**
   * @param {object} [options]
   * @param {string} [options.url] 接続先
   * @param {typeof EventSource} [options.EventSourceClass] テストで差し替えるため
   */
  constructor(options = {}) {
    this.url = options.url ?? '/events';
    this.EventSourceClass = options.EventSourceClass ?? globalThis.EventSource;

    /** @type {EventSource | null} */
    this.eventSource = null;
  }

  /**
   * 接続してコメントを受け取り始める。
   *
   * 既に接続している場合は何もしない。
   *
   * @param {CommentListener} listener
   */
  start(listener) {
    if (this.eventSource !== null) {
      return;
    }

    const es = new this.EventSourceClass(this.url);
    this.eventSource = es;

    es.onmessage = (event) => {
      const comment = this.parse(event.data);
      if (comment !== null) {
        listener(comment);
      }
    };

    es.onerror = () => {
      // EventSource が自分で繋ぎ直すので、ここでは閉じない。
      // 閉じると再接続まで止まってしまう。
      console.warn('SSE の接続が切れた。再接続を待つ');
    };
  }

  /** 接続を閉じる。閉じている場合は何もしない */
  stop() {
    if (this.eventSource === null) {
      return;
    }

    this.eventSource.close();
    this.eventSource = null;
  }

  /**
   * 受信した文字列を OverlayComment にする。
   *
   * 壊れていれば null を返して捨てる。落とさずに次を待つ。
   *
   * @param {string} data
   * @returns {OverlayComment | null}
   */
  parse(data) {
    try {
      const parsed = JSON.parse(data);
      if (!isOverlayComment(parsed)) {
        console.warn('OverlayComment の形をしていないので捨てる', parsed);
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn('JSON として読めないので捨てる', data, error);
      return null;
    }
  }
}
