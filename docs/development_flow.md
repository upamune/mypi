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
| diff をレビューしてほしい | `/review-diff [観点]` | コードレビュー形式で指摘を出す |
| 監査・多視点レビュー・大規模調査を並列で回したい | 「workflow でやって」と依頼 | `pi-dynamic-workflows` が script で subagent を fan-out して結果を統合する |
| 実装中に差分を小さく確認したい | `pi-slopchop` | ターミナルで現在の diff を素早く見る |
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

実装後に polish loop を入れたい場合は、明示的に `/review-start` や `/review-diff` を使います。`pi-simplify` は slash command として `/simplify` が使える環境なら手動で呼び出します。使えない場合は、レビュー時に clarity、重複、命名、局所的な複雑さ、既存パターンとのズレを観点として指定します。

大きいタスクを分けたいときは `pi-subagents` を使います。ただし、同じファイルを複数 agent が触りそうな作業には向きません。独立した調査や、別ディレクトリの実装に分けられるときだけ使うのがよいです。

### 3.5. 実装中の差分確認

実装中は、最後まで書き切ってからまとめて見るより、意味のある単位で diff を確認します。特に settings、installer、extension load、prompt のように壊れると起動不能になりやすい部分では、小さめに確認するほうが戻しやすいです。

まずは shell で状態を見ます。

```bash
git diff --stat
git diff -- <path>
```

差分が増えてきたら `pi-slopchop` を使います。ターミナル内で diff を追えるので、実装中の軽い確認に向いています。

```text
/slopchop
```

`slopchop` で見る観点は次です。

- unrelated な変更が混ざっていないか
- 触ったファイルの責務が広がりすぎていないか
- 削除したファイルや設定に、まだ README / docs / tests から参照が残っていないか
- 変更量に対してテストや確認コマンドが足りているか

`slopchop` は「人間が今の diff を読む」ための軽い道具として使います。指摘を agent に投げて直すところまで自動で回したい場合は `/review-diff` か `/review-start` に切り替えます。

GUI でコメントしながら見たい場合は `/plannotator-review` を使います。大きい diff、UI の見た目、行コメントを残したいレビューではこちらを使います。

`pi-diff-review` は Monaco ベースで diff を見たいときに使います。ターミナルで十分なら `slopchop`、視覚的に広く見たいなら `pi-diff-review`、承認や注釈まで含めるなら Plannotator、という使い分けにします。

### 4. 確認

`mypi` では基本的に次を使います。

```bash
bun test
pi --help
node bin/mypi.mjs status
```

使い分けは以下です。

| コマンド | 使うタイミング |
| --- | --- |
| `bun test` | catalog、manifest、CLI helper、テスト対象ロジックを変えたとき |
| `pi --help` | Pi 起動、extension 読み込み、settings 周りを変えたとき |
| `node bin/mypi.mjs status` | catalog source や install/status 表示を変えたとき |

### 5. レビュー

軽いレビューなら `/review-diff` で十分です。

```text
/review-diff 起動不能につながる regression がないか見て
```

自動で何度か見直してほしい場合は `/review-start` を使います。レビューで問題を直した場合は次のレビューに進み、問題なしになるか最大回数に達するまで続きます。

計画だけを見直したい場合は `/review-plan` を使います。

ブラウザ UI で人間が見たい場合は `/plannotator-review` を使います。diff にコメントしたいときや、視覚的に確認したいとき向きです。

## パッケージ / 拡張の使い分け

### 計画と承認

| Package / command | 使うタイミング | 注意 |
| --- | --- | --- |
| `@devkade/pi-plan` (`/plan`) | 実装前に read-only で計画だけを考えさせたいとき | 承認 UI ではなく計画モード制御が中心 |
| `pi-review-loop` (`/review-plan`, `/review-start`, `/review-status`) | 計画や実装を agent に複数回レビューさせたいとき | 最大反復数と auto trigger は明示的に決める |
| `@plannotator/pi-extension` (`/plannotator`, `/plannotator-review`, `Ctrl+Alt+P`) | 計画、diff、Markdown、直近回答を人間が UI で approve / annotate したいとき | plan は cwd 内の Markdown として submit する運用がわかりやすい |
| `/plan-loop-plannotator` | 計画作成、agent review loop、Plannotator submit まで一気に流したいとき | approve までは実装に入らない前提 |

おすすめの重めフロー:

```text
/plan-loop-plannotator
agent loop で plan 修正
Plannotator で人間レビュー
Approve 後に実装
実装後に /review-start or /plannotator-review
```

### 実装

| Package / command | 使うタイミング | 注意 |
| --- | --- | --- |
| `pi-subagents` (`/run`, `/parallel`, `/chain`) | 独立した調査、並列レビュー、別 agent への委譲をしたいとき | 同じファイルを複数 agent が触る作業には向かない |
| `pi-dynamic-workflows` (`workflow` tool) | 監査、多視点レビュー、fan-out 調査など、多数の subagent を script で決定的に制御したいとき | 「workflow でやって」と明示的に頼む。pi >= 0.78 が必要。prototype のため resumable run はなく、中断は `Esc` |
| `pi-add-dir` (`/add-dir`, `/suggest-dirs`, `/dirs`) | 別 checkout、sibling repo、関連 project の `AGENTS.md` / `CLAUDE.md` / skills を読ませたいとき | external skills を読ませた後は reload が必要になることがある |
| `pi-interactive-shell` (`/spawn`, `/attach`, `/dismiss`) | dev server、ssh、psql、vim、別 CLI agent など対話的なプロセスを TUI overlay で扱いたいとき | `interactive_shell(...)` は agent tool call で、人間が直接打つ command ではない |
| `pi-claude-cli` | Claude Code CLI のサブスク認証を Pi provider として使いたいとき | `claude` CLI が PATH にあり認証済みである必要がある |
| `mitsupi` `multi-edit` | 複数箇所の精密置換や patch を一回で適用したいとき | exact match 前提。大きな生成は通常の edit のほうが扱いやすい |
| `mitsupi` `uv` | Python repo で `pip` / `poetry` / `venv` 直叩きを避けたいとき | `bash` の挙動に介入するので、uv 前提でない project では注意 |
| `personal-repo-workflow` skill | 自分の repo で小さく安全に実装、レビュー、デバッグしたいとき | 汎用 skill ではなく個人 repo 前提 |

### 品質確認

| Package / command | 使うタイミング | 注意 |
| --- | --- | --- |
| `/review-diff` | 現在の diff を correctness、regression、security、missing tests 観点で見たいとき | `mitsupi` の `/review` との名前衝突を避けるため review-diff にしている |
| `mitsupi` review (`/review`, `/end-review`) | uncommitted、base branch、commit、PR、folder review を review session として扱いたいとき | PR review は clean working tree が必要 |
| `pi-review-loop` (`/review-start`) | レビュー、修正、再レビューを agent に回させたいとき | ループ条件が曖昧だと余計に回る |
| `pi-simplify` (`/simplify --staged`, `/simplify --ref=main`) | 動くけど複雑、過剰、読みづらい diff を挙動維持で整理したいとき | git diff 由来の変更が対象 |
| `pi-slopchop` (`/slopchop`, `Ctrl+Alt+S`) | 実装中に現在の diff をターミナルで小さく確認し、line/file/change コメントを作りたいとき | feedback prompt は editor に入るだけで auto-send されない |
| `pi-diff-review` (`/diff-review`) | Monaco ベースの native diff viewer で広めに確認したいとき | コメントは feedback prompt として返る。テスト確認の代替にはしない |
| `/plannotator-review` | diff をブラウザ UI で確認し、注釈や承認を残したいとき | 人間レビューの最終確認向き |

### 調査 / コンテキスト

| Package / command | 使うタイミング | 注意 |
| --- | --- | --- |
| `/investigate` | 触る場所や原因が曖昧で、実装前に事実、仮説、最小修正を分けたいとき | 調査用。実装まで進めたい場合は明示する |
| `pi-web-access` (`/websearch`, `/search`, `web_search`, `fetch_content`) | Web 検索、URL/PDF/GitHub/YouTube/local video の内容が必要なとき | 動画は `ffmpeg` / `yt-dlp`、private GitHub は `gh` CLI が必要になる |
| `pi-mcp-adapter` (`/mcp`, `/mcp-auth`, `mcp`) | MCP server を context を増やしすぎず on-demand に使いたいとき | direct tools は便利だが tool list と context が増える |
| `pi-prompt-template-model` (`/chain-prompts`, `/prompt-tool`) | prompt ごとに model、thinking、skill、subagent、loop を切り替えたいとき | command 名は読み込まれた prompt files から動的に増える |
| `pi-ask-user` (`ask_user`) | 曖昧な要件や高影響の判断で、人間に短く確認したいとき | UI が使えない環境では fallback になる |
| `pi-memory-md` (`/memory-refresh`, `/memory-check`, `/memory-anchor`) | セッションをまたぐ durable memory、project 知識、handoff anchor を残したいとき | git-backed なので sync 状態と token 消費に注意 |
| `pi-autoresearch` (`/autoresearch`) | ベンチマーク、性能改善、試行錯誤を「計測、keep/discard、記録」で長時間回したいとき | `keep` は auto-commit、`discard` / `crash` は revert する |
| `pi-resource-center` | 入っている Pi package、skill、extension、prompt、theme を眺めたいとき | catalog 探索用。日常の実装 command ではない |

### 作業しやすさ

| Package / command | 使うタイミング | 注意 |
| --- | --- | --- |
| `pi-btw` (`/btw`, `/btw:new`, `/btw:inject`, `/btw:summarize`) | 本筋から外れる横道相談を main session から分離したいとき | 必要な結論は inject / summarize で main に戻す |
| `pi-raw-paste` (`/paste`) | 次の paste を整形されない raw input として扱いたいとき | 一回 arm して次 paste に効く |
| `pi-usage-extension` (`/usage`) | token / cost / period 別 usage dashboard を見たいとき | UI session 前提 |
| `@juanibiapina/pi-extension-settings` (`/extension-settings`) | 拡張設定をまとめて UI で変更したいとき | consumer extension より前に load する |
| `@juanibiapina/pi-powerbar` | git branch、tokens、context usage、provider、model などを常時見たいとき | status bar 用。作業 command ではない |
| `mitsupi` `context` (`/context`) | loaded resources、commands、tool token estimate、context 消費を見たいとき | token は概算 |
| `mitsupi` `files` (`/files`, `ctrl+shift+o`) | セッションで参照したファイルや git status 付き file picker を開きたいとき | macOS / terminal shortcut 依存 |
| `mitsupi` `answer` / `btw` / `prompt-editor` (`/answer`, `/btw`, `/mode`) | assistant の質問にまとめて答える、本筋外の質問を逃がす、prompt mode を切り替えるとき | 重要情報は main conversation に戻す |
| `mitsupi` `loop` (`/loop`, `signal_loop_success`) | tests pass など明確な成功条件まで follow-up loop したいとき | 成功条件が曖昧だと無駄に回る |
| `mitsupi` `todos` (`/todos`, `todo`) | session をまたぐ markdown todo、claim/release 付き作業キューを使いたいとき | `pi-manage-todo-list` の `/todos` と衝突しうる |
| `pi-manage-todo-list` (`manage_todo_list`, `/todos`) | agent に複数ステップの作業を可視化、更新させたいとき | 小さい単発作業には重い。todo list は全置換 |
| `@ogulcancelik/pi-herdr` (`herdr` tool) | Herdr の pane / tab / workspace を pi から操作したいとき(pane 分割、`run` / `read` / `watch`、`wait_agent`) | Herdr 管理の pane 内(`HERDR_ENV=1`)でのみ有効。herdr 本体は `mise use -g herdr` |
| `mitsupi` `control` (`/control-sessions`, `send_to_session`) | 複数 Pi session を外から制御、連携したいとき | advanced workflow。送信先 session を必ず確認する |
| `mitsupi` `split-fork` (`/split-fork`) | 現在 session を fork して別 Ghostty split で並行検討したいとき | 並行編集の conflict に注意 |
| `mitsupi` `session-breakdown` (`/session-breakdown`) | 直近 7/30/90 日の session usage、tokens、cost を見たいとき | usage / cost は概算になりうる |
| `pi-terminal-theme`, `@victor-software-house/pi-curated-themes` | Pi の見た目を端末 palette や curated dark theme に合わせたいとき | `/settings` か settings JSON で theme を選ぶ |

### sub-agent に任せる判断

`pi-subagents` は「別 agent に渡しても安全な、境界が切れている作業」に使います。

`pi-dynamic-workflows` との使い分け: 少数のサブタスクを会話の流れで委譲するなら `pi-subagents`、「finder N 体 → 検証 → 統合」のように多数の agent を JavaScript の loop / parallel / pipeline で決定的に回したい(JSON Schema で構造化結果を集めたい)なら workflow を使います。Claude Code の dynamic workflows の Pi 移植版で、model が workflow script を書いて `workflow` tool で実行します。

任せてよい例:

- package の README / manifest 調査
- 既存実装の読み取りと要約
- 互いに独立した仮説検証
- 別ディレクトリ、別 module、別 doc の編集
- 実装後の second opinion review

任せないほうがよい例:

- いま自分が次に触る必要がある critical path の作業
- 同じファイルを同時に編集する作業
- 仕様判断や破壊的変更の最終決定
- credential、settings、global config を直接変える作業

sub-agent に依頼するときは、責任範囲、触ってよいファイル、返してほしい形式を明確にします。実装 worker に渡す場合は「他の agent も同じ repo で作業しているので、他人の変更を戻さない」と明示します。

## Commit 前チェック

commit 前はだいたいこの順番で確認します。

```bash
git diff --stat
bun test
git status --short
```

Pi 起動や settings に触った場合はこれも追加します。

```bash
pi --help
node bin/mypi.mjs status
```

確認すること:

- unrelated なファイルが混ざっていない
- `~/.pi/agent/settings.json` などユーザー設定の変更を repo commit に混ぜていない
- test / 起動確認の結果を最終報告に含められる
- 必要なら `/review` か `/review-start` を通している
