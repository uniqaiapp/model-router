#!/usr/bin/env node
// Route a task to the cheapest model tier that can do it, then price it per provider.
//
//   node scripts/route.mjs "classify 50k support tickets" --input 600 --output 20 --calls 50000 --risk low
//   node scripts/route.mjs --file task.txt --json
//
// Options: --input N  --output N  --calls N  --cached N  --batch  --risk low|medium|high
//          --provider openai|anthropic|google|xai   --json   --file PATH   --prices PATH
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { classify } from "./lib/classify.mjs";
import { loadPrices, cheapestPerProvider, rankModels, fmtUSD, fmtInt, parseArgs, toInt, TIERS } from "./lib/prices.mjs";

const HELP = `model-router: pick the cheapest tier (fast / smart / premium) that can do a task, and price it.

usage: node scripts/route.mjs "<task description>" [options]
       node scripts/route.mjs --file task.txt [options]

options
  --input N        prompt tokens per call (default 2000)
  --output N       completion tokens per call (default 500)
  --calls N        number of calls (default 1)
  --cached N       tokens of the prompt served from the prompt cache (default 0)
  --batch          price with the provider's batch discount where one is verified
  --risk LEVEL     low | medium | high  (how bad is a wrong answer)
  --provider ID    only show openai | anthropic | google | xai
  --tier TIER      skip classification and price this tier: fast | smart | premium
  --json           machine-readable output
  --prices PATH    alternative price table (default data/prices.json)

Prices come from data/prices.json; every row carries its vendor source URL and check date.`;

export function route(task, opts, data) {
  const inputTokens = opts.inputTokens ?? 2000;
  const outputTokens = opts.outputTokens ?? 500;
  const calls = opts.calls ?? 1;
  const assumptions = { input_tokens: inputTokens, output_tokens: outputTokens, calls, risk: opts.risk || "unknown" };
  const cls = opts.tier ? forcedTier(opts.tier, assumptions) : classify(task, { inputTokens, outputTokens, calls, risk: opts.risk });
  const shape = { inputTokens, outputTokens, cachedTokens: opts.cachedTokens || 0, calls, batch: !!opts.batch };
  let picks = cheapestPerProvider(data, cls.tier, shape);
  if (opts.provider) picks = picks.filter((p) => p.provider === opts.provider);
  const nextTier = TIERS[TIERS.indexOf(cls.tier) + 1] || null;
  const fallback = nextTier ? rankModels(data, shape, { tier: nextTier }).rows[0] || null : null;
  return { task, ...cls, shape, picks, fallback: fallback ? { tier: nextTier, ...fallback } : null, prices_as_of: data.updated };
}

function forcedTier(tier, assumptions) {
  if (!TIERS.includes(tier)) throw new Error(`unknown tier "${tier}" (fast | smart | premium)`);
  return { tier, scores: null, confidence: "forced", reasons: [{ id: "T0", tier, weight: 0, label: `tier set by --tier ${tier}` }], hints: [], assumptions };
}

export function render(r, data) {
  const L = [];
  const pad = (s, n) => String(s).padEnd(n);
  L.push(`task      ${r.task}`);
  if (r.scores) {
    L.push(`tier      ${r.tier.toUpperCase()}   (fast ${r.scores.fast} · smart ${r.scores.smart} · premium ${r.scores.premium}; confidence ${r.confidence})`);
  } else L.push(`tier      ${r.tier.toUpperCase()}   (forced)`);
  r.reasons.forEach((x, i) => {
    const sign = x.weight > 0 ? "+" : " ";
    L.push(`${i === 0 ? "why       " : "          "}${pad(x.label, 62)} ${x.tier} ${sign}${x.weight}`);
  });
  const a = r.shape;
  const extra = [a.cachedTokens ? `${fmtInt(a.cachedTokens)} cached` : null, a.batch ? "batch" : null].filter(Boolean).join(", ");
  L.push(`assumes   ${fmtInt(a.inputTokens)} input + ${fmtInt(a.outputTokens)} output tokens per call, ${fmtInt(a.calls)} call${a.calls === 1 ? "" : "s"}${extra ? " (" + extra + ")" : ""}; prices as of ${r.prices_as_of}`);
  L.push("");
  L.push(`cheapest ${r.tier} model per provider (per call → total)`);
  for (const p of r.picks) {
    if (!p.ok) {
      L.push(`  ${pad(p.provider, 10)} ${pad("—", 30)} ${p.note}`);
      continue;
    }
    L.push(`  ${pad(p.provider, 10)} ${pad(p.model, 30)} ${pad(fmtUSD(p.per_call), 11)} →  ${fmtUSD(p.total)}${p.note ? "   " + p.note : ""}`);
    for (const n of p.notes) L.push(`  ${pad("", 10)} ${pad("", 30)} ${n}`);
  }
  if (r.fallback) {
    L.push("");
    L.push(`fallback  ${r.fallback.tier}: ${r.fallback.model} (${fmtUSD(r.fallback.per_call)} per call, ${fmtUSD(r.fallback.total)} total) if ${r.tier}-tier output fails your check on a sample`);
  } else if (r.tier === "premium") {
    L.push("");
    L.push("fallback  none above premium; if this still fails, split the task or add tools, do not just retry");
  }
  for (const h of r.hints) L.push(`hint      ${h}`);
  return L.join("\n") + "\n";
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help || a.h) {
    console.log(HELP);
    return 0;
  }
  let task = a._.join(" ").trim();
  if (a.file) task = fs.readFileSync(String(a.file), "utf8").trim();
  if (!task && !a.tier) {
    console.error(HELP);
    return 2;
  }
  const data = loadPrices(a.prices ? String(a.prices) : undefined);
  const opts = {
    inputTokens: toInt(a.input, undefined),
    outputTokens: toInt(a.output, undefined),
    calls: toInt(a.calls, undefined),
    cachedTokens: toInt(a.cached, 0),
    batch: !!a.batch,
    risk: typeof a.risk === "string" ? a.risk : undefined,
    provider: typeof a.provider === "string" ? a.provider : undefined,
    tier: typeof a.tier === "string" ? a.tier : undefined,
  };
  const r = route(task || `(${opts.tier} tier)`, opts, data);
  process.stdout.write(a.json ? JSON.stringify(r, null, 2) + "\n" : render(r, data));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("error:", e.message);
    process.exit(1);
  }
}
