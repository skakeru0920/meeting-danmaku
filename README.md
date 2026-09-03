# meeting-danmaku

Zoom ミーティング内の Everyone 宛チャットをリアルタイムに取得し、ニコニコ動画のコメントのように画面へ流すオーバーレイツール。

## 目的

1. **発表者自身がチャットを把握する** — 画面共有中でチャット欄が見えないときも内容が分かる
2. **視聴者にもコメントを見せる** — 画面共有の映像にコメントが重なって見える

## 目指す体験

- 参加者は普通に Zoom チャットを書くだけ(追加インストール・URL アクセス不要)
- 発表者は `npm start` → Zoom 参加 → overlay 表示 → 発表開始
  (overlay の出し方は Plan 002 の結果次第。Electron ならアプリ起動のみ、OBS なら OBS 起動が要る)
- 投稿から数秒以内にコメントが右から左へ流れ、一定時間で消える
- **private message(DM)は絶対にオーバーレイへ流さない**

```text
Zoom Meeting ──chat──▶ Meeting SDK client ──event──▶ Node.js
                                                        │ WebSocket
                                                        ▼
                                                   Overlay HTML
                                                        │
                        ┌───────────────────────────────┴───────────────┐
                        ▼                                               ▼
            Electron 透過ウィンドウ                          OBS Browser Source
                        │                                               │
            デスクトップに直接重ねる                            OBS で合成
                        │                                               │
                        ▼                                               ▼
              目的 1 + (2 も満たせるか未検証)                        目的 2
```

※ 上記構成はまだ仮説。Meeting SDK 部分は Plan 001、表示方式は Plan 002 で確定させる。
overlay の HTML / CSS / JS は両方式で共用する。

## 現在のステータス

**Phase 0: Zoom 仕様調査**(実装未着手)

| Phase | ゴール | 状態 |
|---|---|---|
| 1 | Zoom chat → terminal に `console.log` | 未着手 |
| 2 | debug message → browser overlay | 未着手 |
| 3 | Zoom chat → overlay | 未着手 |
| 4 | Zoom chat → 画面共有(Electron または OBS) | 未着手 |

Phase 4 の実現方法は Plan 002 の結果で決まる。Electron の透過オーバーレイが
デスクトップ全体共有に映れば OBS は不要になり、映らなければ OBS を残す。

## 進め方

作業単位は Plan。各 Plan は `docs/plan/` にゴール・手順・完了条件を記録し、やってみないと分からないものは `## Spike` 節に仮説と結果を残す。完了したらコミットする。詳細は [AGENTS.md](./AGENTS.md) と [docs/research.md](./docs/research.md) を参照。

Plan 一覧:

1. Zoom チャットを `console.log` する(SDK 選定を含む。最優先)
2. Electron 透過オーバーレイが画面共有に映るか検証する(1 と並列で着手可能)
3. ダミーコメントを流す HTML(Zoom とは完全に切り離す)
4. WebSocket で Node.js → overlay へ配信
5. Zoom と overlay を接続
6. 実際の画面共有で表示を確認(Electron / OBS は 2 の結果次第)

Plan 002 は Zoom SDK にも WebSocket にも依存しないため、Plan 001 と並列で進められる。
タスク単位の依存関係は [TODO.md](./TODO.md) を参照。

## 技術スタック(候補)

```text
Node.js / TypeScript / Express / ws / HTML / CSS / Vanilla JS
```

overlay をデスクトップに重ねる表示シェルとして Electron を使う想定(Plan 002 で検証)。
Meeting SDK の選定によっても Electron が関わる可能性がある(Plan 001)。この 2 つは別の判断。
React・DB・認証・デプロイ・Docker などは MVP では扱わない。

## ディレクトリ構成

```text
.
├── CLAUDE.md          # AI 駆動開発のルール
├── README.md
├── docs/
│   ├── TODO.md        # 着手予定タスク(作業の入口)
│   ├── TODO_ARCHIVE.md # 完了タスク
│   ├── research.md    # 初期調査メモ(要件・疑問点・代替案)
│   ├── plan/          # タスクの詳細(不確実なものは Spike 節を持つ)
│   └── adr/           # 設計判断の記録(SDK 選定など)
└── src/
    ├── zoom/          # Zoom Meeting SDK アダプタ(CommentSource 実装)
    ├── server/        # Express + WebSocket サーバー
    └── overlay/       # 静的 HTML / CSS / JS のオーバーレイ
```

## セットアップ

前提: Node.js 24 系、npm。

```bash
npm install
cp .env.example .env   # Zoom Meeting SDK の認証情報を記入
```

依存パッケージは各 Plan 着手時に追加する。現時点では `package.json` の骨組みのみ。

## 参考

- Zoom Meeting SDK Overview / Authorization / In-meeting chat(公式ドキュメントを一次情報とする)
- Zoom Team Chat と混同しないこと(今回欲しいのは Meeting 内チャット)
