#!/usr/bin/env node
// Validate data/prices.json against data/schema.json (hand-written validator, no packages).
// Exit 1 on any error. Warnings (stale rows, tier/band mismatches without a note) do not fail
// unless --strict is given.
//
//   node scripts/check.mjs [--strict] [--max-age-days 90] [--prices PATH]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadPrices, ROOT, TIERS, parseArgs, toInt } from "./lib/prices.mjs";

export function validate(data, schema, { today = new Date(), maxAgeDays = 90 } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  checkObject(data, schema.top, "top", err);
  if (!data.providers || !data.models) return { errors, warnings };

  for (const [id, p] of Object.entries(data.providers)) checkObject(p, schema.provider, `providers.${id}`, err);

  const seen = new Set();
  const bands = data.tier_bands || {};
  for (const m of data.models) {
    const where = `models[${m.id || "?"}]`;
    checkObject(m, schema.model, where, err);
    if (m.id) {
      if (seen.has(m.id)) err(`${where}: duplicate id`);
      seen.add(m.id);
    }
    if (m.provider && !data.providers[m.provider]) err(`${where}: unknown provider "${m.provider}"`);
    if (m.long_context) checkObject(m.long_context, schema.long_context, `${where}.long_context`, err);
    if (m.promo) {
      checkObject(m.promo, schema.promo, `${where}.promo`, err);
      if (m.promo.after && typeof m.promo.after.from !== "string") err(`${where}.promo.after.from must be a date string`);
    }
    for (const k of ["source"]) {
      if (typeof m[k] === "string" && !/^https:\/\/[^\s/]+\.[^\s/]+/.test(m[k])) err(`${where}: ${k} is not a well-formed https URL`);
    }
    if (typeof m.input === "number" && m.input < 0) err(`${where}: negative input price`);
    if (typeof m.output === "number" && m.output < 0) err(`${where}: negative output price`);
    if (typeof m.cached_input === "number" && typeof m.input === "number" && m.cached_input > m.input) warn(`${where}: cached_input (${m.cached_input}) is above input (${m.input}); double-check the page`);

    // tier vs band
    if (typeof m.output === "number" && m.tier) {
      const band = bandFor(m.output, bands);
      if (band && band !== m.tier && !m.tier_note) warn(`${where}: output $${m.output} is in the "${band}" band but tier is "${m.tier}" and there is no tier_note`);
    }
    // staleness
    if (m.checked && /^\d{4}-\d{2}-\d{2}$/.test(m.checked)) {
      const age = Math.floor((today - new Date(m.checked + "T00:00:00Z")) / 86400000);
      if (age > maxAgeDays) warn(`${where}: price checked ${age} days ago (> ${maxAgeDays}); re-check ${m.source}`);
      if (age < 0) err(`${where}: checked date is in the future`);
    }
  }
  for (const t of TIERS) if (!data.models.some((m) => m.tier === t)) warn(`no model in tier "${t}"`);
  return { errors, warnings };
}

export function bandFor(output, bands) {
  for (const t of TIERS) {
    const b = bands[t];
    if (!b) return null;
    if (b.max_output == null || output <= b.max_output) return t;
  }
  return null;
}

function checkObject(obj, spec, where, err) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return err(`${where}: expected an object`);
  for (const [key, rule] of Object.entries(spec)) {
    const present = Object.prototype.hasOwnProperty.call(obj, key);
    if (!present) {
      if (rule.required) err(`${where}: missing "${key}"`);
      continue;
    }
    const v = obj[key];
    const types = rule.type.split("|");
    const actual = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    if (!types.includes(actual)) err(`${where}.${key}: expected ${rule.type}, got ${actual}`);
    if (typeof v === "string" && rule.pattern && !new RegExp(rule.pattern).test(v)) err(`${where}.${key}: "${v}" does not match ${rule.pattern}`);
    if (rule.enum && !rule.enum.includes(v)) err(`${where}.${key}: "${v}" not in [${rule.enum.join(", ")}]`);
  }
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help || a.h) {
    console.log("usage: node scripts/check.mjs [--strict] [--max-age-days 90] [--prices PATH]");
    return 0;
  }
  const data = loadPrices(a.prices ? String(a.prices) : undefined);
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "schema.json"), "utf8"));
  const { errors, warnings } = validate(data, schema, { maxAgeDays: toInt(a["max-age-days"], 90) });
  for (const w of warnings) console.log("warn  " + w);
  for (const e of errors) console.log("error " + e);
  console.log(`${data.models.length} models, ${Object.keys(data.providers).length} providers, ${errors.length} errors, ${warnings.length} warnings`);
  return errors.length || (a.strict && warnings.length) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("error:", e.message);
    process.exit(1);
  }
}
