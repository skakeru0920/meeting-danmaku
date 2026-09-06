import { describe, it, expect, beforeEach } from 'vitest';
import { Danmaku, LANE_HEIGHT, DURATION_SECONDS, TOP_OFFSET_LANES } from './danmaku.js';

/** @typedef {import('./types.js').OverlayComment} OverlayComment */

/**
 * @param {Partial<OverlayComment>} [overrides]
 * @returns {OverlayComment}
 */
function makeComment(overrides = {}) {
  return {
    id: 'c1',
    sender: 'テスト太郎',
    text: 'こんにちは',
    timestamp: 1_757_000_000_000,
    ...overrides,
  };
}

/** @type {HTMLElement} */
let stage;

beforeEach(() => {
  document.body.innerHTML = '<div id="stage"></div>';
  const el = document.getElementById('stage');
  if (!el) throw new Error('stage が見つからない');
  stage = el;
});

describe('Danmaku', () => {
  it('push するとコメントが stage へ入る', () => {
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });

    expect(danmaku.push(makeComment())).toBe(true);

    const comments = stage.querySelectorAll('.comment');
    expect(comments).toHaveLength(1);
    expect(comments[0].textContent).toBe('こんにちは');
  });

  it('レーンごとに縦位置がずれる', () => {
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });

    danmaku.push(makeComment({ id: 'c1' }));
    danmaku.push(makeComment({ id: 'c2' }));

    // 画面上端は TOP_OFFSET_LANES ぶん空ける。1 本目はその次から
    const comments = stage.querySelectorAll('.comment');
    expect(/** @type {HTMLElement} */ (comments[0]).style.top).toBe(
      `${TOP_OFFSET_LANES * LANE_HEIGHT}px`,
    );
    expect(/** @type {HTMLElement} */ (comments[1]).style.top).toBe(
      `${(TOP_OFFSET_LANES + 1) * LANE_HEIGHT}px`,
    );
  });

  it('最上段は空ける', () => {
    // メニューバーや Zoom のツールバーと重なる位置なので使わない
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });

    danmaku.push(makeComment({ id: 'c1' }));

    const first = /** @type {HTMLElement} */ (stage.querySelector('.comment'));
    expect(first.style.top).not.toBe('0px');
  });

  it('最後のレーンが画面からはみ出さない', () => {
    const viewportHeight = 1000;
    const danmaku = new Danmaku(stage, { viewportHeight });

    // レーンを一巡させて、最も下に来るものを見る
    const laneCount = danmaku.allocator.laneCount;
    for (let i = 0; i < laneCount; i += 1) {
      danmaku.push(makeComment({ id: `c${i}` }));
    }

    const tops = [...stage.querySelectorAll('.comment')].map((el) =>
      Number.parseInt(/** @type {HTMLElement} */ (el).style.top, 10),
    );

    expect(Math.max(...tops) + LANE_HEIGHT).toBeLessThanOrEqual(viewportHeight);
  });

  it('表示時間は 8 秒', () => {
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });
    danmaku.push(makeComment());

    const comment = stage.querySelector('.comment');
    expect(/** @type {HTMLElement} */ (comment).style.animationDuration).toBe(
      `${DURATION_SECONDS}s`,
    );
  });

  it('同時表示上限を超えた分は捨てる', () => {
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });
    // 上限は LaneAllocator の既定値 20
    for (let i = 0; i < 20; i += 1) {
      expect(danmaku.push(makeComment({ id: `c${i}` }))).toBe(true);
    }

    expect(danmaku.push(makeComment({ id: 'overflow' }))).toBe(false);
    expect(stage.querySelectorAll('.comment')).toHaveLength(20);
  });

  it('アニメーションが終わると DOM から消え、次の 1 件が入る', () => {
    const danmaku = new Danmaku(stage, { viewportHeight: 1000 });
    for (let i = 0; i < 20; i += 1) {
      danmaku.push(makeComment({ id: `c${i}` }));
    }
    expect(danmaku.push(makeComment({ id: 'overflow' }))).toBe(false);

    // jsdom は animation を実際に走らせないのでイベントを直接起こす
    const first = stage.querySelector('.comment');
    first?.dispatchEvent(new Event('animationend'));

    expect(stage.querySelectorAll('.comment')).toHaveLength(19);
    expect(danmaku.push(makeComment({ id: 'next' }))).toBe(true);
  });

  describe('XSS 防止', () => {
    it('タグを含む本文がスクリプトとして解釈されず、文字列として入る', () => {
      const danmaku = new Danmaku(stage, { viewportHeight: 1000 });
      const payload = '<script>alert(1)</script>';

      danmaku.push(makeComment({ text: payload }));

      const comment = stage.querySelector('.comment');
      // 文字列そのものが本文になっている
      expect(comment?.textContent).toBe(payload);
      // script 要素として解釈されていない
      expect(stage.querySelector('script')).toBeNull();
      expect(comment?.children).toHaveLength(0);
    });

    it('img の onerror も要素にならない', () => {
      const danmaku = new Danmaku(stage, { viewportHeight: 1000 });

      danmaku.push(makeComment({ text: '<img src=x onerror=alert(1)>' }));

      expect(stage.querySelector('img')).toBeNull();
    });
  });
});
