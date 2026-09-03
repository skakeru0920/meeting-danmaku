# Plan 005: CommentSource インターフェースと DebugCommentSource

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-007
- depends: T-006

## ゴール

コメント供給源を `start()` / `stop()` だけを持つ `CommentSource` で抽象化し、
Zoom 接続なしで後続を開発できるようにする。

## 手順

1. `CommentSource` インターフェース(`start()` / `stop()`)を定義する
2. 一定間隔でダミーの `OverlayComment` を吐く `DebugCommentSource` を実装する
3. start して callback の呼び出しを console で確認する

抽象化しすぎない。まず動かす。

## 完了条件

- `DebugCommentSource` を start すると callback へ `OverlayComment` が届くことを console で確認できる
- stop すると止まる
