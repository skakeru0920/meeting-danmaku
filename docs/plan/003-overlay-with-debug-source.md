# Plan 003: Zoom 抜きでコメントが流れる状態を作る

- 日付: 2026-09-04
- 状態: 進行中
- 種別: 実装
- TODO: T-005, T-006, T-007, T-008, T-009

## この Plan の狙い

Zoom に一切依存せず、ダミーのコメントが overlay 上を流れる状態にする。
開発者が `/debug` から任意の文字列を投げて、見た目と流れ方をその場で調整できる。

Plan 001 / 002 の検証結果を待たずに進められる部分をここへ寄せている。
Zoom 接続前に見た目を固めておくことで、Plan 004 での作業を接続だけに絞れる。

## 前提

なし。Plan 001 / 002 と並列で進められる。

`docs/decisions/README.md` の「overlay の実装」と「コメントの内部形式」に従う。

## やること

### T-005: ダミーコメントが流れる静的 HTML

1. `src/overlay/index.html` にハードコードしたコメント配列を用意する
2. CSS animation で右端から左端へ流す
3. 表示時間 8 秒固定、同時表示上限 20、レーンは round-robin
4. 背景を `transparent` にする

**完了条件**: ブラウザで開くとコメントが右から左へ流れ、8 秒程度で消える。
コメントが重なって読めなくならない。背景が透過している。

**結果**(2026-09-06): 完了。`src/overlay/` に `index.html` / `style.css` /
`main.js` / `danmaku.js` / `lane.js` を作った。

- 流れ方・8 秒・重ならないことはブラウザで目視確認した
- **背景の透過だけは確認できていない。** 普通のブラウザで開くとブラウザ自身の
  白地が見えるため。CSS に `background: transparent` があり不透明色を敷いて
  いないことまでが確認範囲で、実際に透けるかは T-004 で Electron の
  `transparent: true` ウィンドウに載せたときに分かる

`left` ではなく `transform: translateX()` で動かしている。レイアウトを起こさず
合成だけで済むため。移動距離は幅を DOM 挿入後に実測して CSS 変数へ渡す。

同時表示上限を超えたコメントは**捨てる**。表示中のものを消して場所を空けると
読んでいる途中のコメントが消えるので、そちらのほうが不自然と判断した。

### T-006: `OverlayComment` 型を定義する

`docs/decisions/README.md` の「コメントの内部形式」をそのままコードに落とす。
それ以上の抽象化はしない。

**完了条件**: 型定義が存在し、`tsc` が通る。

**結果**(2026-09-06): 完了。`src/overlay/types.js` に JSDoc の `@typedef` で置いた。
`npm run typecheck` が通る。

overlay は Vanilla JS のままにしたいので `.ts` へは移行せず、`jsconfig.json` の
`checkJs` + `noEmit` で検査だけ行う。実行されるのは素の JS で、ビルド成果物は増えない。

**検査対象は `src/overlay/` に絞った。** 最初 `src/**/*.js` を対象にしたところ、
`src/zoom/main.js` と `src/server/index.js` と `node_modules/jsonwebtoken` から
数十件のエラーが出た(`process` が未定義、Express の型が合わない、
`getElementById` の null チェックが無い)。通すには `@types/node` の追加と
既存コードの書き換えが要り、T-006 の範囲を超えるため広げなかった。
`src/zoom/` を型づけるのは `ZoomCommentSource` を書く T-010 が自然。

### T-007: `CommentSource` インターフェースと `DebugCommentSource`

1. `CommentSource`(`start()` / `stop()`)を定義する
2. 一定間隔でダミーの `OverlayComment` を吐く `DebugCommentSource` を実装する

**完了条件**: `DebugCommentSource` を start すると callback へ `OverlayComment` が
届くことを console で確認できる。stop すると止まる。

**結果**(2026-09-06): 完了。`src/overlay/source.js` に置いた。
Node で実行して console に確認済み。

```text
--- start ---
received: {"id":"debug-0","sender":"user0","text":"こんにちは","timestamp":...}
received: {"id":"debug-1","sender":"user1","text":"888888","timestamp":...}
received: {"id":"debug-2","sender":"user2","text":"テスト投稿です","timestamp":...}
--- stop ---
(以降 received は増えない)
```

JS にインターフェース構文が無いので `CommentSource` は `@typedef` で形だけ決めた。
抽象クラスを作って継承させることはしない(decisions の「抽象化しすぎない」)。
`DebugCommentSource` は `@implements` を書いておくと `tsc` が適合を検査する。

`start` / `stop` はどちらも二重に呼べる。二重 `start` で timer が二本走ると
コメントが倍の速さで流れるため、動作中の `start` は無視する。

`main.js` のダミー配列をこの供給源経由へ差し替えた。T-005 で「先取りしない」と
書いた部分がここで本来の形になっている。`Danmaku` は変えていない。

### T-008: WebSocket で Node.js → overlay へ配信

1. Express + ws のサーバーを `src/server/` に立てる
2. `DebugCommentSource` の出力を接続中のクライアントへ broadcast する
3. T-005 の overlay のコメント供給部を WebSocket 受信に差し替える

**完了条件**: `npm start` → ブラウザで overlay を開くと `DebugCommentSource` の
コメントが流れる。再読み込みしても再接続して流れ続ける。

### T-009: dev-only の `/debug` 投稿画面

入力欄と送信ボタンだけの画面。本文は `textContent` で挿入する
(`innerHTML` にユーザー入力を渡さない)。

**完了条件**: `/debug` で入力した文字列が overlay に流れる。
`<script>alert(1)</script>` を投稿してもスクリプトとして実行されず、文字列として流れる。

## やらないこと

Zoom チャットの受信と接続(Plan 004)。Electron / OBS への組み込み(Plan 002 と Plan 004)。
チャット履歴の永続化(方針として行わない)。

## テスト方針(T-005 で決めた)

Vitest + jsdom を入れた(`npm test`)。

**弾幕が流れる見た目はテストしない。** CSS animation なので目視でしか確認できない。
テストするのは判断を含む部分に絞る。

| 対象 | 置き場所 |
|---|---|
| レーンの round-robin、同時表示上限、レーン数の算出 | `lane.js` / `lane.test.js` |
| 縦位置、表示時間、上限超過時の破棄、`textContent` での挿入 | `danmaku.js` / `danmaku.test.js` |
| start / stop、二重呼び出し、吐かれるコメントの形 | `source.js` / `source.test.js` |

そのために、判断を含むロジックを DOM 操作から切り離して `lane.js` へ置いた。
`lane.js` は DOM を知らない。タイマーを使う `source.js` は Vitest の fake timers で
時間を進める。実時間を待つテストにはしない。

`<script>alert(1)</script>` と `<img onerror>` が要素にならず文字列として入ることを
テストで固定してある。T-009 の完了条件と同じ性質のものを、入力経路ができる前に
描画側で押さえておく狙い。

あわせて Vite の `root` を `src/zoom` からプロジェクト直下へ移した。
`root` が `src/zoom` のままだと `src/overlay/` をブラウザで開けないため。
これに伴い `src/zoom/index.html` の script src を相対パスへ直している
(HTTP 200 で配信されることは確認済み。実際に join できるかは未確認)。
