import { describe, it, expect, vi } from 'vitest';
import {
  isToEveryone,
  toOverlayComment,
  ZoomCommentSource,
  UNKNOWN_SENDER,
} from './comment-source.js';

const NOW = 1_757_000_000_000;

/**
 * T-003 で実際に観測した payload の形。
 * docs/plan/001 に記録したものと同じ構造にしてある。
 */
function everyonePayload(overrides = {}) {
  return {
    id: '1-BFD0A51D-0001',
    message: 'hello',
    sender: { name: 'Kakeru', userId: 16778240 },
    receiver: { name: 'Everyone', userId: 0 },
    file: { name: '', type: '' },
    timestamp: NOW,
    ...overrides,
  };
}

function dmPayload(overrides = {}) {
  return everyonePayload({
    receiver: { name: 'Comment Overlay', userId: 16781312 },
    ...overrides,
  });
}

describe('isToEveryone', () => {
  it('receiver.userId が 0 なら true', () => {
    expect(isToEveryone(everyonePayload())).toBe(true);
  });

  it('receiver.userId が 0 以外なら false', () => {
    expect(isToEveryone(dmPayload())).toBe(false);
  });

  it('receiver.name では判定しない', () => {
    // 表示言語で name が変わっても userId で判定する。
    // name が Everyone でも userId が実 ID なら DM 扱い。
    const spoofed = everyonePayload({
      receiver: { name: 'Everyone', userId: 16781312 },
    });

    expect(isToEveryone(spoofed)).toBe(false);
  });

  describe('形が想定と違うとき', () => {
    // 判定できないものを通すと DM が漏れるので false へ倒す
    it('receiver が無ければ false', () => {
      expect(isToEveryone({ message: 'hello' })).toBe(false);
    });

    it('receiver が null なら false', () => {
      expect(isToEveryone({ receiver: null })).toBe(false);
    });

    it('userId が文字列の 0 なら false', () => {
      expect(isToEveryone({ receiver: { userId: '0' } })).toBe(false);
    });

    it('payload がオブジェクトでなければ false', () => {
      expect(isToEveryone(null)).toBe(false);
      expect(isToEveryone(undefined)).toBe(false);
      expect(isToEveryone('hello')).toBe(false);
    });
  });
});

describe('toOverlayComment', () => {
  it('Everyone 宛を OverlayComment にする', () => {
    expect(toOverlayComment(everyonePayload())).toEqual({
      id: '1-BFD0A51D-0001',
      sender: 'Kakeru',
      text: 'hello',
      timestamp: NOW,
    });
  });

  it('DM は null', () => {
    // overlay に DM を流さない制約はここで担保する
    expect(toOverlayComment(dmPayload())).toBeNull();
  });

  it('本文が空なら null', () => {
    expect(toOverlayComment(everyonePayload({ message: '' }))).toBeNull();
    expect(toOverlayComment(everyonePayload({ message: '   ' }))).toBeNull();
  });

  it('本文が文字列でなければ null', () => {
    expect(toOverlayComment(everyonePayload({ message: undefined }))).toBeNull();
    expect(toOverlayComment(everyonePayload({ message: 123 }))).toBeNull();
  });

  it('HTML に見える本文もそのまま通す', () => {
    // エスケープは overlay の textContent に任せる
    const text = '<script>alert(1)</script>';

    expect(toOverlayComment(everyonePayload({ message: text }))?.text).toBe(text);
  });

  describe('欠けている値の補完', () => {
    it('sender.name が無ければ既定値', () => {
      expect(toOverlayComment(everyonePayload({ sender: undefined }))?.sender).toBe(
        UNKNOWN_SENDER,
      );
      expect(
        toOverlayComment(everyonePayload({ sender: { userId: 1 } }))?.sender,
      ).toBe(UNKNOWN_SENDER);
    });

    it('id が無ければ生成する', () => {
      const comment = toOverlayComment(everyonePayload({ id: undefined }), { now: NOW });

      expect(comment?.id).toBe(`zoom-${NOW}`);
    });

    it('timestamp が無ければ now を使う', () => {
      const comment = toOverlayComment(everyonePayload({ timestamp: undefined }), {
        now: NOW,
      });

      expect(comment?.timestamp).toBe(NOW);
    });
  });
});

describe('ZoomCommentSource', () => {
  /** on / off を記録するだけのモック */
  function makeClient() {
    return { on: vi.fn(), off: vi.fn() };
  }

  /** start 済みの source に payload を届ける */
  function emit(client, payload) {
    const [, handler] = client.on.mock.calls[0];
    handler(payload);
  }

  it('chat-on-message を購読する', () => {
    const client = makeClient();
    new ZoomCommentSource(client).start(vi.fn());

    expect(client.on).toHaveBeenCalledWith('chat-on-message', expect.any(Function));
  });

  it('Everyone 宛を listener へ渡す', () => {
    const client = makeClient();
    const listener = vi.fn();
    new ZoomCommentSource(client).start(listener);

    emit(client, everyonePayload());

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ sender: 'Kakeru', text: 'hello' }),
    );
  });

  it('DM は listener へ渡さない', () => {
    const client = makeClient();
    const listener = vi.fn();
    new ZoomCommentSource(client).start(listener);

    emit(client, dmPayload());

    expect(listener).not.toHaveBeenCalled();
  });

  it('壊れた payload で落ちない', () => {
    const client = makeClient();
    const listener = vi.fn();
    new ZoomCommentSource(client).start(listener);

    expect(() => emit(client, null)).not.toThrow();
    expect(() => emit(client, { receiver: {} })).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  describe('start / stop', () => {
    it('二重に start しても購読は 1 つ', () => {
      // 二重登録すると同じコメントが 2 回流れる
      const client = makeClient();
      const source = new ZoomCommentSource(client);

      source.start(vi.fn());
      source.start(vi.fn());

      expect(client.on).toHaveBeenCalledTimes(1);
    });

    it('stop で購読を解除する', () => {
      const client = makeClient();
      const source = new ZoomCommentSource(client);

      source.start(vi.fn());
      const [, handler] = client.on.mock.calls[0];
      source.stop();

      expect(client.off).toHaveBeenCalledWith('chat-on-message', handler);
    });

    it('start していないのに stop しても落ちない', () => {
      const client = makeClient();

      expect(() => new ZoomCommentSource(client).stop()).not.toThrow();
      expect(client.off).not.toHaveBeenCalled();
    });

    it('stop の後にもう一度 start できる', () => {
      const client = makeClient();
      const source = new ZoomCommentSource(client);

      source.start(vi.fn());
      source.stop();
      source.start(vi.fn());

      expect(client.on).toHaveBeenCalledTimes(2);
    });
  });
});
