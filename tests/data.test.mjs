// data/prices.json: schema, sources, dates, duplicates, tier bands; references/price-table.md is in sync.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadPrices, ROOT, TIERS } from "../scripts/lib/prices.mjs";
import { validate, bandFor } from "../scripts/check.mjs";
import { renderMarkdown } from "../scripts/table.mjs";

const data = loadPrices();
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "schema.json"), "utf8"));

test("prices.json validates with no errors (staleness is a warning only)", () => {
  const { errors } = validate(data, schema, { today: new Date(data.updated + "T00:00:00Z") });
  assert.deepEqual(errors, []);
});

test("validator catches a broken row", () => {
  const broken = JSON.parse(JSON.stringify(data));
  broken.models[0].source = "ftp://nowhere";
  broken.models[1].checked = "yesterday";
  broken.models.push({ ...broken.models[2] }); // duplicate id
  delete broken.models[3].output;
  const { errors } = validate(broken, schema, { today: new Date(data.updated + "T00:00:00Z") });
  assert.ok(errors.some((e) => e.includes("source")));
  assert.ok(errors.some((e) => e.includes("checked")));
  assert.ok(errors.some((e) => e.includes("duplicate")));
  assert.ok(errors.some((e) => e.includes('missing "output"')));
});

test("every model has a source URL on the provider's domain and an ISO checked date", () => {
  for (const m of data.models) {
    const prov = data.providers[m.provider];
    assert.ok(prov, `${m.id}: provider`);
    assert.equal(new URL(m.source).hostname, new URL(prov.pricing_url).hostname, `${m.id}: source host`);
    assert.match(m.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(m.checked <= data.updated, `${m.id}: checked after updated`);
  }
});

test("tier differs from the price band only with a tier_note", () => {
  for (const m of data.models) {
    const band = bandFor(m.output, data.tier_bands);
    if (band !== m.tier) assert.ok(m.tier_note, `${m.id}: tier ${m.tier} vs band ${band} without tier_note`);
  }
});

test("every tier and every provider has at least one model, and every provider has a fast model", () => {
  for (const t of TIERS) assert.ok(data.models.some((m) => m.tier === t), t);
  for (const p of Object.keys(data.providers)) {
    assert.ok(data.models.some((m) => m.provider === p), p);
    assert.ok(data.models.some((m) => m.provider === p && m.tier === "fast"), `${p} has a fast model`);
  }
});

test("references/price-table.md is the current render of prices.json", () => {
  const onDisk = fs.readFileSync(path.join(ROOT, "references", "price-table.md"), "utf8");
  assert.equal(onDisk, renderMarkdown(data), "run: node scripts/table.mjs --write");
});
