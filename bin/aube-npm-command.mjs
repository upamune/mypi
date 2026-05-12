#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { env, exit, stderr } from "node:process";

const ALLOWED_DEPRECATED_VERSIONS = {
  "@mariozechner/pi-agent-core": "*",
  "@mariozechner/pi-ai": "*",
  "@mariozechner/pi-coding-agent": "*",
  "@mariozechner/pi-tui": "*",
  "node-domexception": "*"
};
const TRUST_POLICY_EXCLUDE = ["pi-ask-user@0.11.0"];

function translateArgs(args) {
  if (args[0] !== "install") return args;
  if (!args.includes("-g") && !args.includes("--global")) return args;
  return ["add", ...args.slice(1)];
}

function isGlobalAdd(args) {
  return args[0] === "add" && (args.includes("-g") || args.includes("--global"));
}

function findGlobalPackageJson(root) {
  const direct = join(root, "package.json");
  if (existsSync(direct)) return direct;

  const candidates = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => join(root, entry.name, "package.json"))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? null;
}

function configureGlobalAube() {
  const root = spawnSync("aube", ["root", "-g"], { encoding: "utf8" });
  if (root.status !== 0) return;

  const packageJsonPath = findGlobalPackageJson(root.stdout.trim());
  if (!packageJsonPath) return;

  const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  manifest.aube = {
    ...(manifest.aube ?? {}),
    deprecationWarnings: "none",
    trustPolicyExclude: [
      ...new Set([
        ...(manifest.aube?.trustPolicyExclude ?? []),
        ...TRUST_POLICY_EXCLUDE
      ])
    ],
    allowedDeprecatedVersions: {
      ...(manifest.aube?.allowedDeprecatedVersions ?? {}),
      ...ALLOWED_DEPRECATED_VERSIONS
    }
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const args = translateArgs(process.argv.slice(2));
if (isGlobalAdd(args)) configureGlobalAube();

const childEnv = {
  ...env,
  ...(isGlobalAdd(args) ? {
    NPM_CONFIG_DEPRECATION_WARNINGS: "none",
    NPM_CONFIG_TRUST_POLICY: "no-downgrade",
    NPM_CONFIG_TRUST_POLICY_EXCLUDE: TRUST_POLICY_EXCLUDE.join(",")
  } : {})
};
const result = spawnSync("aube", args, {
  env: childEnv,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  stderr.write(`Failed to run aube ${args.join(" ")}: ${result.error.message}\n`);
  exit(127);
}

exit(result.status ?? 1);
