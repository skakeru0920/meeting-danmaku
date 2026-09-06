/**
 * overlay 内部で扱うコメントの形式。
 *
 * Zoom 固有の payload をそのまま流さず、供給源(Zoom / debug)が
 * この形へ正規化してから overlay へ渡す。
 *
 * @typedef {object} OverlayComment
 * @property {string} id 同一コメントを識別する。DOM 要素との対応付けに使う
 * @property {string} sender 送信者の表示名
 * @property {string} text 本文。textContent で挿入する(innerHTML に渡さない)
 * @property {number} timestamp 受信時刻(epoch ミリ秒)
 */

// 型だけを持つモジュールなので、値としては何も export しない。
// import されたときに空モジュールとして扱われるよう空 export を置く。
export {};
