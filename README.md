# mypi

自分専用の [Pi](https://pi.dev/) coding agent セットアップです。

この repo は 2 つの役割を持ちます。

- `mypi` CLI: Pi 本体と、よく使う Pi packages をまとめてインストールする
- Pi package: この repo 内の `skills/`, `prompts/`, `extensions/` と `mitsupi` の extensions を Pi に読み込ませる
- bundled extensions: [`mitsupi`](https://github.com/mitsuhiko/agent-stuff) package 経由で `agent-stuff` の published extensions を読み込ませつつ、npm package に未収録の `goal.ts` はこの repo から追加で読み込ませる

## Install

ローカル checkout から試す場合:

```bash
bun run install:local-source
```

GitHub に push した後に使う場合:

```bash
bunx github:upamune/mypi mypi install
```

project local に入れる場合:

```bash
bun run install:local-source -- --local
```

## Commands

GitHub から直接実行する場合:

```bash
bunx github:upamune/mypi mypi install              # selected catalog を global に入れる
bunx github:upamune/mypi mypi install --local      # current project の .pi/settings.json に入れる
bunx github:upamune/mypi mypi install --only core  # category / package id で絞る
bunx github:upamune/mypi mypi status               # catalog の installed/missing を見る
bunx github:upamune/mypi mypi update               # catalog reconcile + pi update
bunx github:upamune/mypi mypi remove usage         # catalog id または raw source を削除
bunx github:upamune/mypi mypi doctor               # node/bun/git/pi/auth/settings を確認
```

ローカル checkout では Bun scripts 経由で実行します。

```bash
bun run setup
bun run status
bun run doctor
```

`install` / `update` は Pi の `npmCommand` に `["bun"]` を設定します。Pi package の npm install は Bun の global store に入り、起動時の extension 解決も Bun 側の global `node_modules` を使います。

### Bun settings for Pi package installs

Pi package install には Bun を使います。以前の package-manager 互換ラッパーは使いません。

- `npmCommand` は `["bun"]`
- global package は `~/.bun/install/global/node_modules` に入る
- `bun install -g npm:<package>@<version>` が Pi catalog の npm source を解決する
- Bun は一部 transitive dependency の postinstall を block することがある
  - 必要になった場合は `bun pm -g untrusted` で確認して、明示的に trust する

確認したいとき:

```bash
bun --version
bun run install:local-source
bun run status
```

実行内容だけ見たいとき:

```bash
bun run install:local-source -- --dry-run
```

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
| `core` | `review-loop` | [npm:pi-review-loop](https://www.npmjs.com/package/pi-review-loop) | Automated plan and code review loop |
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

## Plan Review Workflow

`/plan-loop-plannotator` drafts a markdown checklist plan, runs `pi-review-loop` over the plan with fresh context, then submits the final plan to Plannotator for human approval.

For manual control, use `/review-plan` to run the agent loop over a plan, then `/plannotator <plan.md>` or `plannotator_submit_plan` to open the visual review UI.

日々の開発でどの prompt / skill / package をいつ使うかは [`docs/development_flow.md`](docs/development_flow.md) にまとめています。

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

この repo 自体の package manager も Bun です。

```bash
bun install
bun test
bun pm pack --dry-run
```
