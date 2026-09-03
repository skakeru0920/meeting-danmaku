# TODO

タスク一覧。完了したものは [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) の先頭へ移動する。
運用ルールは [AGENTS.md](./AGENTS.md) の「TODO 運用」を参照。

詳細(ゴール・手順・完了条件)は `docs/plan/` に書く。ここには書かない。

## Ready — 着手できる

依存なし。互いに独立しているので並列に進めてよい。

| ID | タスク | Plan |
|---|---|---|
| T-001 | Meeting SDK を選定して ADR に残す | plan/001 |
| T-004 | Electron 透過オーバーレイが画面共有に映るか検証する | plan/002 |
| T-005 | ダミーコメントが流れる静的 HTML | plan/003 |
| T-006 | `OverlayComment` 型を定義する | plan/004 |

## Blocked — 依存待ち

`depends` のタスクがすべて archive へ移ったら Ready へ移す。

| ID | タスク | depends | Plan |
|---|---|---|---|
| T-002 | Zoom チャットを console.log する | T-001 | plan/001 |
| T-003 | Everyone 宛と DM を判別する | T-002 | plan/001 |
| T-007 | `CommentSource` IF と `DebugCommentSource` | T-006 | plan/005 |
| T-008 | WebSocket で Node.js → overlay へ配信 | T-005, T-007 | plan/006 |
| T-009 | dev-only の `/debug` 投稿画面 | T-008 | plan/007 |
| T-010 | `ZoomCommentSource` を overlay に接続する | T-003, T-008 | plan/008 |
| T-011 | 実際の画面共有で表示を確認する | T-004, T-010 | plan/009 |

## Icebox — 検討中

やるかどうか未確定。着手する前にタスク化し、Ready か Blocked へ移す。

| ID | タスク | メモ |
|---|---|---|
| — | OBS Browser Source 経由の表示 | T-004 が失敗した場合のみ必要。成功すれば不要 |
| — | multi monitor 対応 | research.md が未検討として残している。T-004 の範囲外 |
| — | Keynote フルスクリーン対応 | T-004 の任意条件。満たせなければ将来機能として切る |
