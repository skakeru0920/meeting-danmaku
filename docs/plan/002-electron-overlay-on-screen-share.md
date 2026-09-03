# Plan 002: Electron 透過オーバーレイが Zoom 画面共有に映る

- 日付: 2026-09-04
- 状態: 未着手
- TODO: T-004
- depends: なし(Plan 001 と並列で着手できる)

## ゴール

macOS で Electron の透過・クリック透過・常時最前面ウィンドウを作り、
デスクトップに弾幕を直接重ねられること、そしてそれが Zoom のデスクトップ全体共有を
通して別 participant にも見えることを確かめる。

成立すれば Electron 単体で「発表者自身がチャットを把握する」と
「視聴者にもコメントを見せる」の両方を満たせる。

## 背景 / なぜ今これを検証するか

目的は 2 つある。

- 第 1 目的: 画面共有中、チャット欄が見えないタイミングでも発表者が内容を把握する
- 第 2 目的: 視聴者にもコメントを見やすくする

第 1 目的は OBS では満たせない(OBS は合成映像を配信するもので、発表者自身の
デスクトップにコメントが出るわけではない)。デスクトップへ直接重ねる方式が要る。
さらにそれが全体共有に映り込むなら、第 2 目的も同じ仕組みで満たせて OBS が不要になる。

成否によって後続の構成が分岐するため、Zoom 接続や WebSocket より先に潰す。
Zoom Meeting SDK にも `OverlayComment` にも依存しないので、Plan 001 と完全に並列で進められる。

## 手順

Zoom SDK も WebSocket も使わない。ハードコードした矩形かテキストを 1 つ流すだけの
最小 Electron アプリで確認する。overlay の本実装(Plan 003)とは切り離す。

1. 最小の Electron アプリを作る。BrowserWindow の設定は以下。
   - `transparent: true`, `frame: false`, `hasShadow: false`
   - `setIgnoreMouseEvents(true, { forward: true })`(背後のアプリを操作できること)
   - `setAlwaysOnTop(true, 'screen-saver')`
   - `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
   - 画面全体を覆うサイズ
2. 中身は右から左へ動く矩形かテキスト 1 つ。CSS animation で十分。
3. 通常のウィンドウ(ブラウザ、エディタ)の上に出るか、クリックが背後へ透過するかを確認する
4. 自分のミーティングを開き、**デスクトップ全体共有**を開始。別端末の participant から見えるか確認する
5. Keynote を再生モードにし、その上に弾幕が出るか、別 Space に移動しても追従するかを確認する
6. 参考として、ウィンドウ共有(単一ウィンドウ)を選んだ場合の見え方も観測しておく
   (映らない想定。UI 側の案内文言の根拠にする)

## 完了条件

- **必須(1)**: 通常のアプリウィンドウの手前に弾幕が表示され、クリックが背後へ透過する
- **必須(2)**: デスクトップ全体共有中、**別端末の participant の画面に弾幕が見える**
- **任意(3)**: Keynote 再生モードの上にも弾幕が表示される

(1) と (2) が満たされれば仮説の主要部分は成立。
(3) は満たせなくても方式そのものは維持できるため、任意とする。

## この Plan で決めること

- 視聴者への配信を Electron のデスクトップ共有だけで賄えるか、OBS Browser Source を残すか
  - 成功 → OBS 方式は不要になる
  - (2) が失敗 → OBS Browser Source を視聴者向けの本命として残し、
    Electron は発表者自身が見るためだけのものにする
- フルスクリーン対応を MVP に含められるか、将来機能として切るか
- overlay を Electron と OBS の両方で使い回すか、片方だけにするか

## 検証しないこと

Zoom チャットの受信、WebSocket 配信、`OverlayComment` への正規化、
複数コメントのレーン管理、Google Meet での挙動。いずれも後続タスクで扱う。

## Spike

### 仮説

macOS で Electron の透過・クリック透過・常時最前面ウィンドウを作ると、
(1) デスクトップ上の全アプリの手前に弾幕を表示でき、
(2) その表示が Zoom のデスクトップ全体共有を通して別 participant にも見え、
(3) Keynote のプレゼンモード(フルスクリーン)の上にも表示できる。

### 検証方法

上記「手順」がそのまま検証手順。`docs/research.md` が挙げていた懸念
(macOS の画面キャプチャ仕様 / overlay window が共有に映るか / click-through /
Spaces / fullscreen / permissions)を実際に観測して潰す。

### 結果

(未実施)

### 分かったこと・後続への影響

-
