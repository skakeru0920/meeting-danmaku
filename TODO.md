# TODO

タスク一覧。完了したものは [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) の先頭へ移動する。
運用ルールは [AGENTS.md](./AGENTS.md) の「TODO 運用」を参照。

- 手順と完了条件は [docs/plan/](./docs/plan/README.md) に書く。ここには書かない
- 現在の決定事項は [docs/decisions/](./docs/decisions/README.md)

## Ready — 着手できる

依存なし。互いに独立しているので並列に進めてよい。

| ID | タスク | Plan |
|---|---|---|
| T-004 | Electron 透過オーバーレイが画面共有に映るか検証する | 002 |
| T-008 | WebSocket で Node.js → overlay へ配信 | 003 |

## Blocked — 依存待ち

`depends` のタスクがすべて archive へ移ったら Ready へ移す。

T-012 は T-004 が**失敗した場合にのみ**着手する。成功すれば不要になるので、
そのときは archive へ「中止」として移す。

| ID | タスク | depends | Plan |
|---|---|---|---|
| T-009 | dev-only の `/debug` 投稿画面 | T-008 | 003 |
| T-010 | `ZoomCommentSource` を overlay に接続する | T-009 | 004 |
| T-011 | 実際の画面共有で通しで確認する | T-004, T-010 | 004 |
| T-012 | OBS Browser Source 経由の表示を用意する | T-004 | 004 |

## Icebox — 検討中

やるかどうか未確定。着手する前にタスク化し、Ready か Blocked へ移す。

| タスク | メモ |
|---|---|
| SDK クライアントのマイクを OFF にする | `client.stopAudio()` は成功するが参加者リスト上は ON のまま。待機室が原因ではないことは切り分け済み。次は `client.mute(true)` を試す。何も喋らなければ実害なしと判断し保留するが、発表者と同じ Mac で動かすとハウリングの恐れがあるので T-011 の前に決着させる |
| multi monitor 対応 / 表示先の切り替え | **MVP は主ディスプレイのみでよい**(2026-09-06 決定)。将来やるときのために T-004 で実測した内容を残す。`screen.getAllDisplays()` は 内蔵 1800x1169@2x(primary, internal:true)と外部 1920x1080@1x(x:1800)を返した。全画面に出すだけなら `getAllDisplays()` を回して BrowserWindow を複数作れば済む(10 行程度)。出す先を選ばせる方式(設定ファイル / CLI 引数 / UI)は使ってみないと決められないので未定 |
| Keynote フルスクリーン対応 | T-004 の任意条件。満たせなければ将来機能として切る |
