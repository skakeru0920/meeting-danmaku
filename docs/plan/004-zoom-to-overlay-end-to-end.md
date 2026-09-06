# Plan 004: Zoom チャットを画面共有に流す

- 日付: 2026-09-04
- 状態: 進行中
- 種別: 実装
- TODO: T-010(完了), T-011, T-012(中止)

## この Plan の狙い

発表者が画面共有中もチャット内容を把握でき(目的 1)、
視聴者にもコメントが見える(目的 2)状態にする。MVP の完成。

## 前提

- **Plan 001 が完了していること** — Everyone 宛と DM を判別する条件が確定している
- **Plan 002 が完了していること** — 表示方式(Electron 単体か OBS 併用か)が確定している
- **Plan 003 が完了していること** — overlay と配信が動いている
  (WebSocket と書いていたが T-008 で SSE に変えた)

いずれも完了済み。表示方式は Electron 単体に確定している
(`docs/decisions/README.md` の「表示方式」)。

## やること

### T-010: `ZoomCommentSource` を overlay に接続する

1. Plan 001 で確認した chat callback を `CommentSource` 実装にまとめる
2. Plan 001 で特定した条件で Everyone 宛のみを通す
3. Zoom の payload を `OverlayComment` へ正規化して配信へ流す
4. Everyone 宛と DM の両方を投稿して挙動を見る

**完了条件**: Zoom チャットへ Everyone 宛で投稿すると overlay に流れる。
DM は流れない。

**結果**(2026-09-06): 完了。実機で Everyone 宛が流れること、DM が流れないことを
確認した。

#### 経路

**Meeting SDK はブラウザ前提なので、Zoom に繋ぐ部分だけタブの中で動く。**
`document` や WebRTC に依存していて Node では動かない。

```text
[ブラウザのタブ]              [Node.js]           [Electron]
Zoom SDK
  ↓ chat-on-message
ZoomCommentSource     ← Everyone 宛だけ通す
  ↓ POST /comment
                        Express
                          ↓
                        Broadcaster
                          ↓ SSE
                                        →  overlay
```

T-009 で作った `POST /comment` をそのまま使っている。**`/comment` の位置づけが
「dev-only の投稿口」から「コメントを受け取る唯一の口」に変わった。**

サーバー側で Zoom に繋ぐ案も比べたが、**乗り換え先が無いので選べなかった。**
Meeting SDK for Linux はネイティブライブラリで macOS 版が無く、Video SDK は
Zoom Meeting に参加できず(独自セッション用)、RTMS は有料。どれも T-001 の
選定をやり直すことになる。

**このタブを閉じるとコメントが止まる。** Electron の隠しウィンドウ
(`show: false` の BrowserWindow)で動かせばタブは不要になる。中身は Chromium なので
ブラウザ用の SDK がそのまま動く。**T-011 で検討する。**

#### DM を捨てる場所

`src/zoom/comment-source.js` の `toOverlayComment` **1 箇所**に集約した。
判別は `receiver.userId === 0`(T-003 で確定)。

**`receiver` が欠けるなど判定できない payload は「流さない」側へ倒す。**
通してしまうと DM が漏れるため。テストで固定してある。

Zoom タブの画面には「DM を受信したが流さなかった」とだけ出す。**本文は出さない。**
流れていないことを目視で確かめつつ、中身は画面に残さない。

#### ダミーの自動投稿を既定で止めた

実際の Zoom コメントに混ざると見分けがつかないため。`--debug-source` を
付けたときだけ動く(`npm run dev:dummy`)。見た目を調整するときに使う。
`/src/debug/` からの手動投稿はフラグに関係なく使える。

### T-011: 実際の画面共有で通しで確認する

1. `docs/decisions/README.md` の「表示方式」に従って構成する
   - Electron 単体 → アプリを起動するだけ
   - OBS 併用 → overlay の URL を OBS の Browser Source に設定する
2. Zoom ミーティングを開き、画面共有を開始する
3. 別 participant から Everyone 宛に投稿する
4. 発表者自身の画面と別 participant の画面の両方で見え方を確認する

**完了条件**:

- 画面共有中、発表者自身の画面にコメントが流れて見える(目的 1)
- 別 participant の画面にもコメントが流れて見える(目的 2)
- overlay の背景が黒などで塗り潰されていない
- DM が流れていない

### T-012: OBS Browser Source 経由の表示を用意する

**中止**(2026-09-06)。Plan 002 の必須(2)が成功し、Electron 単体で視聴者にも
見えることを確認したため不要になった。以下は当初の記述。

**Plan 002 の必須(2) が失敗した場合にのみ着手する。** 成功していれば不要なので、
その場合は TODO を「中止」として archive へ移す。

overlay の URL を OBS の Browser Source に設定し、背景が透過することを確認する。
Electron 側は発表者が見るためだけのものとして残す。

**完了条件**: OBS のプレビューで overlay の背景が透過し、下のソースが見える。

## やらないこと

multi monitor 対応、自動 moderation、Teams / Google Meet 対応、
コメントの永続化。いずれも MVP の範囲外。

## Spike

種別は実装だが、通しで動かすまで分からない部分が残るため記録する。

### 仮説

Plan 001 と Plan 002 で個別に検証した要素を繋ぐと、投稿から表示まで
数秒以内に収まり、目的 1 と目的 2 の両方を満たす。

### 検証方法

上の T-011 がそのまま検証手順。投稿から表示までの体感遅延も観測する。

### 結果

(未実施)

### 分かったこと・後続への影響

-
