import { describe, it, expect } from 'vitest';
import {
  toOverlayComment,
  MAX_TEXT_LENGTH,
  MAX_SENDER_LENGTH,
  DEFAULT_SENDER,
} from './comment.js';

const NOW = 1_757_000_000_000;

describe('toOverlayComment', () => {
  it('text から OverlayComment を作る', () => {
    const comment = toOverlayComment({ text: 'こんにちは' }, { id: 'post-1', now: NOW });

    expect(comment).toEqual({
      id: 'post-1',
      sender: DEFAULT_SENDER,
      text: 'こんにちは',
      timestamp: NOW,
    });
  });

  it('sender を指定できる', () => {
    const comment = toOverlayComment(
      { text: 'こんにちは', sender: 'テスト太郎' },
      { id: 'post-1', now: NOW },
    );

    expect(comment?.sender).toBe('テスト太郎');
  });

  it('クライアントが指定した id は使わない', () => {
    const comment = toOverlayComment(
      { text: 'こんにちは', id: 'なりすまし' },
      { id: 'post-1', now: NOW },
    );

    expect(comment?.id).toBe('post-1');
  });

  it('クライアントが指定した timestamp は使わない', () => {
    const comment = toOverlayComment(
      { text: 'こんにちは', timestamp: 0 },
      { id: 'post-1', now: NOW },
    );

    expect(comment?.timestamp).toBe(NOW);
  });

  describe('受け付けないもの', () => {
    it('text が無ければ null', () => {
      expect(toOverlayComment({})).toBeNull();
    });

    it('text が文字列でなければ null', () => {
      expect(toOverlayComment({ text: 123 })).toBeNull();
      expect(toOverlayComment({ text: null })).toBeNull();
      expect(toOverlayComment({ text: ['a'] })).toBeNull();
    });

    it('text が空なら null', () => {
      expect(toOverlayComment({ text: '' })).toBeNull();
    });

    it('text が空白だけなら null', () => {
      expect(toOverlayComment({ text: '   ' })).toBeNull();
      expect(toOverlayComment({ text: '\n\t' })).toBeNull();
    });

    it('text が長すぎれば null', () => {
      const tooLong = 'あ'.repeat(MAX_TEXT_LENGTH + 1);

      expect(toOverlayComment({ text: tooLong })).toBeNull();
    });

    it('上限ちょうどは受け付ける', () => {
      const justFit = 'あ'.repeat(MAX_TEXT_LENGTH);

      expect(toOverlayComment({ text: justFit })).not.toBeNull();
    });

    it('ボディがオブジェクトでなければ null', () => {
      expect(toOverlayComment(null)).toBeNull();
      expect(toOverlayComment(undefined)).toBeNull();
      expect(toOverlayComment('こんにちは')).toBeNull();
    });
  });

  describe('sender の正規化', () => {
    it('空文字なら既定値', () => {
      expect(toOverlayComment({ text: 'a', sender: '' })?.sender).toBe(DEFAULT_SENDER);
    });

    it('空白だけなら既定値', () => {
      expect(toOverlayComment({ text: 'a', sender: '  ' })?.sender).toBe(DEFAULT_SENDER);
    });

    it('文字列でなければ既定値', () => {
      expect(toOverlayComment({ text: 'a', sender: 42 })?.sender).toBe(DEFAULT_SENDER);
    });

    it('長すぎれば切り詰める', () => {
      const long = 'x'.repeat(MAX_SENDER_LENGTH + 10);

      expect(toOverlayComment({ text: 'a', sender: long })?.sender).toHaveLength(
        MAX_SENDER_LENGTH,
      );
    });
  });

  describe('本文をエスケープしない', () => {
    // XSS の防御は overlay の textContent が担う。ここでエスケープすると
    // 画面に &lt;script&gt; がそのまま出る(二重エスケープ)。
    // 文字列として素通りすることを固定しておく。
    it('script タグをそのまま通す', () => {
      const text = '<script>alert(1)</script>';

      expect(toOverlayComment({ text }, { id: 'post-1', now: NOW })?.text).toBe(text);
    });

    it('img onerror をそのまま通す', () => {
      const text = '<img src=x onerror=alert(1)>';

      expect(toOverlayComment({ text }, { id: 'post-1', now: NOW })?.text).toBe(text);
    });

    it('前後の空白は残す', () => {
      expect(toOverlayComment({ text: '  ま ん 中  ' })?.text).toBe('  ま ん 中  ');
    });
  });
});
