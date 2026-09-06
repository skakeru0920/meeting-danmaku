# TODO Archive

完了したタスクの記録。**新しいものほど上**。

[TODO.md](./TODO.md) の Ready / Blocked いずれかのテーブルから該当行を切り取り、
`<!-- ARCHIVE_TOP -->` の直下へ貼り付ける。貼り付けたら完了日と、必要なら備考を足す。
タスク名は書き換えない(何をやったかを残すため)。

中止したタスクも同じ場所へ移し、備考に理由を 1 行書く。ID は再利用しない。

| ID | タスク | Plan | 完了日 | 備考 |
|---|---|---|---|---|
<!-- ARCHIVE_TOP -->
| T-007 | `CommentSource` IF と `DebugCommentSource` | 003 | 2026-09-06 | JS にIF構文が無いので @typedef で形だけ定義。継承はさせない |
| T-005 | ダミーコメントが流れる静的 HTML | 003 | 2026-09-06 | 背景の透過だけは未確認。ブラウザでは判定できないので T-004 で確認する |
| T-006 | `OverlayComment` 型を定義する | 003 | 2026-09-06 | .ts へ移行せず JSDoc + tsc --noEmit。検査対象は src/overlay/ のみ |
| T-003 | Everyone 宛と DM を判別する | 001 | 2026-09-05 | 判別条件は receiver.userId === 0。実 payload を Plan 001 に記録 |
| T-002 | Zoom チャットを console.log する | 001 | 2026-09-05 | 無料アカウントで受信を確認。React 18.2.0 固定が必要だった |
| T-001 | Meeting SDK を選定する | 001 | 2026-09-05 | Web Meeting SDK の Component View を採用。根拠は docs/research/meeting-sdk-selection.md |
