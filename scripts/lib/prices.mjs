// Price table access and cost arithmetic. Node built-ins only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_PATH = path.join(ROOT, "data", "prices.json");
export const TIERS = ["fast", "smart", "premium"];

export function loadPrices(p = DATA_PATH) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function findModel(data, id) {
  const want = String(id).toLowerCase();
  return data.models.find((m) => m.id.toLowerCase() === want) || null;
}

export function modelsInTier(data, tier) {
  return data.models.filter((m) => m.tier === tier);
}

/** Prices that apply to one request of the given input size (standard vs long-context rows). */
export function effectivePrices(model, inputTokens = 0) {
  const lc = model.long_context;
  if (lc && inputTokens >= lc.threshold) {
    return { input: lc.input, cached_input: lc.cached_input, output: lc.output, basis: "long_context" };
  }
  return { input: model.input, cached_input: model.cached_input, output: model.output, basis: "standard" };
}

/**
 * Cost of `calls` requests with the given token shape.
 * shape: { inputTokens, outputTokens, cachedTokens, calls, batch }
 * cachedTokens is the part of inputTokens that hits the prompt cache.
 */
export function estimateCost(model, shape, data) {
  const inputTokens = Math.max(0, shape.inputTokens | 0);
  const outputTokens = Math.max(0, shape.outputTokens | 0);
  const cachedTokens = Math.min(inputTokens, Math.max(0, shape.cachedTokens | 0));
  const calls = Math.max(1, shape.calls | 0);
  const notes = [];
  const p = effectivePrices(model, inputTokens);

  if (p.basis === "long_context") notes.push(`long-context prices (prompt >= ${fmtInt(model.long_context.threshold)} tokens)`);
  if (p.input == null || p.output == null) {
    return { ok: false, model: model.id, notes: ["no input/output price on the vendor page; cannot estimate"] };
  }

  let cachedPrice = p.cached_input;
  if (cachedTokens > 0 && cachedPrice == null) {
    cachedPrice = p.input;
    notes.push("no cached-input price listed; cached tokens priced as normal input");
  }

  let discount = 1;
  if (shape.batch) {
    const prov = data.providers[model.provider];
    if (prov && typeof prov.batch_discount === "number") {
      discount = prov.batch_discount;
      notes.push(`batch: x${discount} (${prov.name})`);
    } else {
      notes.push("batch requested but no verified batch discount for this provider; standard price used");
    }
  }

  const M = 1e6;
  const inputCost = ((inputTokens - cachedTokens) * p.input) / M;
  const cachedCost = cachedTokens > 0 ? (cachedTokens * cachedPrice) / M : 0;
  const outputCost = (outputTokens * p.output) / M;
  const perCall = (inputCost + cachedCost + outputCost) * discount;

  return {
    ok: true,
    model: model.id,
    provider: model.provider,
    tier: model.tier,
    basis: p.basis,
    prices: { input: p.input, cached_input: p.cached_input, output: p.output },
    per_call: round(perCall, 8),
    total: round(perCall * calls, 6),
    breakdown: { input: round(inputCost * discount, 8), cached: round(cachedCost * discount, 8), output: round(outputCost * discount, 8) },
    calls,
    notes,
  };
}

/** All models that can take the shape, cheapest first. Models with a known context smaller than the prompt are listed under `excluded`. */
export function rankModels(data, shape, { tier = null, provider = null } = {}) {
  const rows = [];
  const excluded = [];
  for (const m of data.models) {
    if (tier && m.tier !== tier) continue;
    if (provider && m.provider !== provider) continue;
    if (m.context != null && shape.inputTokens > m.context) {
      excluded.push({ model: m.id, reason: `context ${fmtInt(m.context)} < prompt ${fmtInt(shape.inputTokens)}` });
      continue;
    }
    const c = estimateCost(m, shape, data);
    if (c.ok) rows.push(c);
    else excluded.push({ model: m.id, reason: c.notes.join("; ") });
  }
  rows.sort((a, b) => a.per_call - b.per_call || a.model.localeCompare(b.model));
  return { rows, excluded };
}

/**
 * Cheapest model of `tier` for each provider. When a provider has nothing in that tier,
 * step up a tier; if still nothing, take the provider's most expensive-tier model and say so.
 */
export function cheapestPerProvider(data, tier, shape) {
  const out = [];
  const tierIdx = TIERS.indexOf(tier);
  for (const [pid, prov] of Object.entries(data.providers)) {
    let pick = null;
    let note = "";
    for (let i = tierIdx; i < TIERS.length && !pick; i++) {
      const { rows } = rankModels(data, shape, { tier: TIERS[i], provider: pid });
      if (rows.length) {
        pick = rows[0];
        if (i !== tierIdx) note = `no ${tier} model at ${prov.name}; stepped up to ${TIERS[i]}`;
      }
    }
    if (!pick) {
      // nothing at or above the tier: fall back to the provider's highest tier that fits
      for (let i = tierIdx - 1; i >= 0 && !pick; i--) {
        const { rows } = rankModels(data, shape, { tier: TIERS[i], provider: pid });
        if (rows.length) {
          pick = rows[rows.length - 1];
          const m = findModel(data, pick.model);
          note = `no ${tier} model at ${prov.name}; ${m.tier_note ? "see tier_note: " + m.tier_note : "best available is " + TIERS[i]}`;
        }
      }
    }
    if (pick) out.push({ provider: pid, provider_name: prov.name, ...pick, note });
    else out.push({ provider: pid, provider_name: prov.name, ok: false, note: `no model at ${prov.name} fits this prompt size` });
  }
  return out;
}

export function round(x, d) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export function fmtUSD(x) {
  if (x == null || Number.isNaN(x)) return "n/a";
  if (x >= 100) return "$" + x.toFixed(0);
  if (x >= 1) return "$" + x.toFixed(2);
  if (x >= 0.01) return "$" + x.toFixed(4);
  return "$" + x.toFixed(6);
}

export function fmtInt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function fmtPrice(x) {
  if (x == null) return "—";
  const s = String(x);
  const decimals = s.includes(".") ? s.split(".")[1].length : 0;
  return "$" + (decimals <= 2 ? x.toFixed(2) : s);
}

/** Minimal argv parser: --key value, --flag, positional. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[k] = next;
        i++;
      } else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

export function toInt(v, dflt) {
  if (v === undefined || v === true) return dflt;
  const n = parseInt(String(v).replace(/[,_]/g, ""), 10);
  return Number.isFinite(n) ? n : dflt;
}
