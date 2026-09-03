# Plan 003: Zoom 抜きでコメントが流れる状態を作る

- 日付: 2026-09-04
- 状態: 未着手
- 種別: 実装
- TODO: T-005, T-006, T-007, T-008, T-009

## この Plan の狙い

Zoom に一切依存せず、ダミーのコメントが overlay 上を流れる状態にする。
開発者が `/debug` から任意の文字列を投げて、見た目と流れ方をその場で調整できる。

Plan 001 / 002 の検証結果を待たずに進められる部分をここへ寄せている。
Zoom 接続前に見た目を固めておくことで、Plan 004 での作業を接続だけに絞れる。

## 前提

なし。Plan 001 / 002 と並列で進められる。

`docs/decisions/README.md` の「overlay の実装」と「コメントの内部形式」に従う。

## やること

### T-005: ダミーコメントが流れる静的 HTML

1. `src/overlay/index.html` にハードコードしたコメント配列を用意する
2. CSS animation で右端から左端へ流す
3. 表示時間 8 秒固定、同時表示上限 20、レーンは round-robin
4. 背景を `transparent` にする

**完了条件**: ブラウザで開くとコメントが右から左へ流れ、8 秒程度で消える。
コメントが重なって読めなくならない。背景が透過している。

### T-006: `OverlayComment` 型を定義する

`docs/decisions/README.md` の「コメントの内部形式」をそのままコードに落とす。
それ以上の抽象化はしない。

**完了条件**: 型定義が存在し、`tsc` が通る。

### T-007: `CommentSource` インターフェースと `DebugCommentSource`

1. `CommentSource`(`start()` / `stop()`)を定義する
2. 一定間隔でダミーの `OverlayComment` を吐く `DebugCommentSource` を実装する

**完了条件**: `DebugCommentSource` を start すると callback へ `OverlayComment` が
届くことを console で確認できる。stop すると止まる。

### T-008: WebSocket で Node.js → overlay へ配信

1. Express + ws のサーバーを `src/server/` に立てる
2. `DebugCommentSource` の出力を接続中のクライアントへ broadcast する
3. T-005 の overlay のコメント供給部を WebSocket 受信に差し替える

**完了条件**: `npm start` → ブラウザで overlay を開くと `DebugCommentSource` の
コメントが流れる。再読み込みしても再接続して流れ続ける。

### T-009: dev-only の `/debug` 投稿画面

入力欄と送信ボタンだけの画面。本文は `textContent` で挿入する
(`innerHTML` にユーザー入力を渡さない)。

**完了条件**: `/debug` で入力した文字列が overlay に流れる。
`<script>alert(1)</script>` を投稿してもスクリプトとして実行されず、文字列として流れる。

## やらないこと

Zoom チャットの受信と接続(Plan 004)。Electron / OBS への組み込み(Plan 002 と Plan 004)。
チャット履歴の永続化(方針として行わない)。
