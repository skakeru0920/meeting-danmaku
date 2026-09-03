# Plan 006: WebSocket で Node.js → overlay へ配信

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-008
- depends: T-005, T-007

## ゴール

Express + ws で `DebugCommentSource` の出力を overlay へ push し、
Plan 003 のハードコード配列を WebSocket 受信に差し替える。

## 手順

1. Express + ws のサーバーを `src/server/` に立てる
2. `DebugCommentSource` の出力を接続中のクライアントへ broadcast する
3. Plan 003 の overlay のコメント供給部を WebSocket 受信に差し替える
4. `npm start` してブラウザで overlay を開く

## 完了条件

- `npm start` → ブラウザで overlay を開くと DebugCommentSource のコメントが流れる
- ブラウザを再読み込みしても再接続してコメントが流れ続ける
