# CLAUDE.md

このリポジトリで AI(Claude Code / Codex など)と協働するときのルール。プロジェクトの背景と要件は `docs/research.md`、進捗は `README.md` と `docs/spikes/` を参照すること。

## プロジェクト概要

Zoom ミーティング内の **Everyone 宛チャット** をリアルタイムに取得し、ニコニコ動画風に画面へ流すオーバーレイツール。最終的に OBS Browser Source 経由で Zoom 画面共有に重ねる。

現在は **Phase 0(Zoom 仕様調査)**。MVP のゴールは「Zoom チャットに Hello と投稿 → ローカル console に sender と message が出る」まで。

## 開発の進め方

### 1 spike = 1 hypothesis

- 作業単位は Spike。必ず **仮説 / 検証方法 / 成功条件** を先に `docs/spikes/NNN-<slug>.md` に書いてから着手する(テンプレは `docs/spikes/TEMPLATE.md`)。
- 成功・失敗どちらでも結果を同じファイルに追記する。失敗も資産。
- 成功したら 1 Spike につき 1 コミット(必要なら数コミット)。

### いきなり実装しない

- Phase 0 では Research → Spike plan → 最小環境構築 → chat receive の順。
- **SDK 選定を間違えると大きく手戻りする**。Meeting SDK(Web / Electron / macOS native)の選定は必ず公式ドキュメントを一次情報として確認し、結論を `docs/adr/` に ADR として残す。
- Zoom 公式ドキュメント(Meeting SDK Overview / Authorization / In-meeting chat / platform-specific docs)を優先し、古いブログや Stack Overflow だけで判断しない。
- **Zoom Team Chat と Meeting 内チャットを混同しない**。Chatbot API は今回の対象外。

### 先に作り込まないもの

DB、認証、クラウドデプロイ、Docker、React/Next.js、デザインシステム、multi tenancy、CI/CD の作り込み、自動 moderation、Teams / Google Meet 対応。これらの提案・実装は明示的に依頼されるまで行わない。

## 必須の制約

- **private message(DM)を overlay に流さない**。Everyone 宛のみ表示する。SDK から message type / receiver を判定できることを Spike で確認する。
- **XSS 防止**: チャット本文は `textContent` で挿入する。`innerHTML` にユーザー入力を渡さない。
- **チャット履歴を永続化しない**。プロセス上で受け取って即配信する。
- Zoom の認証情報(SDK Key / Secret、ZAK など)はコミットしない。`.env` に置き、`.env.example` にはキー名だけ書く。

## 設計方針

- Zoom 固有形式を overlay に直接流さない。内部形式に正規化する:

  ```ts
  type OverlayComment = {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
  };
  ```

- コメント供給源は `CommentSource` インターフェース(`start()` / `stop()`)で差し替え可能にし、`ZoomCommentSource` と `DebugCommentSource` を用意する。ただし抽象化しすぎない。まず動かす。
- overlay は静的 HTML + CSS animation + Vanilla JS。React は使わない。
- Zoom 接続なしでコメントを投げられる dev-only の `/debug` 画面を用意する。
- MVP の初期値: コメント表示時間 8 秒固定、同時表示上限 20、レーンは round-robin。

## ディレクトリ

```text
docs/research.md   初期調査メモ。要件・疑問点・代替案の一次ソース
docs/spikes/       Spike の仮説と結果
docs/adr/          設計判断(SDK 選定など)
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
