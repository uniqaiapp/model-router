// Unit tests for the classifier and the cost arithmetic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, RULES } from "../scripts/lib/classify.mjs";
import { loadPrices, estimateCost, findModel, cheapestPerProvider, effectivePrices, fmtUSD } from "../scripts/lib/prices.mjs";

const data = loadPrices();

test("rules have unique ids and valid tiers", () => {
  const ids = new Set();
  for (const r of RULES) {
    assert.ok(!ids.has(r.id), r.id);
    ids.add(r.id);
    assert.ok(["fast", "smart", "premium"].includes(r.tier));
    assert.ok(r.w > 0);
  }
});

test("classification verbs at volume go fast", () => {
  const r = classify("classify each review as positive or negative", { calls: 100000, outputTokens: 5, risk: "low" });
  assert.equal(r.tier, "fast");
  assert.equal(r.confidence, "high");
});

test("scoped coding goes smart", () => {
  assert.equal(classify("implement a function that parses ISO dates and add unit tests").tier, "smart");
});

test("high risk alone pushes to premium", () => {
  const r = classify("summarise this", { risk: "high" });
  assert.equal(r.tier, "premium");
  assert.ok(r.reasons.some((x) => x.id === "R1"));
});

test("architecture and security wording go premium", () => {
  assert.equal(classify("design the system architecture for a distributed queue with exactly-once delivery").tier, "premium");
  assert.equal(classify("write a threat model for the new auth flow").tier, "premium");
});

test("no signal defaults to smart with low confidence", () => {
  const r = classify("do the thing");
  assert.equal(r.tier, "smart");
  assert.equal(r.confidence, "low");
  assert.ok(r.reasons.some((x) => x.id === "D0"));
});

test("ties go up a tier", () => {
  // one fast rule (+2) vs one smart rule (+2)
  const r = classify("extract the fields and write a short article about them", { outputTokens: 500 });
  assert.ok(r.scores.fast >= 2 && r.scores.smart >= 2);
  if (r.scores.fast === r.scores.smart) assert.equal(r.tier, "smart");
});

test("mixed fast + premium signals produce the two-stage hint", () => {
  const r = classify("triage every alert and write a threat model for the real vulnerabilities", { calls: 5000 });
  assert.ok(r.hints.some((h) => h.includes("two-stage")));
});

test("estimateCost: plain arithmetic", () => {
  const m = findModel(data, "claude-sonnet-5-5");
  const c = estimateCost(m, { inputTokens: 1_000_000, outputTokens: 1_000_000, calls: 1 }, data);
  assert.equal(c.per_call, m.input + m.output);
});

test("estimateCost: cached tokens, batch discount and long-context prices", () => {
  const m = findModel(data, "claude-haiku-5-5");
  const lc = m.long_context;
  const c = estimateCost(m, { inputTokens: lc.threshold, outputTokens: 0, cachedTokens: lc.threshold, calls: 2, batch: true }, data);
  assert.equal(c.basis, "long_context");
  const expected = ((lc.threshold * lc.cached_input) / 1e6) * data.providers.anthropic.batch_discount;
  assert.ok(Math.abs(c.per_call - expected) < 1e-12);
  assert.ok(Math.abs(c.total - expected * 2) < 1e-9);
});

test("estimateCost: unknown batch discount is not applied", () => {
  const m = findModel(data, "grok-4.3");
  const a = estimateCost(m, { inputTokens: 1000, outputTokens: 1000, batch: true }, data);
  const b = estimateCost(m, { inputTokens: 1000, outputTokens: 1000, batch: false }, data);
  assert.equal(a.per_call, b.per_call);
  assert.ok(a.notes.some((n) => n.includes("no verified batch discount")));
});

test("effectivePrices switches at the threshold", () => {
  const m = findModel(data, "grok-4.7");
  assert.equal(effectivePrices(m, m.long_context.threshold - 1).basis, "standard");
  assert.equal(effectivePrices(m, m.long_context.threshold).basis, "long_context");
});

test("cheapestPerProvider steps up when a provider lacks the tier and explains it", () => {
  const picks = cheapestPerProvider(data, "premium", { inputTokens: 1000, outputTokens: 100, calls: 1 });
  const xai = picks.find((p) => p.provider === "xai");
  assert.ok(xai.ok);
  assert.ok(xai.note.includes("no premium model"));
  for (const p of picks) if (p.ok) assert.ok(p.per_call > 0);
});

test("context limits exclude models that cannot take the prompt", () => {
  const picks = cheapestPerProvider(data, "fast", { inputTokens: 300_000, outputTokens: 100, calls: 1 });
  const xai = picks.find((p) => p.provider === "xai");
  assert.notEqual(xai.model, "grok-build-0.1", "256k model must be excluded for a 300k prompt");
});

test("fmtUSD is stable", () => {
  assert.equal(fmtUSD(0), "$0.000000");
  assert.equal(fmtUSD(0.00007), "$0.000070");
  assert.equal(fmtUSD(0.5), "$0.5000");
  assert.equal(fmtUSD(3.5), "$3.50");
  assert.equal(fmtUSD(150), "$150");
});
