# TODO

タスク一覧。完了したものは [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) の先頭へ移動する。
運用ルールは [AGENTS.md](./AGENTS.md) の「TODO 運用」を参照。

- 手順と完了条件は [docs/plan/](./docs/plan/README.md) に書く。ここには書かない
- 現在の決定事項は [docs/decisions/](./docs/decisions/README.md)

**MVP は 2026-09-06 に完成した。** Zoom チャットが画面共有を通して
視聴者にも見える。次にやることは Icebox から選ぶ。

## Ready — 着手できる

依存なし。互いに独立しているので並列に進めてよい。

| ID | タスク | Plan |
|---|---|---|
| (なし) | | |

## Blocked — 依存待ち

`depends` のタスクがすべて archive へ移ったら Ready へ移す。

| ID | タスク | depends | Plan |
|---|---|---|---|
| (なし) | | | |

## Icebox — 検討中

やるかどうか未確定。着手する前にタスク化し、Ready か Blocked へ移す。

| タスク | メモ |
|---|---|
| multi monitor 対応 / 表示先の切り替え | **MVP は主ディスプレイのみでよい**(2026-09-06 決定)。将来やるときのために T-004 で実測した内容を残す。`screen.getAllDisplays()` は 内蔵 1800x1169@2x(primary, internal:true)と外部 1920x1080@1x(x:1800)を返した。全画面に出すだけなら `getAllDisplays()` を回して BrowserWindow を複数作れば済む(10 行程度)。出す先を選ばせる方式(設定ファイル / CLI 引数 / UI)は使ってみないと決められないので未定 |
| Keynote フルスクリーン対応 | T-004 の任意条件。満たせなければ将来機能として切る |
| Zoom タブを Electron の隠しウィンドウへ移す | 現在は Zoom タブを開いている間だけコメントが流れ、閉じると止まる。`show: false` の BrowserWindow で SDK を動かせばタブが不要になる。Electron の中身は Chromium なのでブラウザ用 SDK がそのまま動くはず。**T-011 で使ってみてから判断する** |
