import { Danmaku } from './danmaku.js';

/** @typedef {import('./types.js').OverlayComment} OverlayComment */

/**
 * ダミーのコメント。
 *
 * T-005 の間だけの仮置き。T-007 で DebugCommentSource、
 * T-008 で WebSocket 受信に差し替わる。
 */
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

/** ダミーを流す間隔(ms) */
const INTERVAL_MS = 700;

/**
 * ダミーの OverlayComment を 1 件作る。
 *
 * @param {number} index 何件目か。本文の選択と id に使う
 * @returns {OverlayComment}
 */
function createDummyComment(index) {
  return {
    id: `dummy-${index}`,
    sender: `user${index % 5}`,
    text: DUMMY_TEXTS[index % DUMMY_TEXTS.length],
    timestamp: Date.now(),
  };
}

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('#stage が見つからない');
}

const danmaku = new Danmaku(stage);

let index = 0;
setInterval(() => {
  danmaku.push(createDummyComment(index));
  index += 1;
}, INTERVAL_MS);
