import test from "node:test";
import assert from "node:assert/strict";

import { buildSpawnOptions, CATALOG, parseArgs, resolveEntrypointUrl } from "../bin/mypi.mjs";

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
  assert.equal(CATALOG.some((pkg) => pkg.id === "plan" && pkg.source === "npm:@devkade/pi-plan"), true);
  assert.equal(CATALOG.some((pkg) => pkg.id === "plannotator" && pkg.source === "npm:@plannotator/pi-extension"), true);
});

test("catalog includes autoresearch", () => {
  assert.equal(
    CATALOG.some((pkg) => pkg.id === "autoresearch" && pkg.source === "git:github.com/davebcn87/pi-autoresearch"),
    true
  );
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
