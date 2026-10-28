# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-28

### Added

- `SKILL.md`: the routing procedure, the decision table (fast / smart / premium), escalation and step-down rules, cost rules of thumb.
- `data/prices.json`: 34 text models across OpenAI, Anthropic, Google and xAI, each with input / cached-input / output prices per 1M tokens, long-context and promotional rows where the vendor lists them, a source URL and a check date (all checked 2026-10-28).
- `scripts/route.mjs`: task classifier with explained scores, cheapest model per provider, fallback and hints.
- `scripts/cost.mjs`: cost calculator for one model, a tier or every model; cached prefix, batch discount, long-context thresholds, token estimate from a file.
- `scripts/check.mjs`: schema and honesty validator for the price table (sources, dates, duplicates, tier bands, staleness).
- `scripts/table.mjs`: renders `references/price-table.md` from the data.
- `examples/`: eleven routed tasks and four calculator runs with committed outputs, reproduced by the tests.
- Adapters for Claude Code (`SKILL.md`, `.claude-plugin/plugin.json`), Cursor (`.cursor/rules/model-router.mdc`), Codex (`codex/INSTRUCTIONS.md`) and any `AGENTS.md` agent.
- Assets from the uniqaiapp design kit: animated banner (dark and light), terminal demo, social preview.
