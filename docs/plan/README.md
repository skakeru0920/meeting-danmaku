# Plan 一覧

作業単位。ゴール・手順・完了条件を書き、やってみないと分からないものは
`## Spike` 節に仮説と結果を残す。**完了しても移動しない。** 完了後の Plan は
「何が分かったか」の参照先になる。

これから何をするかは [TODO.md](../../TODO.md)、現在の決定事項は
[docs/decisions/](../decisions/README.md) を見る。

| # | Plan | 種別 | 状態 | TODO |
|---|---|---|---|---|
| 001 | [Zoom チャットを受信する](./001-zoom-chat-receive.md) | 検証 | 未着手 | T-001〜T-003 |
| 002 | [Electron 透過オーバーレイが画面共有に映るか](./002-electron-overlay-on-screen-share.md) | 検証 | 未着手 | T-004 |
| 003 | [Zoom 抜きでコメントが流れる状態を作る](./003-overlay-with-debug-source.md) | 実装 | 未着手 | T-005〜T-009 |
| 004 | [Zoom チャットを画面共有に流す](./004-zoom-to-overlay-end-to-end.md) | 実装 | 未着手 | T-010, T-011 |

001 / 002 / 003 は互いに独立しており、並列で進められる。004 は 3 つすべての完了が前提。

テンプレートは [TEMPLATE.md](./TEMPLATE.md)。
