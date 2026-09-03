# Plan 004: OverlayComment 型を定義する

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-006
- depends: なし

## ゴール

Zoom 固有形式を overlay に直接流さないための内部形式を定義する。

```ts
type OverlayComment = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};
```

## 手順

1. `src/` 配下に上記の型を置く
2. `tsc` を通す

これ以上の抽象化はしない。フィールドの追加は、実際に必要になった時点で判断する。

## 完了条件

- 型定義が存在し、`tsc` が通る
