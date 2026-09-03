# Plan 001: Zoom チャットを console.log する

- 日付: 2026-09-03
- 状態: 未着手
- TODO: T-001, T-002, T-003
- depends: なし

## ゴール

Zoom Meeting SDK クライアントを自分のミーティングへ参加させ、Everyone 宛チャットを
sender と message 付きで console に出す。あわせて DM と判別する方法を確定する。

MVP の最優先項目。ここが成立しないとプロジェクト全体が成り立たない。

## 手順

1. Meeting SDK を選定し、結論を `docs/adr/` に ADR として残す(T-001)
2. 選定した SDK の公式 sample を起動し、自分のミーティングへ join する(T-002)
3. chat callback に `console.log({ sender, message, receiver/type })` を追加する(T-002)
4. 別 participant から "Hello" を Everyone 宛に投稿する(T-002)
5. 同じ participant から DM を送り、判別できることを確認する(T-003)

## 完了条件

- `docs/adr/NNN-meeting-sdk-selection.md` に採用 SDK・バージョン・必要な認証構成・却下理由が書かれている
- 別 participant の "Hello" が数秒以内に console へ `sender` と `message` 付きで出る
- Everyone 宛のみを通す条件式が 1 行で書ける状態になっている

## この Plan で決めること

- 採用する Meeting SDK と、検証済みの SDK バージョン
- その SDK に必要な最小の言語・ランタイム・認証構成
- Everyone 宛チャットを判定する方法

Express / WebSocket ライブラリ、overlay の構成、画面共有への重ね方は後続で必要になってから決める。

## Spike

### 仮説

Zoom Meeting SDK クライアントを自分のミーティングへ参加させると、Everyone 宛チャットを
イベントとして受信でき、sender と message を取り出せる。

### 検証方法

公式ドキュメントで以下を確認し、必須条件を満たす可能性がある SDK のうち、
Mac で最も小さく試せるものを選ぶ。

- Web / Electron / macOS Meeting SDK のどれで chat receive event が取れるか
- SDK client は participant として参加する必要があるか。participant list に表示されるか
- video / audio を off にして chat listener 専用で参加できるか
- 自分がホストの自分のアカウント内ミーティングに必要な token(ZAK / OBF 等)と App 設定
- free アカウントで検証できるか。local development のみで使えるか
- chat callback で Everyone / DM を判別できるか

第一候補として Web Meeting SDK を試す。別の SDK は、Web で必須条件を満たせない場合にのみ試す。

### 結果

(未実施)

### 分かったこと・後続への影響

-
