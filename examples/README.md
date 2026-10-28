# Examples

Every file in `expected/` is the exact stdout of one command, produced by `node scripts/regen-examples.mjs` and checked byte-for-byte by `node tests/run.mjs`. If a number appears in the README, it comes from one of these files.

## Routing examples (`tasks/*.json` → `expected/<name>.txt`)

Each task file holds the task text and the flags; the command is `node scripts/route.mjs "<task>" --input N --output N --calls N --risk L`.

| Example | What it shows |
|---|---|
| `01-classify-tickets` | High-volume labelling with low risk: fast tier, with a smart fallback |
| `02-extract-invoice-fields` | Extraction to JSON at volume: fast tier even with no risk flag |
| `03-draft-release-notes` | Structured prose with medium risk: smart tier |
| `04-implement-parser-with-tests` | Scoped coding task with tests: smart tier |
| `05-deadlock-root-cause` | Hard debugging, multi-file, high risk: premium; xAI falls back to its most capable smart model |
| `06-contract-review` | High-stakes domain plus judgment: premium |
| `07-translate-ui-strings` | Short strings at volume: fast tier |
| `08-support-chat-turn` | Grounded chat turn with a cached prefix: smart tier, cache priced per provider |
| `09-mixed-signals-security-triage` | Fast and premium signals in one task: volume wins the tier, and the output carries a two-stage hint (fast pass to filter, premium for the real findings) |
| `10-no-signal-default` | No rule matches: smart by default, low confidence |
| `11-forced-tier-batch` | `--tier smart --batch`: skip classification, price a nightly batch job |

## Calculator examples (`cost-commands.json` → `expected/<name>.txt`)

| Example | Command |
|---|---|
| `cost-one-haiku-long-context` | `node scripts/cost.mjs --model claude-haiku-5-5 --input 120000 --output 800 --cached 100000 --batch` |
| `cost-compare-smart-1000-calls` | `node scripts/cost.mjs --tier smart --input 12000 --output 1500 --calls 1000` |
| `cost-compare-all-chat-turn` | `node scripts/cost.mjs --compare --input 6000 --output 250 --cached 4000` |
| `cost-list` | `node scripts/cost.mjs --list` |

To add an example: drop a JSON file into `tasks/` (keys: `task`, optional `input`, `output`, `calls`, `cached`, `risk`, `provider`, `tier`, `batch`), run `node scripts/regen-examples.mjs`, commit both files.
