#!/usr/bin/env node
// Zero-dependency test runner: runs every tests/*.test.mjs with `node --test`.
// A child process is used (not node:test/reporters) so it works on Node 18 as well as 22+.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort().map((f) => join(dir, f));
const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit", cwd: dirname(dir) });
process.exit(r.status ?? 1);
