import { LaneAllocator, countLanes } from './lane.js';

/** @typedef {import('./types.js').OverlayComment} OverlayComment */

/** コメントが画面を横切る秒数。docs/decisions/ の初期値 */
export const DURATION_SECONDS = 8;

/** レーン 1 本の高さ(px)。CSS の --lane-height と合わせる */
export const LANE_HEIGHT = 48;

/**
 * コメントを画面へ流す。
 *
 * 供給源を知らない。ダミー配列でも WebSocket でも、push されたものを流すだけ。
 * T-008 で供給源が WebSocket に変わってもこのクラスは変えない。
 */
export class Danmaku {
  /**
   * @param {HTMLElement} stage コメントを入れる器
   * @param {object} [options]
   * @param {number} [options.viewportHeight] レーン数の算出に使う画面の高さ
   */
  constructor(stage, options = {}) {
    this.stage = stage;

    const viewportHeight = options.viewportHeight ?? window.innerHeight;
    this.allocator = new LaneAllocator(countLanes(viewportHeight, LANE_HEIGHT));
  }

  /**
   * コメントを 1 件流す。
   *
   * 同時表示上限に達している場合は捨てて false を返す。
   *
   * @param {OverlayComment} comment
   * @returns {boolean} 流したなら true、捨てたなら false
   */
  push(comment) {
    const lane = this.allocator.acquire();
    if (lane === null) {
      return false;
    }

    const el = this.createElement(comment, lane);
    this.stage.append(el);

    // 幅は DOM へ入れてからでないと測れない。画面右端の外から、
    // 要素の幅ぶんだけ左端の外へ抜けるまで動かす。
    el.style.setProperty('--travel', `${this.stage.clientWidth + el.offsetWidth}px`);

    el.addEventListener('animationend', () => {
      el.remove();
      this.allocator.release();
    });

    return true;
  }

  /**
   * コメント 1 件の DOM を作る。
   *
   * @param {OverlayComment} comment
   * @param {number} lane
   * @returns {HTMLElement}
   */
  createElement(comment, lane) {
    const el = document.createElement('div');
    el.className = 'comment';
    el.dataset.id = comment.id;

    // 本文はユーザー入力。textContent で入れる(innerHTML には渡さない)。
    // T-009 で /debug から任意の文字列が入るため、ここは最初からこの形にする。
    el.textContent = comment.text;

    el.style.top = `${lane * LANE_HEIGHT}px`;
    el.style.animationDuration = `${DURATION_SECONDS}s`;

    return el;
  }
}
