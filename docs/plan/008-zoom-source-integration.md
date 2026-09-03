# Plan 008: ZoomCommentSource を overlay に接続する

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-010
- depends: T-003, T-008

## ゴール

Plan 001 で特定した判定条件を使い、Everyone 宛チャットだけを `OverlayComment` に
正規化して overlay へ流す。

## 手順

1. Plan 001 で確認した chat callback を `CommentSource` 実装(`ZoomCommentSource`)にまとめる
2. Plan 001 で特定した条件で Everyone 宛のみを通す
3. Zoom の payload を `OverlayComment` へ正規化して WebSocket へ流す
4. Everyone 宛と DM の両方を投稿して挙動を見る

## 完了条件

- Zoom チャットへ Everyone 宛で投稿すると overlay に流れる
- DM は overlay に流れない
