# Plan 002: Electron 透過オーバーレイが画面共有に映るか検証する

- 日付: 2026-09-04
- 状態: 進行中
- 種別: 検証
- TODO: T-004

## この Plan の狙い

Electron の透過ウィンドウをデスクトップに重ねられるか、そしてそれが Zoom の
デスクトップ全体共有を通して別 participant にも見えるかが分かる。

結果によって後続の構成が分岐する。

- 映る → Electron 単体で目的 1 と目的 2 の両方を満たせる。OBS は不要
- 映らない → OBS Browser Source を視聴者向けに残し、Electron は発表者用にする

## 前提

なし。Zoom Meeting SDK にも `OverlayComment` にも依存しないため、
Plan 001 と完全に並列で進められる。

背景として、目的が 2 つあることが判明している(`docs/research/` の 2026-09-04 追記)。

- 目的 1: 画面共有中、チャット欄が見えないタイミングでも発表者が内容を把握する
- 目的 2: 視聴者にもコメントを見やすくする

目的 1 は OBS では満たせない。OBS は合成映像を配信するもので、発表者自身の
デスクトップにコメントが出るわけではないため。デスクトップへ直接重ねる方式が要る。

## やること

### T-004: Electron 透過オーバーレイが画面共有に映るか検証する

Zoom SDK も WebSocket も使わない。ハードコードした矩形かテキストを 1 つ流すだけの
最小 Electron アプリで確認する。overlay の本実装(Plan 003)とは切り離す。

1. 最小の Electron アプリを作る。BrowserWindow の設定は以下。
   - `transparent: true`, `frame: false`, `hasShadow: false`
   - `setIgnoreMouseEvents(true, { forward: true })`(背後のアプリを操作できること)
   - `setAlwaysOnTop(true, 'screen-saver')`
   - `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
   - 画面全体を覆うサイズ
2. 中身は右から左へ動く矩形かテキスト 1 つ。CSS animation で十分
3. 通常のウィンドウ(ブラウザ、エディタ)の上に出るか、クリックが背後へ透過するか確認する
4. 自分のミーティングでデスクトップ全体共有を開始し、別端末の participant から見えるか確認する
5. Keynote を再生モードにし、その上に弾幕が出るか、別 Space へ移動しても追従するか確認する
6. 参考として、ウィンドウ共有(単一ウィンドウ)を選んだ場合の見え方も観測しておく
   (映らない想定。UI 側の案内文言の根拠にする)

**完了条件**:

- **必須(1)**: 通常のアプリウィンドウの手前に弾幕が表示され、クリックが背後へ透過する
- **必須(2)**: デスクトップ全体共有中、別端末の participant の画面に弾幕が見える
- **任意(3)**: Keynote 再生モードの上にも弾幕が表示される

(1) と (2) が満たされれば仮説の主要部分は成立。(3) は満たせなくても方式そのものは
維持できるため任意とする。

## やらないこと

Zoom チャットの受信、WebSocket 配信、`OverlayComment` への正規化、
複数コメントのレーン管理、Google Meet での挙動。いずれも後続で扱う。

multi monitor 対応も範囲外(`docs/research/` が未検討として残している)。

## Spike

### 仮説

macOS で Electron の透過・クリック透過・常時最前面ウィンドウを作ると、
(1) デスクトップ上の全アプリの手前に弾幕を表示でき、
(2) その表示が Zoom のデスクトップ全体共有を通して別 participant にも見え、
(3) Keynote のプレゼンモード(フルスクリーン)の上にも表示できる。

### 検証方法

上の「やること」がそのまま検証手順。`docs/research/` が挙げていた懸念
(macOS の画面キャプチャ仕様 / overlay window が共有に映るか / click-through /
Spaces / fullscreen / permissions)を実際に観測して潰す。

### 結果

**進行中**(2026-09-06 時点)。

**必須(1): 満たした。** `npm run electron:spike` で起動し、透過ウィンドウが
全アプリの手前に出ることと、クリックが背後へ透過することを確認した。
メニューバーと Dock の上にも弾幕が出る(画面全体を覆う設計なので想定どおり)。

**必須(2): 未確認。** これから Zoom のデスクトップ全体共有で試す。

**任意(3): 未確認。**

#### 分かったこと

**この環境には `ELECTRON_RUN_AS_NODE=1` が設定されている。**
そのまま `electron` を起動すると GUI ではなく素の Node として立ち上がり、
`require('electron')` が返すのはバイナリのパス(文字列)になる。
`app` も `BrowserWindow` も undefined で落ちる。
`npm run electron:spike` は `env -u` でこれを打ち消している。
**直接 `npx electron` を叩かないこと。**

`electron` は CommonJS なので名前付き import ができない。
`import { app } from 'electron'` は `SyntaxError` になる。default を受けて分解する。

**検証環境は外部モニタあり。** `screen.getAllDisplays()` の実測値は以下。

| | 解像度 | 位置 | 備考 |
|---|---|---|---|
| 内蔵 | 1800x1169 @2x | x:0 | primary, internal: true |
| 外部 | 1920x1080 @1x | x:1800 | |

**MVP は主ディスプレイのみでよい**と決めた(2026-09-06)。
複数ディスプレイ対応と表示先の切り替えは Icebox に残してある。
`getPrimaryDisplay()` だけを見ているので、**検証は内蔵ディスプレイを共有して行う。**
外部モニタを共有すると弾幕が出ておらず、失敗の原因を取り違える。

**画面全体を覆うには `enableLargerThanScreen` が要る。**

macOS はウィンドウを**表示する瞬間に** `workArea` の内側へ押し込む。
`x:0, y:0` を渡しても実際には `x:81, y:44`(Dock 左 81px とメニューバー 44px のぶん)に
なり、サイズは変わらないので右下が画面からはみ出す。
**表示後の `setBounds` では戻せない。**

実測した組み合わせ:

| 設定 | 結果 |
|---|---|
| `fullscreenable: false` | y:44 NG |
| `fullscreenable: true` | y:44 NG |
| `type: 'panel'` | y:44 NG(警告も出る) |
| **`fullscreenable: true` + `enableLargerThanScreen: true`** | **y:0 OK** |

最初は CSS 側で枠を内側へ寄せて対処しようとしたが、これは症状の見立てを誤っていた。
枠が隠れていたのではなく、ウィンドウ自体が画面全体を覆えていなかった。

### 分かったこと・後続への影響

<以下を必ず記録し、結論を `docs/decisions/README.md` の「表示方式」節へ反映する>

- 視聴者への配信を Electron のデスクトップ共有だけで賄えるか、OBS を残すか
- フルスクリーン対応を MVP に含められるか、将来機能として切るか
- overlay を Electron と OBS の両方で使い回すか、片方だけにするか
