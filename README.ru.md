<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#установка)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#установка)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#установка)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-ru&utm_campaign=model-router)

**Роутер LLM-моделей: таблица решений fast / smart / premium для GPT, Claude, Gemini и Grok с датированными ценами и калькулятором стоимости.**

[Быстрый старт](#быстрый-старт) · [Как это работает](#как-это-работает) · [Примеры](#примеры) · [Установка](#установка) · [FAQ](#faq)

</div>

[English](README.md) · Русский · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Português (BR)](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md)

**model-router** — это роутер LLM-моделей, который можно прочитать: таблица решений, которая по форме задачи относит её к одному из трёх уровней (fast, smart, premium), рекомендует самую дешёвую модель у каждого провайдера (OpenAI, Anthropic, Google и xAI) и оценивает стоимость до запуска. Поставляется как скилл для Claude Code, раздел `AGENTS.md` и правило Cursor, плюс два Node-скрипта без зависимостей. Мы ведём эту таблицу, потому что те же четыре семейства моделей работают бок о бок в [чате UniqAI](https://uniqai.app/chat?utm_source=github&utm_medium=readme-ru&utm_campaign=model-router), и вопрос «какая из них должна отвечать» мы решаем на каждом запросе. Каждая ячейка с ценой в [`data/prices.json`](data/prices.json) содержит URL страницы цен вендора и дату проверки; таблица последний раз сверялась 2026-10-28, и каждое число в этом README — закоммиченный вывод скрипта из этого репозитория.

| **Классификация по форме задачи, а не на глаз** | **Оцените стоимость до запуска** | **Цены с подтверждением** |
|:---|:---|:---|
| Двадцать шесть взвешенных правил превращают описание задачи, число токенов, объём вызовов и риск в уровень и печатают каждое сработавшее правило. | Калькулятор для одной модели, уровня или всех 34 моделей: кешированный префикс, скидка за batch и наценки за длинный контекст учтены. | У каждой из 34 строк есть URL источника и дата проверки; валидатор помечает устаревшие строки и уровни, которые не сходятся с ценовым диапазоном. |

## Быстрый старт

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

Вы получаете уровень, причины, самую дешёвую модель у каждого провайдера со стоимостью за вызов и за всё, а также запасной вариант на уровень выше. Устанавливать ничего не нужно; Node 18 или новее.

## Демо

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## Как это работает

1. **Сначала форма.** Уровень определяют четыре факта: входные токены на вызов, выходные токены на вызов, число вызовов и риск (насколько дорого обходится неверный ответ). Вы передаёте их флагами; значения по умолчанию указаны в выводе.
2. **Правила, сложенные вместе.** Правила лежат в `scripts/lib/classify.mjs`. Классификация, извлечение и массовые формулировки голосуют за fast; черновики, ограниченное по объёму кодирование и ревью — за smart; доказательства, архитектура, безопасность, юридическая или медицинская область, многофайловые агентные прогоны и высокий риск — за premium. Побеждает наибольшая сумма, при равенстве уровень повышается. Та же таблица выписана в [`SKILL.md`](SKILL.md), так что агент без Node приходит к тому же ответу вручную.
3. **Самая дешёвая в уровне, у каждого провайдера.** `scripts/lib/prices.mjs` считает стоимость формы задачи для каждой модели уровня и возвращает самую дешёвую у каждого провайдера. Если у провайдера в этом уровне ничего нет, он поднимается на уровень выше и говорит об этом (у xAI нет текстовой модели в диапазоне premium, поэтому предлагается самая способная модель smart с пометкой).
4. **Повышать по одному уровню за раз.** В выводе названы запасная модель на уровень выше и единственная проверка, которая докажет, что уровень справился. Скилл говорит агенту снова спуститься на уровень ниже, как только уровень проходит eval; именно там и лежит экономия.

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

Числа: уровни — это ценовые диапазоны по цене выходных токенов (fast до $3 за 1M выходных токенов, smart до $15, premium выше) плюс собственные названия вендоров. В репозитории нет результатов бенчмарков, и он не утверждает, что все модели в диапазоне работают одинаково; строки, где диапазон и позиционирование расходятся, несут `tier_note`. Полная таблица с источниками лежит в [`references/price-table.md`](references/price-table.md) и генерируется командой `node scripts/table.mjs --write`.

## Примеры

Все выводы ниже скопированы из [`examples/expected/`](examples/) и воспроизводятся командой `node tests/run.mjs`.

<details open>
<summary><b>50,000 тикетов на классификацию → уровень fast, меньше $4 у трёх провайдеров из четырёх</b></summary>

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
<summary><b>Плавающий дедлок, высокий риск → premium, и что вместо него получает xAI</b></summary>

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
<summary><b>Сигналы fast и premium в одной задаче → подсказка про два этапа</b></summary>

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
<summary><b>Калькулятор: промпт на 120k токенов на Claude Haiku 5.5 с кешированным префиксом и batch-ценой</b></summary>

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

Сработала строка для длинного контекста, потому что промпт длиннее 100,000 токенов; поэтому цена входа $0.50 вместо $0.10.

</details>

Одиннадцать маршрутизированных задач и четыре запуска калькулятора перечислены в [`examples/README.md`](examples/README.md).

## Установка

Работает с любым агентом, который читает файлы инструкций. Выберите свой. Требования: Node 18+. Пакеты ставить не нужно.

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

Затем `/model-router` в любой сессии, или просто спросите «какую модель взять для этого» или «сколько это будет стоить»: скилл срабатывает по своему `description`. Когда будет опубликован маркетплейс uniqaiapp: `/plugin marketplace add uniqaiapp/skills`, затем `/plugin install model-router@uniqaiapp`.

</details>

<details>
<summary><b>Cursor</b></summary>

Скопируйте `SKILL.md`, `scripts/`, `data/` и [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) в свой проект. Файл правила встраивает скилл через `@SKILL.md`.

</details>

<details>
<summary><b>Codex / любой агент с AGENTS.md</b></summary>

Скопируйте `SKILL.md`, `scripts/` и `data/` в `.agents/skills/model-router/` и допишите сниппет из [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) в свой `AGENTS.md`. Собственный [`AGENTS.md`](AGENTS.md) репозитория — рабочий пример.

</details>

<details>
<summary><b>Обычный промпт или вообще без агента</b></summary>

Вставьте [`SKILL.md`](SKILL.md) в системный промпт любой модели; за пределами фронтматтера в нём нет синтаксиса, привязанного к конкретному агенту. Скрипты тоже работают сами по себе: `node scripts/route.mjs --help`, `node scripts/cost.mjs --help`.

</details>

## FAQ

<details>
<summary><b>Откуда берутся цены и насколько они устарели?</b></summary>

Со страниц цен самих вендоров, скопированы вручную: OpenAI, Anthropic, Google AI (Gemini API) и xAI. У каждой строки в `data/prices.json` есть URL и дата проверки; вся таблица сверялась 2026-10-28. `node scripts/check.mjs` предупреждает о строках старше 90 дней. Акционные цены с датой окончания и наценки за длинный контекст хранятся рядом со стандартной ценой, и калькулятор выбирает нужную.

</details>

<details>
<summary><b>«fast / smart / premium» — это рейтинг качества?</b></summary>

Нет. Уровни — это ценовые диапазоны по цене выходных токенов плюс собственные названия вендоров (nano, flash, haiku против pro, opus, astra). В репозитории нет результатов бенчмарков, и он не утверждает, что модели внутри диапазона работают одинаково. Роутер упорядочивает модели внутри уровня по стоимости для вашей формы задачи; между провайдерами выбирает ваша собственная выборка.

</details>

<details>
<summary><b>А если дешёвая модель ошибётся?</b></summary>

Каждый результат называет запасной вариант на уровень выше и единственную проверку, которая докажет, что уровень справился (точное совпадение меток, зелёные тесты, выборочная проверка ревьюером). Правило скилла: проверьте на выборке, повышайте по одному уровню за раз, а как только уровень проходит, попробуйте уровень ниже, прежде чем фиксировать выбор.

</details>

<details>
<summary><b>Можно добавить своего провайдера или внутренний прайс-лист?</b></summary>

Да. Добавьте строки в `data/prices.json` (или укажите скриптам другой файл через `--prices`), запустите `node scripts/check.mjs`, затем `node scripts/table.mjs --write`. Строкам нужны URL `source` и дата `checked`; валидатор отклоняет строки без них.

</details>

<details>
<summary><b>Он считает токены?</b></summary>

Приблизительно: `--file prompt.txt` оценивает как символы / 4 и говорит об этом в выводе. Для чисел, пригодных для биллинга, используйте счётчик токенов вендора и передайте результат через `--input`.

</details>

## Ограничения и честность

- Классификатор сопоставляет английские формулировки задачи и четыре флага формы; ваши данные он не читает. Расплывчатое описание получает уровень smart по умолчанию с низкой уверенностью.
- Никаких данных о качестве. Ничья между провайдерами — это ничья.
- Цены на изображения, видео, аудио и эмбеддинги вне области; как и self-hosted модели.
- Все суммы в долларах выше произведены `node scripts/regen-examples.mjs` на закоммиченной таблице цен и сверяются тестами байт в байт. Изменится таблица — изменятся и цифры.

## Похожие проекты

- [token-diet](https://github.com/uniqaiapp/token-diet): сокращение токенов в промптах и контексте без потери смысла; вторая половина счёта.
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): сжатие любого SKILL.md или файла инструкций для агента, чтобы агент загружал меньше токенов на каждом ходу.
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): то же правило «URL источника и дата проверки в каждой строке», применённое к ценам за секунду ИИ-видео.

## Как помочь проекту

Issues и пул-реквесты приветствуются; самые полезные — исправления цен с URL вендора и датой. Локальные проверки описаны в [CONTRIBUTING.md](CONTRIBUTING.md) (`node tests/run.mjs`, `node scripts/check.mjs`, без зависимостей).

## Лицензия

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>Сделано в <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-ru&utm_campaign=model-router">UniqAI</a> — Kling 3.0, Veo 3, Flux, Nano Banana и GPT-5/Claude/Gemini/Grok в одном приложении.</sub>

</div>
