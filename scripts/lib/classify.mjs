// Task-shape classifier: scores a task description into fast / smart / premium.
// The rules below are the same ones written out in SKILL.md and references/tier-criteria.md,
// so an agent that cannot run Node can apply them by hand and reach the same tier.
import { TIERS, fmtInt } from "./prices.mjs";

// Each rule: id, tier it votes for, weight, regex over the lower-cased task text, label shown in the output.
export const RULES = [
  // ---- fast: bounded output, pattern work, high volume
  { id: "F1", tier: "fast", w: 2, re: /\b(classif\w*|categori[sz]\w*|label(?:ing|s)?|tag(?:ging)?|sentiment|intent detection|spam|moderat\w*|triage|yes[/ ]or[/ ]no|yes\/no|true or false|is this (?:a|an)\b)/, label: "classification / labelling verb" },
  { id: "F2", tier: "fast", w: 2, re: /\b(extract\w*|parse|pull out|fields?|entit(?:y|ies)|to json|as json|json|csv|convert|reformat|normali[sz]e|dedup\w*|lookup|map(?:ping)? .* to\b)/, label: "extraction / format conversion" },
  { id: "F3", tier: "fast", w: 2, re: /\b(one[- ]line|one sentence|title|headline|subject line|slug|tl;?dr|rephrase|reword|fix (?:typos|grammar|spelling)|proofread|autocomplete|expand (?:this )?abbreviation)/, label: "short, bounded output" },
  { id: "F4", tier: "fast", w: 1, re: /\b(keywords?|hashtags?|emoji|synonyms?|simple|trivial|quick|basic|boilerplate)\b/, label: "simple or pattern-like" },
  { id: "F5", tier: "fast", w: 2, re: /\b(bulk|batch|every|each) (?:row|record|ticket|email|message|comment|review|document|file|item|product|entry|line)s?\b|\b(thousands|millions|per day|at scale|high[- ]volume)\b/, label: "high-volume wording" },
  { id: "F6", tier: "fast", w: 1, re: /\btranslate\b.*\b(short|sentence|string|label|ui|button)s?\b|\b(short|sentence|string|label|ui)s?\b.*\btranslate\b/, label: "short translation" },

  // ---- smart: real writing, real code, judgment within a clear spec
  { id: "S1", tier: "smart", w: 2, re: /\b(write|draft|compose|rewrite|edit) (?:an? |the |my )?(?:\w+ ){0,3}(essay|article|blog|post|email|docs?|documentation|spec|readme|report|proposal|brief|landing page|changelog|release notes)\b/, label: "drafting prose with structure" },
  { id: "S2", tier: "smart", w: 2, re: /\b(implement|write|add|build) (?:a |an |the )?(?:\w+ ){0,3}(function|class|module|component|endpoint|script|parser|migration|test|tests|cli|hook|query)\b|\bfix (?:the |this |a )?(?:\w+ )?bug\b|\bunit tests?\b|\bsql\b/, label: "scoped coding task" },
  { id: "S3", tier: "smart", w: 2, re: /\b(review|critique|explain|compare|analy[sz]e|evaluate|assess|plan|outline|summari[sz]e (?:the |this |a )?(?:\w+ )?(?:long |whole |entire |full )?(?:paper|report|book|transcript|thread|contract|spec|pdf|document))\b/, label: "judgment within a clear spec" },
  { id: "S4", tier: "smart", w: 2, re: /\b(code review|pull request|\bpr\b|refactor (?:this|the|a) (?:function|file|module|class))\b/, label: "code review or local refactor" },
  { id: "S5", tier: "smart", w: 1, re: /\b(chat|assistant|customer support reply|answer (?:the |this |a )?(?:user|customer)|rag|retrieval|grounded|cite|citations?)\b/, label: "grounded answering / chat turn" },
  { id: "S6", tier: "smart", w: 2, re: /\b(translate|localize|localise)\b.*\b(article|document|book|chapter|page|contract|manual|tone|style)s?\b/, label: "long or tone-sensitive translation" },

  // ---- premium: open-ended reasoning, high stakes, long-horizon agent work
  { id: "P1", tier: "premium", w: 2, re: /\b(prove|proof|theorem|lemma|formal(?:ly)? verif\w*|derive|derivation|optimi[sz]e (?:the )?algorithm|complexity analysis|np-hard)\b/, label: "mathematical or formal reasoning" },
  { id: "P2", tier: "premium", w: 2, re: /\b(architect\w*|system design|design (?:a|the) system|trade-?offs?|migration plan|distributed|consensus|concurren\w*|race condition|deadlock|memory leak|root[- ]cause|flaky|intermittent|heisenbug|performance regression)\b/, label: "architecture or hard debugging" },
  { id: "P3", tier: "premium", w: 2, re: /\b(security|vulnerab\w*|exploit|cryptograph\w*|threat model|pentest|penetration test|auth(?:entication|orization) (?:flow|design)|key management)\b/, label: "security-sensitive" },
  { id: "P4", tier: "premium", w: 2, re: /\b(legal|contract (?:review|terms|clause)|compliance|regulat\w*|gdpr|hipaa|medical|diagnos\w*|clinical|dosage|financial (?:advice|model|statement)|tax|audit)\b/, label: "high-stakes domain" },
  { id: "P5", tier: "premium", w: 2, re: /\b(multi-?file|across the (?:codebase|repo|repository|monorepo)|whole (?:codebase|repo)|entire (?:codebase|repo)|end-to-end|autonomous\w*|agent(?:ic)? (?:loop|run|task)|long-?running|many steps|multi-?step|hours of work|overnight)\b/, label: "long-horizon or multi-file agent work" },
  { id: "P6", tier: "premium", w: 1, re: /\b(novel|research|open-?ended|ambiguous|unclear spec|no (?:clear )?spec|strategy|strategic|from scratch|greenfield|invent|creative direction)\b/, label: "open-ended, under-specified" },
];

export const DEFAULTS = { inputTokens: 2000, outputTokens: 500, calls: 1, risk: "unknown" };

/**
 * classify(task, opts) -> { tier, scores, confidence, reasons, hints, assumptions }
 * opts: { inputTokens, outputTokens, calls, risk: low|medium|high|unknown }
 */
export function classify(task, opts = {}) {
  const text = String(task || "").toLowerCase().replace(/\s+/g, " ").trim();
  const o = { ...DEFAULTS, ...stripUndefined(opts) };
  const scores = { fast: 0, smart: 0, premium: 0 };
  const reasons = [];
  const vote = (tier, w, label, id) => {
    scores[tier] += w;
    reasons.push({ id, tier, weight: w, label });
  };

  for (const r of RULES) {
    const m = r.re.exec(text);
    if (m) vote(r.tier, r.w, `${r.label} ("${m[0].trim().slice(0, 40)}")`, r.id);
  }

  // ---- shape of the request, not its wording
  if (o.outputTokens <= 50) vote("fast", 1, `short expected output (${fmtInt(o.outputTokens)} tokens)`, "L1");
  if (o.outputTokens >= 4000) vote("smart", 1, `long expected output (${fmtInt(o.outputTokens)} tokens)`, "L2");
  if (o.inputTokens > 32000) vote("smart", 1, `long prompt (${fmtInt(o.inputTokens)} tokens) needs reliable attention`, "L3");
  if (o.inputTokens > 200000) vote("premium", 1, `very long prompt (${fmtInt(o.inputTokens)} tokens)`, "L4");
  if (o.calls >= 1000) vote("fast", 2, `high volume (${fmtInt(o.calls)} calls): a cheaper tier compounds`, "V1");

  if (o.risk === "high") vote("premium", 3, "high risk: an error is expensive or irreversible", "R1");
  else if (o.risk === "medium") vote("smart", 1, "medium risk", "R2");
  else if (o.risk === "low") vote("fast", 1, "low risk: errors are cheap to catch and retry", "R3");

  // ---- decide; ties go up a tier (measure, then step down)
  let tier;
  const defaulted = scores.fast === 0 && scores.smart === 0 && scores.premium === 0;
  if (defaulted) {
    tier = "smart";
    reasons.push({ id: "D0", tier: "smart", weight: 0, label: "no rule matched; default is smart (measure on a sample, then step down)" });
  } else {
    const best = Math.max(scores.fast, scores.smart, scores.premium);
    tier = [...TIERS].reverse().find((t) => scores[t] === best);
  }
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const margin = sorted[0] - sorted[1];
  const confidence = defaulted ? "low" : margin >= 4 ? "high" : margin >= 2 ? "medium" : "low";

  const hints = [];
  if (scores.premium >= 2 && (scores.fast >= 2 || o.calls >= 1000)) {
    hints.push("mixed signals: run a fast model first to filter or pre-process, send only the hard cases to premium (two-stage routing)");
  }
  if (tier === "fast" && o.risk === "unknown") hints.push("risk not given: validate fast-tier output on a sample before trusting it at volume");
  if (tier === "premium" && o.calls >= 100) hints.push("premium at volume: cache the stable prefix and batch where the provider allows; re-check whether smart passes your eval");
  if (o.inputTokens > 100000) hints.push("prompt over 100k tokens: some vendors switch to long-context prices (see long_context rows); check context limits");

  return {
    tier,
    scores,
    confidence,
    reasons,
    hints,
    assumptions: { input_tokens: o.inputTokens, output_tokens: o.outputTokens, calls: o.calls, risk: o.risk },
  };
}

function stripUndefined(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) out[k] = v;
  return out;
}
