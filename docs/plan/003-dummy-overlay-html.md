# Plan 003: ダミーコメントが流れる静的 HTML

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-005
- depends: なし

## ゴール

Zoom も WebSocket も使わず、静的 HTML + CSS animation + Vanilla JS だけで
ニコニコ動画風に右から左へ流れるコメント表示を作る。

これが overlay の見た目の基準になり、Electron / OBS のどちらの表示方式でも共用する。

## 手順

1. `src/overlay/index.html` にハードコードしたコメント配列を用意する
2. CSS animation で右端から左端へ流す
3. 表示時間 8 秒固定、同時表示上限 20、レーンは round-robin
4. 背景を `transparent` にしてブラウザで開く

## 完了条件

- ブラウザで開くとコメントが右から左へ流れ、8 秒程度で消える
- コメントが重なって読めなくなっていない
- 背景が透過している(後段の画面共有合成の前提)
