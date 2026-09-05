# 調査: Zoom Meeting SDK の選定

- 日付: 2026-09-05
- 結論: **Web Meeting SDK(`@zoom/meetingsdk` v6.2.0)の Component View を採用**
- 関連 Plan: [001](../plan/001-zoom-chat-receive.md)
- 反映先: [docs/decisions/](../decisions/README.md) の「Zoom チャット受信」節

## 何を決めるための調査か

Zoom ミーティング内の Everyone 宛チャットを受信するために、どの Meeting SDK を
使うかを決める。ここが決まらないと T-002(チャットを console.log する)に着手できず、
Phase 0 全体が止まる。

SDK 選定を間違えると大きく手戻りするため、公式ドキュメントと SDK の型定義を
一次情報として確認する。

## 確認項目

Plan 001 の「検証方法」が列挙した 6 点。候補ごとにこの物差しで測る。

| # | 項目 | なぜ要るか |
|---|---|---|
| 1 | chat receive event が取れるか | 必須条件。取れない SDK は選べない |
| 2 | SDK client は participant として join が必要か / participant list に出るか | 会議に参加者が 1 人増える。この UX が許容できるかの判断材料 |
| 3 | video / audio off の chat listener 専用で参加できるか | 常時起動させる前提が成り立つか |
| 4 | 自分がホストの自分のミーティングに必要な token / App 設定 | T-002 の準備手順に直結する |
| 5 | free アカウントで検証できるか / local development のみで使えるか | 有料契約が要るなら着手前に判断が必要 |
| 6 | chat callback で Everyone / DM を判別できるか | 必須の制約(DM を overlay に流さない)。T-003 の前提 |

## 候補

Plan 001 の指示により、第一候補は Web Meeting SDK。Web が必須条件を
満たせないと分かった場合にのみ他を検討する(複数候補を同時に作り込まない)。

| 候補 | 結果 |
|---|---|
| **Web Meeting SDK — Component View** | **採用** |
| Web Meeting SDK — Client View | 却下(同じ SDK 内での選択。理由は後述) |
| Electron Meeting SDK | 却下 |
| macOS Meeting SDK | 保留(Web で不足が判明した場合の次点) |
| Windows / Linux Meeting SDK | 調べなかった。開発機が Mac のため対象外 |
| RTMS(Realtime Media Streams) | 却下(有料。ただし有力な代替案) |
| Webhook Only App(Meeting webhook) | 却下 |
| Zoom Team Chat / Chatbot API | 調べなかった。Meeting 内チャットとは別物(AGENTS.md の注意事項) |

## 一次ソース

公式ドキュメント。

| URL | 確認日 | 何を確認したか |
|---|---|---|
| https://developers.zoom.us/docs/meeting-sdk/ | 2026-09-05 | 対応プラットフォーム一覧、認証方式の概要、ライセンスモデル |
| https://developers.zoom.us/docs/meeting-sdk/auth/ | 2026-09-05 | SDK JWT の生成方法、ZAK / OBF が要る条件 |
| https://developers.zoom.us/docs/meeting-sdk/web/ | 2026-09-05 | Client View と Component View の違い |
| https://developers.zoom.us/docs/meeting-sdk/electron/ | 2026-09-05 | Electron wrapper の位置づけと Zoom 自身の推奨 |
| https://developers.zoom.us/docs/api/meetings/events/ | 2026-09-05 | Meeting webhook のイベント一覧。チャット本文の配信が無いこと |
| https://developers.zoom.us/docs/rtms/ | 2026-09-05 | RTMS の概要。クレジットが必要なこと |
| https://developers.zoom.us/docs/rtms/event-reference/ | 2026-09-05 | RTMS が chat を扱えること |
| https://developers.zoom.us/docs/distribute/sdk-feature-review-requirements/ | 2026-09-05 | ボット参加の扱いと審査が必要になる条件 |

SDK の型定義。**ドキュメントより信頼できる一次情報**として扱った。
リファレンスページ(`/web/component-view/reference/`)は JavaScript で描画されており
取得できなかったため、npm パッケージの `.d.ts` を直接読んだ。

| 対象 | 確認日 | 何を確認したか |
|---|---|---|
| `@zoom/meetingsdk@6.2.0` の `embedded.d.ts` | 2026-09-05 | Component View のイベント名と payload 型 |
| `@zoom/meetingsdk@6.2.0` の `index.d.ts` | 2026-09-05 | Client View のイベント名 |

## 各候補の評価

### Web Meeting SDK — Component View — 採用

**1. chat receive event**: 取れる。`client.on('chat-on-message', callback)`。
型定義では以下のように宣言されている。

```ts
export declare function event_chat_on_message(payload: ChatRecord | ChatMessage): void;
function on(event: 'chat-on-message', callback: typeof event_chat_on_message): void;
```

**6. Everyone / DM の判別**: payload に `receiver` があり、判別できる**見込み**。
`ChatMessage` の型定義は以下。

```ts
export interface ChatMessage {
  id?: string;
  message: string;
  sender: { name: string; userId: number; avatar?: string };
  receiver: { name: string; userId: number };
  timestamp: number;
}
```

必要なフィールド(`sender.name` / `message` / `timestamp` / `receiver`)は揃っている。
`OverlayComment` へそのまま正規化できる形。

ただし **`receiver` が Everyone 宛のときに何を持つかは型定義に書かれていない。**
message type の enum も存在しない。送信側 API (`sendChat(message, userId?)`) の
コメントに「`userId` を渡さなければ everyone に送られる」とあることから、
Everyone 宛には特別な `userId` が入ると推測されるが、**これは推測であり未確認**。
実際の payload を T-003 で観測して確定する。

**4. 必要な token と App 設定**: Marketplace で **OAuth アプリ**を作り、
その **Client ID / Client Secret** で SDK JWT(signature)を生成する。
Meeting SDK は OAuth アプリの一機能という位置づけ。

ZAK が要るかは用途で変わる。ドキュメントの記載は以下。

- **アプリ所有者のアカウント内**のミーティングに participant として join → **JWT のみ**
- ミーティングを**開始**する、または**アカウント外**のミーティングに join → ZAK または OBF が必要

今回は「自分のアカウントの自分のミーティングに、SDK クライアントを参加させる」
構成なので、**JWT のみで足りる**見込み。`JoinOptions` でも `signature` が必須、
`zak` と `obfToken` は optional になっている。

**2. participant として join が必要か**: 必要。`JoinOptions` が
`meetingNumber` / `userName` / `signature` を要求しており、SDK クライアント自身が
会議に参加する設計。**既存の Zoom アプリを外から監視する API ではない。**
research の初期メモが立てていた仮説どおりだった。

したがって **会議の参加者リストに 1 人増える**。`userName` は指定できるので
"Comment Overlay" のような名前にはできる。

**3. audio / video off で参加できるか**: `JoinOptions` に audio/video の
起動可否を直接指定するフィールドは見当たらなかった。ただし Component View は
表示するコンポーネントを選択できる設計で、`init` 時の設定で制御できる可能性がある。
**未確認**。T-002 で実機確認する。

### Web Meeting SDK — Client View — 却下

chat イベント自体は存在する。`ZoomMtg.inMeetingServiceListener('onReceiveChatMsg', cb)`。

**却下理由**: **callback が `Function` 型で、payload の型が定義されていない。**

```ts
function inMeetingServiceListener(event: 'onReceiveChatMsg', callback: Function): void;
```

Component View の `ChatMessage` / `ChatRecord` に相当する型が Client View には無い。
payload の構造がドキュメントにも型にも書かれていないため、Everyone / DM の判別に
何を見ればよいかを事前に読み取れない。同じ SDK で型が付いている選択肢がある以上、
そちらを採る。

### RTMS(Realtime Media Streams)— 却下。ただし有力な代替案

Zoom が提供するデータパイプライン。会議に参加者を増やさずに、音声・映像・
文字起こし・**チャット**を受け取れる。ボットや AI ノートテイカー向けの正規ルート。

**チャットに対応している。** イベントリファレンスに chat が含まれ、payload には
sender / receiver / timestamp / 本文が含まれる。本プロジェクトの要件は満たす。

**却下理由: アカウントクレジット(有料)が必要なため。**
MVP の検証段階で課金を発生させるのは Lean の方針に反する。

加えて Webhook + WebSocket のサーバー構成が要り、Meeting SDK(npm パッケージ 1 つ)
より重い。

**ただし以下の条件が来たら再評価する価値がある。**

- **参加者が 1 人増える UX が許容できないと分かったとき**(T-002 で判断)。
  RTMS なら参加者が増えない。これは Meeting SDK に対する明確な優位点
- 他人のアカウントの会議に対応する必要が出たとき
- チャット以外(音声・画面共有・文字起こし)も扱いたくなったとき

### Webhook Only App(Meeting webhook)— 却下

SDK を使わず、Zoom から自前サーバーへ HTTP POST を受ける方式。
SDK クライアントを会議に参加させずに済むため、参加者が 1 人増える問題を
回避できる可能性があった。

**却下理由: Meeting 内チャットの本文を配信する webhook が存在しない。**

Meeting webhook のイベント一覧を確認したところ、提供されているのは
参加・退出・録画完了などのライフサイクル系イベントのみだった。
チャット関連は `webinar.chat_message_file_downloaded` があるが、これは
webinar のチャットで共有されたファイルがダウンロードされたときに発火し、
**ファイルのメタデータのみでメッセージ本文は含まない**。

副次的な理由として、webhook は Zoom 側から POST が飛ぶため
**公開された HTTPS エンドポイントが要る**。localhost では受けられず、
トンネリング(ngrok 等)が必要になって MVP の構成が重くなる。
Meeting SDK ならブラウザ側で完結する。

なお Chatbot webhook は存在するが、これは Zoom Team Chat 用であり
Meeting 内チャットとは別物。

### Electron Meeting SDK — 却下

**却下理由**: Zoom 自身が非推奨としているため。公式ドキュメントの記載は以下。

- macOS / Windows 用 Meeting SDK の上に載る Electron インターフェース層である
- 「ほとんどの統合では macOS か Windows 用の Meeting SDK を推奨する」
- 「Electron wrapper はドキュメントと開発者サポートが限られている」

加えて、この選定は overlay を Electron で表示する話(Plan 002)とは**別の判断**。
overlay 側で Electron を使うことは、チャット受信に Electron Meeting SDK を
使う理由にはならない。両者は独立している。

### macOS Meeting SDK — 保留

調べなかった。Web で必須条件を満たせる見込みが立ったため、Plan 001 の
「最も小さく試せる候補から始め、必須条件を満たせないと分かった場合にだけ次へ進む」
に従って深追いしていない。

Web で行き詰まった場合の次点。native なので raw data アクセスなど機能面では
上位だが、Node.js 中心で済ませたいという方針からは遠い。

## ボット利用に関する制約(重要)

`@zoom/meetingsdk` は **npm install 時に以下の警告を出す**。

> The Meeting SDK is reserved for human use cases and does not support bots or
> AI notetakers. To build an AI notetaker application or access realtime media,
> use Zoom RTMS (Real-time media streams)

本プロジェクトの SDK クライアントは、誰も操作せずチャットを受信し続ける
常駐参加者であり、**形態としてはボットに近い**。この警告が規約上の禁止に
あたるかを確認した。

**結論: 禁止ではない。自分のアカウント内の会議に限れば審査も不要。**

根拠は Meeting SDK の審査要件の記述。

> call out if the SDK app joins meetings as a bot participant

**「ボットとして参加するなら申告せよ」**という書き方であり、禁止ではない。
禁止なら申告項目を設ける必要がない。審査が要るのは以下の場合。

> Apps will need to go through our App Review process to join Meetings
> **outside their own account**

本プロジェクトは自分のアカウント内の会議のみを対象とするため、審査は不要。
postinstall の警告は「サポート窓口の対象外・非推奨」の意味と解釈し、
RTMS へ誘導する意図が強いと判断した。

**この判断が変わる条件**: 他人のアカウントの会議に対応する場合は審査が必要になる。
そのときは RTMS の再評価も含めて選定をやり直す。

## 採用理由

Web Meeting SDK の Component View を採る理由は 3 つ。

1. **payload に型が付いている。** Client View と違い `ChatMessage` / `ChatRecord` が
   定義されており、`sender` / `message` / `receiver` / `timestamp` が揃っている。
   `OverlayComment` への正規化がそのまま書ける
2. **Mac で最も小さく試せる。** ブラウザで動くため native のビルド環境が要らない。
   npm パッケージ 1 つで始められる
3. **Node.js 中心という方針に合う。** 初期メモが「可能なら Web / Node.js 中心で
   済ませたい」としていた条件を満たす

Electron を却下したのは Zoom 自身が非推奨としているため。macOS native を
選ばなかったのは、Web で足りる見込みが立った時点で深追いする理由がないため。

## 未確認のまま残したこと

ドキュメントと型定義を読んだだけでは確定できなかった項目と、その後の実機検証の結果。

**2026-09-05 の実機検証(T-002 / T-003)で以下は解消した。**

| 確認したこと | 結果 |
|---|---|
| Everyone 宛のとき `receiver` に何が入るか | `{ name: 'Everyone', userId: 0 }`。DM は受信者の実 userId。判別は **`receiver.userId === 0`** |
| payload が `ChatMessage` と `ChatRecord` のどちらで来るか | **`ChatRecord`**(`file` フィールドを持つ方) |
| audio / video を off にできるか | video は最初から OFF。**audio は切れなかった**。`client.stopAudio()` は成功するが参加者リスト上は ON のまま。待機室は原因ではない(無効にしても同じ)。Icebox 送り |
| participant list にどう表示されるか | `userName` で指定した名前(`Comment Overlay`)で 1 人増える。カメラ OFF |
| free アカウントで検証できるか | **できた。** 有料プランは不要 |
| 審査・公開なしで local development で動くか | **動いた。** General App を作り Embed で Meeting SDK を有効化するだけで足りる |

**残っている未確認事項。**

| 未確認のこと | 確かめる TODO |
|---|---|
| 参加者が 1 人増える UX が実運用で許容できるか。**許容できない場合は RTMS の再評価が要る** | T-011(実際の画面共有で通しで確認するとき) |
| 長時間の常駐で切断・再接続がどう振る舞うか | 未タスク化 |

**アカウントプランについて補足。** 調査時点では公式に
「A paid Zoom account is required」と読める記述があり、無料枠の可否が
不明だったため Pro アカウントへの切り替えを想定していた。

**実際には無料アカウントで動作した。** Meeting SDK の利用に有料プランは要らない。
ライセンスモデルの記述は、Zoom Meetings 自体の機能制限(会議時間など)を
指していたと解釈できる。

## 後から見返す人へ

この結論は「**自分のアカウント内の、自分がホストのミーティング**に参加する」
という前提の上に立っている。以下が変わると結論も変わる。

- **他人がホストのミーティングに対応する場合** — ZAK / OBF が必要になり、
  さらに 2026-03-02 以降は Marketplace の審査が要るとの記載がある。
  RTMS という別の選択肢も挙がっているので、そこから調べ直す
- **raw audio / video が必要になった場合** — Web SDK では扱えない。
  macOS native SDK の再評価が要る
- **Google Meet / Teams を追加する場合** — このノートの「確認項目」の 6 項目を
  そのまま物差しとして使えば横比較できる。特に「SDK クライアント自身が
  会議に参加する必要があるか」は、プラットフォームによって設計が大きく違う部分
- **React のバージョンを上げたくなった場合** — SDK の peerDependencies が
  `react@18.2.0` を固定で要求する。React 19 では `ReactCurrentOwner` の削除により
  実行時エラーになることを実機で確認した。SDK 側が 19 に対応するまで上げられない
