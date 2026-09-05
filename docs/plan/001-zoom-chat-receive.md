# Plan 001: Zoom チャットを受信する

- 日付: 2026-09-03
- 状態: 進行中
- 種別: 検証
- TODO: T-001, T-002, T-003

## この Plan の狙い

Zoom Meeting SDK で Everyone 宛チャットを受信できるか、そして DM と判別できるかが分かる。

MVP の最優先項目。ここが成立しないとプロジェクト全体が成り立たない。
SDK 選定を間違えると大きく手戻りするため、結論は `docs/decisions/` に残す。

## 前提

なし。Plan 002 とは独立しており、並列で着手できる。

## やること

### T-001: Meeting SDK を選定する

公式ドキュメントを一次情報として確認し、必須条件を満たす可能性がある SDK のうち
Mac で最も小さく試せるものを選ぶ。確認項目は下の「検証方法」に列挙する。

**完了条件**: `docs/decisions/README.md` の「Zoom チャット受信」節に採用 SDK と
検証済みバージョン・必要な認証構成が書かれている。却下した候補とその理由は
この Plan の「分かったこと・後続への影響」に残す。

### T-002: Zoom チャットを console.log する

1. 選定した SDK の公式 sample を起動し、自分のミーティングへ join する
2. chat callback に `console.log({ sender, message, receiver/type })` を追加する
3. 別 participant から "Hello" を Everyone 宛に投稿する

**完了条件**: 別 participant の "Hello" が数秒以内に console へ `sender` と `message`
付きで表示される。

### T-003: Everyone 宛と DM を判別する

同じ participant から DM を送り、callback の payload で Everyone 宛と区別できる
フィールド(message type / receiver)を特定する。

**完了条件**: Everyone 宛のみを通す条件式が 1 行で書ける状態になり、
下の「結果」に実際の payload が記録されている。

## やらないこと

Express / WebSocket ライブラリの選定、overlay の構成、画面共有への重ね方。
いずれも後続の Plan で必要になってから決める。

## Spike

### 仮説

Zoom Meeting SDK クライアントを自分のミーティングへ参加させると、
Everyone 宛チャットをイベントとして受信でき、sender と message を取り出せる。

### 検証方法

公式ドキュメント(Meeting SDK Overview / Authorization / In-meeting chat)で
以下を確認してから着手する。古いブログや Stack Overflow だけで判断しない。

- Web / Electron / macOS Meeting SDK のどれで chat receive event が取れるか
- SDK client は participant として参加する必要があるか。participant list に表示されるか
- video / audio を off にして chat listener 専用で参加できるか
- 自分がホストの自分のアカウント内ミーティングに必要な token(ZAK / OBF 等)と App 設定
- free アカウントで検証できるか。local development のみで使えるか
- chat callback で Everyone / DM を判別できるか

第一候補として Web Meeting SDK を試す。別の SDK は、Web で必須条件を
満たせないと分かった場合にのみ試す。

なお Zoom Team Chat と Meeting 内チャットを混同しないこと。Chatbot API は対象外。

### 結果

**T-001(SDK 選定)のみ完了。T-002 / T-003 は未実施。**

Web Meeting SDK(`@zoom/meetingsdk` v6.2.0)の Component View を採用した。
`client.on('chat-on-message', callback)` で受信でき、payload は型定義上
`sender.name` / `message` / `receiver` / `timestamp` を持つ。

**ただしこれはドキュメントと型定義を読んだ結果であり、実際に動かしていない。**
仮説そのもの(Everyone 宛チャットを受信できる)は T-002 で検証する。

選定の根拠・却下した候補・一次ソースは
[docs/research/meeting-sdk-selection.md](../research/meeting-sdk-selection.md)。

### 分かったこと・後続への影響

- **SDK クライアント自身が会議に participant として join する必要がある。**
  既存の Zoom アプリを外から監視する API ではなかった。初期メモが立てていた
  仮説どおり。会議の参加者リストに 1 人増えるため、この UX の可否は T-002 で
  実物を見てから判断する
- **自分のアカウント内のミーティングなら JWT のみで join できる**見込み。
  ZAK / OBF は不要。T-002 の準備は Marketplace で OAuth アプリを作り
  Client ID / Secret を取得するところから始める
- **Everyone / DM の判別条件はまだ書けない。** `receiver` で判別できる見込みだが、
  Everyone 宛のときの値が型定義に書かれていない。T-003 で実 payload を見るまで
  「DM を流さない」制約を満たせたと見なさない
- **free アカウントで足りるかが未確認のまま残っている。** 公式に有料前提とも
  読める記述がある一方、無料枠の可否を明示した箇所を見つけられなかった。
  T-002 の着手時に実際に App を作って確かめる。ただし**ブロッカーではない**。
  無料で駄目なら業務用の Pro アカウントで検証できる(2026-09-05 に確認)
- Electron Meeting SDK は Zoom 自身が非推奨としているため却下した。
  これは overlay を Electron で表示する話(Plan 002)とは独立した判断
