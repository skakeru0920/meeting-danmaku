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

**Phase 1 完了**(2026-09-05)。Zoom チャットの受信と DM の判別まで確認済み。

| Phase | ゴール | 状態 |
|---|---|---|
| 1 | Zoom chat → terminal に `console.log` | **完了**(Plan 001) |
| 2 | debug message → browser overlay | 未着手(Plan 003) |
| 3 | Zoom chat → overlay | 未着手(Plan 004) |
| 4 | Zoom chat → 画面共有(Electron または OBS) | 未着手(Plan 002 / 004) |

Phase 4 の実現方法は Plan 002 の結果で決まる。Electron の透過オーバーレイが
デスクトップ全体共有に映れば OBS は不要になり、映らなければ OBS を残す。

## 進め方

作業単位は Plan。ゴール・手順・完了条件を [docs/plan/](./docs/plan/README.md) に記録し、
やってみないと分からないものは `## Spike` 節に仮説と結果を残す。

| # | Plan | 種別 | 状態 |
|---|---|---|---|
| 001 | Zoom チャットを受信する(SDK 選定を含む) | 検証 | **完了** |
| 002 | Electron 透過オーバーレイが画面共有に映るか | 検証 | 未着手 |
| 003 | Zoom 抜きでコメントが流れる状態を作る | 実装 | 未着手 |
| 004 | Zoom チャットを画面共有に流す | 実装 | 未着手 |

001 / 002 / 003 は互いに独立しており並列で進められる。004 は 3 つすべてが前提。

ドキュメントの役割:

- [TODO.md](./TODO.md) — これから何をするか。タスク単位の依存関係
- [docs/plan/](./docs/plan/README.md) — なぜそうしたか、何が分かったか
- [docs/decisions/](./docs/decisions/README.md) — 今どうなっているか(正本)

詳細は [AGENTS.md](./AGENTS.md) と [docs/research/](./docs/research/README.md) を参照。

## 技術スタック

**確定分**(Plan 001)。

| | 用途 |
|---|---|
| `@zoom/meetingsdk` v6.2.0 | チャット受信。Component View を使う |
| **React 18.2.0(固定)** | SDK の peerDependencies。**19 では動かない** |
| Vite | フロントのバンドルと dev サーバー |
| Express | 署名エンドポイント。Client Secret を扱う |

React を固定しているのは SDK が `react@18.2.0` を範囲指定なしで要求するため。
19 では `ReactCurrentOwner` の削除により実行時エラーになる。
`redux` / `react-redux` / `redux-thunk` も同様に固定。

**未確定分**。overlay の配信に `ws` を使う想定(Plan 003 の T-008)。
デスクトップへ重ねる表示シェルとして Electron を使う想定(Plan 002 で検証)。

DB・認証・デプロイ・Docker・Next.js などは MVP では扱わない。
overlay 自体は React を使わず Vanilla JS で書く(decisions 参照)。
SDK が React を要求するのとは別の話。

## ディレクトリ構成

```text
.
├── AGENTS.md          # AI 駆動開発のルール
├── README.md
├── TODO.md            # 作業の入口。Ready / Blocked / Icebox
├── TODO_ARCHIVE.md    # 完了タスク(新しいものほど上)
├── docs/
│   ├── research/      # 調査ノート(初期メモ・技術選定の根拠)
│   ├── plan/          # タスクの詳細(不確実なものは Spike 節を持つ)
│   └── decisions/     # 現在有効な決定事項(正本)
├── src/
│   ├── zoom/          # Meeting SDK クライアント(Vite の root)
│   ├── server/        # Express。SDK JWT の署名
│   └── overlay/       # 静的 HTML / CSS / JS のオーバーレイ(Plan 003 で作る)
└── vite.config.js
```

## セットアップ

前提: Node.js 24 系、npm。

```bash
npm install
cp .env.example .env   # 値を記入(下記)
```

### Zoom 側の準備

[Zoom App Marketplace](https://marketplace.zoom.us) で **General App** を作る。

1. **Develop → Build App → General app → Create**
2. **Basic Information** — Management type は **User-managed**、
   OAuth Redirect URL に `http://localhost:3000`
   (必須項目なので埋めるが、OAuth 認可フローは通らないため実際には使わない)
3. **Features → Embed → Meeting SDK を ON** ← **これを忘れると join できない**
4. **Scopes** — `user:read:zak` を 1 つ(Meeting SDK の要件)
5. **Basic Information** から **Client ID / Client Secret** を控える

審査も Marketplace への公開も不要。自分のアカウント内の会議に参加するだけなら
ZAK / OBF も要らない。詳細は
[docs/research/meeting-sdk-selection.md](./docs/research/meeting-sdk-selection.md)。

### `.env`

```bash
ZOOM_SDK_CLIENT_ID=...      # 上で控えた Client ID
ZOOM_SDK_CLIENT_SECRET=...  # 同 Client Secret
ZOOM_MEETING_NUMBER=...     # 検証に使う会議の番号(ハイフンなし)
ZOOM_MEETING_PASSWORD=...   # パスコード。招待 URL の pwd= ではなく人が入力する方
PORT=3000
```

### 起動

```bash
npm run dev
```

Vite(5173)と署名サーバー(3000)が同時に立つ。
ブラウザで **http://localhost:5173** を開くと、SDK が `Comment Overlay` という名前で
会議に参加し、受信したチャットの payload を画面と console に出す。

**会議はホストが開始しておく必要がある。** PMI は開始前だと
`errorCode 3008 / Meeting has not started` で join できない。
待機室が有効な場合はホスト側で入室を許可する。

チャットを投稿すると payload が流れる。Everyone 宛と DM の判別は
`receiver.userId === 0`(0 が Everyone)。

## 参考

- Zoom Meeting SDK Overview / Authorization / In-meeting chat(公式ドキュメントを一次情報とする)
- Zoom Team Chat と混同しないこと(今回欲しいのは Meeting 内チャット)
