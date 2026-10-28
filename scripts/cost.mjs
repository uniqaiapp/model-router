#!/usr/bin/env node
// Zero-dependency LLM cost calculator over data/prices.json.
//
//   node scripts/cost.mjs --model claude-haiku-5-5 --input 12000 --output 800 --calls 1000
//   node scripts/cost.mjs --tier smart --input 12000 --output 1500            (compare every smart model)
//   node scripts/cost.mjs --file prompt.txt --output 400 --compare            (estimate tokens from a file)
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { loadPrices, findModel, estimateCost, rankModels, fmtUSD, fmtInt, fmtPrice, parseArgs, toInt, TIERS } from "./lib/prices.mjs";

const HELP = `model-router cost calculator (prices from data/prices.json, each row dated and sourced)

usage: node scripts/cost.mjs --model ID [shape]        one model
       node scripts/cost.mjs --tier TIER [shape]       every model in a tier, cheapest first
       node scripts/cost.mjs --compare [shape]         every model, cheapest first
       node scripts/cost.mjs --list                    print the price table

shape
  --input N        prompt tokens per call (default 2000)
  --output N       completion tokens per call (default 500)
  --cached N       prompt tokens served from the prompt cache (default 0)
  --calls N        number of calls (default 1)
  --batch          apply the provider's batch discount where one is verified
  --file PATH      estimate --input from a text file (chars / 4, a rough rule of thumb)
  --provider ID    openai | anthropic | google | xai
  --json           machine-readable output
  --prices PATH    alternative price table`;

function shapeFrom(a) {
  let inputTokens = toInt(a.input, 2000);
  const notes = [];
  if (a.file) {
    const text = fs.readFileSync(String(a.file), "utf8");
    inputTokens = Math.ceil(text.length / 4);
    notes.push(`--input estimated from ${a.file}: ${fmtInt(text.length)} chars / 4 ≈ ${fmtInt(inputTokens)} tokens (rough; count with the vendor's tokenizer for billing-grade numbers)`);
  }
  return { shape: { inputTokens, outputTokens: toInt(a.output, 500), cachedTokens: toInt(a.cached, 0), calls: toInt(a.calls, 1), batch: !!a.batch }, notes };
}

function shapeLine(s, asOf) {
  const extra = [s.cachedTokens ? `${fmtInt(s.cachedTokens)} cached` : null, s.batch ? "batch" : null].filter(Boolean).join(", ");
  return `shape     ${fmtInt(s.inputTokens)} input + ${fmtInt(s.outputTokens)} output tokens per call, ${fmtInt(s.calls)} call${s.calls === 1 ? "" : "s"}${extra ? " (" + extra + ")" : ""}; prices as of ${asOf}`;
}

export function renderOne(c, m, s, data) {
  const L = [];
  L.push(`model     ${m.id}  (${data.providers[m.provider].name}, ${m.tier} tier)`);
  L.push(shapeLine(s, data.updated));
  L.push(`prices    in ${fmtPrice(c.prices.input)} · cached ${fmtPrice(c.prices.cached_input)} · out ${fmtPrice(c.prices.output)} per 1M (${c.basis})`);
  L.push(`per call  ${fmtUSD(c.per_call)}   = input ${fmtUSD(c.breakdown.input)} + cached ${fmtUSD(c.breakdown.cached)} + output ${fmtUSD(c.breakdown.output)}`);
  L.push(`total     ${fmtUSD(c.total)}   for ${fmtInt(c.calls)} call${c.calls === 1 ? "" : "s"}`);
  for (const n of c.notes) L.push(`note      ${n}`);
  L.push(`source    ${m.source} (checked ${m.checked})`);
  return L.join("\n") + "\n";
}

export function renderTable(rows, excluded, s, data, title) {
  const L = [];
  L.push(title);
  L.push(shapeLine(s, data.updated));
  L.push("");
  L.push(`  ${"model".padEnd(30)} ${"provider".padEnd(10)} ${"tier".padEnd(8)} ${"per call".padStart(11)} ${"total".padStart(11)}  notes`);
  for (const r of rows) {
    L.push(`  ${r.model.padEnd(30)} ${r.provider.padEnd(10)} ${r.tier.padEnd(8)} ${fmtUSD(r.per_call).padStart(11)} ${fmtUSD(r.total).padStart(11)}  ${r.notes.join("; ")}`.trimEnd());
  }
  for (const e of excluded) L.push(`  ${e.model.padEnd(30)} excluded: ${e.reason}`);
  return L.join("\n") + "\n";
}

export function renderList(data) {
  const L = [];
  L.push(`price table, USD per 1M tokens, as of ${data.updated} (source and check date per row in data/prices.json)`);
  L.push("");
  L.push(`  ${"model".padEnd(30)} ${"provider".padEnd(10)} ${"tier".padEnd(8)} ${"input".padStart(8)} ${"cached".padStart(8)} ${"output".padStart(8)}  checked`);
  for (const t of TIERS) {
    for (const m of data.models.filter((x) => x.tier === t)) {
      L.push(`  ${m.id.padEnd(30)} ${m.provider.padEnd(10)} ${m.tier.padEnd(8)} ${fmtPrice(m.input).padStart(8)} ${fmtPrice(m.cached_input).padStart(8)} ${fmtPrice(m.output).padStart(8)}  ${m.checked}`);
    }
  }
  return L.join("\n") + "\n";
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help || a.h || process.argv.length <= 2) {
    console.log(HELP);
    return a.help || a.h ? 0 : 2;
  }
  const data = loadPrices(a.prices ? String(a.prices) : undefined);
  if (a.list) {
    process.stdout.write(a.json ? JSON.stringify(data.models, null, 2) + "\n" : renderList(data));
    return 0;
  }
  const { shape, notes } = shapeFrom(a);
  const provider = typeof a.provider === "string" ? a.provider : null;

  if (a.model) {
    const m = findModel(data, a.model);
    if (!m) {
      console.error(`unknown model "${a.model}". Known ids: ${data.models.map((x) => x.id).join(", ")}`);
      return 2;
    }
    const c = estimateCost(m, shape, data);
    if (!c.ok) {
      console.error(`${m.id}: ${c.notes.join("; ")}`);
      return 2;
    }
    c.notes.push(...notes);
    process.stdout.write(a.json ? JSON.stringify({ shape, ...c, source: m.source, checked: m.checked }, null, 2) + "\n" : renderOne(c, m, shape, data));
    return 0;
  }

  const tier = typeof a.tier === "string" ? a.tier : null;
  if (tier && !TIERS.includes(tier)) {
    console.error(`unknown tier "${tier}" (fast | smart | premium)`);
    return 2;
  }
  if (tier || a.compare) {
    const { rows, excluded } = rankModels(data, shape, { tier, provider });
    const title = tier ? `${tier} tier, cheapest first` : "all models, cheapest first";
    if (a.json) process.stdout.write(JSON.stringify({ shape, rows, excluded, notes }, null, 2) + "\n");
    else {
      let out = renderTable(rows, excluded, shape, data, title);
      for (const n of notes) out += `note      ${n}\n`;
      process.stdout.write(out);
    }
    return 0;
  }
  console.error(HELP);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("error:", e.message);
    process.exit(1);
  }
}
