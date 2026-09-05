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

**採用**: Web Meeting SDK(`@zoom/meetingsdk`)の **Component View**。

- バージョン: v6.2.0(2026-09-05 時点の最新。**動作は未検証**)
- チャット受信: `client.on('chat-on-message', callback)`
- payload 型: `ChatMessage | ChatRecord`。`sender.name` / `message` /
  `receiver` / `timestamp` を持つ

**認証構成**: Marketplace の **OAuth アプリ**を作り、その Client ID / Client Secret で
SDK JWT(signature)を生成する。自分のアカウント内のミーティングへ participant として
join する場合は **JWT のみでよく、ZAK / OBF は不要**(公式ドキュメントの記載)。

**Everyone 宛と DM の判別条件**: **未確定。** payload の `receiver` で判別できる
見込みだが、Everyone 宛のときに `receiver` が何を持つかは型定義に書かれていない。
T-003 で実際の payload を観測してから確定する。それまでは
「DM を overlay に流さない」制約を満たせたと見なさない。

**SDK クライアントは会議に participant として参加する**(外から監視する API ではない)。
参加者リストに 1 人増える。

**検証環境**: まず無料アカウントで試す。Meeting SDK が無料枠で使えるかは未確認のため、
駄目だった場合は開発者が業務で使っている **Pro プランのアカウント**で検証する。
どちらで動いたかは T-002 の結果として記録する。

**ボット利用の制約**: Meeting SDK は install 時に「ボットや AI ノートテイカーは
サポートしない」と警告するが、**禁止ではない**(審査要件に「ボットとして参加するなら
申告せよ」とある)。**自分のアカウント内の会議に限れば審査も不要。**
他人のアカウントの会議へ広げる場合は審査が必要になり、前提が変わる。

**代替案**: RTMS(Realtime Media Streams)はチャットを扱え、**会議に参加者を
増やさずに済む**。ただしアカウントクレジット(有料)が必要なため MVP では採らない。
参加者が 1 人増える UX が許容できないと分かった場合は再評価する。

選定の根拠と却下した候補は [docs/research/meeting-sdk-selection.md](../research/meeting-sdk-selection.md)。

## 表示方式

**未決定。** Plan 002 の結果で決まる。

- Electron 透過ウィンドウがデスクトップ全体共有に映る → Electron 単体。OBS は不要
- 映らない → 発表者向けに Electron、視聴者向けに OBS Browser Source を併用

## overlay の実装

静的 HTML + CSS animation + Vanilla JS。React は使わない。

Electron / OBS のどちらの表示方式でも同じ overlay を共用するため、
**表示先に依存する処理を overlay 側に持ち込まない**。

Zoom 接続なしでコメントを投げられる dev-only の `/debug` 画面を用意する。

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
