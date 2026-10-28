#!/usr/bin/env node
// Regenerate examples/expected/*.txt from examples/tasks/*.json and examples/cost-commands.json.
// tests/examples.test.mjs runs the same commands and compares byte-for-byte, so README numbers stay honest.
//
//   node scripts/regen-examples.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT } from "./lib/prices.mjs";

export const EX = path.join(ROOT, "examples");
export const TASKS = path.join(EX, "tasks");
export const EXPECTED = path.join(EX, "expected");

/** Every example as { name, argv, expected }: argv is the full `node scripts/...` argument list. */
export function listExamples() {
  const out = [];
  for (const f of fs.readdirSync(TASKS).filter((x) => x.endsWith(".json")).sort()) {
    const t = JSON.parse(fs.readFileSync(path.join(TASKS, f), "utf8"));
    const name = f.replace(/\.json$/, "");
    const argv = ["scripts/route.mjs", t.task];
    for (const k of ["input", "output", "calls", "cached", "risk", "provider", "tier"]) if (t[k] !== undefined) argv.push(`--${k}`, String(t[k]));
    if (t.batch) argv.push("--batch");
    out.push({ name, argv, expected: path.join(EXPECTED, name + ".txt") });
  }
  const cmds = JSON.parse(fs.readFileSync(path.join(EX, "cost-commands.json"), "utf8"));
  for (const c of cmds) out.push({ name: c.name, argv: ["scripts/cost.mjs", ...c.args], expected: path.join(EXPECTED, c.name + ".txt") });
  return out;
}

export function runExample(ex) {
  const r = spawnSync(process.execPath, ex.argv, { cwd: ROOT, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fs.mkdirSync(EXPECTED, { recursive: true });
  let n = 0;
  for (const ex of listExamples()) {
    const r = runExample(ex);
    if (r.status !== 0) {
      console.error(`${ex.name}: exit ${r.status}\n${r.stderr}`);
      process.exit(1);
    }
    fs.writeFileSync(ex.expected, r.stdout);
    n++;
  }
  console.log(`wrote ${n} expected outputs to examples/expected/`);
}
