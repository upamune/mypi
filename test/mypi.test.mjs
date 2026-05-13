import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

import { buildSpawnOptions, CATALOG, parseArgs, resolveAubeNpmCommand, resolveEntrypointUrl } from "../bin/mypi.mjs";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("catalog has unique ids and sources", () => {
  assert.equal(new Set(CATALOG.map((pkg) => pkg.id)).size, CATALOG.length);
  assert.equal(CATALOG.every((pkg) => pkg.source && pkg.category && pkg.description), true);
});

test("catalog includes native diff review", () => {
  assert.equal(
    CATALOG.some((pkg) => pkg.id === "diff-review" && pkg.source === "git:https://github.com/badlogic/pi-diff-review"),
    true
  );
});

test("catalog includes both planning workflows", () => {
  assert.equal(CATALOG.some((pkg) => pkg.id === "plan" && pkg.source === "npm:@devkade/pi-plan@0.2.2"), true);
  assert.equal(CATALOG.some((pkg) => pkg.id === "review-loop" && pkg.source === "npm:pi-review-loop@0.4.4"), true);
  assert.equal(CATALOG.some((pkg) => pkg.id === "plannotator" && pkg.source === "npm:@plannotator/pi-extension@0.19.14"), true);
});

test("catalog includes autoresearch", () => {
  assert.equal(
    CATALOG.some((pkg) => pkg.id === "autoresearch" && pkg.source === "git:github.com/davebcn87/pi-autoresearch"),
    true
  );
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
  assert.equal(extensionFiles.includes("goal.ts"), false);
  assert.equal(extensionFiles.includes("uv.ts"), true);
  assert.equal(extensionFiles.includes("multi-edit.ts"), true);
  assert.equal(extensionFiles.length, 16);

  const shimFiles = await readdir(new URL("../node_modules/mitsupi/intercepted-commands/", import.meta.url));
  assert.deepEqual(shimFiles.sort(), ["pip", "pip3", "poetry", "python", "python3"]);
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

test("resolveEntrypointUrl tolerates missing paths", () => {
  assert.match(resolveEntrypointUrl("/tmp/does-not-exist/mypi.mjs"), /^file:/);
});

test("resolveAubeNpmCommand points next to the mypi bin", () => {
  assert.equal(
    resolveAubeNpmCommand(new URL("../bin/mypi.mjs", import.meta.url).pathname).endsWith("/bin/aube-npm-command.mjs"),
    true
  );
});
