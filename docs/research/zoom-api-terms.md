# 制約: Zoom API 利用規約の許諾範囲

- 日付: 2026-09-05
- 結論: **MVP(自分だけの利用)は問題なし。社内展開も条件付きで可。社外は不可**
- 一次ソース: https://www.zoom.com/en/trust/legal/zoom-api-license-and-tou/ (2026-09-05 確認)

**注意: 以下は規約の文面に基づく読み取りであり、法的助言ではない。**
業務で本格運用する段階では法務確認を挟むこと。

## なぜ調べたか

Meeting SDK を使うには API 利用規約への同意が要る。同意する前に、
このプロジェクトが許諾範囲に収まるかを確認した。特に「将来社内に配りたい」
という要求が規約上どう扱われるかを明確にする必要があった。

## 結論

| 展開先 | 可否 | 根拠 |
|---|---|---|
| 自分だけ | 可 | internal business purposes に収まる |
| 社内の正社員(守秘義務あり) | 可 | Third Party の定義から外れる |
| 業務委託・フリーランス | **要確認** | 契約に守秘義務条項があるかによる |
| 社外・顧客・取引先 | **不可** | 審査または Marketplace 公開が必要 |

## 根拠となる原文

### 利用許諾

> Zoom grants you a limited, non-exclusive, non-assignable, non-transferable,
> revocable license to develop, test, and support your Application, and allow
> customers of Zoom's services or software to use your integration

**revocable(取り消し可能)** である点に注意。Zoom は裁量でアクセスを停止できる。

### 内部利用の範囲

> your Application may be used only for internal business purposes, and you agree
> not to share, sell, transfer, outsource, resell, rent, lease, lend, or otherwise
> provide access to your Application

「internal business purposes」自体の定義は規約中にない。
実質的には「配布しないこと」を指していると読める。

### 第三者配布の条件

> Third Party Use of your Application(s) is permitted only where:
> (1) your Application has been published to the Zoom App Marketplace; or
> (2) that Third Party Use has been approved, in writing, in advance, by Zoom.

### Third Party の定義 — **社内展開の可否はここで決まる**

> anyone who is not both: (1) your employee or agent; and (2) contractually-bound
> in writing to the use and confidentiality restrictions

**条件が AND である点が要点。** 従業員であることに加えて、
書面で利用制限・守秘義務に拘束されている必要がある。

通常の正社員は雇用契約や就業規則の守秘義務条項がこれを満たすと考えられる。
業務委託・フリーランスは契約内容次第なので個別確認が要る。

### その他の禁止事項

このプロジェクトに関係しうるもの。

- Zoom のサービスの機能を再現すること(recreate the features or functionality)
- 取得したデータのスクレイピング・データベース化
- 広告・マーケティング目的での利用
- 同意なく AI / ML モデルの学習に顧客コンテンツを使うこと

## 本プロジェクトとの照合

| 禁止事項 | 本プロジェクトの状況 |
|---|---|
| Zoom の機能の再現 | **抵触しないと判断。** チャットを表示補助するものであり、Zoom を置き換えない |
| スクレイピング・DB 化 | 該当しない。チャット履歴を永続化しない方針(decisions) |
| 広告・マーケティング利用 | 該当しない |
| AI / ML の学習利用 | 該当しない |
| プライバシー法の遵守と同意取得 | **対応が要る。** 下記参照 |

### プライバシー面の要請

規約はエンドユーザーからの適切な同意取得を求めている。チャットを画面共有へ
再表示する以上、参加者への告知が要る。

これは [000-initial-notes](./000-initial-notes.md) の「プライバシー」節が既に
挙げていた論点(「Everyone宛のチャットは共有画面上にも表示されます」と案内する)と
同じで、規約側からも裏付けられた形。

**MVP では口頭告知で足りる。** 他人が参加する場で使うなら告知は必須。

## 適用範囲の注意

**アプリを「使う」人と、ミーティングの「参加者」は別。**

- **使う人**(overlay を起動し画面共有する人) — Third Party 条項の対象。社内に限る
- **参加者**(チャットを書く人) — アプリを使っているわけではないので Third Party 条項の
  対象外。社外の人が参加していてもよい。ただしプライバシー面の告知は要る

## その他の条件

- API は **AS IS** で無保証
- **責任上限は 500 ドル**
- 開発者側に補償義務(indemnification)がある
- 請求は 1 年以内に提起する必要がある
- セキュリティ侵害は **24 時間以内**に Zoom へ報告する義務
- 過大な帯域消費や、必要最小限を超えるデータ要求をしないこと

## 前提が変わる条件

以下が変わったら再確認する。

- **社外へ配布する場合** — Marketplace 公開(審査あり)または Zoom からの書面承認が要る。
  プライバシー影響評価への協力義務なども追加で効いてくる。MVP の内部利用とは要求水準が別物
- **業務委託メンバーへ展開する場合** — その契約に書面の守秘義務があるか確認する
- **チャット内容を保存・分析する方向へ広げる場合** — スクレイピング / DB 化の禁止条項と、
  AI 学習利用の制限に抵触しないか確認し直す
- **規約自体が改定された場合** — 上記の引用は 2026-09-05 時点のもの

## 技術面の補足

規約とは別に、アプリのインストール範囲という論点がある。

General App を Local Test で自分のアカウントに追加する形では、他のメンバーは使えない。
社内展開するには管理者による組織内アプリの承認か、Publishable URL 経由の追加が要る。
規約上 Publishable URL は限定的なプライベートベータ用で外部共有不可とされているため、
社内配布はこの範囲に収まる。
