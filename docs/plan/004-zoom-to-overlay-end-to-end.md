# Plan 004: Zoom チャットを画面共有に流す

- 日付: 2026-09-04
- 状態: 未着手
- 種別: 実装
- TODO: T-010, T-011, T-012

## この Plan の狙い

発表者が画面共有中もチャット内容を把握でき(目的 1)、
視聴者にもコメントが見える(目的 2)状態にする。MVP の完成。

## 前提

- **Plan 001 が完了していること** — Everyone 宛と DM を判別する条件が確定している
- **Plan 002 が完了していること** — 表示方式(Electron 単体か OBS 併用か)が確定している
- **Plan 003 が完了していること** — overlay と WebSocket 配信が動いている

着手前に `docs/decisions/README.md` の「表示方式」を読み、どちらの構成で
組むかを確定させること。未検証のまま進めない。

## やること

### T-010: `ZoomCommentSource` を overlay に接続する

1. Plan 001 で確認した chat callback を `CommentSource` 実装にまとめる
2. Plan 001 で特定した条件で Everyone 宛のみを通す
3. Zoom の payload を `OverlayComment` へ正規化して WebSocket へ流す
4. Everyone 宛と DM の両方を投稿して挙動を見る

**完了条件**: Zoom チャットへ Everyone 宛で投稿すると overlay に流れる。
DM は流れない。

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
