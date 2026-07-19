#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "mypi.mjs");
const { CATALOG } = await import(pathToFileURL(target).href);

let src = readFileSync(target, "utf8");
const changes = [];
let failures = 0;

for (const pkg of CATALOG) {
  const npmMatch = pkg.source.match(/^npm:(.+)@(\d[^@]*)$/);
  const gitMatch = pkg.source.match(/^git:([^@]+)@([0-9a-f]{40})$/);

  if (npmMatch) {
    const [, name, pinned] = npmMatch;
    const probe = spawnSync("npm", ["view", name, "version"], { encoding: "utf8" });
    const latest = probe.status === 0 ? probe.stdout.trim() : null;
    if (!latest) {
      failures++;
      console.error(`skip ${pkg.id}: could not fetch latest version of ${name}`);
      continue;
    }
    if (latest !== pinned) {
      src = src.replace(`npm:${name}@${pinned}`, `npm:${name}@${latest}`);
      changes.push(`${pkg.id}: ${pinned} -> ${latest}`);
    }
  } else if (gitMatch) {
    const [, repoPath, pinned] = gitMatch;
    const probe = spawnSync("git", ["ls-remote", `https://${repoPath}`, "HEAD"], { encoding: "utf8" });
    const latest = probe.status === 0 ? probe.stdout.trim().split(/\s+/)[0] : null;
    if (!latest) {
      failures++;
      console.error(`skip ${pkg.id}: could not fetch HEAD of ${repoPath}`);
      continue;
    }
    if (latest !== pinned) {
      src = src.replace(`git:${repoPath}@${pinned}`, `git:${repoPath}@${latest}`);
      changes.push(`${pkg.id}: ${pinned.slice(0, 12)} -> ${latest.slice(0, 12)}`);
    }
  }
}

if (changes.length > 0) writeFileSync(target, src);
for (const change of changes) console.log(change);
if (changes.length === 0) console.error("no pin updates");
process.exit(failures > 0 ? 1 : 0);
