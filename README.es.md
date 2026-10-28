<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#instalación)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#instalación)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#instalación)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-es&utm_campaign=model-router)

**Router de modelos LLM: una tabla de decisión fast / smart / premium para GPT, Claude, Gemini y Grok, con precios fechados y una calculadora de costos.**

[Inicio rápido](#inicio-rápido) · [Cómo funciona](#cómo-funciona) · [Ejemplos](#ejemplos) · [Instalación](#instalación) · [FAQ](#faq)

</div>

[English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · Español · [Português (BR)](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md)

**model-router** es un router de modelos LLM que puedes leer: una tabla de decisión que clasifica una tarea en tres niveles (fast, smart, premium) según su forma, recomienda el modelo más barato de cada proveedor para OpenAI, Anthropic, Google y xAI, y estima el costo antes de ejecutarla. Se distribuye como skill de Claude Code, sección de `AGENTS.md` y regla de Cursor, más dos scripts de Node sin dependencias. Mantenemos esta tabla porque las mismas cuatro familias de modelos conviven en el [chat de UniqAI](https://uniqai.app/chat?utm_source=github&utm_medium=readme-es&utm_campaign=model-router), y "cuál debería responder esto" es una pregunta que tenemos que contestar en cada petición. Cada celda de precio de [`data/prices.json`](data/prices.json) lleva la URL de la página de precios del proveedor y una fecha de comprobación; la tabla se comprobó por última vez el 2026-10-28, y cada número de este README es salida versionada de un script de este repositorio.

| **Clasificar por forma, no por intuición** | **Calcular el precio antes de ejecutar** | **Precios con comprobante** |
|:---|:---|:---|
| Veintiséis reglas ponderadas convierten la descripción de una tarea, los recuentos de tokens, el volumen de llamadas y el riesgo en un nivel, e imprimen cada regla que se activó. | Una calculadora para un modelo, un nivel o los 34 modelos: prefijo en caché, descuento por batch y recargos por contexto largo incluidos. | Cada una de las 34 filas tiene una URL de origen y una fecha de comprobación; un validador marca filas obsoletas y niveles que no coinciden con la banda de precio. |

## Inicio rápido

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

Obtienes el nivel, los motivos, el modelo más barato de cada proveedor con el costo por llamada y el total, y un modelo de respaldo un nivel más arriba. Sin paso de instalación; Node 18 o superior.

## Demo

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## Cómo funciona

1. **Primero la forma.** Cuatro datos determinan el nivel: tokens de entrada por llamada, tokens de salida por llamada, número de llamadas y riesgo (qué tan grave es una respuesta incorrecta). Los pasas como flags; los valores por defecto se indican en la salida.
2. **Reglas, sumadas.** `scripts/lib/classify.mjs` contiene las reglas. Clasificación, extracción y redacción masiva votan fast; redactar, programar con alcance acotado y revisar votan smart; demostraciones, arquitectura, dominios de seguridad, legales o médicos, ejecuciones de agente multiarchivo y riesgo alto votan premium. Gana el total más alto y los empates suben de nivel. La misma tabla está escrita en [`SKILL.md`](SKILL.md) para que un agente sin Node llegue a la misma respuesta a mano.
3. **El más barato del nivel, por proveedor.** `scripts/lib/prices.mjs` calcula el precio de la forma contra cada modelo del nivel y devuelve el más barato de cada proveedor. Cuando un proveedor no tiene nada en el nivel, sube uno y lo dice (xAI no lista ningún modelo de texto en la banda premium, así que se ofrece su modelo smart más capaz con la nota).
4. **Escalar un nivel cada vez.** La salida nombra el modelo de respaldo un nivel más arriba y la única comprobación que demostraría que el nivel pasó. La skill indica al agente que vuelva a bajar cuando un nivel pase una evaluación; ahí es donde está el ahorro.

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

Números: los niveles son bandas de precio por precio de salida (fast hasta $3 por 1M de tokens de salida, smart hasta $15, premium por encima), más la nomenclatura del propio proveedor. El repositorio no contiene puntuaciones de benchmarks ni afirma que todos los modelos de una banda rindan igual; las filas donde la banda y el posicionamiento no coinciden llevan un `tier_note`. La tabla completa con fuentes está en [`references/price-table.md`](references/price-table.md), generada con `node scripts/table.mjs --write`.

## Ejemplos

Todas las salidas de abajo están copiadas de [`examples/expected/`](examples/) y se reproducen con `node tests/run.mjs`.

<details open>
<summary><b>50,000 tickets por clasificar → nivel fast, menos de $4 en tres de los cuatro proveedores</b></summary>

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
<summary><b>Deadlock intermitente, riesgo alto → premium, y qué recibe xAI en su lugar</b></summary>

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
<summary><b>Señales fast y premium en una misma tarea → sugerencia de dos etapas</b></summary>

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
<summary><b>Calculadora: un prompt de 120k tokens en Claude Haiku 5.5 con prefijo en caché y precio batch</b></summary>

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

La fila de contexto largo se activó porque el prompt supera los 100,000 tokens, y por eso el precio de entrada es $0.50 y no $0.10.

</details>

Once tareas enrutadas y cuatro ejecuciones de la calculadora están listadas en [`examples/README.md`](examples/README.md).

## Instalación

Funciona con cualquier agente que lea archivos de instrucciones. Elige el tuyo. Requisitos: Node 18+. Sin paquetes que instalar.

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

Luego `/model-router` en cualquier sesión, o simplemente pregunta "qué modelo debería usar para esto" o "cuánto va a costar esto"; la `description` de la skill la activa. Cuando se publique el marketplace de uniqaiapp: `/plugin marketplace add uniqaiapp/skills` y luego `/plugin install model-router@uniqaiapp`.

</details>

<details>
<summary><b>Cursor</b></summary>

Copia `SKILL.md`, `scripts/`, `data/` y [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) a tu proyecto. El archivo de reglas incrusta la skill con `@SKILL.md`.

</details>

<details>
<summary><b>Codex / cualquier agente con AGENTS.md</b></summary>

Copia `SKILL.md`, `scripts/` y `data/` a `.agents/skills/model-router/` y añade el fragmento de [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) al final de tu `AGENTS.md`. El propio [`AGENTS.md`](AGENTS.md) del repositorio es un ejemplo funcional.

</details>

<details>
<summary><b>Prompt plano, o sin ningún agente</b></summary>

Pega [`SKILL.md`](SKILL.md) en el system prompt de cualquier modelo; no tiene sintaxis específica de agente fuera del frontmatter. Los scripts también funcionan por sí solos: `node scripts/route.mjs --help`, `node scripts/cost.mjs --help`.

</details>

## FAQ

<details>
<summary><b>¿De dónde salen los precios y qué tan desactualizados están?</b></summary>

De la página de precios de cada proveedor, copiados a mano: OpenAI, Anthropic, Google AI (Gemini API) y xAI. Cada fila de `data/prices.json` tiene la URL y la fecha en que se comprobó; la tabla completa se comprobó el 2026-10-28. `node scripts/check.mjs` avisa de las filas con más de 90 días. Los precios promocionales con fecha de fin y los recargos por contexto largo se guardan junto al precio estándar, y la calculadora elige el correcto.

</details>

<details>
<summary><b>¿"fast / smart / premium" es un ranking de calidad?</b></summary>

No. Los niveles son bandas de precio por precio de salida más la nomenclatura del propio proveedor (nano, flash, haiku frente a pro, opus, astra). El repositorio no contiene puntuaciones de benchmarks ni afirma que los modelos de una misma banda rindan igual. El router ordena los modelos de un nivel por costo para tu forma; tu propia muestra decide entre proveedores.

</details>

<details>
<summary><b>¿Y si el modelo barato se equivoca?</b></summary>

Cada resultado nombra el modelo de respaldo un nivel más arriba y la única comprobación que demuestra que el nivel pasó (coincidencia exacta de etiquetas, tests en verde, una comprobación puntual de un revisor). La regla de la skill es: valida sobre una muestra, escala un nivel cada vez y, cuando un nivel pase, prueba el nivel inferior antes de decidirte.

</details>

<details>
<summary><b>¿Puedo añadir mi propio proveedor o una lista de precios interna?</b></summary>

Sí. Añade filas a `data/prices.json` (o apunta los scripts a otro archivo con `--prices`), ejecuta `node scripts/check.mjs` y luego `node scripts/table.mjs --write`. Las filas necesitan una URL en `source` y una fecha en `checked`; el validador rechaza las filas que no las tengan.

</details>

<details>
<summary><b>¿Cuenta tokens?</b></summary>

Aproximadamente: `--file prompt.txt` estima caracteres / 4 y lo indica en la salida. Para cifras con precisión de facturación usa el contador de tokens del proveedor y pasa el recuento con `--input`.

</details>

## Límites y honestidad

- El clasificador compara la redacción de la tarea en inglés y los cuatro flags de forma; no lee tus datos. Una descripción vaga recibe el nivel smart por defecto con confianza baja.
- No hay datos de calidad de ningún tipo. Los empates entre proveedores son empates.
- Los precios de imagen, video, audio y embeddings quedan fuera del alcance; también los modelos autoalojados.
- Todas las cifras en dólares de arriba las produce `node scripts/regen-examples.mjs` sobre la tabla de precios versionada y los tests las comprueban byte a byte. Si la tabla cambia, las cifras cambian con ella.

## Relacionados

- [token-diet](https://github.com/uniqaiapp/token-diet): recorta tokens de prompt y contexto sin perder significado; la otra mitad de la factura.
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): reduce cualquier SKILL.md o archivo de instrucciones para agentes para que el agente cargue menos tokens en cada turno.
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): la misma regla de "URL de origen y fecha de comprobación en cada fila", aplicada a los precios por segundo del video con IA.

## Contribuir

Los issues y pull requests son bienvenidos; las correcciones de precios con la URL del proveedor y la fecha son las más útiles. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las comprobaciones locales (`node tests/run.mjs`, `node scripts/check.mjs`, sin dependencias).

## Licencia

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>Hecho por <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-es&utm_campaign=model-router">UniqAI</a> — Kling 3.0, Veo 3, Flux, Nano Banana y GPT-5/Claude/Gemini/Grok en una sola app.</sub>

</div>
