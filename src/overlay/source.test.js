import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebugCommentSource, DEFAULT_INTERVAL_MS } from './source.js';

// 実時間を待たずに間隔を進める
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DebugCommentSource', () => {
  describe('start', () => {
    it('間隔ごとに listener へコメントが届く', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      expect(listener).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('既定の間隔は 700ms', () => {
      const source = new DebugCommentSource();
      const listener = vi.fn();

      source.start(listener);

      vi.advanceTimersByTime(DEFAULT_INTERVAL_MS - 1);
      expect(listener).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('二重に start しても timer は 1 本だけ', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      source.start(listener);

      vi.advanceTimersByTime(100);
      // 二本走っていれば 2 回呼ばれる
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('stop すると届かなくなる', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);

      source.stop();
      vi.advanceTimersByTime(500);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('start していない状態で stop しても落ちない', () => {
      const source = new DebugCommentSource();

      expect(() => source.stop()).not.toThrow();
    });

    it('stop したあと start し直せる', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      source.stop();
      source.start(listener);

      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('吐かれるコメント', () => {
    it('OverlayComment の 4 フィールドを持つ', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      vi.advanceTimersByTime(100);

      const comment = listener.mock.calls[0][0];
      expect(comment).toEqual({
        id: expect.any(String),
        sender: expect.any(String),
        text: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('id が重複しない', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      vi.advanceTimersByTime(1000);

      const ids = listener.mock.calls.map(([comment]) => comment.id);
      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('本文は渡した配列を順に使い回す', () => {
      const source = new DebugCommentSource({
        intervalMs: 100,
        texts: ['あ', 'い'],
      });
      const listener = vi.fn();

      source.start(listener);
      vi.advanceTimersByTime(300);

      const texts = listener.mock.calls.map(([comment]) => comment.text);
      expect(texts).toEqual(['あ', 'い', 'あ']);
    });

    it('stop して start し直しても id は続きから振られる', () => {
      const source = new DebugCommentSource({ intervalMs: 100 });
      const listener = vi.fn();

      source.start(listener);
      vi.advanceTimersByTime(100);
      source.stop();
      source.start(listener);
      vi.advanceTimersByTime(100);

      const ids = listener.mock.calls.map(([comment]) => comment.id);
      expect(new Set(ids).size).toBe(2);
    });
  });
});
