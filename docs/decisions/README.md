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

- バージョン: v6.2.0(2026-09-05 に実機で受信を確認)
- チャット受信: `client.on('chat-on-message', callback)`
- payload 型: `ChatMessage | ChatRecord`。`sender.name` / `message` /
  `receiver` / `timestamp` を持つ

**認証構成**: Marketplace で **General App** を作り、**Features > Embed で
Meeting SDK を有効化**する。その Client ID / Client Secret で SDK JWT(signature)を
生成する。自分のアカウント内のミーティングへ participant として join する場合は
**JWT のみでよく、ZAK / OBF は不要**(実機で確認)。

- 署名の payload は `appKey` / `mn` / `role: 0` / `iat` / `exp` / `tokenExp`。
  `sdkKey` は v5.0.0 以降 deprecated なので入れない
- 署名は**必ずサーバー側で作る**。Client Secret をブラウザへ出さない
- 旧来の SDK Key / Secret は 2026-06-27 に Client ID / Secret へ移行が強制済み

**React 18.2.0 が必須。** SDK の peerDependencies が範囲指定ではなく固定版を要求する。
React 19 では `ReactCurrentOwner` の削除により実行時エラーになる
(`redux@4.2.1` / `react-redux@8.1.2` / `redux-thunk@2.4.2` も同様に固定)。

**Everyone 宛と DM の判別条件**: **確定**(T-003 で実 payload を観測)。

```js
const isToEveryone = (payload) => payload.receiver.userId === 0;
```

Everyone 宛は `receiver.userId === 0`(`name` は `"Everyone"`)、
DM は受信者の実 userId が入る。実測値は以下。

| | receiver.name | receiver.userId |
|---|---|---|
| Everyone 宛 | `"Everyone"` | `0` |
| DM | `"Comment Overlay"`(受信者名) | `16781312` |

**`name` で判別しない。** 表示言語によって変わる可能性があるため、数値で判定する。

実 payload は型定義の `ChatRecord`(`file` フィールドを持つ方)で届く。

**Meeting SDK はブラウザ前提。Node では動かない。** `document` や WebRTC に
依存している。そのため Zoom に繋ぐ部分だけブラウザのタブで動かし、受け取った
コメントを `POST /comment` でサーバーへ渡す。**このタブを閉じるとコメントが
止まる。** Electron の隠しウィンドウへ移す案は TODO.md の Icebox にある。

サーバー側で直接 Zoom に繋ぐ乗り換え先は無い。Meeting SDK for Linux は
ネイティブライブラリで macOS 版が無く、Video SDK は Zoom Meeting に参加できず、
RTMS は有料。

**SDK クライアントは会議に participant として参加する**(外から監視する API ではない)。
参加者リストに 1 人増える(名前は `userName` で指定。カメラ OFF、**マイクは ON のまま**)。
マイクを切る方法は未解決で Icebox にある。

**検証環境**: **無料アカウントで動作した**(2026-09-05 に確認)。
Meeting SDK の利用に有料プランは要らない。Pro への切り替えは不要。

**ボット利用の制約**: Meeting SDK は install 時に「ボットや AI ノートテイカーは
サポートしない」と警告するが、**禁止ではない**(審査要件に「ボットとして参加するなら
申告せよ」とある)。**自分のアカウント内の会議に限れば審査も不要。**
他人のアカウントの会議へ広げる場合は審査が必要になり、前提が変わる。

**代替案**: RTMS(Realtime Media Streams)はチャットを扱え、**会議に参加者を
増やさずに済む**。ただしアカウントクレジット(有料)が必要なため MVP では採らない。
参加者が 1 人増える UX が許容できないと分かった場合は再評価する。

選定の根拠と却下した候補は [docs/research/meeting-sdk-selection.md](../research/meeting-sdk-selection.md)。

## 表示方式

**採用**: **Electron 透過オーバーレイ単体。OBS は使わない。**(2026-09-06 に確定)

Plan 002 で、Electron の透過ウィンドウが Zoom のデスクトップ全体共有を通して
別 participant にも見えることを実機で確認した。これで目的 1(発表者が把握)と
目的 2(視聴者に見せる)の両方を Electron だけで満たせる。

BrowserWindow の設定は以下。**`enableLargerThanScreen` が要る**点に注意。
これが無いと macOS が表示の瞬間にウィンドウを workArea の内側へ押し込み、
メニューバーと Dock のぶん右下へずれて画面からはみ出す。表示後の
`setBounds` では戻せない。

```js
transparent: true, frame: false, hasShadow: false,
skipTaskbar: true, focusable: false, resizable: false, movable: false,
fullscreenable: true,          // false だと enableLargerThanScreen が効かない
enableLargerThanScreen: true,  // これが無いと画面全体を覆えない
```

```js
win.setBounds(display.bounds);  // 表示前に呼ぶ。表示後は効かない
win.setIgnoreMouseEvents(true, { forward: true });
win.setAlwaysOnTop(true, 'screen-saver');
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
```

**フルスクリーンアプリの上にも出る**(Google Slides の全画面表示で確認)。

**表示先は主ディスプレイのみ。** MVP はこれでよい。複数ディスプレイ対応と
表示先の切り替えは TODO.md の Icebox にある。

この環境には `ELECTRON_RUN_AS_NODE=1` が設定されており、そのまま `electron` を
起動すると GUI にならない。`npm run electron:spike` が `env -u` で打ち消している。

## overlay の実装

静的 HTML + CSS animation + Vanilla JS。React は使わない。

**表示先に依存する処理を overlay 側に持ち込まない。**
表示方式は Electron 単体に確定したが(上の「表示方式」)、overlay は
ブラウザで開いても同じように動く状態を保つ。開発中の確認がしやすい。

**`POST /comment` がコメントを受け取る唯一の口。** Zoom タブからも、
手動投稿の `/debug` 画面(`http://localhost:5173/src/debug/`)からも同じ口へ送る。
**認証は付けていないので開発機の外へ公開しない。**

ダミーの自動投稿は既定で止まっている。`npm run dev:dummy` で動く。

**XSS の防御は overlay の `textContent` 一箇所に集約する。** 投稿経路の途中で
エスケープしない。サーバーでエスケープすると画面に `&lt;script&gt;` が出る。

初期値: コメント表示時間 8 秒固定、同時表示上限 20、レーンは round-robin。

## overlay への配信

**採用**: **SSE(Server-Sent Events)。WebSocket は使わない。**(2026-09-06 に確定)

サーバーの `GET /events` が接続中の overlay へ `OverlayComment` を JSON で
1 件ずつ配る。overlay 側は `EventSource` で受ける。

- **一方向で足りる。** overlay から送り返すものがない
- **依存が増えない。** `res.write()` と `EventSource` だけで書ける
- **再接続は `EventSource` 任せ。** 自前のループを持たない

受信データは `isOverlayComment` で形を確かめてから描画へ渡す。
壊れた 1 件で弾幕全体が止まらないようにするため。

`src/server/broadcast.js` は通信方式を知らない。双方向が必要になったら
(送信が高頻度になる、視聴者が操作して全員へ即反映する)、供給源クラスの
差し替えで WebSocket へ移れる。判断の経緯は
[docs/plan/003](../plan/003-overlay-with-debug-source.md)。

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
