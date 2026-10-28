# Contributing

Issues and pull requests are welcome. The most useful contributions, in order: a price correction with the vendor URL and date, a routing rule that fixes a concrete misroute (with the task text that triggered it), a new provider.

## Local checks (no dependencies, Node 18+)

```bash
node tests/run.mjs          # all tests: structure, forbidden strings, data, classifier, examples
node scripts/check.mjs      # price table: schema, sources, dates, tier bands, staleness warnings
```

Tests run in under ten seconds and make no network calls.

## Updating prices

1. Open the vendor pricing page listed under `providers.<id>.pricing_url` in `data/prices.json`.
2. Edit the row(s): `input`, `cached_input`, `output` per 1M tokens, `long_context` and `promo` if the page shows them. Write `null` for anything the page does not list.
3. Set `checked` on every row you looked at, even when the price did not change, and set the top-level `updated` to today.
4. Run `node scripts/check.mjs`, then `node scripts/table.mjs --write` and `node scripts/regen-examples.mjs`, and commit the regenerated files with the data change.

New models go in the tier their output price band gives them (see `tier_bands`). If you file one elsewhere, add a `tier_note` saying why; `check.mjs` warns otherwise.

## Changing routing rules

Rules live in `scripts/lib/classify.mjs` and are mirrored in `SKILL.md` (decision table) and `references/tier-criteria.md`. Change all three. Add an example task under `examples/tasks/` that shows the new behaviour, regenerate `examples/expected/`, and include before/after output in the PR description.

## Style

- Node built-ins only. No `package.json` dependencies, no lockfile.
- Keep `SKILL.md` under 500 lines; long material goes to `references/`.
- Engineer-to-engineer tone, no superlatives, no emoji.
- Every number in Markdown is produced by a script here or carries a source URL and a date.
- Author and maintainer is UniqAI <support@uniqai.app>. Do not add personal names, including in commit trailers.

## Deviations from org conventions

- Runtime is Node, not Python as `_shared/repos.json` lists for this repo: the build brief asked for a zero-dependency Node cost calculator, and the classifier shares its price library, so one runtime keeps the repo small. CI runs the Node job only.
- `.github/ISSUE_TEMPLATE/price_update.md` is an extra template; price corrections are this repo's main inbound traffic.
- `.github/repo.json` holds the GitHub description, topics and homepage from `_shared/meta.json` for the release step; the org tooling may apply it.
- README follows `_shared/design/README.template.md` (hero, badges, feature grid, quickstart, demo, how it works, examples, install, FAQ) with the conventions' "Limits and honesty" and "Related" sections added.
