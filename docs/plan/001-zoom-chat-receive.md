# Plan 001: Zoom チャットを受信する

- 日付: 2026-09-03
- 状態: 未着手
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

(未実施)

### 分かったこと・後続への影響

-
