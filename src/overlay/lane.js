/**
 * レーン割り当てと同時表示数の管理。
 *
 * DOM を知らない。どのレーンへ入れるか、そもそも入れてよいかだけを決める。
 * 実際の描画は main.js が担当する。分けているのは、この判断部分だけを
 * テストできるようにするため。
 *
 * 初期値は docs/decisions/ の「overlay の実装」に従う。
 * 同時表示上限 20、レーンは round-robin。
 */

/** @type {number} 同時に表示するコメントの上限 */
export const MAX_ACTIVE = 20;

export class LaneAllocator {
  /**
   * @param {number} laneCount レーン数。1 以上
   * @param {number} [maxActive] 同時表示上限
   */
  constructor(laneCount, maxActive = MAX_ACTIVE) {
    if (laneCount < 1) {
      throw new Error(`laneCount は 1 以上である必要がある: ${laneCount}`);
    }

    this.laneCount = laneCount;
    this.maxActive = maxActive;

    /** 次に使うレーン番号。acquire のたびに進む */
    this.nextLane = 0;

    /** いま表示中の件数 */
    this.activeCount = 0;
  }

  /**
   * レーンを 1 つ確保する。
   *
   * 上限に達している場合は null を返す。このとき呼び出し側はコメントを捨てる。
   * 表示中のものを消して場所を空ける方式は採らない。読んでいる途中のコメントが
   * 消えるほうが、新しいコメントが 1 つ出ないことより不自然なため。
   *
   * @returns {number | null} レーン番号。上限に達していれば null
   */
  acquire() {
    if (this.activeCount >= this.maxActive) {
      return null;
    }

    const lane = this.nextLane;
    this.nextLane = (this.nextLane + 1) % this.laneCount;
    this.activeCount += 1;

    return lane;
  }

  /**
   * 表示が終わったコメント 1 件ぶんを解放する。
   *
   * レーン番号は受け取らない。round-robin なので次に使うレーンは
   * 解放されたレーンとは無関係に決まる。ここで管理するのは件数だけ。
   */
  release() {
    if (this.activeCount > 0) {
      this.activeCount -= 1;
    }
  }
}

/**
 * 画面の高さに何本のレーンを引けるか求める。
 *
 * @param {number} viewportHeight 画面の高さ(px)
 * @param {number} laneHeight レーン 1 本の高さ(px)
 * @returns {number} レーン数。最低 1 本は返す
 */
export function countLanes(viewportHeight, laneHeight) {
  return Math.max(1, Math.floor(viewportHeight / laneHeight));
}
