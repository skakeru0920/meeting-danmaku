import { Danmaku } from './danmaku.js';
import { DebugCommentSource } from './source.js';

const stage = document.getElementById('stage');
if (!stage) {
  throw new Error('#stage が見つからない');
}

const danmaku = new Danmaku(stage);

// 供給源は差し替えられる。T-008 で WebSocket 受信のものに変わるが、
// Danmaku 側は供給源を知らないので変えずに済む。
const source = new DebugCommentSource();

source.start((comment) => {
  danmaku.push(comment);
});
