#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = "mitsuhiko/agent-stuff";
const FILE = "extensions/goal.ts";

const ref = process.argv[2] ?? "HEAD";
const lsRemote = spawnSync("git", ["ls-remote", `https://github.com/${REPO}`, ref], { encoding: "utf8" });
if (lsRemote.status !== 0) {
  console.error(lsRemote.stderr || `git ls-remote failed for ${REPO}`);
  process.exit(1);
}
const sha = /^[0-9a-f]{40}$/.test(ref) ? ref : lsRemote.stdout.trim().split(/\s+/)[0];
if (!sha) {
  console.error(`could not resolve ${ref} for ${REPO}`);
  process.exit(1);
}

const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${FILE}`;
const response = await fetch(url);
if (!response.ok) {
  console.error(`fetch failed: ${response.status} ${url}`);
  process.exit(1);
}
const body = await response.text();

const header = `// Vendored from https://github.com/${REPO}/blob/${sha}/${FILE}\n// Not included in the published mitsupi npm package, so this repo loads it directly.\n// Re-sync with: bun run sync:goal\n\n`;
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "extensions", "goal.ts");
writeFileSync(target, header + body);
console.log(`synced ${FILE} from ${REPO}@${sha.slice(0, 12)}`);
