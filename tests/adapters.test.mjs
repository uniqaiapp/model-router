// Structure and forbidden-string checks shared by every uniqaiapp repo (CONVENTIONS section 3.7 and 10).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "model-router";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

function frontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(md);
  assert.ok(m, "SKILL.md has YAML frontmatter");
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
    const nested = /^\s+([a-z_]+):\s*(.*)$/.exec(line);
    if (nested) fm["metadata." + nested[1]] = nested[2].trim();
  }
  return fm;
}

test("SKILL.md frontmatter: name equals repo, description single-line and within limits", () => {
  const fm = frontmatter(read("SKILL.md"));
  assert.equal(fm.name, REPO);
  assert.ok(fm.description.length >= 1 && fm.description.length <= 1024, `description length ${fm.description.length}`);
  assert.ok(!fm.description.includes("\n"));
  assert.ok(/^\d+\.\d+\.\d+$/.test(fm["metadata.version"]), "metadata.version is semver");
  assert.equal(fm["metadata.author"], "UniqAI");
});

test("SKILL.md body stays under 500 lines", () => {
  assert.ok(read("SKILL.md").split("\n").length < 500);
});

test("plugin.json name and version match SKILL.md", () => {
  const fm = frontmatter(read("SKILL.md"));
  const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
  assert.equal(plugin.name, fm.name);
  assert.equal(plugin.version, fm["metadata.version"]);
  assert.deepEqual(plugin.skills, ["./"]);
  assert.equal(plugin.author.name, "UniqAI");
});

test("CHANGELOG top entry matches the version", () => {
  const fm = frontmatter(read("SKILL.md"));
  const top = /^## \[(\d+\.\d+\.\d+)\]/m.exec(read("CHANGELOG.md"));
  assert.ok(top, "CHANGELOG has a versioned entry");
  assert.equal(top[1], fm["metadata.version"]);
});

test("adapters point at SKILL.md", () => {
  assert.ok(read(`.cursor/rules/${REPO}.mdc`).includes("@SKILL.md"));
  assert.ok(read("AGENTS.md").includes("SKILL.md"));
  assert.ok(read("codex/INSTRUCTIONS.md").includes("SKILL.md"));
});

test("README has exactly one Made by UniqAI footer and UTM on every uniqai.app link", () => {
  const md = read("README.md");
  assert.equal((md.match(/Made by/g) || []).length, 1);
  const links = md.match(/https:\/\/uniqai\.app[^\s)"'>]*/g) || [];
  assert.ok(links.length >= 1);
  for (const l of links) assert.ok(l.includes(`utm_campaign=${REPO}`), `UTM missing on ${l}`);
  assert.ok(links.length <= 3, "at most three UniqAI links per README");
});

const FORBIDDEN = ["aeoria", "richpeach", "/Users/", "/Volumes/", "node_modules", "sk-ant-", "sk_live", "api_key=", "API_KEY=<real", "TODO: fill", "lorem ipsum"];
const TEXT_EXT = new Set([".md", ".mjs", ".js", ".json", ".yml", ".yaml", ".txt", ".mdc", ".svg", ".cff", ".editorconfig", ".gitignore", ".gitattributes", ""]);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (TEXT_EXT.has(path.extname(e.name))) yield p;
  }
}

test("no forbidden strings in any tracked text file", () => {
  const hits = [];
  for (const file of walk(ROOT)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    for (const bad of FORBIDDEN) {
      const idx = text.toLowerCase().indexOf(bad.toLowerCase());
      if (idx === -1) continue;
      // the test itself lists the strings; .gitignore legitimately ignores node_modules
      if (rel === "tests/adapters.test.mjs") continue;
      if (bad === "node_modules" && (rel === ".gitignore" || rel === "AGENTS.md" || rel === "CONTRIBUTING.md")) continue;
      const line = text.slice(0, idx).split("\n").length;
      const lineText = text.split("\n")[line - 1];
      if (bad === "/Volumes/" && lineText.includes("conventions-allow: abs-path")) continue;
      hits.push(`${rel}:${line} contains "${bad}"`);
    }
  }
  assert.deepEqual(hits, []);
});

test("every Copyright line names UniqAI", () => {
  for (const file of walk(ROOT)) {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      if (/copyright \(c\)/i.test(line)) assert.ok(line.includes("UniqAI"), `${path.relative(ROOT, file)}: ${line}`);
    }
  }
});

test("required files exist", () => {
  for (const f of ["README.md", "SKILL.md", "AGENTS.md", "LICENSE", "CONTRIBUTING.md", "CHANGELOG.md", ".gitignore", ".gitattributes", ".editorconfig",
    ".github/workflows/ci.yml", ".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/bug_report.md", ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/PULL_REQUEST_TEMPLATE.md", ".github/repo.json", "assets/banner.svg", "assets/banner-light.svg", "assets/social-preview.png", "assets/demo.svg",
    "data/prices.json", "data/schema.json", "examples/README.md", "references/price-table.md", "references/tier-criteria.md"]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
  }
});
