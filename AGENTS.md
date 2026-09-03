# AGENTS.md

このリポジトリで AI(Claude Code / Codex など)と協働するときの共通ルール。プロジェクトの背景と要件は `docs/research.md`、進捗は `README.md` と `docs/plan/` を参照すること。

## プロジェクト概要

Zoom ミーティング内の **Everyone 宛チャット** をリアルタイムに取得し、ニコニコ動画風に画面へ流すオーバーレイツール。

目的は 2 つ。

1. **発表者自身がチャットを把握する** — 画面共有中でチャット欄が見えないときも内容が分かる
2. **視聴者にもコメントを見せる** — 画面共有の映像にコメントが重なって見える

このため overlay の表示先として 2 方式を想定している。

- **Electron 透過ウィンドウ**: デスクトップに直接重ねる。目的 1 を満たす。デスクトップ全体共有に映り込めば目的 2 も同時に満たせる(**未検証**、Plan 002)
- **OBS Browser Source**: OBS で合成して共有する。目的 2 のみを満たす

overlay の HTML / CSS / JS は両方式で共用する。どちらを本命にするかは Plan 002 の結果で決まる。

現在は **Phase 0(Zoom 仕様調査)**。MVP のゴールは「Zoom チャットへ Everyone 宛で投稿すると、
発表者の画面と視聴者の画面の両方にコメントが流れる」(Plan 004)。
Phase 0 の当面のゴールはその手前、「Zoom チャットに Hello と投稿 → ローカル console に
sender と message が出る」(Plan 001)まで。

表示方式の検証(Plan 002 / T-004)は Zoom SDK にも WebSocket にも依存しないため、Phase 0 と並列で進められる。

## TODO 運用

作業の入口は必ず [TODO.md](./TODO.md)。着手前に開き、完了後に更新する。
タスクの詳細(ゴール・手順・完了条件)は `docs/plan/` に置き、TODO.md には書かない。

TODO.md は 3 つのセクションを持つ。

- **Ready** — 依存なし。今すぐ着手でき、この中のタスクは並列に進めてよい
- **Blocked** — `depends` のタスクが未完了。着手しない
- **Icebox** — やるか未確定の候補。着手前にタスク化して Ready か Blocked へ移す

### 着手するとき

1. TODO.md の **Ready** からタスクを選ぶ。Blocked には着手しない。
2. 対応する `docs/plan/NNN-<slug>.md` を読む。無ければ先に書く。
3. plan の `状態` を `未着手` → `進行中` にする。

### 完了したとき

**plan の完了条件を実際に満たしたことを観測してから**、以下を機械的に行う。

1. TODO.md の該当行を切り取る(Ready / Blocked どちらのテーブルからでも)。
2. [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) の `<!-- ARCHIVE_TOP -->` の直下へ貼る。常に一番上。
3. 貼った行に完了日を足す。
4. 対応する plan の `状態` を更新し、`## Spike` があれば `結果` を埋める。
   失敗しても消さない。失敗も資産。Plan のすべての TODO が終わったら
   `状態` を `完了` にし、`docs/plan/README.md` の一覧も更新する。
   決定事項が生まれていれば `docs/decisions/` へ反映する。
5. TODO.md の他タスクの `depends` から完了 ID を削除する。
6. `depends` が空になったタスクを **Blocked から Ready へ移す**。

### 新しいタスクを足すとき

- ID は既存の最大値 + 1。**archive にある ID も含めて数える**。ID は再利用しない。
- 対応する plan を `docs/plan/` に作る(テンプレートは `docs/plan/TEMPLATE.md`)。
- 依存があれば Blocked、なければ Ready へ入れる。

### 守ること

- タスクを TODO.md から**削除しない**。完了しても中止しても archive へ移す。
  中止の場合は理由を 1 行添える。
- 完了条件を満たしていないタスクを archive へ移さない。「たぶん動く」で完了にしない。
- 1 タスク = 1 コミット以上。コミット前にユーザーへ差分を伝えて確認を取る。

## 開発の進め方

### Lean に進める

- その時点で最も不確実性が高い仮説を、観測可能な最小構成で検証する
- 公式 sample や既存コードを可能な限りそのまま利用し、成功条件に不要な実装は追加しない
- SDK・ライブラリ・ツールは、現在の Plan に必要になった時点でのみ追加する
- 複数の候補を同時に作り込まない。最も小さく試せる候補から始め、必須条件を満たせないと分かった場合にだけ次の候補へ進む
- 動作確認前に本番用の構成や将来向けの抽象化を確定しない。実際に観測した結果をもとに次の判断を行う
- 各 Plan の完了条件を満たしたらそこで止め、次の機能は次の Plan として扱う

### ドキュメントの使い分け

3 つを役割で分ける。同じことを 2 箇所に書かない。

| | 内容 | 性質 |
|---|---|---|
| [TODO.md](./TODO.md) | これから何をするか | 完了したら archive へ移動 |
| `docs/plan/` | なぜそうしたか、何が分かったか | 追記のみ。**完了しても移動しない** |
| `docs/decisions/` | 今どうなっているか | 上書き更新。常に正本 |

判断の履歴は Plan に残り、現在の結論は decisions に集まる。
「結局いま何が決まっているのか」を探すときは decisions だけを読めばよい状態を保つ。
decisions が読みにくくなったらトピック単位でファイルへ切り出す。

### Plan と Spike

- 作業単位は Plan。着手前に `docs/plan/NNN-<slug>.md` へ **狙い / 前提 / やること / 完了条件** を書く(テンプレは `docs/plan/TEMPLATE.md`)。追加したら `docs/plan/README.md` の一覧も更新する。
- Plan には **種別**(検証 / 実装)を持たせる。
  - **検証**: この Plan を終えると何が分かるか。Lean に不確実性を潰す局面で使う
  - **実装**: 誰に何が届くか。ユーザーストーリーに近い単位で切る
- Phase 0 は不確実性が高いので検証が中心になる。検証が済んだら実装へ切り替える。
- **`## Spike` 節は不確実性がある Plan だけが持つ**。そこに **仮説 / 検証方法 / 結果** を書く。確実にできることの手順書に Spike 節は要らない。
- Spike は 1 つにつき仮説 1 つ。成功・失敗どちらでも結果を同じファイルに追記する。失敗も資産。
- Plan の `## 前提` には、依存する既に確定した事実をどの Plan の結果か明記して書く。**未検証の仮定の上に積まない。**
- Spike の結論が決定事項になったら `docs/decisions/` を更新する。
- 完了したら 1 Plan につき 1 コミット(必要なら数コミット)。

### いきなり実装しない

- Phase 0 では Research → Plan 作成 → 最小環境構築 → chat receive の順。
- **SDK 選定を間違えると大きく手戻りする**。Meeting SDK(Web / Electron / macOS native)の選定は必ず公式ドキュメントを一次情報として確認し、結論を `docs/decisions/` に反映する。
- Zoom 公式ドキュメント(Meeting SDK Overview / Authorization / In-meeting chat / platform-specific docs)を優先し、古いブログや Stack Overflow だけで判断しない。
- **Zoom Team Chat と Meeting 内チャットを混同しない**。Chatbot API は今回の対象外。

### 先に作り込まないもの

[docs/decisions/](./docs/decisions/README.md) の「MVP で扱わないもの」を参照。
そこに挙がっているものは、明示的に依頼されるまで提案も実装もしない。

## 必須の制約

- **private message(DM)を overlay に流さない**。Everyone 宛のみ表示する。SDK から message type / receiver を判定できることを Plan 001 で確認する。
- **XSS 防止**: チャット本文は `textContent` で挿入する。`innerHTML` にユーザー入力を渡さない。
- **チャット履歴を永続化しない**。プロセス上で受け取って即配信する。
- Zoom の認証情報(SDK Key / Secret、ZAK など)はコミットしない。`.env` に置き、`.env.example` にはキー名だけ書く。

## 設計方針

**[docs/decisions/](./docs/decisions/README.md) が正本。** 内部形式、overlay の実装方針、
表示方式、MVP の範囲はそこを読むこと。ここには書かない(二重管理を避けるため)。

決定を変えるときは decisions を上書きし、経緯を該当 Plan の
「分かったこと・後続への影響」に残す。

## ディレクトリ

```text
TODO.md            作業の入口。Ready / Blocked / Icebox
TODO_ARCHIVE.md    完了タスク。新しいものほど上
docs/research.md   初期調査メモ。要件・疑問点・代替案の一次ソース
docs/plan/         タスクの詳細。不確実なものは Spike 節を持つ
docs/decisions/    現在有効な決定事項。正本。上書き更新する
src/zoom/          Meeting SDK アダプタ(CommentSource 実装)
src/server/        Express + ws サーバー
src/overlay/       静的 HTML / CSS / JS
```

## コミット

- Conventional Commits(`docs:` / `chore:` / `feat:` / `fix:` / `refactor:`)。
- 件名は英語、本文は日本語でよい。
- コミット前にユーザーへ差分を伝えて確認を取る。

## コミュニケーション

- 説明・コメント・コミット本文は日本語。技術用語とコード識別子は原語のまま。
- 非自明な実装(設計判断、ライブラリ選定、処理フロー)に着手する前に方針を提示し、了承を得てから書く。
- 検証できていないことを「動く」と言わない。SDK の挙動は実際に試した結果のみを事実として扱う。
