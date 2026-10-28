<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#安装)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#安装)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#安装)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-zh-cn&utm_campaign=model-router)

**LLM 模型路由：一张 fast / smart / premium 决策表，覆盖 GPT、Claude、Gemini 和 Grok，价格带核查日期，附成本计算器。**

[快速开始](#快速开始) · [工作原理](#工作原理) · [示例](#示例) · [安装](#安装) · [常见问题](#常见问题)

</div>

[English](README.md) · [Русский](README.ru.md) · 简体中文 · [Español](README.es.md) · [Português (BR)](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md)

**model-router** 是一个你能直接读懂的 LLM 模型路由：一张决策表，按任务的形态把它归入三个档位（fast、smart、premium），为 OpenAI、Anthropic、Google 和 xAI 各推荐一个最便宜的模型，并在你真正运行之前估算成本。它以 Claude Code 技能、`AGENTS.md` 段落和 Cursor 规则的形式提供，外加两个零依赖的 Node 脚本。我们维护这张表，是因为同样的四个模型家族在 [UniqAI 聊天](https://uniqai.app/chat?utm_source=github&utm_medium=readme-zh-cn&utm_campaign=model-router)里并排运行，“该让哪个模型来回答”是我们每一次请求都必须回答的问题。[`data/prices.json`](data/prices.json) 里的每一个价格单元格都带有厂商定价页的 URL 和一个“核查日期”；整张表最后一次核查是 2026-10-28，本 README 中的每一个数字都是本仓库脚本提交在案的输出。

| **按形态分类，不凭感觉** | **先算价，再运行** | **每个价格都有凭据** |
|:---|:---|:---|
| 二十六条加权规则把任务描述、token 数、调用次数和风险转换成一个档位，并打印出每一条命中的规则。 | 一个计算器，可按单个模型、一个档位或全部 34 个模型计算：缓存前缀、批量折扣和长上下文附加费都已计入。 | 34 行中的每一行都有来源 URL 和核查日期；校验器会标出过期的行，以及档位与价格区间不一致的行。 |

## 快速开始

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

你会得到档位、判定理由、每家提供商最便宜的模型及其单次与总成本，以及高一档的备选模型。无需安装步骤；Node 18 或更新版本即可。

## 演示

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## 工作原理

1. **先看形态。** 四个事实决定档位：每次调用的输入 token 数、每次调用的输出 token 数、调用次数，以及风险（答错的代价有多大）。你通过命令行参数传入；默认值会在输出中注明。
2. **规则求和。** 规则在 `scripts/lib/classify.mjs` 里。分类、抽取和批量文案投给 fast；起草、范围明确的编码和评审投给 smart；证明、架构、安全、法律或医疗领域、跨多文件的 agent 运行和高风险投给 premium。总分最高者胜出，平局向上取。同一张表也写在 [`SKILL.md`](SKILL.md) 里，没有 Node 的 agent 也能手动得出同样的答案。
3. **每家提供商在档位内取最便宜。** `scripts/lib/prices.mjs` 用这个形态对档位内的每个模型计价，返回每家提供商最便宜的一个。某家提供商在该档位没有模型时，它会向上一档并明确说明（xAI 没有 premium 价格区间的文本模型，所以给出的是其能力最强的 smart 模型，并附注说明）。
4. **一次只升一档。** 输出会指出高一档的备选模型，以及能证明当前档位已通过的那一项检查。技能会告诉 agent：一旦某个档位通过了评估，就再往下降一档试试；省钱就省在这里。

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

关于数字：档位是按输出价格划分的价格区间（fast 为每 1M 输出 token 最高 $3，smart 最高 $15，premium 更高），再结合厂商自己的命名。本仓库不含任何基准测试分数，也不声称同一区间内的每个模型表现相同；区间与定位不一致的行会带有 `tier_note`。带来源的完整表格在 [`references/price-table.md`](references/price-table.md)，由 `node scripts/table.mjs --write` 生成。

## 示例

下面所有输出都复制自 [`examples/expected/`](examples/)，可由 `node tests/run.mjs` 复现。

<details open>
<summary><b>50,000 条工单待分类 → fast 档，四家提供商中有三家不到 $4</b></summary>

`node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low`

```text
task      Classify 50,000 support tickets into billing / bug / feature / other
tier      FAST   (fast 6 · smart 0 · premium 0; confidence high)
why       classification / labelling verb ("classify")                   fast +2
          short expected output (20 tokens)                              fast +1
          high volume (50,000 calls): a cheaper tier compounds           fast +2
          low risk: errors are cheap to catch and retry                  fast +1
assumes   600 input + 20 output tokens per call, 50,000 calls; prices as of 2026-10-28

cheapest fast model per provider (per call → total)
  openai     gpt-5-nano                     $0.000038   →  $1.90
  anthropic  claude-haiku-5-5               $0.000070   →  $3.50
  google     gemini-2.5-flash-lite          $0.000068   →  $3.40
  xai        grok-build-0.1                 $0.000640   →  $32.00

fallback  smart: gemini-3.6-flash ($0.000525 per call, $26.25 total) if fast-tier output fails your check on a sample
```

</details>

<details>
<summary><b>偶发死锁，高风险 → premium，以及 xAI 得到的替代方案</b></summary>

`node scripts/route.mjs "Find the root cause of an intermittent deadlock in the payment service and propose a fix across the codebase" --input 60000 --output 3000 --risk high`

```text
task      Find the root cause of an intermittent deadlock in the payment service and propose a fix across the codebase
tier      PREMIUM   (fast 0 · smart 1 · premium 7; confidence high)
why       architecture or hard debugging ("root cause")                  premium +2
          long-horizon or multi-file agent work ("across the codebase")  premium +2
          long prompt (60,000 tokens) needs reliable attention           smart +1
          high risk: an error is expensive or irreversible               premium +3
assumes   60,000 input + 3,000 output tokens per call, 1 call; prices as of 2026-10-28

cheapest premium model per provider (per call → total)
  openai     gpt-5.6-sol                    $0.3000     →  $0.3000
  anthropic  claude-opus-5-5                $0.3000     →  $0.3000
  google     gemini-4-argon                 $0.1500     →  $0.1500
  xai        grok-4.7                       $0.1380     →  $0.1380   no premium model at xAI; see tier_note: xAI's models page calls it their most capable model, but it is priced in the smart band; xAI lists no premium-band text model, so the router also offers it as the xAI fallback for premium tasks

fallback  none above premium; if this still fails, split the task or add tools, do not just retry
```

</details>

<details>
<summary><b>一个任务里同时出现 fast 和 premium 信号 → 两阶段提示</b></summary>

`node scripts/route.mjs "Triage every alert from the scanner and write a threat model for the ones that look like a real vulnerability" --input 4000 --output 800 --calls 5000`

```text
task      Triage every alert from the scanner and write a threat model for the ones that look like a real vulnerability
tier      FAST   (fast 4 · smart 0 · premium 2; confidence medium)
why       classification / labelling verb ("triage")                     fast +2
          security-sensitive ("threat model")                            premium +2
          high volume (5,000 calls): a cheaper tier compounds            fast +2
assumes   4,000 input + 800 output tokens per call, 5,000 calls; prices as of 2026-10-28

cheapest fast model per provider (per call → total)
  openai     gpt-5-nano                     $0.000520   →  $2.60
  anthropic  claude-haiku-5-5               $0.000800   →  $4.00
  google     gemini-2.5-flash-lite          $0.000720   →  $3.60
  xai        grok-build-0.1                 $0.005600   →  $28.00

fallback  smart: gemini-3.6-flash ($0.006000 per call, $30.00 total) if fast-tier output fails your check on a sample
hint      mixed signals: run a fast model first to filter or pre-process, send only the hard cases to premium (two-stage routing)
hint      risk not given: validate fast-tier output on a sample before trusting it at volume
```

</details>

<details>
<summary><b>计算器：120k token 的 prompt 跑在 Claude Haiku 5.5 上，带缓存前缀和批量定价</b></summary>

`node scripts/cost.mjs --model claude-haiku-5-5 --input 120000 --output 800 --cached 100000 --batch`

```text
model     claude-haiku-5-5  (Anthropic, fast tier)
shape     120,000 input + 800 output tokens per call, 1 call (100,000 cached, batch); prices as of 2026-10-28
prices    in $0.50 · cached $0.05 · out $2.50 per 1M (long_context)
per call  $0.008500   = input $0.005000 + cached $0.002500 + output $0.001000
total     $0.008500   for 1 call
note      long-context prices (prompt >= 100,000 tokens)
note      batch: x0.5 (Anthropic)
source    https://platform.claude.com/docs/en/about-claude/pricing (checked 2026-10-28)
```

因为 prompt 超过 100,000 个 token，长上下文那一行生效了，所以输入价格是 $0.50 而不是 $0.10。

</details>

十一个路由任务和四次计算器运行列在 [`examples/README.md`](examples/README.md) 中。

## 安装

适用于任何会读取指令文件的 agent，按你用的选。要求：Node 18+。无需安装任何包。

<details open>
<summary><b>Claude Code</b></summary>

```bash
# user-level
git clone https://github.com/uniqaiapp/model-router ~/.claude/skills/model-router
# or project-level
git clone https://github.com/uniqaiapp/model-router .claude/skills/model-router
# or with the skills CLI
npx skills add uniqaiapp/model-router
```

然后在任意会话里输入 `/model-router`，或者直接问“这个任务我该用哪个模型”、“这要花多少钱”；技能的 `description` 会触发它。待 uniqaiapp marketplace 发布后：先 `/plugin marketplace add uniqaiapp/skills`，再 `/plugin install model-router@uniqaiapp`。

</details>

<details>
<summary><b>Cursor</b></summary>

把 `SKILL.md`、`scripts/`、`data/` 和 [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) 复制到你的项目里。规则文件通过 `@SKILL.md` 内嵌了这个技能。

</details>

<details>
<summary><b>Codex / 任何读取 AGENTS.md 的 agent</b></summary>

把 `SKILL.md`、`scripts/` 和 `data/` 复制到 `.agents/skills/model-router/`，再把 [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) 里的片段追加到你的 `AGENTS.md` 中。本仓库自己的 [`AGENTS.md`](AGENTS.md) 就是一个可用的范例。

</details>

<details>
<summary><b>纯 prompt，或者完全不用 agent</b></summary>

把 [`SKILL.md`](SKILL.md) 粘贴到任意模型的 system prompt 里；除 frontmatter 之外它没有任何 agent 特有的语法。脚本也能独立运行：`node scripts/route.mjs --help`、`node scripts/cost.mjs --help`。

</details>

## 常见问题

<details>
<summary><b>价格从哪里来，有多新？</b></summary>

来自各厂商自己的定价页，手工抄录：OpenAI、Anthropic、Google AI（Gemini API）和 xAI。`data/prices.json` 里的每一行都有 URL 和核查日期；整张表在 2026-10-28 核查过。`node scripts/check.mjs` 会对超过 90 天的行发出警告。带截止日期的促销价和长上下文附加费与标准价并列存储，计算器会自动选对的那个。

</details>

<details>
<summary><b>“fast / smart / premium”是质量排名吗？</b></summary>

不是。档位是按输出价格划分的价格区间，再结合厂商自己的命名（nano、flash、haiku 对应 pro、opus、astra）。本仓库不含任何基准测试分数，也不声称同一区间内的模型表现相同。路由器只按你的任务形态在档位内按成本排序；提供商之间怎么选，由你自己的样本决定。

</details>

<details>
<summary><b>便宜的模型答错了怎么办？</b></summary>

每个结果都会指出高一档的备选模型，以及能证明当前档位已通过的那一项检查（标签精确匹配、测试全绿、评审员抽查）。技能的规则是：先在样本上验证，一次只升一档，某个档位通过之后，先试试再低一档，然后再定下来。

</details>

<details>
<summary><b>能加我自己的提供商或内部价目表吗？</b></summary>

可以。往 `data/prices.json` 里加行（或用 `--prices` 让脚本读另一个文件），运行 `node scripts/check.mjs`，再运行 `node scripts/table.mjs --write`。每一行都需要 `source` URL 和 `checked` 日期；缺了这两项，校验器会拒绝。

</details>

<details>
<summary><b>它会数 token 吗？</b></summary>

粗略地数：`--file prompt.txt` 按字符数 / 4 估算，并在输出中注明。需要计费级精度时，请用厂商的 token 计数器，再通过 `--input` 传入结果。

</details>

## 限制与坦诚

- 分类器匹配的是英文任务描述和四个形态参数；它不会读你的数据。描述含糊的任务会得到 smart 默认档，置信度低。
- 没有任何质量数据。提供商之间的平局就是平局。
- 图像、视频、音频和 embedding 的价格不在范围内；自托管模型也不在。
- 上面所有美元数字都由 `node scripts/regen-examples.mjs` 基于已提交的价格表生成，并由测试逐字节核对。价格表一变，数字跟着变。

## 相关项目

- [token-diet](https://github.com/uniqaiapp/token-diet)：在不丢失语义的前提下削减 prompt 和上下文 token；账单的另一半。
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker)：给任何 SKILL.md 或 agent 指令文件瘦身，让 agent 每轮加载更少的 token。
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing)：同样的“每一行都有来源 URL 和核查日期”规则，用在 AI 视频的每秒价格上。

## 参与贡献

欢迎提 issue 和 pull request；附厂商 URL 和日期的价格修正最有价值。本地检查见 [CONTRIBUTING.md](CONTRIBUTING.md)（`node tests/run.mjs`、`node scripts/check.mjs`，无依赖）。

## 许可证

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>由 <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-zh-cn&utm_campaign=model-router">UniqAI</a> 开发 — Kling 3.0、Veo 3、Flux、Nano Banana 和 GPT-5/Claude/Gemini/Grok 集于一个应用。</sub>

</div>
