# mypi

自分専用の [Pi](https://pi.dev/) coding agent セットアップです。

この repo は 2 つの役割を持ちます。

- `mypi` CLI: Pi 本体と、よく使う Pi packages をまとめてインストールする
- Pi package: この repo 内の `skills/`, `prompts/`, `extensions/` と `mitsupi` の extensions を Pi に読み込ませる
- bundled extensions: [`mitsupi`](https://github.com/mitsuhiko/agent-stuff) package 経由で `agent-stuff` の published extensions を読み込ませつつ、npm package に未収録の `goal.ts` はこの repo から追加で読み込ませる

## Install

ローカル checkout から試す場合:

```bash
aube run install:local-source
```

GitHub に push した後に使う場合:

```bash
pi install git:github.com/upamune/mypi
pi
/mypi-setup
```

`/mypi-setup` はこの package に含まれる Pi slash command です。Pi の中から `mypi install --yes` 相当を実行して catalog を reconcile します。
package の `install` script は使わず、Pi package installs 用の `npmCommand` も `bin/aube-npm-command.mjs` に設定するため、実際の package manager は aube のままです。

one-shot CLI として直接実行したい場合:

```bash
aubx -p github:upamune/mypi mypi install
```

project local に入れる場合:

```bash
aube run install:local-source -- --local
```

## Commands

GitHub から直接実行する場合:

```bash
aubx -p github:upamune/mypi mypi install              # selected catalog を global に入れる
aubx -p github:upamune/mypi mypi install --local      # current project の .pi/settings.json に入れる
aubx -p github:upamune/mypi mypi install --only core  # category / package id で絞る
aubx -p github:upamune/mypi mypi status               # catalog の installed/missing を見る
aubx -p github:upamune/mypi mypi update               # catalog reconcile + pi update
aubx -p github:upamune/mypi mypi remove usage         # catalog id または raw source を削除
aubx -p github:upamune/mypi mypi doctor               # node/aube/git/pi/auth/settings を確認
```

Pi 内で実行する場合:

```text
/mypi-setup              # selected catalog を global に入れる
/mypi-setup --local      # current project の .pi/settings.json に入れる
/mypi-setup --only core  # category / package id で絞る
/mypi-setup --dry-run    # 実行内容だけ見る
```

ローカル checkout では aube scripts 経由で実行します。

```bash
aube run setup
aube run status
aube run doctor
```

`install` / `update` は Pi の `npmCommand` に `bin/aube-npm-command.mjs` を設定します。Pi からは npm 互換コマンドとして呼ばれますが、ラッパー内で `aube install -g` を `aube add -g` に変換するため、実際の package manager は aube になります。

### Aube settings for Pi package installs

この machine の通常の aube は `paranoid=true` / `strictDepBuilds=true` のままで使います。Pi package install だけは npm-compatible な global installer として動くため、`bin/aube-npm-command.mjs` が child process にだけ次の調整を入れます。ユーザーの global aube config を恒久的に緩める必要はありません。

- `install -g <pkg>` を `aube add -g <pkg>` に変換する
- public npm packages 解決用に `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/` を設定する
  - 通常 shell の registry が private/proxy registry の場合でも Pi catalog を解決できるようにするため
- `NPM_CONFIG_TRUST_POLICY=no-downgrade` を維持する
- `NPM_CONFIG_TRUST_POLICY_EXCLUDE=pi-ask-user@0.11.0` を設定する
  - catalog 内で必要な package だけ trust downgrade 判定から除外する
- `NPM_CONFIG_DEPRECATION_WARNINGS=none` を設定する
  - 旧 `@mariozechner/*` peer が残る package の deprecation warning を global install に限って mute する
- `NPM_CONFIG_PARANOID=false` と `NPM_CONFIG_STRICT_DEP_BUILDS=false` を child process にだけ設定する
  - `@google/genai`, `koffi`, `protobufjs` などの transitive dependency が build script review で Pi catalog install 全体を止めないようにするため
  - build scripts は aube により ignore され、必要ならあとで `aube approve-builds` で明示レビューする
- `--allow-build=@google/genai`, `--allow-build=koffi`, `--allow-build=protobufjs` を付けて、global aube manifest に review 対象を明示する
- `aube root -g` の結果ディレクトリがまだ存在しない初回 install でも落ちないようにする

確認したいとき:

```bash
aube config get paranoid          # expected: true
aube config get strictDepBuilds   # expected: true
aube run install:local-source
aube run status
```

実行内容だけ見たいとき:

```bash
aube run install:local-source -- --dry-run
```

## Skills

この package は Pi skill として次を公開します。

- `/skill:personal-repo-workflow`: 自分用 repo workflow preferences
- `/skill:grill-me`: Matt Pocock-style に、実装前の要件を codebase-first で確認し、1 度に 1 つずつ質問する requirements interview

## Catalog

default では次を入れます。

| Category | ID | Source | Description |
| --- | --- | --- | --- |
| `personal` | `mypi` | [github.com/upamune/mypi](https://github.com/upamune/mypi) | Personal Pi prompts, skills, local `goal.ts`, and bundled mitsupi extensions |
| `core` | `subagents` | [npm:pi-subagents](https://www.npmjs.com/package/pi-subagents) | Sub-agent execution |
| `core` | `ask-user` | [npm:pi-ask-user](https://www.npmjs.com/package/pi-ask-user) | Interactive ask-user prompts for agent workflows |
| `core` | `mcp` | [npm:pi-mcp-adapter](https://www.npmjs.com/package/pi-mcp-adapter) | MCP server integration |
| `core` | `web-access` | [npm:pi-web-access](https://www.npmjs.com/package/pi-web-access) | Web search and URL fetching |
| `core` | `memory` | [github.com/VandeeFeng/pi-memory-md](https://github.com/VandeeFeng/pi-memory-md) | Markdown-backed persistent memory |
| `core` | `plan` | [npm:@devkade/pi-plan](https://www.npmjs.com/package/@devkade/pi-plan) | Read-only planning mode |
| `core` | `simplify` | [npm:pi-simplify](https://www.npmjs.com/package/pi-simplify) | Code clarity and consistency review |
| `core` | `add-dir` | [npm:pi-add-dir](https://www.npmjs.com/package/pi-add-dir) | Load extra project directories |
| `core` | `prompt-templates` | [npm:pi-prompt-template-model](https://www.npmjs.com/package/pi-prompt-template-model) | Prompt template model and thinking frontmatter |
| `core` | `claude-cli` | [npm:pi-claude-cli](https://www.npmjs.com/package/pi-claude-cli) | Claude Code CLI auth as a Pi provider |
| `ui` | `powerbar-settings` | [npm:@juanibiapina/pi-extension-settings](https://www.npmjs.com/package/@juanibiapina/pi-extension-settings) | Shared settings layer for UI extensions |
| `ui` | `powerbar` | [npm:@juanibiapina/pi-powerbar](https://www.npmjs.com/package/@juanibiapina/pi-powerbar) | Live status bar |
| `ui` | `usage` | [npm:@tmustier/pi-usage-extension](https://www.npmjs.com/package/@tmustier/pi-usage-extension) | Token and cost tracker |
| `ui` | `raw-paste` | [npm:@tmustier/pi-raw-paste](https://www.npmjs.com/package/@tmustier/pi-raw-paste) | Raw clipboard paste command |
| `ui` | `todos` | [github.com/tintinweb/pi-manage-todo-list](https://github.com/tintinweb/pi-manage-todo-list) | Todo list management |
| `ui` | `btw` | [npm:pi-btw](https://www.npmjs.com/package/pi-btw) | Side questions without polluting history |
| `ui` | `interactive-shell` | [npm:pi-interactive-shell](https://www.npmjs.com/package/pi-interactive-shell) | Observable interactive shell overlays |
| `ui` | `plannotator` | [npm:@plannotator/pi-extension](https://www.npmjs.com/package/@plannotator/pi-extension) | Visual plan review, annotation, and approval workflow |
| `ui` | `diff-review` | [github.com/badlogic/pi-diff-review](https://github.com/badlogic/pi-diff-review) | Native diff review window with Monaco |
| `ui` | `slopchop` | [npm:pi-slopchop](https://www.npmjs.com/package/pi-slopchop) | Terminal-native diff review |
| `research` | `autoresearch` | [github.com/davebcn87/pi-autoresearch](https://github.com/davebcn87/pi-autoresearch) | Autonomous research and experiment loop |
| `themes` | `terminal-theme` | [npm:pi-terminal-theme](https://www.npmjs.com/package/pi-terminal-theme) | Map Pi colors to terminal ANSI colors |
| `themes` | `curated-themes` | [npm:@victor-software-house/pi-curated-themes](https://www.npmjs.com/package/@victor-software-house/pi-curated-themes) | Curated terminal themes |

## Bundled Extensions

`mitsuhiko/agent-stuff` は npm package `mitsupi` として依存に入れ、Pi manifest から `node_modules/mitsupi/extensions` を参照します。npm package 版の `mitsupi@1.6.0` には GitHub HEAD にある `goal.ts` が含まれていないため、`goal.ts` だけこの repo の `extensions/goal.ts` に置いて Pi manifest から先に読み込ませます。`uv.ts` が参照する PATH shim は `mitsupi` package 側の `intercepted-commands/` を使います。

| Source | Path | Contents |
| --- | --- | --- |
| local | `extensions/goal.ts` | GitHub HEAD の `goal.ts`。`/goal`, `get_goal`, `create_goal`, `update_goal` を追加 |
| `mitsupi@1.6.0` | `node_modules/mitsupi/extensions` | published package に含まれる `context.ts`, `uv.ts`, `multi-edit.ts` など |

## After Install

Pi を起動します。

```bash
pi
```

認証がまだなら、Pi の中で `/login` します。API key を使う場合は `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` などを shell に設定してから起動します。

## Development

この repo 自体の package manager は aube です。`aube-workspace.yaml` は `paranoid: true` と 3 日の minimum release age を有効にしています。

```bash
aube install
aube test
aube pack --dry-run
```
