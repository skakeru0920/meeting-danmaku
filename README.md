# meeting-danmaku

Zoom ミーティング内の Everyone 宛チャットをリアルタイムに取得し、ニコニコ動画のコメントのように画面へ流すオーバーレイツール。最終的には OBS Browser Source 経由で Zoom の画面共有に重ねることを目指す。

## 目指す体験

- 参加者は普通に Zoom チャットを書くだけ(追加インストール・URL アクセス不要)
- 発表者は `npm start` → Zoom 参加 → OBS 起動 → 発表開始
- 投稿から数秒以内にコメントが右から左へ流れ、一定時間で消える
- **private message(DM)は絶対にオーバーレイへ流さない**

```text
Zoom Meeting ──chat──▶ Meeting SDK client ──event──▶ Node.js
                                                        │ WebSocket
                                                        ▼
                                              Overlay HTML ──▶ OBS Browser Source ──▶ Zoom 画面共有
```

※ 上記構成はまだ仮説。Spike 1 で確定させる。

## 現在のステータス

**Phase 0: Zoom 仕様調査**(実装未着手)

| Phase | ゴール | 状態 |
|---|---|---|
| 1 | Zoom chat → terminal に `console.log` | 未着手 |
| 2 | debug message → browser overlay | 未着手 |
| 3 | Zoom chat → overlay | 未着手 |
| 4 | Zoom chat → OBS → Zoom 画面共有 | 未着手 |

## 進め方

「1 spike = 1 hypothesis」の単位で進める。各 Spike は `docs/spikes/` に仮説・検証手順・成功条件・結果を記録し、成功したらコミットする。詳細は [CLAUDE.md](./CLAUDE.md) と [docs/research.md](./docs/research.md) を参照。

Spike 予定:

1. Zoom チャットを `console.log` する(SDK 選定を含む。最優先)
2. ダミーコメントを流す HTML(Zoom とは完全に切り離す)
3. WebSocket で Node.js → overlay へ配信
4. Zoom と overlay を接続
5. OBS Browser Source で透過表示を確認

## 技術スタック(候補)

```text
Node.js / TypeScript / Express / ws / HTML / CSS / Vanilla JS
```

Meeting SDK の都合で Electron を採用する可能性あり。React・DB・認証・デプロイ・Docker などは MVP では扱わない。

## ディレクトリ構成

```text
.
├── CLAUDE.md          # AI 駆動開発のルール
├── README.md
├── docs/
│   ├── research.md    # 初期調査メモ(要件・疑問点・代替案)
│   ├── spikes/        # Spike ごとの仮説と検証結果
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

依存パッケージは各 Spike 着手時に追加する。現時点では `package.json` の骨組みのみ。

## 参考

- Zoom Meeting SDK Overview / Authorization / In-meeting chat(公式ドキュメントを一次情報とする)
- Zoom Team Chat と混同しないこと(今回欲しいのは Meeting 内チャット)
