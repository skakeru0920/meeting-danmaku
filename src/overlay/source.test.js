import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DebugCommentSource,
  DEFAULT_INTERVAL_MS,
  SseCommentSource,
  isOverlayComment,
} from './source.js';

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

/** EventSource の最小の偽物。onmessage を手で叩けるようにする */
class FakeEventSource {
  /** @param {string} url */
  constructor(url) {
    this.url = url;
    this.closed = false;
    /** @type {((event: {data: string}) => void) | null} */
    this.onmessage = null;
    /** @type {(() => void) | null} */
    this.onerror = null;
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  /**
   * サーバーから 1 件届いたことにする
   * @param {string} data
   */
  emit(data) {
    this.onmessage?.({ data });
  }
}
/** @type {FakeEventSource[]} */
FakeEventSource.instances = [];
// EventSource として渡すために型が要求する定数。値は使わない
FakeEventSource.CONNECTING = /** @type {0} */ (0);
FakeEventSource.OPEN = /** @type {1} */ (1);
FakeEventSource.CLOSED = /** @type {2} */ (2);

describe('isOverlayComment', () => {
  const valid = { id: 'c1', sender: '太郎', text: 'やあ', timestamp: 1 };

  it('4 フィールドが揃っていれば true', () => {
    expect(isOverlayComment(valid)).toBe(true);
  });

  it.each(['id', 'sender', 'text', 'timestamp'])('%s が無ければ false', (key) => {
    /** @type {Record<string, unknown>} */
    const broken = { ...valid };
    delete broken[key];
    expect(isOverlayComment(broken)).toBe(false);
  });

  it('型が違えば false', () => {
    expect(isOverlayComment({ ...valid, timestamp: '1' })).toBe(false);
    expect(isOverlayComment({ ...valid, text: 123 })).toBe(false);
  });

  it('オブジェクトでなければ false', () => {
    expect(isOverlayComment(null)).toBe(false);
    expect(isOverlayComment('文字列')).toBe(false);
    expect(isOverlayComment(undefined)).toBe(false);
  });
});

describe('SseCommentSource', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
  });

  /** @returns {{source: SseCommentSource, listener: any, es: FakeEventSource}} */
  function startSource() {
    const source = new SseCommentSource({
      EventSourceClass: /** @type {any} */ (FakeEventSource),
    });
    const listener = vi.fn();
    source.start(listener);
    return { source, listener, es: FakeEventSource.instances[0] };
  }

  it('既定の接続先は /events', () => {
    const { es } = startSource();
    expect(es.url).toBe('/events');
  });

  it('受信したコメントが listener へ渡る', () => {
    const { listener, es } = startSource();
    const comment = { id: 'c1', sender: '太郎', text: 'やあ', timestamp: 1 };

    es.emit(JSON.stringify(comment));

    expect(listener).toHaveBeenCalledWith(comment);
  });

  it('二重に start しても接続は 1 本だけ', () => {
    const source = new SseCommentSource({
      EventSourceClass: /** @type {any} */ (FakeEventSource),
    });
    source.start(vi.fn());
    source.start(vi.fn());

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  describe('壊れたデータは捨てる', () => {
    it('JSON として読めないものを捨てる', () => {
      const { listener, es } = startSource();

      es.emit('これは JSON ではない');

      expect(listener).not.toHaveBeenCalled();
    });

    it('OverlayComment の形をしていないものを捨てる', () => {
      const { listener, es } = startSource();

      es.emit(JSON.stringify({ text: '本文だけある' }));

      expect(listener).not.toHaveBeenCalled();
    });

    it('壊れた 1 件のあとも受信を続ける', () => {
      const { listener, es } = startSource();
      const comment = { id: 'c1', sender: '太郎', text: 'やあ', timestamp: 1 };

      es.emit('壊れている');
      es.emit(JSON.stringify(comment));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(comment);
    });
  });

  describe('stop', () => {
    it('接続を閉じる', () => {
      const { source, es } = startSource();

      source.stop();

      expect(es.closed).toBe(true);
    });

    it('start していない状態で stop しても落ちない', () => {
      const source = new SseCommentSource({
      EventSourceClass: /** @type {any} */ (FakeEventSource),
    });

      expect(() => source.stop()).not.toThrow();
    });

    it('stop したあと start し直せる', () => {
      const { source } = startSource();

      source.stop();
      source.start(vi.fn());

      expect(FakeEventSource.instances).toHaveLength(2);
      expect(FakeEventSource.instances[1].closed).toBe(false);
    });
  });

  it('接続が切れても自分では閉じない(EventSource の再接続に任せる)', () => {
    const { source, es } = startSource();

    es.onerror?.();

    expect(es.closed).toBe(false);
    expect(source.eventSource).toBe(es);
  });
});
