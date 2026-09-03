# Spike 001: Zoom チャットを console.log する

- 日付: 2026-09-03
- 状態: 未着手

## 仮説

Zoom Meeting SDK クライアントを自分のミーティングへ参加させると、Everyone 宛チャットをイベントとして受信でき、sender と message を取り出せる。

## 検証方法

1. 公式ドキュメントで以下を確認し、Mac で最も小さく試せる SDK を選ぶ(結論は `docs/adr/` に記録)
   - Web / Electron / macOS Meeting SDK のどれで chat receive event が取れるか
   - SDK client は participant として参加する必要があるか。participant list に表示されるか
   - video / audio を off にして chat listener 専用で参加できるか
   - 自分がホストの自分のアカウント内ミーティングに必要な token(ZAK / OBF 等)と App 設定
   - free アカウントで検証できるか。local development のみで使えるか
   - chat callback で Everyone / DM を判別できるか
2. 選んだ SDK の公式 sample を起動し、自分のミーティングへ join する
3. chat callback に `console.log({ sender, message, receiver/type })` を追加する
4. 別 participant から "Hello" を Everyone 宛に投稿する
5. 同じ participant から DM を送り、判別できることも確認する

## 成功条件

- 別 participant の "Hello" が数秒以内に console に `sender` と `message` 付きで表示される
- DM が Everyone 宛と区別できる情報(message type / receiver)を持っている

## 結果

(未実施)

## 分かったこと・次の Spike への影響

-
