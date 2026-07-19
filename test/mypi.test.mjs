import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildSpawnOptions, CATALOG, CATEGORIES, normalizeSource, parseArgs, pruneBackups, resolveEntrypointUrl } from "../bin/mypi.mjs";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("catalog has unique ids and sources", () => {
  assert.equal(new Set(CATALOG.map((pkg) => pkg.id)).size, CATALOG.length);
  assert.equal(new Set(CATALOG.map((pkg) => pkg.source)).size, CATALOG.length);
  assert.equal(CATALOG.every((pkg) => pkg.source && pkg.category && pkg.description), true);
});

test("catalog categories are valid", () => {
  assert.equal(CATALOG.every((pkg) => CATEGORIES.includes(pkg.category)), true);
});

test("catalog sources use known schemes", () => {
  for (const pkg of CATALOG) {
    assert.match(pkg.source, /^(npm:|git:)/, `${pkg.id} has unknown source scheme: ${pkg.source}`);
  }
});

test("npm sources pin an exact version", () => {
  for (const pkg of CATALOG.filter((item) => item.source.startsWith("npm:"))) {
    assert.match(pkg.source, /@\d+\.\d+\.\d+(-[\w.]+)?$/, `${pkg.id} is not pinned: ${pkg.source}`);
  }
});

test("git sources pin a commit hash", () => {
  for (const pkg of CATALOG.filter((item) => item.source.startsWith("git:") && item.id !== "mypi")) {
    assert.match(pkg.source, /^git:github\.com\/[^/]+\/[^/@]+@[0-9a-f]{40}$/, `${pkg.id} is not commit-pinned: ${pkg.source}`);
  }
});

test("catalog includes the expected workflow packages", () => {
  const ids = new Set(CATALOG.map((pkg) => pkg.id));
  for (const id of ["diff-review", "plan", "review-loop", "plannotator", "dynamic-workflows", "autoresearch"]) {
    assert.equal(ids.has(id), true, `catalog is missing ${id}`);
  }
});

test("package manifest exposes local goal extension and bundled mitsupi extensions", () => {
  assert.deepEqual(packageJson.pi.extensions, ["extensions", "node_modules/mitsupi/extensions"]);
  assert.equal(packageJson.files.includes("extensions"), true);
  assert.equal(packageJson.files.includes("intercepted-commands"), false);
  assert.equal(packageJson.dependencies.diff, "^8.0.2");
  assert.equal(packageJson.dependencies.mitsupi, "^1.6.0");
  assert.equal(packageJson.bundledDependencies.includes("mitsupi"), true);
  assert.equal(packageJson.peerDependencies["@earendil-works/pi-coding-agent"], "*");
  assert.equal(packageJson.peerDependencies["@earendil-works/pi-ai"], "*");
  assert.equal(packageJson.peerDependencies["@earendil-works/pi-tui"], "*");
  assert.equal(packageJson.peerDependencies.typebox, "*");
});

test("local extensions include goal extension from agent-stuff HEAD", async () => {
  const extensionFiles = (await readdir(new URL("../extensions/", import.meta.url))).filter((name) => name.endsWith(".ts"));
  assert.deepEqual(extensionFiles.sort(), ["goal.ts"]);

  const goalSource = await readFile(new URL("../extensions/goal.ts", import.meta.url), "utf8");
  assert.match(goalSource, /registerCommand\("goal"/);
  assert.match(goalSource, /registerTool\(\{\s*name: "create_goal"/s);
  assert.match(goalSource, /registerTool\(\{\s*name: "update_goal"/s);
});

test("mitsupi package provides extension files and uv shims", async () => {
  const extensionFiles = (await readdir(new URL("../node_modules/mitsupi/extensions/", import.meta.url))).filter((name) => name.endsWith(".ts"));
  assert.equal(extensionFiles.includes("context.ts"), true);
  assert.equal(extensionFiles.includes("uv.ts"), true);
  assert.equal(extensionFiles.includes("multi-edit.ts"), true);

  // mitsupi が goal.ts を公開したら、この repo の vendored copy を撤去する合図
  assert.equal(extensionFiles.includes("goal.ts"), false);

  const shimFiles = await readdir(new URL("../node_modules/mitsupi/intercepted-commands/", import.meta.url));
  for (const shim of ["pip", "pip3", "poetry", "python", "python3"]) {
    assert.equal(shimFiles.includes(shim), true, `mitsupi is missing uv shim: ${shim}`);
  }
});

test("parseArgs supports selectors and local dry-run", () => {
  assert.deepEqual(parseArgs(["install", "--only", "core,ui", "--local", "--dry-run"]).only, ["core", "ui"]);
  assert.equal(parseArgs(["install", "--local", "--dry-run"]).local, true);
  assert.equal(parseArgs(["install", "--local", "--dry-run"]).dryRun, true);
});

test("parseArgs resolves remove targets", () => {
  const flags = parseArgs(["remove", "usage", "npm:example"]);
  assert.equal(flags.command, "remove");
  assert.deepEqual(flags.targets, ["usage", "npm:example"]);
});

test("buildSpawnOptions enables shell on Windows only", () => {
  assert.deepEqual(buildSpawnOptions({ stdio: "inherit" }, "win32"), {
    stdio: "inherit",
    shell: true
  });
  assert.deepEqual(buildSpawnOptions({ stdio: "inherit" }, "linux"), {
    stdio: "inherit"
  });
});

test("normalizeSource strips version pins and unifies git forms", () => {
  assert.equal(normalizeSource("npm:pi-subagents@0.35.1"), "npm:pi-subagents");
  assert.equal(normalizeSource("npm:@scope/name@1.2.3"), "npm:@scope/name");
  assert.equal(normalizeSource("npm:@scope/name"), "npm:@scope/name");
  assert.equal(normalizeSource("git:github.com/owner/repo@0123456789012345678901234567890123456789"), "git:github.com/owner/repo");
  assert.equal(normalizeSource("git:https://github.com/owner/repo"), "git:github.com/owner/repo");
  assert.equal(normalizeSource("git:github.com/owner/repo.git"), "git:github.com/owner/repo");
  assert.equal(normalizeSource("."), ".");
});

test("pruneBackups keeps only the newest backups", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mypi-test-"));
  const settings = join(dir, "settings.json");
  const stamps = ["20260101T000000Z", "20260102T000000Z", "20260103T000000Z", "20260104T000000Z"];
  for (const stamp of stamps) {
    await writeFile(`${settings}.mypi.${stamp}.bak`, "{}");
  }
  await writeFile(join(dir, "unrelated.bak"), "{}");

  pruneBackups(settings, 2);

  const remaining = (await readdir(dir)).sort();
  assert.deepEqual(remaining, [
    "settings.json.mypi.20260103T000000Z.bak",
    "settings.json.mypi.20260104T000000Z.bak",
    "unrelated.bak"
  ]);
});

test("resolveEntrypointUrl tolerates missing paths", () => {
  assert.match(resolveEntrypointUrl("/tmp/does-not-exist/mypi.mjs"), /^file:/);
});
