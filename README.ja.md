<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#インストール)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#インストール)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#インストール)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-ja&utm_campaign=model-router)

**LLM モデルルーター: GPT・Claude・Gemini・Grok を fast / smart / premium の 3 段階に振り分ける判断表。日付つきの価格表とコスト計算ツールを同梱。**

[クイックスタート](#クイックスタート) · [仕組み](#仕組み) · [例](#例) · [インストール](#インストール) · [FAQ](#faq)

</div>

[English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Português (BR)](README.pt-BR.md) · 日本語 · [한국어](README.ko.md) · [Deutsch](README.de.md)

**model-router** は、中身を読んで理解できる LLM モデルルーターです。タスクをその形から 3 つのティア（fast、smart、premium）に分類し、OpenAI・Anthropic・Google・xAI それぞれで最も安いモデルを提案し、実行前にコストを見積もります。Claude Code スキル、`AGENTS.md` のセクション、Cursor ルールとして提供され、依存パッケージなしの Node スクリプトが 2 本付属します。この表を維持しているのは、[UniqAI のチャット](https://uniqai.app/chat?utm_source=github&utm_medium=readme-ja&utm_campaign=model-router)で同じ 4 つのモデルファミリーを並べて動かしており、「この質問にはどれが答えるべきか」をリクエストごとに決めなければならないからです。[`data/prices.json`](data/prices.json) の各価格セルにはベンダーの料金ページの URL と確認日（checked）が記録されています。表の最終確認日は 2026-10-28 で、この README に載っている数値はすべて、このリポジトリ内のスクリプトの出力をそのままコミットしたものです。

| **雰囲気ではなく、形で分類する** | **実行前に価格を出す** | **根拠つきの価格** |
|:---|:---|:---|
| 26 の重みつきルールが、タスクの説明、トークン数、呼び出し回数、リスクからティアを決め、発火したルールをすべて表示します。 | 1 モデル、1 ティア、または全 34 モデルを対象にしたコスト計算ツール。キャッシュ済みプレフィックス、バッチ割引、長文コンテキストの追加料金を含みます。 | 34 行それぞれにソース URL と確認日があり、バリデーターが古い行や価格帯と食い違うティアを指摘します。 |

## クイックスタート

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

ティア、その理由、プロバイダーごとの最安モデルと 1 回あたり・合計のコスト、そして 1 段階上のフォールバックが表示されます。インストール手順はありません。Node 18 以降が必要です。

## デモ

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## 仕組み

1. **まず形を見る。** ティアを決めるのは 4 つの事実です。1 回あたりの入力トークン数、1 回あたりの出力トークン数、呼び出し回数、そしてリスク（誤答がどれだけ痛いか）。これらはフラグで渡し、デフォルト値は出力に明記されます。
2. **ルールを合計する。** ルールは `scripts/lib/classify.mjs` にあります。分類、抽出、大量の文言処理は fast に、下書き、範囲の限られたコーディング、レビューは smart に、証明、アーキテクチャ、セキュリティ、法律や医療の領域、複数ファイルにまたがるエージェント実行、高リスクは premium に票を入れます。合計が最も高いティアが勝ち、同点なら上のティアになります。同じ表が [`SKILL.md`](SKILL.md) にも書き出されているので、Node のないエージェントでも手作業で同じ答えにたどり着けます。
3. **プロバイダーごとにティア内の最安を選ぶ。** `scripts/lib/prices.mjs` がティア内のすべてのモデルに対してその形の価格を計算し、プロバイダーごとに最も安いものを返します。そのティアに該当モデルがないプロバイダーでは、1 段階上げたうえでその旨を表示します（xAI には premium 帯のテキストモデルがないため、最も高性能な smart モデルを注記つきで提示します）。
4. **1 段階ずつ上げる。** 出力には 1 段階上のフォールバックモデルと、そのティアで十分だったと証明できる 1 つのチェックが示されます。スキルはエージェントに対し、あるティアが評価を通過したらもう一度下げてみるよう指示します。節約が生まれるのはそこです。

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

数値について: ティアは出力価格による価格帯（fast は出力 100 万トークンあたり $3 まで、smart は $15 まで、premium はそれ以上）に、ベンダー自身の命名を加えたものです。このリポジトリにはベンチマークのスコアは一切なく、同じ帯のモデルがすべて同じ性能だとは主張しません。帯と位置づけが食い違う行には `tier_note` が付いています。ソースつきの完全な表は [`references/price-table.md`](references/price-table.md) にあり、`node scripts/table.mjs --write` で生成されます。

## 例

以下の出力はすべて [`examples/expected/`](examples/) からコピーしたもので、`node tests/run.mjs` で再現されます。

<details open>
<summary><b>50,000 件のチケットを分類 → fast ティア、4 社中 3 社で $4 未満</b></summary>

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
<summary><b>断続的なデッドロック、高リスク → premium。xAI には代わりに何が提示されるか</b></summary>

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
<summary><b>fast と premium のシグナルが 1 つのタスクに混在 → 2 段階のヒント</b></summary>

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
<summary><b>計算ツール: Claude Haiku 5.5 で 120k トークンのプロンプト、キャッシュ済みプレフィックスとバッチ料金つき</b></summary>

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

プロンプトが 100,000 トークンを超えているため長文コンテキストの行が適用され、入力価格が $0.10 ではなく $0.50 になっています。

</details>

ルーティングしたタスク 11 件と計算ツールの実行 4 件は [`examples/README.md`](examples/README.md) に一覧があります。

## インストール

指示ファイルを読むエージェントならどれでも使えます。お使いのものを選んでください。要件: Node 18+。インストールするパッケージはありません。

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

その後、任意のセッションで `/model-router` と入力するか、単に「このタスクにはどのモデルを使うべきか」「これはいくらかかるか」と尋ねてください。スキルの `description` によって起動します。uniqaiapp マーケットプレイスが公開されたら、`/plugin marketplace add uniqaiapp/skills` の後に `/plugin install model-router@uniqaiapp` でも導入できます。

</details>

<details>
<summary><b>Cursor</b></summary>

`SKILL.md`、`scripts/`、`data/`、[`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) をプロジェクトにコピーしてください。ルールファイルは `@SKILL.md` でスキルを埋め込んでいます。

</details>

<details>
<summary><b>Codex / AGENTS.md を読むエージェント全般</b></summary>

`SKILL.md`、`scripts/`、`data/` を `.agents/skills/model-router/` にコピーし、[`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) のスニペットを `AGENTS.md` に追記してください。このリポジトリ自身の [`AGENTS.md`](AGENTS.md) が実際に動く例です。

</details>

<details>
<summary><b>プレーンなプロンプト、またはエージェントなしで</b></summary>

[`SKILL.md`](SKILL.md) を任意のモデルのシステムプロンプトに貼り付けてください。フロントマター以外にエージェント固有の構文はありません。スクリプトも単体で動きます: `node scripts/route.mjs --help`、`node scripts/cost.mjs --help`。

</details>

## FAQ

<details>
<summary><b>価格はどこから来ていて、どのくらい古くなっていますか？</b></summary>

各ベンダー自身の料金ページ（OpenAI、Anthropic、Google AI（Gemini API）、xAI）から手作業で転記しています。`data/prices.json` のすべての行に URL と確認日があり、表全体の確認日は 2026-10-28 です。`node scripts/check.mjs` は 90 日より古い行について警告します。終了日のあるプロモーション価格と長文コンテキストの追加料金は標準価格の隣に保存され、計算ツールが適切なほうを選びます。

</details>

<details>
<summary><b>「fast / smart / premium」は品質のランキングですか？</b></summary>

いいえ。ティアは出力価格による価格帯に、ベンダー自身の命名（nano、flash、haiku に対して pro、opus、astra）を加えたものです。このリポジトリにはベンチマークのスコアはなく、同じ帯のモデルが同じ性能だとは主張しません。ルーターはティア内のモデルを、指定した形でのコスト順に並べるだけです。プロバイダー間の選択は、自分のサンプルで決めてください。

</details>

<details>
<summary><b>安いモデルが間違えたらどうなりますか？</b></summary>

すべての結果に、1 段階上のフォールバックと、そのティアで十分だったと証明できる 1 つのチェック（ラベルの完全一致、テストがグリーン、レビュアーの抜き取り確認）が示されます。スキルのルールは次のとおりです。サンプルで検証し、1 段階ずつ上げ、あるティアが通ったら、確定する前に 1 つ下のティアも試す。

</details>

<details>
<summary><b>独自のプロバイダーや社内価格表を追加できますか？</b></summary>

できます。`data/prices.json` に行を追加する（または `--prices` で別ファイルを指定する）か、`node scripts/check.mjs` を実行してから `node scripts/table.mjs --write` を実行してください。行には `source` の URL と `checked` の日付が必要で、バリデーターはそれらのない行を受け付けません。

</details>

<details>
<summary><b>トークン数は数えてくれますか？</b></summary>

おおまかには。`--file prompt.txt` は文字数 / 4 で推定し、出力にその旨を表示します。課金精度の数値が必要なら、ベンダーのトークンカウンターを使い、その値を `--input` で渡してください。

</details>

## 制限事項と正直な注記

- 分類器が見るのは英語のタスク記述と 4 つの形のフラグだけで、データの中身は読みません。曖昧な記述は、信頼度 low で smart のデフォルトになります。
- 品質に関するデータは一切ありません。プロバイダー間の同点は同点のままです。
- 画像、動画、音声、埋め込みの価格は対象外です。セルフホストのモデルも同様です。
- 上記のドル額はすべて、コミット済みの価格表に対して `node scripts/regen-examples.mjs` が生成したもので、テストがバイト単位で照合しています。表が変われば数値も変わります。

## 関連プロジェクト

- [token-diet](https://github.com/uniqaiapp/token-diet): 意味を失わずにプロンプトとコンテキストのトークンを削減します。請求額のもう半分です。
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): SKILL.md やエージェント指示ファイルをスリム化し、エージェントが 1 ターンごとに読み込むトークンを減らします。
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): 「すべての行にソース URL と確認日」という同じルールを、AI 動画の秒単価に適用したものです。

## コントリビュート

Issue とプルリクエストを歓迎します。ベンダーの URL と日付を添えた価格の訂正が最も助かります。ローカルでのチェック（`node tests/run.mjs`、`node scripts/check.mjs`、依存なし）は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>開発: <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-ja&utm_campaign=model-router">UniqAI</a> — Kling 3.0、Veo 3、Flux、Nano Banana と GPT-5/Claude/Gemini/Grok をひとつのアプリで。</sub>

</div>
