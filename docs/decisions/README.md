# 決定事項

**現在有効な決定だけを書く。** 履歴は残さず上書きする。
「なぜそうしたか」「何が分かったか」は経緯として挙げた Plan を読む。

決定が増えてこのファイルが読みにくくなったら、トピック単位で
`docs/decisions/<topic>.md` へ切り出し、ここからリンクする。

| トピック | ファイル |
|---|---|
| (まだ切り出していない) | — |

---

## Zoom チャット受信

**未決定。** Plan 001 で Meeting SDK を選定する。

決まったら以下を書く: 採用 SDK と検証済みバージョン / 必要な認証構成
(ZAK・OBF 等)/ Everyone 宛と DM を判別する条件。

## 表示方式

**未決定。** Plan 002 の結果で決まる。

- Electron 透過ウィンドウがデスクトップ全体共有に映る → Electron 単体。OBS は不要
- 映らない → 発表者向けに Electron、視聴者向けに OBS Browser Source を併用

## overlay の実装

静的 HTML + CSS animation + Vanilla JS。React は使わない。
Electron / OBS のどちらの表示方式でも同じ overlay を共用する。

初期値: コメント表示時間 8 秒固定、同時表示上限 20、レーンは round-robin。

## コメントの内部形式

Zoom 固有形式を overlay へ直接流さず、以下へ正規化する。

```ts
type OverlayComment = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};
```

コメント供給源は `CommentSource` インターフェース(`start()` / `stop()`)で
差し替え可能にし、`ZoomCommentSource` と `DebugCommentSource` を用意する。
ただし抽象化しすぎない。まず動かす。

## MVP で扱わないもの

DB、認証、クラウドデプロイ、Docker、React/Next.js、デザインシステム、
multi tenancy、CI/CD の作り込み、自動 moderation、Teams / Google Meet 対応。

明示的に依頼されるまで提案・実装しない。
