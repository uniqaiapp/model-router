---
name: model-router
description: Routes an LLM task to the cheapest model tier that can do it (fast / smart / premium) and recommends a concrete model per provider (OpenAI, Anthropic, Google, xAI) with a cost estimate before you run it, from a dated, sourced price table. Use when the user asks which model to use, wants to cut LLM or API costs, compares GPT, Claude, Gemini or Grok prices, asks what a prompt or batch will cost, or sets up model routing in an agent or app. Not for benchmarks, quality rankings, or self-hosted model selection.
license: MIT
metadata:
  version: 0.1.0
  author: UniqAI
  homepage: https://github.com/uniqaiapp/model-router
---

# model-router

Pick the cheapest model that still passes the task. This skill classifies a task into one of three tiers from its *shape* (what kind of work, how long, how many calls, how bad a wrong answer is), names the cheapest model in that tier for each provider, and prices the job before anyone presses run. The most common trigger is "which model should I use for this?" or "what will this cost?".

## When to use

- The user asks which model to use for a task, a pipeline step, a sub-agent or a batch job.
- The user asks what a prompt, a run of N calls, or a nightly batch will cost, or whether a cheaper model would do.
- The user is designing an agent or app with more than one model and wants routing rules (fast path, smart path, escalation).
- The user compares GPT, Claude, Gemini or Grok prices, or asks about prompt caching, batch pricing or long-context surcharges.
- An existing workflow is too expensive and the user wants to know where a smaller model would pass.

## When NOT to use

- Benchmarks or "which model is smartest": this skill ranks by price within a tier; it holds no quality scores and must not invent them.
- Self-hosted or open-weight models (Llama, Qwen, Mistral on your own GPUs): there is no per-token list price to route on.
- Image, video, audio or embedding pricing: the table is text-model prices only.
- Deciding a tier for a task the user has not described: ask for the task and the four shape facts first (see step 1).

## How it works

All commands run from the skill root (the directory holding this file). Nothing to install; Node 18+.

1. **Pin the shape.** Get four facts, or state the defaults you are assuming:
   - input tokens per call (default 2,000), output tokens per call (default 500),
   - number of calls (default 1),
   - risk: `low` (errors cheap to catch), `medium`, `high` (an error is expensive or irreversible). If unknown, say so; the router adds a validation hint.
   Estimate tokens from a file with `node scripts/cost.mjs --file prompt.txt` (chars / 4, rough).

2. **Classify.** Run

   ```
   node scripts/route.mjs "<task in the user's words>" --input N --output N --calls N --risk L
   ```

   Output: the tier, every rule that fired with its weight, the cheapest model per provider with per-call and total cost, the fallback model one tier up, and hints. Add `--json` for machine output, `--provider openai|anthropic|google|xai` to narrow, `--cached N` for a cached prefix, `--batch` for batch pricing, `--tier` to skip classification.

   If Node is not available, apply the decision table below by hand and show the same breakdown.

3. **Choose the model.** Prefer the provider the user already pays (shared keys, prompt cache, rate limits) over the globally cheapest one; show the others as alternatives. Within a provider, the router already picked the cheapest model in the tier for that shape. When a provider has no model in the tier, the router steps up a tier and says so.

4. **Price it.** For a single model or a side-by-side table:

   ```
   node scripts/cost.mjs --model <id> --input N --output N --calls N [--cached N] [--batch]
   node scripts/cost.mjs --tier smart --input N --output N --calls N
   ```

   Quote per-call and total cost, and always quote `prices as of <date>` and the source URL the script prints. Never quote a price from memory.

5. **Report** in this shape, short:

   ```
   tier:      smart (why: scoped coding task +2, medium risk +1; confidence medium)
   model:     gpt-6.1-terra (OpenAI) · alternatives: claude-sonnet-5-5, gemini-3.6-flash, grok-4.20-0309-reasoning
   cost:      $0.0195 per call → $19.50 for 1,000 calls (prices as of 2026-10-28, see data/prices.json)
   fallback:  premium: claude-opus-5-5 if the smart output fails your check on a 20-item sample
   validate:  <the one check that proves the tier passed: exact-match on labels, tests green, a reviewer spot-check>
   ```

6. **Escalate and step down, one tier at a time.** If the chosen tier fails the validation check on a sample, move up exactly one tier and re-run the sample. If premium fails, the fix is a better prompt, a split task or a tool, not a retry. Once a tier passes, try the tier below on the same sample before committing; most savings come from this step.

## Decision table

The router sums the weights of every rule that matches and picks the highest tier; ties go up. `+N` is the weight. Confidence is high when the winner leads by 4 or more, medium at 2 to 3, low otherwise. Full wording and examples are in [`references/tier-criteria.md`](references/tier-criteria.md); the exact regular expressions are in `scripts/lib/classify.mjs`.

| Signal in the task | Tier | Weight |
|---|---|---|
| Classify, label, tag, triage, sentiment, spam, yes/no | fast | +2 |
| Extract fields, parse, convert to JSON/CSV, normalise, dedupe | fast | +2 |
| One line, title, subject line, slug, proofread, fix typos | fast | +2 |
| Bulk / every row / thousands / per day / at scale | fast | +2 |
| Simple, trivial, keywords, hashtags, boilerplate | fast | +1 |
| Short translation (strings, labels, UI) | fast | +1 |
| Expected output ≤ 50 tokens | fast | +1 |
| 1,000 calls or more | fast | +2 |
| Risk low | fast | +1 |
| Write / draft an article, email, docs, spec, report, release notes | smart | +2 |
| Implement a function, module, endpoint, tests; fix a bug; SQL | smart | +2 |
| Review, critique, explain, compare, analyse, plan, summarise a long document | smart | +2 |
| Code review, pull request, local refactor | smart | +2 |
| Long or tone-sensitive translation | smart | +2 |
| Chat turn, grounded answer, RAG with citations | smart | +1 |
| Prompt over 32,000 tokens | smart | +1 |
| Expected output ≥ 4,000 tokens | smart | +1 |
| Risk medium | smart | +1 |
| Proof, theorem, formal verification, algorithm optimisation | premium | +2 |
| Architecture, system design, trade-offs, race condition, deadlock, root cause, flaky | premium | +2 |
| Security, vulnerability, threat model, cryptography, auth design | premium | +2 |
| Legal, compliance, medical, clinical, financial model, tax, audit | premium | +2 |
| Multi-file, across the codebase, end-to-end, autonomous, long-running, many steps | premium | +2 |
| Novel, research, open-ended, ambiguous, no spec, strategy | premium | +1 |
| Prompt over 200,000 tokens | premium | +1 |
| Risk high | premium | +3 |
| No rule matched | smart (default, low confidence) | |

Two-stage rule: when fast signals and premium signals both score 2 or more (for example "triage every alert, write a threat model for the real ones"), route the bulk pass to fast and only the survivors to premium. The router prints this as a hint.

## What each tier is for

- **fast**: bounded output that can be checked mechanically. Classification, extraction, formatting, short rewrites, routing. Price band: output up to $3 per 1M tokens.
- **smart**: real writing and real code within a clear spec; judgment where a reviewer will look at the result. Price band: output $3 to $15 per 1M.
- **premium**: open-ended reasoning, hard debugging, high-stakes domains, long-horizon agent runs where a wrong step costs hours. Price band: output above $15 per 1M.

Tiers are price bands plus the vendor's own positioning (mini / flash / haiku vs pro / opus), not benchmark results. The table says so per row where the two disagree (`tier_note`).

## Cost rules of thumb the router applies

- Output tokens cost 4 to 6 times input tokens on most models; a shorter answer format saves more than a cheaper model with a chatty one.
- A cached prefix is priced at a fraction of input (listed per model as `cached_input`); keep system prompt and tools byte-stable and pass `--cached` to see the effect.
- Batch processing is listed at 50% off by OpenAI and Anthropic (as checked on the table date); the calculator applies it only where the table records a verified discount and says when it does not.
- Some vendors charge more once the prompt passes a threshold (Claude Haiku 5.5 at 100k, Gemini Pro and Grok at 200k); the calculator switches to those rows automatically.
- Reasoning effort settings spend output tokens; a premium model at low effort can be cheaper than a smart model at high effort. Measure per completed task, not per request.

## Inputs / outputs

| Input | Output |
|---|---|
| Task text (argument or `--file`) | Tier with scores, confidence and the rules that fired |
| `--input`, `--output`, `--calls`, `--cached`, `--batch`, `--risk` | Cheapest model per provider with per-call and total cost |
| `--provider`, `--tier` | Fallback one tier up, hints (validation, two-stage, long-context) |
| `data/prices.json` (every row: `source`, `checked`) | `prices as of <date>` on every estimate; `--json` for machines |

## Examples

Eleven routed tasks and four calculator runs live in [`examples/`](examples/README.md); each committed output is reproduced by the tests. Start with `examples/expected/01-classify-tickets.txt` (fast at volume) and `05-deadlock-root-cause.txt` (premium, with a provider that has no premium model).

## Limits

- The classifier is keyword and shape based. It reads the task description, not the data; a vague description gets the smart default with low confidence. Rephrase in concrete verbs ("classify", "implement", "prove") and it improves.
- Prices are copied by hand from vendor pages on the `checked` date. Run `node scripts/check.mjs` to see which rows are older than 90 days, and open the source URL before quoting a number in anything that matters.
- Token counts from `--file` are chars / 4; use the vendor's token counter for billing-grade numbers.
- English task descriptions only for the rule matching. Prices and the calculator work for any language.
- No quality data. If two providers tie on price, the router does not know which answers better; run your sample on both.

## References

- [`references/tier-criteria.md`](references/tier-criteria.md): each rule with examples and the validation check to pair with it.
- [`references/price-table.md`](references/price-table.md): the price table rendered from `data/prices.json` with source links and dates.
