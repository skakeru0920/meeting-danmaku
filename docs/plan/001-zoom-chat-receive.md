# Plan 001: Zoom チャットを受信する

- 日付: 2026-09-03
- 状態: 完了
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

**成功。T-001 / T-002 / T-003 すべて完了(2026-09-05)。**

Web Meeting SDK(`@zoom/meetingsdk` v6.2.0)の Component View で、Everyone 宛
チャットを受信できることを実機で確認した。DM との判別条件も確定した。

実際に観測した payload。

```js
// Everyone 宛
{
  id: '1-BFD0A51D-...',
  message: 'hello',
  sender:   { name: 'Kakeru', userId: 16778240 },
  receiver: { name: 'Everyone', userId: 0 },
  file: { name: '', type: '' },
  timestamp: 1788618806911,
}

// DM
{
  id: '1-91F0B751-...',
  message: 'DM from host',
  sender:   { name: 'Kakeru', userId: 16778240 },
  receiver: { name: 'Comment Overlay', userId: 16781312 },
  file: { name: '', type: '' },
  timestamp: 1788618936303,
}
```

**判別条件は `receiver.userId === 0`。** Everyone 宛だけ 0 で、DM は受信者の
実 userId が入る。`name` は表示言語で変わりうるので使わない。

型定義は `ChatMessage | ChatRecord` の 2 択だったが、**実際に届くのは `ChatRecord`**
(`file` フィールドを持つ方)だった。

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
- **無料アカウントで動作した。** Meeting SDK の利用に有料プランは要らなかった。
  Pro への切り替えは不要
- **React 18.2.0 が必須だった。** SDK の peerDependencies が範囲指定ではなく
  固定版を要求する。React 19 では `ReactCurrentOwner` の削除で実行時エラーになる。
  Vite でバンドルする構成にしたので、この固定は今後も効く
- **署名の payload から `sdkKey` を外す必要があった。** v5.0.0 以降 deprecated で、
  入れると警告が出る。`appKey` のみでよい
- **PMI(パーソナルミーティングルーム)はホストが開始するまで join できない。**
  `role: 0` で参加するため。errorCode 3008 / `Meeting has not started` が返る
- **~~SDK クライアントのマイクを OFF にできなかった。~~**
  **この観測は誤りだった。2026-09-06 に決着。下の追記を読む。**

  当初の記録: `client.stopAudio()` は成功するが、参加者リスト上は ON のままだった。
  カメラは最初から OFF。待機室にいると 5004 / `on hold` で失敗するが、待機室を
  無効にして成功させても結果は変わらなかったので**待機室は原因ではない**。
  `stopAudio` が音声接続の停止であってミュートとは別の概念らしい。

  **追記(2026-09-06): マイクは最初から掴んでいなかった。**
  `client.mute(true)` を試したところ `6015 / 'no audio joined'` で失敗した。
  **ミュートする対象の音声接続が存在しない。** `stopAudio` が空振りしていたのも
  同じ理由で、型定義の "Only works if the audio flag is `true` in the media
  constraints" がこれを指している。

  **参加者リストのアイコンを ON と読み違えていた。** あれはヘッドセット記号で
  「音声未接続」を表す。マイク ON ではない。**ハウリングは起きない**ので、
  `mute` も `stopAudio` も呼ぶ必要がなく、両方削除した。
- Electron Meeting SDK は Zoom 自身が非推奨としているため却下した。
  これは overlay を Electron で表示する話(Plan 002)とは独立した判断
