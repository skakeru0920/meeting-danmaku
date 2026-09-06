import { describe, it, expect, vi } from 'vitest';
import { Broadcaster } from './broadcast.js';

/** @returns {import('../overlay/types.js').OverlayComment} */
function makeComment(text = 'こんにちは') {
  return { id: 'c1', sender: 'テスト太郎', text, timestamp: 1_757_000_000_000 };
}

describe('Broadcaster', () => {
  it('登録したクライアント全員へ配る', () => {
    const b = new Broadcaster();
    const a = vi.fn();
    const c = vi.fn();
    b.add(a);
    b.add(c);

    const comment = makeComment();
    b.broadcast(comment);

    expect(a).toHaveBeenCalledWith(comment);
    expect(c).toHaveBeenCalledWith(comment);
  });

  it('誰も繋がっていなくても落ちない', () => {
    const b = new Broadcaster();

    expect(() => b.broadcast(makeComment())).not.toThrow();
  });

  it('size で接続数が分かる', () => {
    const b = new Broadcaster();
    expect(b.size).toBe(0);

    const remove = b.add(vi.fn());
    expect(b.size).toBe(1);

    remove();
    expect(b.size).toBe(0);
  });

  describe('切断', () => {
    it('解除したクライアントには配らない', () => {
      const b = new Broadcaster();
      const stays = vi.fn();
      const leaves = vi.fn();
      b.add(stays);
      const remove = b.add(leaves);

      remove();
      b.broadcast(makeComment());

      expect(stays).toHaveBeenCalledTimes(1);
      expect(leaves).not.toHaveBeenCalled();
    });

    it('二重に解除しても落ちない', () => {
      const b = new Broadcaster();
      const remove = b.add(vi.fn());

      remove();
      expect(() => remove()).not.toThrow();
      expect(b.size).toBe(0);
    });
  });

  describe('送信に失敗したとき', () => {
    it('他のクライアントへは配り続ける', () => {
      const b = new Broadcaster();
      const broken = vi.fn(() => {
        throw new Error('接続が切れている');
      });
      const healthy = vi.fn();
      b.add(broken);
      b.add(healthy);

      // 失敗が伝播して全体が止まらないこと
      expect(() => b.broadcast(makeComment())).not.toThrow();
      expect(healthy).toHaveBeenCalledTimes(1);
    });

    it('失敗したクライアントは取り除く', () => {
      const b = new Broadcaster();
      const broken = vi.fn(() => {
        throw new Error('接続が切れている');
      });
      b.add(broken);

      b.broadcast(makeComment());
      expect(b.size).toBe(0);

      // 2 回目はもう呼ばれない
      b.broadcast(makeComment());
      expect(broken).toHaveBeenCalledTimes(1);
    });
  });
});
