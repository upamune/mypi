# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
bun run test                               # テスト実行(node --test)
node --test --test-name-pattern "catalog"  # 単一テストの絞り込み実行
node bin/mypi.mjs install --dry-run --yes  # インストーラの smoke(実書き込みなし)
node bin/mypi.mjs status | doctor | list | outdated
bun run install:local-source               # ローカル checkout を self source として install
```

- **`bun test` は使わない**。Bun 自前 runner で挙動が変わるため、CI と同じ `bun run test`(= `node --test`)を使う。
- `.github/workflows/ci.yml` を編集したら `pinact run .github/workflows/ci.yml` で action の SHA pin を維持する(pinact は mise 管理、非対話シェルでは `mise x -- pinact`)。

## アーキテクチャ

この repo は 2 つの役割を持つ:

1. **`mypi` CLI**(`bin/mypi.mjs`、単一ファイル): Pi 本体と厳選 package を `pi install` でまとめて導入するインストーラ。`~/.pi/agent/settings.json`(または `--local` で `./.pi/settings.json`)を直接編集する。
2. **Pi package 本体**: `package.json` の `pi` manifest が `skills/` と `prompts/` を Pi に読み込ませる。

### CATALOG が唯一の source of truth

導入 package の一覧・pin は `bin/mypi.mjs` の `CATALOG` 配列だけで管理する。npm source は exact version、git source は commit SHA で pin する(テストが強制)。README のカタログ表は手書きだが、全 id の掲載をテストが検証する。pin の陳腐化は `node bin/mypi.mjs outdated` で検知する。

### 冪等性は設計要件

`install` / `update` は再実行が no-op になることを保証している。settings への書き込みは必ず差分チェックしてから行い、変更時のみ backup を作る(直近 5 世代保持)。この性質を壊す変更をしたら、scratch ディレクトリで `--local` を使って「2 回目の実行が no-op か」を実測して確認する。

### pi の settings 操作に関する非自明な制約

実挙動の検証で判明した制約。pin 更新まわりを触るとき必読:

- `pi install` は同名 package の既存 entry を**旧 source 文字列のまま残す**(新 entry を追加しない)。
- `pi remove` は source 文字列ではなく **package 名単位**で削除するため、旧 pin の掃除に使うと新 pin まで巻き添えで消える。
- そのため pin 更新時は settings の `packages` 配列を直接「旧 source → 新 source」に書き換えている(`cmdInstall` の `toUpgrade` 処理)。
- source の同一性比較は `normalizeSource`(version / commit pin と URL 表記差を吸収して package 名で比較)を通す。

### mitsupi は git pin で導入

`mitsuhiko/agent-stuff` は repo root がそのまま `mitsupi` Pi package なので、catalog の git source(commit pin)として入れる。npm の `mitsupi` package は 2026-04 で publish が止まっているため使わない(npm 依存 + goal.ts vendoring の旧構成から一本化した経緯がある)。pin は週次 workflow が自動更新する。

### Pi package の解決は Bun

installer は settings に `npmCommand: ["bun"]` を書き、Pi の package install は Bun の global store(`~/.bun/install/global/node_modules`)を使う。Bun が transitive dependency の postinstall を block した場合は `bun pm -g untrusted` で確認して明示的に trust する。

## 変更時の注意

- settings / installer / extension 読み込みを壊すと Pi が起動不能になる。関連変更後は `bun run test` に加えて `pi --help` と `node bin/mypi.mjs status` で確認する(`docs/development_flow.md` に人間向けフローがある)。
- `~/.pi/agent/settings.json` などユーザー設定の変更を repo の commit に混ぜない。
