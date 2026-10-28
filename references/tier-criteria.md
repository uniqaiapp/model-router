# Tier criteria

The router scores a task description with the rules in `scripts/lib/classify.mjs`. This file explains each rule in prose, gives examples that match and examples that do not, and names the validation check that proves a tier passed. Read it when a routing result looks wrong, or when applying the rules by hand without Node.

## How the score becomes a tier

1. Every matching rule adds its weight to its tier.
2. The highest total wins. Ties go **up** (smart beats fast, premium beats smart): a wrong cheap answer usually costs more than the price difference.
3. Confidence is the lead over the runner-up: 4 or more is high, 2 to 3 is medium, less is low.
4. If nothing matches, the tier is smart with low confidence. Ask for a better description rather than trusting that.

The weights are deliberately coarse. A task with two fast signals and one premium signal still goes fast, with a two-stage hint; one premium signal is a flag to look at, not a verdict.

## Fast tier

What it is for: output that a program can check. If you could write a regex, a schema or an exact-match test for the answer, it belongs here first.

| Rule | Matches | Does not match |
|---|---|---|
| F1 classification / labelling | "classify tickets", "tag each photo", "is this spam", "triage alerts" | "explain why this is spam" (smart: S3) |
| F2 extraction / conversion | "extract dates and amounts", "convert to JSON", "normalise addresses" | "extract the argument of this essay" (judgment; add "summarise" wording and it becomes smart) |
| F3 short bounded output | "write a subject line", "give me a slug", "fix typos", "one-line description" | "write the email" (smart: S1) |
| F4 simple / pattern | "simple", "boilerplate", "keywords", "hashtags" | |
| F5 high-volume wording | "every row", "each ticket", "thousands", "per day", "at scale" | "a batch of three" |
| F6 short translation | "translate these UI strings", "translate the button labels" | "translate the article, keep the tone" (smart: S6) |
| L1 output ≤ 50 tokens | `--output 20` | |
| V1 calls ≥ 1,000 | `--calls 50000` | |
| R3 risk low | `--risk low` | |

Validation that proves fast passed: exact match or schema validation on a labelled sample of 100 to 200 items. Report the error rate; if it is above the bar, step up to smart on the same sample.

Typical fast-tier mistakes to watch for: silent format drift (an extra sentence after the JSON), label sets that the model expands on its own, and long inputs where a small model loses the instruction. Pin the format in the prompt and validate every response.

## Smart tier

What it is for: real work within a clear spec, where a reviewer will look at the result and can tell good from bad.

| Rule | Matches | Does not match |
|---|---|---|
| S1 drafting prose | "draft the release notes", "write a blog post", "write the API docs" | "write a tagline" (fast: F3) |
| S2 scoped coding | "implement the parser", "add unit tests", "fix this bug", "write the SQL" | "refactor across the whole codebase" (premium: P5) |
| S3 judgment in a clear spec | "review this PR", "explain the trade-off", "compare these two libraries", "summarise this contract" | "which is the best architecture for us" (premium: P2 / P6) |
| S4 code review / local refactor | "code review", "pull request", "refactor this function" | |
| S5 grounded answering | "answer the customer from these articles", "RAG with citations", "assistant turn" | |
| S6 long or tone-sensitive translation | "translate the chapter", "localise the landing page, same tone" | |
| L2 output ≥ 4,000 tokens | `--output 5000` | |
| L3 prompt > 32,000 tokens | `--input 40000` | |
| R2 risk medium | `--risk medium` | |

Validation that proves smart passed: tests green for code; a rubric or a reviewer spot-check of 10 to 20 outputs for prose; citation accuracy for grounded answers (does the cited passage support the sentence).

## Premium tier

What it is for: open-ended reasoning, hard debugging, work where a wrong step costs hours or money, and long agent runs where small errors compound.

| Rule | Matches | Does not match |
|---|---|---|
| P1 formal reasoning | "prove", "theorem", "formally verify", "optimise the algorithm", "complexity analysis" | "add two numbers" |
| P2 architecture / hard debugging | "system design", "trade-offs", "race condition", "deadlock", "root cause", "flaky test", "performance regression" | "fix this null check" (smart: S2) |
| P3 security | "threat model", "vulnerability", "cryptography", "auth flow design", "pentest" | "add a login button" |
| P4 high-stakes domain | "legal", "contract clause", "compliance", "medical", "financial model", "tax", "audit" | "summarise this news article" |
| P5 long-horizon / multi-file | "across the codebase", "end-to-end", "autonomous agent run", "many steps", "overnight" | "in this file" |
| P6 open-ended | "research", "ambiguous", "no spec", "strategy", "from scratch", "greenfield" | |
| L4 prompt > 200,000 tokens | `--input 300000` | |
| R1 risk high | `--risk high` (+3, the single strongest signal) | |

Validation that proves premium passed: the same check as smart, plus a second opinion on anything irreversible (a human for legal, medical and money; a staging run for migrations). If premium fails, do not retry with a bigger model: narrow the task, add a tool, or split it.

## Two-stage routing

When a task carries both bulk signals (F1, F2, F5, V1) and premium signals (P1 to P4), the cheapest correct design is usually two models:

1. Fast model over everything, producing a verdict or a short structured summary per item.
2. Premium model only over the items the fast pass flagged.

The router prints a hint when it sees this pattern. Price the two stages separately with `scripts/cost.mjs` (`--calls` for stage one, a smaller `--calls` for stage two).

## Why tiers are price bands

The tier of each model in `data/prices.json` is set by its output price band (fast up to $3 per 1M output tokens, smart up to $15, premium above) and the vendor's own naming. The repo holds no benchmark numbers and does not claim that every model in a band performs the same. When a model's band and its vendor positioning disagree, the row carries a `tier_note` saying what was decided and why (for example Grok 4.7: priced in the smart band, described by xAI as its most capable model, so it is also offered when a premium pick is requested from xAI). Treat the within-tier ordering as a price ordering, and let your own sample decide between providers.
