# mypi

自分専用の [Pi](https://pi.dev/) coding agent セットアップです。

この repo は 2 つの役割を持ちます。

- `mypi` CLI: Pi 本体と、よく使う Pi packages をまとめてインストールする
- Pi package: この repo 内の `skills/` と `prompts/` を Pi に読み込ませる

## Install

ローカル checkout から試す場合:

```bash
node bin/mypi.mjs install --self-source .
```

GitHub に push した後に使う場合:

```bash
npx github:upamune/mypi install
```

project local に入れる場合:

```bash
node bin/mypi.mjs install --local --self-source .
```

## Commands

```bash
node bin/mypi.mjs install              # selected catalog を global に入れる
node bin/mypi.mjs install --local      # current project の .pi/settings.json に入れる
node bin/mypi.mjs install --only core  # category / package id で絞る
node bin/mypi.mjs status               # catalog の installed/missing を見る
node bin/mypi.mjs update               # catalog reconcile + pi update
node bin/mypi.mjs remove usage         # catalog id または raw source を削除
node bin/mypi.mjs doctor               # node/npm/git/pi/auth/settings を確認
```

実行内容だけ見たいとき:

```bash
node bin/mypi.mjs install --dry-run --self-source .
```

## Catalog

default では次を入れます。

| Category | ID | Source | Description |
| --- | --- | --- | --- |
| `personal` | `mypi` | [github.com/upamune/mypi](https://github.com/upamune/mypi) | Personal Pi prompts and skills from this repo |
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

## After Install

Pi を起動します。

```bash
pi
```

認証がまだなら、Pi の中で `/login` します。API key を使う場合は `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` などを shell に設定してから起動します。
