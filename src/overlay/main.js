import { Danmaku } from './danmaku.js';
import { SseCommentSource } from './source.js';

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('#stage が見つからない');
}

// 切り分け用の赤枠。Electron が --frame を付けて起動したときだけ出す。
// ブラウザで直接開くときは URL に ?frame=1 を足す。
if (new URLSearchParams(location.search).get('frame') === '1') {
  document.body.classList.add('show-frame');
}

const danmaku = new Danmaku(stage);

// コメントはサーバーから SSE で届く。何を流すかはサーバー側が決める。
// いまは DebugCommentSource のダミーで、T-010 で Zoom のチャットに変わる。
// overlay 側は供給源が変わっても影響を受けない。
const source = new SseCommentSource();

source.start((comment) => {
  danmaku.push(comment);
});
