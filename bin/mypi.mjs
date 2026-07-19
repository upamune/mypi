#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { argv, cwd, env, exit, stdin, stderr, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_SELF_SOURCE = "git:github.com/upamune/mypi";

export const CATEGORIES = ["personal", "core", "ui", "research", "themes"];

export const CATALOG = [
  {
    id: "mypi",
    category: "personal",
    source: DEFAULT_SELF_SOURCE,
    description: "Personal Pi prompts and skills from this repo"
  },
  {
    id: "mitsupi",
    category: "core",
    source: "git:github.com/mitsuhiko/agent-stuff@4bce45560fa55ace2f5dc8634a63a2af464ddc8b",
    description: "Armin's pi commands, skills, extensions, and themes (agent-stuff)"
  },
  {
    id: "subagents",
    category: "core",
    source: "npm:pi-subagents@0.35.1",
    description: "Sub-agent execution"
  },
  {
    id: "ask-user",
    category: "core",
    source: "npm:pi-ask-user@0.13.0",
    description: "Interactive ask-user prompts for agent workflows"
  },
  {
    id: "mcp",
    category: "core",
    source: "npm:pi-mcp-adapter@2.11.0",
    description: "MCP server integration"
  },
  {
    id: "web-access",
    category: "core",
    source: "npm:pi-web-access@0.13.0",
    description: "Web search and URL fetching"
  },
  {
    id: "memory",
    category: "core",
    source: "git:github.com/VandeeFeng/pi-memory-md@2c6e1948f0a594bf904c5f9dcd92a16be96710d9",
    description: "Markdown-backed persistent memory"
  },
  {
    id: "plan",
    category: "core",
    source: "npm:@devkade/pi-plan@0.2.2",
    description: "Read-only planning mode"
  },
  {
    id: "review-loop",
    category: "core",
    source: "npm:pi-review-loop@0.4.4",
    description: "Automated plan and code review loop"
  },
  {
    id: "simplify",
    category: "core",
    source: "npm:pi-simplify@0.2.3",
    description: "Code clarity and consistency review"
  },
  {
    id: "add-dir",
    category: "core",
    source: "npm:pi-add-dir@1.3.1",
    description: "Load extra project directories"
  },
  {
    id: "prompt-templates",
    category: "core",
    source: "npm:pi-prompt-template-model@0.10.0",
    description: "Prompt template model and thinking frontmatter"
  },
  {
    id: "claude-cli",
    category: "core",
    source: "npm:pi-claude-cli@0.3.1",
    description: "Claude Code CLI auth as a Pi provider"
  },
  {
    id: "dynamic-workflows",
    category: "core",
    source: "npm:pi-dynamic-workflows@1.0.1",
    description: "Claude-Code-style dynamic workflow orchestration"
  },
  {
    id: "powerbar-settings",
    category: "ui",
    source: "npm:@juanibiapina/pi-extension-settings@0.8.0",
    description: "Shared settings layer for UI extensions"
  },
  {
    id: "powerbar",
    category: "ui",
    source: "npm:@juanibiapina/pi-powerbar@0.12.0",
    description: "Live status bar"
  },
  {
    id: "usage",
    category: "ui",
    source: "npm:@tmustier/pi-usage-extension@0.9.1",
    description: "Token and cost tracker"
  },
  {
    id: "raw-paste",
    category: "ui",
    source: "npm:@tmustier/pi-raw-paste@0.1.3",
    description: "Raw clipboard paste command"
  },
  {
    id: "todos",
    category: "ui",
    source: "git:github.com/tintinweb/pi-manage-todo-list@2eb22d3b0c9dd981398d928c8edcc4afce202fa1",
    description: "Todo list management"
  },
  {
    id: "btw",
    category: "ui",
    source: "npm:pi-btw@0.4.1",
    description: "Side questions without polluting history"
  },
  {
    id: "interactive-shell",
    category: "ui",
    source: "npm:pi-interactive-shell@0.13.0",
    description: "Observable interactive shell overlays"
  },
  {
    id: "plannotator",
    category: "ui",
    source: "npm:@plannotator/pi-extension@0.23.1",
    description: "Visual plan review, annotation, and approval workflow"
  },
  {
    id: "diff-review",
    category: "ui",
    source: "git:github.com/badlogic/pi-diff-review@57622138f5b02896a230b4fbfe702d24c6a515bb",
    description: "Native diff review window with Monaco"
  },
  {
    id: "slopchop",
    category: "ui",
    source: "npm:pi-slopchop@0.10.1",
    description: "Terminal-native diff review"
  },
  {
    id: "autoresearch",
    category: "research",
    source: "git:github.com/davebcn87/pi-autoresearch@00062fb9cc425e71d82e75445dc5b6ad31c32f0e",
    description: "Autonomous research and experiment loop"
  },
  {
    id: "terminal-theme",
    category: "themes",
    source: "npm:pi-terminal-theme@0.2.0",
    description: "Map Pi colors to terminal ANSI colors"
  },
  {
    id: "curated-themes",
    category: "themes",
    source: "npm:@victor-software-house/pi-curated-themes@0.2.1",
    description: "Curated terminal themes"
  }
];

const COMMANDS = new Set(["install", "status", "update", "remove", "doctor", "list", "outdated"]);
const SUBAGENT_BUILTIN_MODELS = ["context-builder", "planner", "researcher", "reviewer", "scout", "worker"];
const PI_NPM_COMMAND = ["bun"];
const AUTH_ENV_VARS = [
  ["ANTHROPIC_API_KEY", "anthropic"],
  ["OPENAI_API_KEY", "openai"],
  ["GOOGLE_API_KEY", "google"],
  ["GEMINI_API_KEY", "google"],
  ["OPENROUTER_API_KEY", "openrouter"],
  ["GROQ_API_KEY", "groq"],
  ["MISTRAL_API_KEY", "mistral"]
];

const isTTY = Boolean(stdout.isTTY);
const color = (code) => (value) => isTTY ? `\x1b[${code}m${value}\x1b[0m` : String(value);
const bold = color("1");
const dim = color("2");
const green = color("32");
const yellow = color("33");
const red = color("31");

function printHelp() {
  console.log(`${bold("mypi")} - personal installer for Pi packages

Usage:
  mypi [command] [options]

Commands:
  install    Install the selected catalog (default)
  status     Show installed and missing catalog packages
  update     Reconcile catalog, then run pi update
  remove     Remove catalog ids or raw pi package sources
  doctor     Check local environment
  list       Print the catalog
  outdated   Compare catalog pins with the latest published versions

Options:
  --only <list>        Install only category or package ids
  --except <list>      Install everything except category or package ids
  --self-source <src>  Override the mypi package source, useful for local checkout
  -l, --local          Write to current project's .pi/settings.json
  -y, --yes            Assume yes for installing Pi itself
  -n, --dry-run        Print actions without changing anything
  -h, --help           Show help

Examples:
  mypi install --self-source .
  mypi install --only core,ui
  mypi status --local
  mypi remove usage raw-paste`);
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseArgs(args) {
  const flags = {
    command: "install",
    local: false,
    yes: false,
    dryRun: false,
    help: false,
    only: null,
    except: null,
    selfSource: DEFAULT_SELF_SOURCE,
    targets: [],
    problems: []
  };

  let index = 0;
  if (args[0] && COMMANDS.has(args[0])) {
    flags.command = args[0];
    index = 1;
  }

  const takeValue = (name) => {
    const value = args[++index];
    if (value === undefined) {
      flags.problems.push(`${name} requires a value`);
      return null;
    }
    return value;
  };

  for (; index < args.length; index++) {
    const arg = args[index];
    if (arg === "-l" || arg === "--local") flags.local = true;
    else if (arg === "-y" || arg === "--yes") flags.yes = true;
    else if (arg === "-n" || arg === "--dry-run") flags.dryRun = true;
    else if (arg === "-h" || arg === "--help") flags.help = true;
    else if (arg === "--only") flags.only = parseList(takeValue("--only"));
    else if (arg.startsWith("--only=")) flags.only = parseList(arg.slice("--only=".length));
    else if (arg === "--except") flags.except = parseList(takeValue("--except"));
    else if (arg.startsWith("--except=")) flags.except = parseList(arg.slice("--except=".length));
    else if (arg === "--self-source") flags.selfSource = takeValue("--self-source") ?? flags.selfSource;
    else if (arg.startsWith("--self-source=")) flags.selfSource = arg.slice("--self-source=".length);
    else if (flags.command === "remove" && !arg.startsWith("-")) flags.targets.push(arg);
    else flags.problems.push(`Unknown argument: ${arg}`);
  }

  if (flags.only && flags.except) flags.problems.push("--only and --except cannot be combined");

  return flags;
}

function catalog(flags) {
  return CATALOG.map((pkg) => pkg.id === "mypi" ? { ...pkg, source: flags.selfSource } : pkg);
}

function validateSelectors(pkgs, selectors, label) {
  const ids = new Set(pkgs.map((pkg) => pkg.id));
  const invalid = selectors.filter((selector) => !CATEGORIES.includes(selector) && !ids.has(selector));
  if (invalid.length > 0) {
    throw new Error(`Unknown ${label}: ${invalid.join(", ")}`);
  }
}

function matchesSelector(pkg, selectors) {
  return selectors.some((selector) => selector === pkg.category || selector === pkg.id);
}

function selectPackages(flags) {
  const pkgs = catalog(flags);
  if (flags.only) {
    validateSelectors(pkgs, flags.only, "--only");
    return pkgs.filter((pkg) => matchesSelector(pkg, flags.only));
  }
  if (flags.except) {
    validateSelectors(pkgs, flags.except, "--except");
    return pkgs.filter((pkg) => !matchesSelector(pkg, flags.except));
  }
  return pkgs;
}

export function buildSpawnOptions(options = {}, platformName = platform()) {
  const resolved = { ...options };
  if (platformName === "win32" && resolved.shell == null) resolved.shell = true;
  return resolved;
}

function spawnCommand(command, args = [], options = {}) {
  return spawnSync(command, args, buildSpawnOptions(options));
}

function hasCommand(name) {
  const probe = spawnCommand(platform() === "win32" ? "where" : "which", [name], { stdio: "ignore" });
  return probe.status === 0;
}

export function normalizeSource(source) {
  if (typeof source !== "string") return source;
  if (source.startsWith("npm:")) {
    const spec = source.slice(4);
    const at = spec.lastIndexOf("@");
    return at > 0 ? `npm:${spec.slice(0, at)}` : source;
  }
  if (source.startsWith("git:")) {
    let spec = source.slice(4).replace(/^https?:\/\//, "");
    const at = spec.lastIndexOf("@");
    if (at > 0) spec = spec.slice(0, at);
    if (spec.endsWith(".git")) spec = spec.slice(0, -4);
    return `git:${spec}`;
  }
  return source;
}

function groupByNormalizedSource(sources) {
  const groups = new Map();
  for (const source of sources) {
    const key = normalizeSource(source);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(source);
  }
  return groups;
}

function settingsPath(local) {
  return local ? join(cwd(), ".pi", "settings.json") : join(homedir(), ".pi", "agent", "settings.json");
}

function readJson(path) {
  if (!existsSync(path)) return { exists: false, parsed: null, error: null };
  try {
    return { exists: true, parsed: JSON.parse(readFileSync(path, "utf8")), error: null };
  } catch (error) {
    return { exists: true, parsed: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function readInstalledSources(local) {
  const path = settingsPath(local);
  const current = readJson(path);
  if (current.error) return { path, exists: current.exists, sources: new Set(), error: current.error };
  const sources = new Set();
  for (const entry of current.parsed?.packages ?? []) {
    if (typeof entry === "string") sources.add(entry);
    else if (entry && typeof entry === "object" && typeof entry.source === "string") sources.add(entry.source);
  }
  return { path, exists: current.exists, sources, error: null };
}

const BACKUP_KEEP = 5;

function backupPath(path) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${path}.mypi.${stamp}.bak`;
}

export function pruneBackups(path, keep = BACKUP_KEEP) {
  const dir = dirname(path);
  const prefix = `${basename(path)}.mypi.`;
  const backups = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".bak"))
    .sort();
  for (const name of backups.slice(0, Math.max(0, backups.length - keep))) {
    unlinkSync(join(dir, name));
  }
}

function writeSettings(local, mutate) {
  const path = settingsPath(local);
  const current = readJson(path);
  if (current.error) return { ok: false, path, error: current.error };
  const settings = current.parsed ?? {};
  const changed = mutate(settings);
  if (!changed) return { ok: true, changed: false, path, backup: null };

  if (existsSync(path)) {
    const backup = backupPath(path);
    copyFileSync(path, backup);
    pruneBackups(path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    return { ok: true, changed: true, path, backup };
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return { ok: true, changed: true, path, backup: null };
}

function writeSubagentModelFallbacks(flags) {
  if (flags.dryRun) {
    console.log("dry-run: write subagent agentOverrides model fallbacks");
    return { ok: true, changed: false };
  }

  return writeSettings(flags.local, (settings) => {
    const existing = settings.subagents?.agentOverrides ?? {};
    const missing = SUBAGENT_BUILTIN_MODELS.filter((name) => existing[name]?.model === undefined);
    if (missing.length === 0) return false;

    const overrides = { ...existing };
    for (const name of missing) overrides[name] = { ...(overrides[name] ?? {}), model: "" };
    settings.subagents = {
      ...(settings.subagents ?? {}),
      agentOverrides: overrides
    };
    return true;
  });
}

function writePiNpmCommand(flags) {
  const command = PI_NPM_COMMAND;
  if (flags.dryRun) {
    console.log(`dry-run: write npmCommand ${JSON.stringify(command)}`);
    return { ok: true, changed: false };
  }

  return writeSettings(flags.local, (settings) => {
    if (JSON.stringify(settings.npmCommand) === JSON.stringify(command)) return false;
    settings.npmCommand = command;
    return true;
  });
}

function authJsonPath() {
  return join(homedir(), ".pi", "agent", "auth.json");
}

function detectAuth() {
  const providers = [];
  for (const [name, provider] of AUTH_ENV_VARS) {
    if (env[name]) providers.push(`${provider} (${name})`);
  }

  const auth = readJson(authJsonPath()).parsed ?? {};
  for (const provider of Object.keys(auth)) providers.push(`${provider} (auth.json)`);
  return providers;
}

async function confirm(message, defaultValue = true) {
  if (!stdin.isTTY || !stdout.isTTY) return defaultValue;
  const suffix = defaultValue ? "Y/n" : "y/N";
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`${message} (${suffix}) `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function ensurePi(flags) {
  if (hasCommand("pi")) return true;
  if (flags.dryRun) {
    console.log("dry-run: bun install -g @earendil-works/pi-coding-agent");
    return true;
  }

  if (!hasCommand("bun")) {
    console.error(red("`pi` is not on PATH and `bun` is not available to install it."));
    return false;
  }

  const ok = flags.yes || await confirm("`pi` is not on PATH. Install it with `bun install -g @earendil-works/pi-coding-agent`?", true);
  if (!ok) {
    console.log("Install Pi first, then re-run `mypi install`.");
    return false;
  }

  console.log("Installing Pi with bun install -g @earendil-works/pi-coding-agent");
  const status = spawnCommand("bun", ["install", "-g", "@earendil-works/pi-coding-agent"], {
    stdio: "inherit",
    env: {
      ...env,
      NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/"
    }
  }).status ?? 1;
  return status === 0 && hasCommand("pi");
}

function runPiInstall(pkg, flags) {
  const args = flags.local ? ["install", "-l", pkg.source] : ["install", pkg.source];
  const command = `pi ${args.join(" ")}`;
  if (flags.dryRun) {
    console.log(`dry-run: ${command}`);
    return 0;
  }

  console.log(`\n> ${command}`);
  const childEnv = pkg.source.startsWith("git:") ? { ...env, npm_config_ignore_scripts: "true" } : env;
  return spawnCommand("pi", args, { stdio: "inherit", env: childEnv }).status ?? 1;
}

async function cmdInstall(flags) {
  const selected = selectPackages(flags);
  if (selected.length === 0) {
    console.log("Nothing selected.");
    return 0;
  }

  if (!(await ensurePi(flags))) return 127;

  const installed = readInstalledSources(flags.local);
  if (installed.error) {
    console.error(red(`Could not parse ${installed.path}: ${installed.error}`));
    return 2;
  }

  const installedGroups = groupByNormalizedSource(installed.sources);
  const toInstall = [];
  const toUpgrade = [];
  for (const pkg of selected) {
    if (installed.sources.has(pkg.source)) continue;
    const staleSources = [...(installedGroups.get(normalizeSource(pkg.source)) ?? [])].filter((source) => source !== pkg.source);
    if (staleSources.length > 0) toUpgrade.push({ pkg, staleSources });
    else toInstall.push(pkg);
  }

  const scope = flags.local ? "project .pi/settings.json" : "~/.pi/agent/settings.json";
  console.log(`Target: ${scope}`);
  console.log(`Selected: ${selected.length}/${catalog(flags).length}`);
  console.log(`Already installed: ${selected.length - toInstall.length - toUpgrade.length}`);
  console.log(`Will install: ${toInstall.length}`);
  console.log(`Will upgrade pin: ${toUpgrade.length}`);
  for (const { pkg, staleSources } of toUpgrade) {
    console.log(`  ${pkg.id}: ${staleSources.join(", ")} ${dim("->")} ${pkg.source}`);
  }

  const npmCommandResult = writePiNpmCommand(flags);
  if (!npmCommandResult.ok) {
    console.error(red(`Refusing to update ${npmCommandResult.path}: ${npmCommandResult.error}`));
    return 2;
  }
  if (npmCommandResult.changed && npmCommandResult.backup) console.log(`Backed up settings to ${npmCommandResult.backup}`);

  if (selected.some((pkg) => pkg.id === "subagents")) {
    const result = writeSubagentModelFallbacks(flags);
    if (!result.ok) {
      console.error(red(`Refusing to update ${result.path}: ${result.error}`));
      return 2;
    }
    if (result.changed && result.backup) console.log(`Backed up settings to ${result.backup}`);
  }

  const failed = [];
  for (const pkg of toInstall) {
    const status = runPiInstall(pkg, flags);
    if (status !== 0) failed.push(pkg);
  }

  for (const { pkg, staleSources } of toUpgrade) {
    const status = runPiInstall(pkg, flags);
    if (status !== 0) {
      failed.push(pkg);
      continue;
    }
    if (flags.dryRun) {
      for (const source of staleSources) console.log(`dry-run: rewrite settings entry ${source} -> ${pkg.source}`);
      continue;
    }
    // pi install は同名 package の既存 entry を旧 source のまま残し、
    // pi remove は package 名単位で新 pin まで巻き添え削除するため、
    // 旧 pin の entry は settings の packages 配列を直接新 source に書き換える
    const cleanup = writeSettings(flags.local, (settings) => {
      const packages = settings.packages ?? [];
      let hasNew = packages.some((entry) => (typeof entry === "string" ? entry : entry?.source) === pkg.source);
      let changed = false;
      const next = [];
      for (const entry of packages) {
        const source = typeof entry === "string" ? entry : entry?.source;
        if (!staleSources.includes(source)) {
          next.push(entry);
          continue;
        }
        changed = true;
        if (hasNew) continue;
        next.push(typeof entry === "string" ? pkg.source : { ...entry, source: pkg.source });
        hasNew = true;
      }
      if (!changed) return false;
      settings.packages = next;
      return true;
    });
    if (!cleanup.ok) console.error(red(`Could not update stale entries in ${cleanup.path}: ${cleanup.error}`));
    else if (cleanup.changed) console.log(`Updated settings entry: ${staleSources.join(", ")} -> ${pkg.source}`);
  }

  if (failed.length > 0) {
    console.error(red("\nFailed packages:"));
    for (const pkg of failed) console.error(`  ${pkg.id} (${pkg.source})`);
    return 1;
  }

  const auth = detectAuth();
  console.log(green("\nDone."));
  console.log(auth.length > 0 ? `Pi credentials: ${auth.join(", ")}` : "Pi credentials: none detected. Run `pi`, then `/login`, or set a provider API key.");
  return 0;
}

function cmdStatus(flags) {
  const installed = readInstalledSources(flags.local);
  console.log(`Settings file: ${installed.path}`);
  if (!installed.exists) console.log(yellow("Settings file does not exist yet."));
  if (installed.error) {
    console.error(red(`Could not parse settings: ${installed.error}`));
    return 1;
  }

  const pkgs = catalog(flags);
  const installedGroups = groupByNormalizedSource(installed.sources);
  const present = pkgs.filter((pkg) => installed.sources.has(pkg.source));
  const outdated = pkgs
    .filter((pkg) => !installed.sources.has(pkg.source))
    .map((pkg) => ({
      pkg,
      staleSources: [...(installedGroups.get(normalizeSource(pkg.source)) ?? [])].filter((source) => source !== pkg.source)
    }))
    .filter((entry) => entry.staleSources.length > 0);
  const missing = pkgs.filter(
    (pkg) => !installed.sources.has(pkg.source) && !outdated.some((entry) => entry.pkg.id === pkg.id)
  );
  const accountedSources = new Set([
    ...pkgs.map((pkg) => pkg.source),
    ...outdated.flatMap((entry) => entry.staleSources)
  ]);
  const other = [...installed.sources].filter((source) => !accountedSources.has(source));

  console.log(`\nInstalled from mypi catalog (${present.length}/${pkgs.length}):`);
  for (const pkg of present) console.log(`  ${green("ok")} [${pkg.category}] ${pkg.id.padEnd(18)} ${dim(pkg.source)}`);
  if (present.length === 0) console.log(`  ${dim("none")}`);

  console.log(`\nOutdated pin (${outdated.length}):`);
  for (const { pkg, staleSources } of outdated) {
    console.log(`  ${yellow("!!")} [${pkg.category}] ${pkg.id.padEnd(18)} ${dim(`${staleSources.join(", ")} -> ${pkg.source}`)}`);
  }
  if (outdated.length === 0) console.log(`  ${dim("none")}`);

  console.log(`\nMissing from mypi catalog (${missing.length}):`);
  for (const pkg of missing) console.log(`  ${dim("--")} [${pkg.category}] ${pkg.id.padEnd(18)} ${dim(pkg.source)}`);
  if (missing.length === 0) console.log(`  ${dim("none")}`);

  console.log(`\nOther Pi packages (${other.length}):`);
  for (const source of other) console.log(`  ${source}`);
  if (other.length === 0) console.log(`  ${dim("none")}`);

  return 0;
}

async function cmdUpdate(flags) {
  if (!(await ensurePi(flags))) return 127;
  const installStatus = await cmdInstall({ ...flags, yes: true });
  if (installStatus !== 0) return installStatus;
  if (flags.local) return updateLocalPackages(flags);
  if (flags.dryRun) {
    console.log("dry-run: pi update");
    return 0;
  }
  return spawnCommand("pi", ["update"], { stdio: "inherit" }).status ?? 1;
}

function updateLocalPackages(flags) {
  const installed = readInstalledSources(true);
  if (installed.error) {
    console.error(red(`Could not parse ${installed.path}: ${installed.error}`));
    return 2;
  }

  for (const source of installed.sources) {
    const args = ["install", "-l", source];
    if (flags.dryRun) {
      console.log(`dry-run: pi ${args.join(" ")}`);
      continue;
    }

    const childEnv = source.startsWith("git:") ? { ...env, npm_config_ignore_scripts: "true" } : env;
    const status = spawnCommand("pi", args, { stdio: "inherit", env: childEnv }).status ?? 1;
    if (status !== 0) return status;
  }

  return 0;
}

async function cmdRemove(flags) {
  if (flags.targets.length === 0) {
    console.error(red("Usage: mypi remove <id|source> [...]"));
    return 2;
  }
  if (!(await ensurePi(flags))) return 127;

  const pkgs = catalog(flags);
  let exitCode = 0;
  for (const target of flags.targets) {
    const pkg = pkgs.find((candidate) => candidate.id === target);
    const source = pkg?.source ?? target;
    const args = flags.local ? ["remove", "-l", source] : ["remove", source];
    if (flags.dryRun) {
      console.log(`dry-run: pi ${args.join(" ")}`);
      continue;
    }
    const status = spawnCommand("pi", args, { stdio: "inherit" }).status ?? 1;
    if (status !== 0) exitCode = status;
  }
  return exitCode;
}

function cmdDoctor(flags) {
  let problems = 0;
  const pass = (message) => console.log(`  ${green("ok")} ${message}`);
  const warn = (message) => console.log(`  ${yellow("!!")} ${message}`);
  const fail = (message) => {
    problems++;
    console.log(`  ${red("xx")} ${message}`);
  };

  console.log(bold("Environment"));
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 20) pass(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node}; mypi requires Node >= 20`);
  if (hasCommand("bun")) {
    pass("bun is on PATH");
    const version = spawnCommand("bun", ["--version"], { encoding: "utf8" });
    const output = String(version.stdout || version.stderr || "").trim();
    if (output) pass(`bun --version: ${output}`);

    const binProbe = spawnCommand("bun", ["pm", "bin", "-g"], { encoding: "utf8" });
    const bunGlobalBin = binProbe.status === 0 && String(binProbe.stdout).trim()
      ? String(binProbe.stdout).trim()
      : join(homedir(), ".bun", "bin");
    const pathEntries = String(env.PATH ?? "").split(platform() === "win32" ? ";" : ":");
    if (pathEntries.includes(bunGlobalBin)) pass(`bun global bin is on PATH (${bunGlobalBin})`);
    else warn(`bun global bin ${bunGlobalBin} is not on PATH; binaries installed with bun install -g will not be found`);

    const untrusted = spawnCommand("bun", ["pm", "-g", "untrusted"], { encoding: "utf8" });
    if (untrusted.status === 0) {
      const untrustedOutput = String(untrusted.stdout).trim();
      if (!untrustedOutput || /no untrusted/i.test(untrustedOutput)) pass("no blocked postinstall scripts in bun global store");
      else warn(`bun pm -g untrusted reports blocked postinstall scripts; review and trust them explicitly:\n     ${untrustedOutput.split("\n")[0]}`);
    }
  } else {
    fail("bun is not on PATH");
  }
  if (hasCommand("git")) pass("git is on PATH");
  else warn("git is not on PATH; git package sources will fail");

  console.log(bold("\nPi"));
  if (hasCommand("pi")) {
    pass("pi is on PATH");
    const version = spawnCommand("pi", ["--version"], { encoding: "utf8" });
    const output = String(version.stdout || version.stderr || "").trim();
    if (output) pass(`pi --version: ${output}`);
  } else {
    fail("pi is not on PATH");
  }

  console.log(bold("\nSettings"));
  const installed = readInstalledSources(flags.local);
  if (!installed.exists) warn(`${installed.path} does not exist yet`);
  else if (installed.error) fail(`${installed.path} is invalid JSON: ${installed.error}`);
  else {
    pass(`${installed.path} is readable`);
    const settings = readJson(installed.path).parsed ?? {};
    if (JSON.stringify(settings.npmCommand) === JSON.stringify(PI_NPM_COMMAND)) pass(`npmCommand is ${JSON.stringify(PI_NPM_COMMAND)}`);
    else warn(`npmCommand is ${JSON.stringify(settings.npmCommand)}; run mypi install to set ${JSON.stringify(PI_NPM_COMMAND)}`);
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (existsSync(join(repoRoot, "extensions", "goal.ts"))) {
    console.log(bold("\nLocal checkout"));
    if (existsSync(join(repoRoot, "node_modules", "mitsupi", "extensions"))) pass("node_modules/mitsupi/extensions is present");
    else warn("node_modules/mitsupi/extensions is missing; run bun install so the bundled mitsupi extensions can load");
  }

  console.log(bold("\nAuth"));
  const auth = detectAuth();
  if (auth.length > 0) pass(auth.join(", "));
  else warn("No credentials detected; use `/login` in Pi or set a provider API key");

  return problems === 0 ? 0 : 1;
}

function cmdList(flags) {
  for (const category of CATEGORIES) {
    console.log(bold(category));
    for (const pkg of catalog(flags).filter((item) => item.category === category)) {
      console.log(`  ${pkg.id.padEnd(18)} ${pkg.source}`);
      console.log(`  ${"".padEnd(18)} ${dim(pkg.description)}`);
    }
  }
  return 0;
}

function latestNpmVersion(name) {
  const probe = spawnCommand("npm", ["view", name, "version"], { encoding: "utf8" });
  if (probe.status !== 0) return null;
  return String(probe.stdout).trim() || null;
}

function latestGitCommit(repoPath) {
  const probe = spawnCommand("git", ["ls-remote", `https://${repoPath}`, "HEAD"], { encoding: "utf8" });
  if (probe.status !== 0) return null;
  return String(probe.stdout).trim().split(/\s+/)[0] || null;
}

function cmdOutdated(flags) {
  const npmAvailable = hasCommand("npm");
  if (!npmAvailable) console.log(yellow("npm is not on PATH; npm sources will be skipped"));

  let outdatedCount = 0;
  let errorCount = 0;
  for (const pkg of catalog(flags)) {
    const npmMatch = pkg.source.match(/^npm:(.+)@(\d[^@]*)$/);
    const gitMatch = pkg.source.match(/^git:([^@]+)@([0-9a-f]{40})$/);
    const label = pkg.id.padEnd(18);

    if (npmMatch) {
      if (!npmAvailable) continue;
      const [, name, pinned] = npmMatch;
      const latest = latestNpmVersion(name);
      if (!latest) {
        errorCount++;
        console.log(`  ${red("xx")} ${label} could not fetch latest version of ${name}`);
      } else if (latest === pinned) {
        console.log(`  ${green("ok")} ${label} ${dim(pinned)}`);
      } else {
        outdatedCount++;
        console.log(`  ${yellow("!!")} ${label} ${pinned} ${dim("->")} ${bold(latest)}`);
      }
    } else if (gitMatch) {
      const [, repoPath, pinned] = gitMatch;
      const latest = latestGitCommit(repoPath);
      if (!latest) {
        errorCount++;
        console.log(`  ${red("xx")} ${label} could not fetch HEAD of ${repoPath}`);
      } else if (latest === pinned) {
        console.log(`  ${green("ok")} ${label} ${dim(pinned.slice(0, 12))}`);
      } else {
        outdatedCount++;
        console.log(`  ${yellow("!!")} ${label} ${pinned.slice(0, 12)} ${dim("->")} ${bold(latest.slice(0, 12))}`);
      }
    } else {
      console.log(`  ${dim("--")} ${label} ${dim(`${pkg.source} (unpinned, skipped)`)}`);
    }
  }

  if (outdatedCount > 0) console.log(`\n${outdatedCount} package(s) behind. Update the pins in bin/mypi.mjs CATALOG, then run mypi update.`);
  else if (errorCount === 0) console.log(`\n${green("All pinned packages are up to date.")}`);
  return errorCount > 0 ? 1 : 0;
}

export function resolveEntrypointUrl(scriptPath) {
  if (!scriptPath) return null;
  try {
    return pathToFileURL(realpathSync(scriptPath)).href;
  } catch {
    return pathToFileURL(resolve(scriptPath)).href;
  }
}

async function main() {
  const flags = parseArgs(argv.slice(2));
  if (flags.problems.length > 0) {
    for (const problem of flags.problems) console.error(red(problem));
    printHelp();
    return 2;
  }
  if (flags.help) {
    printHelp();
    return 0;
  }

  try {
    switch (flags.command) {
      case "install":
        return cmdInstall(flags);
      case "status":
        return cmdStatus(flags);
      case "update":
        return cmdUpdate(flags);
      case "remove":
        return cmdRemove(flags);
      case "doctor":
        return cmdDoctor(flags);
      case "list":
        return cmdList(flags);
      case "outdated":
        return cmdOutdated(flags);
      default:
        printHelp();
        return 2;
    }
  } catch (error) {
    console.error(red(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

if (resolveEntrypointUrl(argv[1]) === import.meta.url) {
  main().then((code) => exit(code ?? 0)).catch((error) => {
    stderr.write(`${error?.stack || error}\n`);
    exit(1);
  });
}
