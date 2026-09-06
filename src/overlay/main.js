import { Danmaku } from './danmaku.js';
import { SseCommentSource } from './source.js';

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('#stage が見つからない');
}

const danmaku = new Danmaku(stage);

// コメントはサーバーから SSE で届く。何を流すかはサーバー側が決める。
// いまは DebugCommentSource のダミーで、T-010 で Zoom のチャットに変わる。
// overlay 側は供給源が変わっても影響を受けない。
const source = new SseCommentSource();

source.start((comment) => {
  danmaku.push(comment);
});
