# Zoom Chat Overlay MVP — 雑多メモ

## これは何

Zoomミーティング中のチャットを取得して、ニコニコ動画のコメントのように画面上へ流したい。

まずは完成品を作るというより、

- 本当にZoomチャットをリアルタイム取得できるか
- どのSDK / 構成が一番楽か
- OBSまで含めて成立するか
- 実運用すると何が問題になるか

を小さく試したい。

Codexと壁打ちしながら仕様・構成を詰める前提。

---

# やりたいこと

イメージ：

```text
Zoom Meeting

参加者A:
「ここについて質問です」

        ↓

Zoomのチャットを検知

        ↓

画面共有中の映像に

    ← ここについて質問です

のようなコメントが右から左に流れる
```

理想的には、

- Zoom参加者は普通にZoomのチャットを使うだけ
- 発表者側で別アプリを操作しなくていい
- チャット投稿後、ほぼリアルタイムで表示
- コメントは一定時間で消える
- 複数コメントが重なりすぎない
- 発言者名も必要なら表示
- OBS経由でZoomの共有画面に重ねられる

状態を目指す。

---

# 最初のMVP

## MVPのゴール

自分で作ったZoomミーティングに2人で入る。

別参加者がZoomチャットに

```text
Hello
```

と投稿。

数秒以内に、

```text
← Hello
```

が別ウィンドウ上を右から左に流れる。

ここまでできたら第一段階成功。

OBS連携はその後でもよい。

---

# 最初に確認したいこと

かなり重要。

実装を始める前にCodexに最新のZoom公式ドキュメントを調べてもらう。

特に以下。

## Zoom Meeting SDK

Zoom Meeting SDKにはミーティング内チャットを受信する仕組みがある。

ネイティブSDKでは、例えば以下のようなチャット受信イベントが存在する。

```text
onChatMsgNotification
```

チャット本文だけでなく、

- message id
- content
- timestamp
- sender user id
- sender display name
- receiver
- message type
- thread id

などを取得できる模様。

ただし、

**どのMeeting SDKを使うのが一番簡単か**

はちゃんと調べたい。

候補：

- Web Meeting SDK
- Electron Meeting SDK
- macOS Meeting SDK
- Windows Meeting SDK
- Linux Meeting SDK

自分はMacを使う想定なので、

```text
Web
Electron
macOS native
```

あたりが候補。

可能ならWeb / Node.js中心で済ませたい。

---

# 重要な疑問

## 普通のZoomクライアントの横で動かせるのか？

ここがかなり重要。

理想：

```text
通常のZoomアプリ
    ↓
チャット
    ↓
自作Node.jsアプリが横から取得
```

ができること。

ただしMeeting SDKは、

「既存のZoomデスクトップアプリを監視するAPI」

ではなく、

「自分のアプリ内にZoom Meeting機能を組み込むSDK」

という性質が強い。

つまり実際には、

```text
通常Zoom
+
裏でMeeting SDKクライアントも同じ会議に参加
```

のような構成が必要になる可能性がある。

ここは最優先で検証する。

もしSDKクライアントを別参加者として参加させる必要があるなら、

```text
Overlay Bot
```

のような参加者がZoom上に1人増える可能性もある。

このUXが許容できるか考える。

---

# Zoom認可について

Meeting SDKアプリが開発者自身のZoomアカウント外でホストされた会議へ参加する場合、追加の認可要件が関係する可能性がある。

ZAK / OBF token等について、2026年現在の公式ドキュメントを確認する。

なので最初は、

```text
自分のZoomアカウント
↓
自分で作ったMeeting
↓
自分のMeeting SDK app
```

という閉じた環境で試す。

外部企業や他人がホストするZoom対応は後回し。

---

# とりあえず想定している構成

案A。

```text
Zoom Meeting
     │
     │ chat
     ▼
Zoom Meeting SDK client
     │
     │ chat event
     ▼
Node.js process
     │
     │ WebSocket
     ▼
Overlay HTML
     │
     ▼
OBS Browser Source
     │
     ▼
OBS
     │
     ▼
Zoomで共有
```

ただしMeeting SDK部分とNode.js部分を分離する必要があるかは未確定。

Electronで全部まとめる案もありそう。

---

# もっと小さく検証する

一気に全部作らない。

## Spike 1: Zoomチャットをconsole.logする

最初の目標はこれだけ。

```text
Zoom Chat
「こんにちは」
```

↓

```text
console.log({
  sender: "Kakeru",
  message: "こんにちは"
})
```

これさえできればよい。

UI不要。  
OBS不要。  
WebSocket不要。

---

## Spike 2: ダミーコメントを流すHTML

Zoomとは完全に切り離す。

例えば：

```text
http://localhost:3000/overlay
```

を開いて、ボタンを押したら

```text
← Hello World
```

が流れる。

必要なもの：

- HTML
- CSS animation
- JavaScript

最初はReactすら不要かもしれない。

---

## Spike 3: WebSocket

Node.jsから

```json
{
  "sender": "Kakeru",
  "message": "Hello"
}
```

を送信。

Overlay側で受信して流す。

候補：

- `ws`
- Socket.IO

MVPなら `ws` で十分そう。

---

## Spike 4: ZoomとOverlayを接続

```text
Zoom chat callback
↓
WebSocket
↓
overlay
```

をつなぐ。

---

## Spike 5: OBS

OBSのBrowser Sourceから

```text
http://localhost:3000/overlay
```

を読み込む。

背景：

```css
background: transparent;
```

OBS上で透過できることを確認。

---

# Overlay UI

最初はニコニコ動画的なもの。

```text
                       Hello!!
                    質問です
        それいいですね！
```

右から左へ流す。

## 欲しい動作

- 右端から出現
- 左端まで一定速度で移動
- 画面外へ出たらDOM削除
- 同時表示可能
- Y座標をランダム or レーン制御
- 同じ位置で重ならない
- 長文でも表示可能
- コメント数が多すぎる場合の制御

---

# レーン方式

完全ランダムだと重なりそう。

例えば画面を

```text
lane 0  -------------------------
lane 1  -------------------------
lane 2  -------------------------
lane 3  -------------------------
lane 4  -------------------------
lane 5  -------------------------
```

に分ける。

空いているレーンへコメントを流す。

MVPならround-robinでもよい。

後で衝突判定を入れる。

---

# コメントの見た目

最初は、

```text
Kakeru: これいいですね！
```

くらい。

検討：

- sender表示する / しない
- avatar
- font size
- text color
- outline
- shadow
- background
- speed
- emoji対応
- URL表示
- 改行
- 日本語
- Unicode
- rich text

ニコニコっぽくするなら、

```css
color: white;
-webkit-text-stroke: 2px black;
```

のような感じ。

OBSで背景がどんな色でも読める必要あり。

---

# セキュリティ

ZoomチャットをHTMLとしてそのまま突っ込まない。

NG：

```js
element.innerHTML = message;
```

基本：

```js
element.textContent = message;
```

XSS防止。

URLなども最初はただの文字列でよい。

---

# 表示対象

最初は

```text
Everyone宛チャットのみ
```

にした方がよさそう。

DMを画面共有に流したら事故る。

以下は絶対区別したい。

```text
Everyone
Host
Individual user
Waiting room
```

MVPでも

**private messageをoverlayへ流さない**

ことは必須条件にしたい。

Zoom SDKからmessage type / receiverを判定できるか確認する。

---

# Moderation

将来的には必要そう。

例えば、

```text
!hide
!clear
```

とか。

ただしMVPでは不要。

後で考える：

- NG word
- URL禁止
- 特定ユーザーmute
- コメント非表示
- コメント一括clear
- 流速変更
- pause
- hostだけ表示
- Q&Aだけ表示

---

# OBSを使う理由

最終的な表示合成は自前で頑張らずOBSに任せたい。

```text
Presentation
+
Comment Overlay
=
OBS Scene
```

という形。

OBS Browser SourceならHTMLを直接表示できる。

透過背景も扱える。

---

# Zoom画面共有との関係

ここは実際に試す。

候補1：

```text
OBSで合成
↓
OBS Preview / Projector
↓
そのウィンドウをZoomで共有
```

候補2：

```text
OBS Virtual Camera
```

ただしVirtual Cameraは「カメラ映像」なので、通常の画面共有用途としてベストかは要検討。

候補3：

Mac上でOBSのFullscreen Projectorを仮想ディスプレイ等へ表示して共有。

最初は一番簡単な方法を使う。

---

# もしかするとOBSすら不要？

別案。

Electronで

```text
always-on-top
transparent
click-through
```

なウィンドウを作る。

Mac画面上にコメントを直接重ねる。

```text
Desktop
   +
Transparent Electron Overlay
```

これをZoomで「画面全体共有」すれば映るか？

要検証。

メリット：

- OBS不要
- セットアップが簡単になる可能性

デメリット：

- macOSの画面キャプチャ仕様
- overlay windowが共有に映るか
- click-through制御
- Spaces / fullscreen
- multi monitor
- permissions

など面倒そう。

MVPではOBSの方が安全そう。

---

# 技術スタック候補

無理にReactを使わない。

候補：

```text
Node.js
TypeScript
Express
ws
HTML
CSS
Vanilla JS
```

Meeting SDK側の都合によって

```text
Electron
```

を採用する可能性あり。

Overlayだけなら：

```text
Express
+
WebSocket
+
static HTML
```

で十分。

---

# Repo構成案

仮。

```text
zoom-chat-overlay/
├── apps/
│   ├── zoom-client/
│   └── overlay/
│
├── server/
│   └── websocket
│
├── docs/
│   └── research.md
│
├── package.json
└── README.md
```

でもMVP段階ではもっと単純でもいい。

```text
src/
  zoom/
  server/
  overlay/
```

くらい。

Codexと相談する。

---

# 先に作り込みすぎないもの

以下は後回し。

- DB
- authentication
- cloud deployment
- Docker
- Kubernetes
- React
- Next.js
- design system
- user accounts
- multi tenancy
- analytics
- CI/CDの作り込み
- 自動moderation
- Google Meet
- Teams

まず、

```text
Zoom chat
↓
console.log
```

だけ成功させる。

---

# 保存も最初はいらない

チャット履歴をDB保存しない。

プロセス上で受け取って即配信。

```text
Zoom
↓
event
↓
WebSocket
↓
browser
```

のみ。

プライバシー的にもこの方が楽。

---

# 遅延

目標：

```text
投稿 → overlay
```

1秒未満〜数秒程度。

MVPでは厳密なSLA不要。

測りたいもの：

```text
Zoom timestamp
receive timestamp
browser receive timestamp
render timestamp
```

後で必要なら計測。

---

# チャット大量投稿

将来的に問題。

100人が一気に投稿したら

```text
████████████████████████████████
```

になる。

候補：

- queue
- max active comments
- drop
- sampling
- rate limit
- userごとのrate limit

MVP：

```text
active max = 20
```

などでもよい。

---

# コメント速度

文字数によって変える？

ニコニコ的には、長いコメントが途中で消えないように

```text
distance
text width
duration
```

を計算したい。

でも最初：

```text
duration: 8s
```

固定。

---

# OBSサイズ

まず：

```text
1920 x 1080
```

想定。

ただしOverlay HTML自体はレスポンシブにする。

OBS Browser Source：

```text
Width 1920
Height 1080
```

程度。

---

# 開発時に欲しいデバッグ画面

Zoom接続なしでコメントを投げられるUI。

例えば：

```text
/debug
```

```text
Message:
[ Hello world            ]

[Send]
```

これがあるとOverlayの実装が非常に楽。

本番機能ではなくdev-onlyでOK。

---

# Eventデータの内部形式

Zoom固有形式をそのままOverlayへ流さない方が良さそう。

内部では、

```ts
type OverlayComment = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};
```

くらいに正規化。

Zoom adapter:

```text
Zoom Chat Message
↓
OverlayComment
```

将来：

```text
Teams
↓
OverlayComment

Google Meet Adapter
↓
OverlayComment
```

とできる。

---

# Adapter設計

少しだけ先を見据えるなら、

```ts
interface CommentSource {
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

のようにして、

```text
ZoomCommentSource
DebugCommentSource
```

を差し替えられるようにする。

ただし抽象化しすぎない。

まず動かす。

---

# Zoomの参加方法について調査すること

Codexに最初に調べてもらいたい。

1. Web Meeting SDKでchat receive eventは取れるか
2. Electron Meeting SDKなら取れるか
3. macOS Meeting SDKなら取れるか
4. SDK clientはZoom meetingにparticipantとして参加する必要があるか
5. participant listに表示されるか
6. video/audioをoffにしてchat listener専用で参加できるか
7. 自分がhostの場合のtoken要件
8. 自分のaccount内meetingの場合のtoken要件
9. external meetingの場合の2026年現在の認可要件
10. free Zoom accountでも検証できるか
11. Meeting SDK App作成時に必要な設定
12. local developmentのみで使えるか
13. Marketplace公開が必要になる条件
14. chat callbackでEveryone / DMを判別できるか

---

# かなり重要な判断ポイント

## 「SDK bot参加方式」が必要か

もし

```text
普通のZoomアプリのチャット
↓
外部API/Webhook
```

で取得できるなら最高。

ただ、Meeting SDKの性質上、

```text
SDK client自身がMeetingへjoin
↓
そのSDK clientがchat eventを受信
```

になる可能性が高い。

これが確認できたらアーキテクチャを決める。

---

# Zoom Team Chatと混同しない

今回欲しいのは、

```text
Zoom Meeting内のchat
```

。

Zoomには別に

```text
Zoom Team Chat
```

がある。

Chatbot API等を見つけても、今回欲しいAPIとは限らない。

Codexが検索中に混同しないよう注意。

---

# 開発の順番（仮）

```text
0. Zoom仕様調査

1. Zoom Meeting SDK sampleを起動

2. 自分のMeetingへjoin

3. chat callbackをconsole.log

4. debug overlay作成

5. CSS animation

6. WebSocket server

7. Zoom chat → WebSocket

8. OBS Browser Source

9. 実際のZoom screen share

10. UX改善
```

この順番が良さそう。

特に3までを早くやる。

---

# 成功条件

Phase 1：

```text
Zoom chat
↓
terminal
```

成功。

Phase 2：

```text
debug message
↓
browser overlay
```

成功。

Phase 3：

```text
Zoom chat
↓
overlay
```

成功。

Phase 4：

```text
Zoom chat
↓
OBS
↓
Zoom screen sharing
```

成功。

---

# 失敗した場合の代替案

Meeting SDKが思ったより面倒だった場合。

## Plan B

Zoomチャットではなく専用Webフォーム。

```text
QR code
↓
comment page
↓
WebSocket
↓
OBS
```

これは確実に作れる。

ただし今回はまずZoom chat連携を試したい。

## Plan C

Zoom Apps SDK側でできないか検討。

Meeting SDKとは別物なので、利用可能なchat event等を調査。

## Plan D

字幕を流す。

音声認識：

```text
Zoom audio
↓
speech-to-text
↓
overlay
```

これは別プロジェクトとして面白いが今回は範囲外。

---

# プライバシー

チャットを画面共有に再表示するので、参加者に分かるようにした方がよい。

特に：

```text
private chat
```

は絶対に公開しない。

できれば

```text
「Everyone宛のチャットは共有画面上にも表示されます」
```

と最初に案内する。

---

# 将来やりたいこと

MVPが面白ければ。

- コメントON/OFF
- sender非表示
- anonymous
- emoji reaction
- 質問だけ表示
- `?` で始まるものだけ表示
- `/q` コマンド
- moderator
- pinned comment
- 色
- font size
- speed
- lane数
- profanity filter
- word cloud
- reaction aggregation
- 👍 x 12
- Q&A queue
- AI要約
- AIによる質問分類
- duplicate question merge
- meeting終了時のコメントログ
- Teams対応
- Google Meet対応
- browser-only版
- remote hosted overlay
- OBS plugin化
- Stream Deck連携

---

# これが面白そうな利用シーン

- 社内勉強会
- 研修
- LT
- オンラインイベント
- All Hands
- 授業
- webinar
- ハンズオン
- ライブコーディング

発表を止めずにリアクションが見えるのが価値。

---

# 名前

仮。

```text
zoom-chat-overlay
```

他：

```text
zoom-danmaku
meeting-danmaku
chat-stream-overlay
meeting-comments
live-comments
```

ただし名前決めは後。

---

# Codexへの最初の依頼

以下くらいから壁打ちする。

```text
ZoomミーティングのEveryone宛チャットをリアルタイムに取得し、
最終的にはOBS Browser Source上へニコニコ動画のように流す
小さなアプリを作りたいです。

まず実装はしないでください。

このresearch.mdを読んだうえで、
2026年現在のZoom公式ドキュメントを確認しながら、
最初の技術検証方法を一緒に決めたいです。

最優先で知りたいのは、

1. 通常のZoomクライアントを使いながら、Meeting内チャットを外部から取得できるか
2. Meeting SDKクライアント自身が会議へ参加する必要があるか
3. Macで最も小さく検証できるSDKは何か
4. Everyone宛とDMを確実に判別できるか
5. 自分のZoomアカウント内だけで試す場合に必要なApp設定・token・権限は何か

です。

最初のゴールはUIではなく、

Zoomチャットに「Hello」と投稿
↓
ローカルのconsoleへmessageとsenderが表示される

ところまでです。

過剰な設計はせず、
最短でこの仮説を検証する方法を提案してください。
```

---

# Codexへの注意

いきなり実装させない。

最初は、

```text
Research
↓
Spike plan
↓
最低限の環境構築
↓
chat receive
```

まで。

特にSDK選定を間違えると大きく手戻りする。

---

# 開発ルール案

AI駆動なので、

```text
1 spike = 1 hypothesis
```

くらいにしたい。

例：

```text
Hypothesis:
Web Meeting SDKでEveryone chatを受信できる

Test:
公式sampleへchat listener追加

Success:
別participantから送った"hello"がconsoleに出る
```

この単位で進める。

成功したらcommit。

---

# 最初のcommit候補

```text
docs: add initial research notes
```

次：

```text
chore: initialize zoom meeting sdk spike
```

次：

```text
feat: log incoming zoom chat messages
```

くらい。

---

# 今の段階で決めなくていいもの

- 最終プロダクト名
- Reactかどうか
- UIデザイン
- 本番デプロイ先
- DB
- monorepo
- Teams設計
- Google Meet設計
- 課金
- Marketplace公開
- 配布形式

全部後。

---

# 現時点の仮説

一番ありそうなのは：

```text
Meeting SDK client
       ↓
Zoomへchat listener専用participantとしてjoin
       ↓
Everyone chat受信
       ↓
localhost WebSocket
       ↓
OBS Browser Source
```

という構成。

ただしこれはまだ仮説。

**最初のSpikeでここを確定させる。**

---

# 参考にする公式情報

Codexには可能な限りZoom公式ドキュメントを一次情報として使わせる。

確認対象：

- Zoom Meeting SDK Overview
- Meeting SDK Authorization
- In-meeting chat
- Meeting SDK platform-specific docs
- Meeting SDK Web supported features
- external meeting authorization requirements

古いブログ記事・Stack Overflowだけで判断しない。

---

# 最終的にほしい体験

発表者：

```text
npm start
↓
Zoom参加
↓
OBS起動
↓
overlay source表示
↓
presentation開始
```

参加者：

```text
普通にZoom chatを書く
```

だけ。

参加者側に追加インストールやURLアクセスを要求しない。

**このUXが成立するかをまず試す。**
