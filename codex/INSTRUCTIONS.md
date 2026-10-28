# model-router for Codex

Paste the block below into your project's `AGENTS.md` (or Codex custom instructions),
and copy `SKILL.md`, `scripts/` and `data/` from https://github.com/uniqaiapp/model-router into `.agents/skills/model-router/`.

---
When the user asks which model to use for a task, what a prompt or batch will cost, or how to cut LLM spend, follow `.agents/skills/model-router/SKILL.md`: classify the task into fast / smart / premium with `node .agents/skills/model-router/scripts/route.mjs "<task>"`, then estimate cost with `node .agents/skills/model-router/scripts/cost.mjs --tier <tier> --input <tokens> --output <tokens>`. Quote the tier, the reasons and the price source date, never a price from memory.
---
