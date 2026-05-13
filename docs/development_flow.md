# 開発フロー

`mypi` で入れている Pi のプロンプト、スキル、拡張を、開発中にどう使い分けるかの人間向けメモです。

目的は「最初から重いワークフローにしない」「必要なところだけレビューや承認を厚くする」ことです。

## 基本方針

- 小さい修正は軽く進める
- 迷う修正は先に調査する
- 影響範囲が広い修正は計画を作ってから進める
- 計画や差分は、必要に応じて agent loop と Plannotator で確認する
- 最後は `git diff` とテスト結果を見てから commit する

## まず何を使うか

| 状況 | 使うもの | 目的 |
| --- | --- | --- |
| どこを直すべきかわからない | `/investigate <質問>` | コードを読ませて事実と仮説を分ける |
| やることは明確 | 通常の依頼文 | 実装、確認、最後のまとめまで進める |
| 計画を先に固めたい | `/plan-loop-plannotator` | 計画作成、agent review loop、Plannotator 確認まで流す |
| 既に計画がある | `/review-plan` | 計画だけを agent loop で見直す |
| 実装後に自己レビューだけ追加したい | `/review-start` | 問題がなくなるまで agent にレビューを回させる |
| diff をレビューしてほしい | `/review [観点]` | コードレビュー形式で指摘を出す |
| ブラウザ UI で diff を見たい | `/plannotator-review` | 行コメント付きで視覚的に確認する |

## 通常の開発フロー

### 1. 調査

曖昧な依頼や、触る場所が不明なときは `/investigate` から始めます。

```text
/investigate pi 起動時に npmCommand が壊れる原因を調べて
```

この段階では、まだ実装させずに「どのファイルが関係するか」「何が原因か」「最小修正は何か」を出させます。

関連 repo も読ませたい場合は `pi-add-dir` を使います。別 checkout や sibling package が原因に絡むときだけで十分です。

### 2. 計画

小さい修正なら会話中の短い計画で十分です。

次のような場合は `/plan-loop-plannotator` を使います。

- 複数ファイルを触る
- 仕様や挙動が変わる
- 失敗すると起動不能やデータ破壊につながる
- 「実装前に人間が承認したい」

```text
/plan-loop-plannotator
```

このプロンプトは次の流れを想定しています。

1. agent が Markdown checklist の計画を作る
2. `pi-review-loop` で計画を複数回レビューする
3. 見つかった問題を計画に反映する
4. 最後に Plannotator に submit する
5. 人間が approve / annotate する

Plannotator で approve するまでは実装に入らない、という運用にします。

### 3. 実装

実装する内容が明確なら、通常の依頼文でそのまま進めます。

```text
mypi の npmCommand を Bun に切り替えて、package 解決が正しく動くようにして
```

期待する動きは、関連コード確認、最小修正、テスト、diff 確認、最終報告までです。

実装後に polish loop を入れたい場合は、明示的に `/review-start` や `/review` を使います。`pi-simplify` は slash command として `/simplify` が使える環境なら手動で呼び出します。使えない場合は、レビュー時に clarity、重複、命名、局所的な複雑さ、既存パターンとのズレを観点として指定します。

大きいタスクを分けたいときは `pi-subagents` を使います。ただし、同じファイルを複数 agent が触りそうな作業には向きません。独立した調査や、別ディレクトリの実装に分けられるときだけ使うのがよいです。

### 4. 確認

`mypi` では基本的に次を使います。

```bash
npm test
PI_OFFLINE=1 pi --help
node bin/mypi.mjs status
```

使い分けは以下です。

| コマンド | 使うタイミング |
| --- | --- |
| `npm test` | catalog、manifest、CLI helper、テスト対象ロジックを変えたとき |
| `PI_OFFLINE=1 pi --help` | Pi 起動、extension 読み込み、settings 周りを変えたとき |
| `node bin/mypi.mjs status` | catalog source や install/status 表示を変えたとき |

`PI_OFFLINE=1` を使うのは、毎回 npm package 解決を走らせずに extension load の破損だけ確認したいからです。

### 5. レビュー

軽いレビューなら `/review` で十分です。

```text
/review 起動不能につながる regression がないか見て
```

自動で何度か見直してほしい場合は `/review-start` を使います。レビューで問題を直した場合は次のレビューに進み、問題なしになるか最大回数に達するまで続きます。

計画だけを見直したい場合は `/review-plan` を使います。

ブラウザ UI で人間が見たい場合は `/plannotator-review` を使います。diff にコメントしたいときや、視覚的に確認したいとき向きです。

## パッケージ / 拡張の使い分け

### 計画と承認

| Package | 用途 |
| --- | --- |
| `@devkade/pi-plan` | read-only で計画を考えさせたいとき |
| `pi-review-loop` | 計画や実装を agent に繰り返しレビューさせたいとき |
| `@plannotator/pi-extension` | 計画や差分を人間が UI で approve / annotate したいとき |

おすすめの重めフロー:

```text
/plan-loop-plannotator
agent loop で plan 修正
Plannotator で人間レビュー
Approve 後に実装
実装後に /review-start or /plannotator-review
```

### 実装

| Package | 用途 |
| --- | --- |
| `pi-subagents` | 独立した調査や実装を並列化したいとき |
| `pi-add-dir` | 別 checkout や sibling repo も読ませたいとき |
| `mitsupi` extensions | file picker、context、uv/python、multi-edit など普段の作業補助 |

### 品質確認

| Package / prompt | 用途 |
| --- | --- |
| `/review` | 現在の diff をコードレビューしてもらう |
| `/review-start` | 実装後の自己レビューを loop させる |
| `/review-plan` | 計画を loop で見直す |
| `pi-simplify` | 動くけど複雑、過剰、読みづらい変更を整理したいとき |
| `pi-diff-review` / `pi-slopchop` | diff をターミナル寄りに確認したいとき |
| `/plannotator-review` | diff をブラウザ UI で確認したいとき |

### 調査 / コンテキスト

| Package | 用途 |
| --- | --- |
| `pi-web-access` | 現在の外部情報や URL の内容が必要なとき |
| `pi-mcp-adapter` | MCP server 経由の情報や操作が必要なとき |
| `pi-memory-md` | セッションをまたぐメモを残したいとき |
| `pi-autoresearch` | ベンチマークや試行錯誤を記録しながら回したいとき |

### 作業しやすさ

| Package | 用途 |
| --- | --- |
| `pi-btw` | 本筋から外れる質問を別枠で聞きたいとき |
| `pi-interactive-shell` | 長い shell 作業や対話的な command を見たいとき |
| `pi-usage-extension` | token / cost を見たいとき |
| `@juanibiapina/pi-powerbar` | session 状態を常に見たいとき |
| theme packages | 端末表示を整えたいとき |

## Commit 前チェック

commit 前はだいたいこの順番で確認します。

```bash
git diff --stat
npm test
git status --short
```

Pi 起動や settings に触った場合はこれも追加します。

```bash
PI_OFFLINE=1 pi --help
node bin/mypi.mjs status
```

確認すること:

- unrelated なファイルが混ざっていない
- `~/.pi/agent/settings.json` などユーザー設定の変更を repo commit に混ぜていない
- test / 起動確認の結果を最終報告に含められる
- 必要なら `/review` か `/review-start` を通している
