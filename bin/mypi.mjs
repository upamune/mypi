#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { argv, cwd, env, exit, stdin, stderr, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

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
    source: "git:github.com/VandeeFeng/pi-memory-md",
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
    source: "git:github.com/tintinweb/pi-manage-todo-list@b75c449aa85ce328e9a8b632f62bf642aed40359",
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
    source: "git:https://github.com/badlogic/pi-diff-review",
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
    source: "git:github.com/davebcn87/pi-autoresearch",
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

const COMMANDS = new Set(["install", "status", "update", "remove", "doctor", "list"]);
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
    targets: []
  };

  let index = 0;
  if (args[0] && COMMANDS.has(args[0])) {
    flags.command = args[0];
    index = 1;
  }

  for (; index < args.length; index++) {
    const arg = args[index];
    if (arg === "-l" || arg === "--local") flags.local = true;
    else if (arg === "-y" || arg === "--yes") flags.yes = true;
    else if (arg === "-n" || arg === "--dry-run") flags.dryRun = true;
    else if (arg === "-h" || arg === "--help") flags.help = true;
    else if (arg === "--only") flags.only = parseList(args[++index]);
    else if (arg.startsWith("--only=")) flags.only = parseList(arg.slice("--only=".length));
    else if (arg === "--except") flags.except = parseList(args[++index]);
    else if (arg.startsWith("--except=")) flags.except = parseList(arg.slice("--except=".length));
    else if (arg === "--self-source") flags.selfSource = args[++index];
    else if (arg.startsWith("--self-source=")) flags.selfSource = arg.slice("--self-source=".length);
    else if (flags.command === "remove" && !arg.startsWith("-")) flags.targets.push(arg);
    else {
      console.error(red(`Unknown argument: ${arg}`));
      flags.help = true;
    }
  }

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

function backupPath(path) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${path}.mypi.${stamp}.bak`;
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
    const overrides = {};
    for (const name of SUBAGENT_BUILTIN_MODELS) overrides[name] = { model: "" };
    settings.subagents = {
      ...(settings.subagents ?? {}),
      agentOverrides: {
        ...(settings.subagents?.agentOverrides ?? {}),
        ...overrides
      }
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

  const toInstall = selected.filter((pkg) => !installed.sources.has(pkg.source));
  const scope = flags.local ? "project .pi/settings.json" : "~/.pi/agent/settings.json";
  console.log(`Target: ${scope}`);
  console.log(`Selected: ${selected.length}/${catalog(flags).length}`);
  console.log(`Already installed: ${selected.length - toInstall.length}`);
  console.log(`Will install: ${toInstall.length}`);

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
  const present = pkgs.filter((pkg) => installed.sources.has(pkg.source));
  const missing = pkgs.filter((pkg) => !installed.sources.has(pkg.source));
  const catalogSources = new Set(pkgs.map((pkg) => pkg.source));
  const other = [...installed.sources].filter((source) => !catalogSources.has(source));

  console.log(`\nInstalled from mypi catalog (${present.length}/${pkgs.length}):`);
  for (const pkg of present) console.log(`  ${green("ok")} [${pkg.category}] ${pkg.id.padEnd(18)} ${dim(pkg.source)}`);
  if (present.length === 0) console.log(`  ${dim("none")}`);

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
  else pass(`${installed.path} is readable`);

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
