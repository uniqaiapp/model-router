<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#instalação)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#instalação)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#instalação)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-pt-br&utm_campaign=model-router)

**Roteador de modelos LLM: uma tabela de decisão fast / smart / premium para GPT, Claude, Gemini e Grok, com preços datados e uma calculadora de custo.**

[Início rápido](#início-rápido) · [Como funciona](#como-funciona) · [Exemplos](#exemplos) · [Instalação](#instalação) · [FAQ](#faq)

</div>

[English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · Português (BR) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md)

O **model-router** é um roteador de modelos LLM que dá para ler: uma tabela de decisão que classifica uma tarefa em três tiers (fast, smart, premium) pela sua forma, recomenda o modelo mais barato de cada provedor para OpenAI, Anthropic, Google e xAI, e estima o custo antes de você rodar. Ele vem como skill do Claude Code, seção de `AGENTS.md` e regra do Cursor, mais dois scripts Node sem dependências. Mantemos essa tabela porque as mesmas quatro famílias de modelos rodam lado a lado no [chat da UniqAI](https://uniqai.app/chat?utm_source=github&utm_medium=readme-pt-br&utm_campaign=model-router), e "qual deles deve responder isto" é uma pergunta que precisamos responder a cada requisição. Cada célula de preço em [`data/prices.json`](data/prices.json) carrega a URL da página de preços do fornecedor e uma data de "checked"; a tabela foi conferida pela última vez em 2026-10-28, e todo número neste README é a saída commitada de um script deste repositório.

| **Classifique pela forma, não pelo feeling** | **Precifique antes de rodar** | **Preços com comprovante** |
|:---|:---|:---|
| Vinte e seis regras ponderadas transformam a descrição da tarefa, as contagens de tokens, o volume de chamadas e o risco em um tier, e imprimem cada regra que disparou. | Uma calculadora para um modelo, um tier ou todos os 34 modelos: prefixo em cache, desconto de batch e sobretaxas de contexto longo incluídos. | Cada uma das 34 linhas tem uma URL de origem e uma data de verificação; um validador sinaliza linhas desatualizadas e tiers que discordam da faixa de preço. |

## Início rápido

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

Você recebe o tier, os motivos, o modelo mais barato de cada provedor com custo por chamada e total, e um fallback um tier acima. Sem etapa de instalação; Node 18 ou mais recente.

## Demo

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## Como funciona

1. **A forma vem primeiro.** Quatro fatos determinam o tier: tokens de entrada por chamada, tokens de saída por chamada, número de chamadas e risco (o quão ruim é uma resposta errada). Você os passa como flags; os padrões são informados na saída.
2. **Regras, somadas.** `scripts/lib/classify.mjs` guarda as regras. Classificação, extração e redação em massa votam fast; rascunhos, programação com escopo definido e revisão votam smart; provas, arquitetura, domínios de segurança, jurídico ou médico, execuções de agente em vários arquivos e risco alto votam premium. O maior total vence e empates sobem. A mesma tabela está escrita em [`SKILL.md`](SKILL.md), para que um agente sem Node chegue à mesma resposta à mão.
3. **O mais barato do tier, por provedor.** `scripts/lib/prices.mjs` precifica a forma contra todo modelo do tier e devolve o mais barato de cada provedor. Quando um provedor não tem nada no tier, ele sobe um degrau e avisa (a xAI não lista nenhum modelo de texto na faixa premium, então recebe seu modelo smart mais capaz, com a observação).
4. **Escale um tier por vez.** A saída nomeia o modelo de fallback um tier acima e a única verificação que provaria que o tier passou. A skill instrui o agente a descer de novo assim que um tier passar em um eval; é aí que está a economia.

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

Números: os tiers são faixas de preço pelo preço de saída (fast até $3 por 1M de tokens de saída, smart até $15, premium acima disso), mais a nomenclatura do próprio fornecedor. O repositório não tem pontuações de benchmark e não afirma que todo modelo de uma faixa tem o mesmo desempenho; linhas em que faixa e posicionamento discordam carregam um `tier_note`. A tabela completa com fontes está em [`references/price-table.md`](references/price-table.md), gerada por `node scripts/table.mjs --write`.

## Exemplos

Todas as saídas abaixo foram copiadas de [`examples/expected/`](examples/) e são reproduzidas por `node tests/run.mjs`.

<details open>
<summary><b>50,000 tickets para classificar → tier fast, menos de $4 em três dos quatro provedores</b></summary>

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
<summary><b>Deadlock intermitente, risco alto → premium, e o que a xAI recebe no lugar</b></summary>

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
<summary><b>Sinais fast e premium na mesma tarefa → dica de duas etapas</b></summary>

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
<summary><b>Calculadora: um prompt de 120k tokens no Claude Haiku 5.5 com prefixo em cache e preço de batch</b></summary>

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

A linha de contexto longo entrou em ação porque o prompt passa de 100,000 tokens, e é por isso que o preço de entrada é $0.50 e não $0.10.

</details>

Onze tarefas roteadas e quatro execuções da calculadora estão listadas em [`examples/README.md`](examples/README.md).

## Instalação

Funciona com qualquer agente que leia arquivos de instruções. Escolha o seu. Requisitos: Node 18+. Nenhum pacote para instalar.

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

Depois, `/model-router` em qualquer sessão, ou simplesmente pergunte "qual modelo devo usar para isto" ou "quanto isto vai custar"; a `description` da skill a dispara. Quando o marketplace uniqaiapp for publicado: `/plugin marketplace add uniqaiapp/skills` e depois `/plugin install model-router@uniqaiapp`.

</details>

<details>
<summary><b>Cursor</b></summary>

Copie `SKILL.md`, `scripts/`, `data/` e [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) para o seu projeto. O arquivo de regra incorpora a skill com `@SKILL.md`.

</details>

<details>
<summary><b>Codex / qualquer agente com AGENTS.md</b></summary>

Copie `SKILL.md`, `scripts/` e `data/` para `.agents/skills/model-router/` e acrescente o trecho de [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) ao seu `AGENTS.md`. O próprio [`AGENTS.md`](AGENTS.md) do repositório é um exemplo funcional.

</details>

<details>
<summary><b>Prompt puro, ou nenhum agente</b></summary>

Cole [`SKILL.md`](SKILL.md) no system prompt de qualquer modelo; ele não tem sintaxe específica de agente fora do frontmatter. Os scripts também rodam sozinhos: `node scripts/route.mjs --help`, `node scripts/cost.mjs --help`.

</details>

## FAQ

<details>
<summary><b>De onde vêm os preços, e quão desatualizados estão?</b></summary>

Da página de preços de cada fornecedor, copiados à mão: OpenAI, Anthropic, Google AI (API Gemini) e xAI. Toda linha de `data/prices.json` tem a URL e a data em que foi conferida; a tabela inteira foi conferida em 2026-10-28. `node scripts/check.mjs` avisa sobre linhas com mais de 90 dias. Preços promocionais com data de término e sobretaxas de contexto longo ficam armazenados ao lado do preço padrão, e a calculadora escolhe o certo.

</details>

<details>
<summary><b>"fast / smart / premium" é um ranking de qualidade?</b></summary>

Não. Os tiers são faixas de preço pelo preço de saída mais a nomenclatura do próprio fornecedor (nano, flash, haiku contra pro, opus, astra). O repositório não tem pontuações de benchmark e não afirma que modelos da mesma faixa têm desempenho parecido. O roteador ordena os modelos dentro de um tier pelo custo para a sua forma; a sua própria amostra decide entre provedores.

</details>

<details>
<summary><b>E se o modelo barato errar?</b></summary>

Todo resultado nomeia o fallback um tier acima e a única verificação que prova que o tier passou (correspondência exata nos rótulos, testes verdes, uma checagem por amostragem de um revisor). A regra da skill é: valide em uma amostra, escale um tier por vez e, quando um tier passar, tente o tier abaixo antes de se comprometer.

</details>

<details>
<summary><b>Posso adicionar meu próprio provedor ou uma lista de preços interna?</b></summary>

Pode. Adicione linhas a `data/prices.json` (ou aponte os scripts para outro arquivo com `--prices`), rode `node scripts/check.mjs` e depois `node scripts/table.mjs --write`. As linhas precisam de uma URL em `source` e uma data em `checked`; o validador recusa linhas sem elas.

</details>

<details>
<summary><b>Ele conta tokens?</b></summary>

Mais ou menos: `--file prompt.txt` estima caracteres / 4 e diz isso na saída. Para números em nível de cobrança, use o contador de tokens do fornecedor e passe a contagem com `--input`.

</details>

## Limites e honestidade

- O classificador reconhece a descrição da tarefa em inglês e as quatro flags de forma; ele não lê os seus dados. Uma descrição vaga recebe o padrão smart com confiança baixa.
- Nenhum dado de qualidade de nenhum tipo. Empates entre provedores são empates.
- Preços de imagem, vídeo, áudio e embeddings estão fora do escopo; modelos self-hosted também.
- Todos os valores em dólar acima são produzidos por `node scripts/regen-examples.mjs` sobre a tabela de preços commitada e conferidos byte a byte pelos testes. Se a tabela mudar, os valores mudam junto.

## Relacionados

- [token-diet](https://github.com/uniqaiapp/token-diet): reduza tokens de prompt e de contexto sem perder significado; a outra metade da conta.
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): encolha qualquer SKILL.md ou arquivo de instruções de agente para que o agente carregue menos tokens a cada turno.
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): a mesma regra de "URL de origem e data de verificação em toda linha", aplicada a preços de vídeo por IA por segundo.

## Contribuindo

Issues e pull requests são bem-vindos; correções de preço com a URL do fornecedor e a data são o tipo mais útil. Veja [CONTRIBUTING.md](CONTRIBUTING.md) para as verificações locais (`node tests/run.mjs`, `node scripts/check.mjs`, sem dependências).

## Licença

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>Feito pela <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-pt-br&utm_campaign=model-router">UniqAI</a> — Kling 3.0, Veo 3, Flux, Nano Banana e GPT-5/Claude/Gemini/Grok em um só app.</sub>

</div>
