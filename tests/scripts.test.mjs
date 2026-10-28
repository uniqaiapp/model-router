// Every script answers --help with exit 0; every example in examples/ reproduces its committed output byte-for-byte.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { ROOT } from "../scripts/lib/prices.mjs";
import { listExamples, runExample } from "../scripts/regen-examples.mjs";

const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });

for (const s of ["scripts/route.mjs", "scripts/cost.mjs", "scripts/check.mjs", "scripts/table.mjs"]) {
  test(`${s} --help exits 0`, () => {
    const r = run([s, "--help"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes("usage"));
  });
}

test("route.mjs without a task exits 2 and prints usage", () => {
  const r = run(["scripts/route.mjs"]);
  assert.equal(r.status, 2);
});

test("cost.mjs rejects an unknown model", () => {
  const r = run(["scripts/cost.mjs", "--model", "no-such-model"]);
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes("unknown model"));
});

test("route.mjs --json is valid JSON with the expected keys", () => {
  const r = run(["scripts/route.mjs", "classify emails", "--json", "--calls", "5000"]);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  for (const k of ["task", "tier", "scores", "confidence", "reasons", "picks", "prices_as_of"]) assert.ok(k in j, k);
  assert.equal(j.tier, "fast");
});

test("check.mjs exits 0 on the committed table", () => {
  const r = run(["scripts/check.mjs"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

const examples = listExamples();
assert.ok(examples.length >= 10, "examples present");
for (const ex of examples) {
  test(`example ${ex.name} reproduces examples/expected/${ex.name}.txt`, () => {
    assert.ok(fs.existsSync(ex.expected), `missing ${ex.expected}; run node scripts/regen-examples.mjs`);
    const r = runExample(ex);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, fs.readFileSync(ex.expected, "utf8"));
  });
}
