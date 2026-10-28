<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#installation)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#installation)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#installation)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-de&utm_campaign=model-router)

**LLM-Router: eine Entscheidungstabelle fast / smart / premium für GPT, Claude, Gemini und Grok, mit datierten Preisen und Kostenrechner.**

[Schnellstart](#schnellstart) · [So funktioniert es](#so-funktioniert-es) · [Beispiele](#beispiele) · [Installation](#installation) · [FAQ](#faq)

</div>

[English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Português (BR)](README.pt-BR.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Deutsch

**model-router** ist ein LLM-Router, den Sie lesen können: eine Entscheidungstabelle, die eine Aufgabe anhand ihrer Form in drei Stufen einordnet (fast, smart, premium), für OpenAI, Anthropic, Google und xAI jeweils das günstigste Modell empfiehlt und die Kosten schätzt, bevor Sie die Aufgabe ausführen. Geliefert wird das Ganze als Claude-Code-Skill, als Abschnitt für `AGENTS.md` und als Cursor-Regel, dazu zwei Node-Skripte ohne Abhängigkeiten. Wir pflegen diese Tabelle, weil dieselben vier Modellfamilien im [UniqAI-Chat](https://uniqai.app/chat?utm_source=github&utm_medium=readme-de&utm_campaign=model-router) nebeneinander laufen und wir die Frage „welches Modell soll das beantworten“ bei jeder Anfrage beantworten müssen. Jede Preiszelle in [`data/prices.json`](data/prices.json) trägt die URL der Preisseite des Anbieters und ein Prüfdatum; die Tabelle wurde zuletzt am 2026-10-28 geprüft, und jede Zahl in dieser README ist die eingecheckte Ausgabe eines Skripts aus diesem Repository.

| **Nach Form klassifizieren, nicht nach Gefühl** | **Preis vor dem Lauf kennen** | **Preise mit Beleg** |
|:---|:---|:---|
| Sechsundzwanzig gewichtete Regeln machen aus Aufgabenbeschreibung, Token-Zahlen, Aufrufvolumen und Risiko eine Stufe und geben jede Regel aus, die gegriffen hat. | Ein Rechner für ein Modell, eine Stufe oder alle 34 Modelle: gecachter Prefix, Batch-Rabatt und Long-Context-Aufschläge eingerechnet. | Jede der 34 Zeilen hat eine Quell-URL und ein Prüfdatum; ein Validator meldet veraltete Zeilen und Stufen, die dem Preisband widersprechen. |

## Schnellstart

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

Sie erhalten die Stufe, die Begründung, das günstigste Modell pro Anbieter mit Kosten pro Aufruf und gesamt sowie einen Fallback eine Stufe höher. Kein Installationsschritt; Node 18 oder neuer.

## Demo

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## So funktioniert es

1. **Erst die Form.** Vier Fakten bestimmen die Stufe: Input-Tokens pro Aufruf, Output-Tokens pro Aufruf, Anzahl der Aufrufe und Risiko (wie schlimm eine falsche Antwort ist). Sie übergeben sie als Flags; Standardwerte werden in der Ausgabe genannt.
2. **Regeln, aufsummiert.** `scripts/lib/classify.mjs` enthält die Regeln. Klassifikation, Extraktion und Massenformulierungen stimmen für fast; Entwürfe, abgegrenzte Programmieraufgaben und Reviews für smart; Beweise, Architektur, Sicherheit, juristische oder medizinische Themen, Agentenläufe über mehrere Dateien und hohes Risiko für premium. Die höchste Summe gewinnt, bei Gleichstand geht es nach oben. Dieselbe Tabelle steht in [`SKILL.md`](SKILL.md), damit ein Agent ohne Node von Hand zum selben Ergebnis kommt.
3. **Günstigstes Modell der Stufe, pro Anbieter.** `scripts/lib/prices.mjs` rechnet die Form gegen jedes Modell der Stufe und liefert pro Anbieter das günstigste. Hat ein Anbieter nichts in der Stufe, wird eine Stufe höher gegangen und das gesagt (xAI führt kein Textmodell im Premium-Band, also wird dessen leistungsfähigstes Smart-Modell mit Hinweis angeboten).
4. **Eine Stufe nach der anderen eskalieren.** Die Ausgabe nennt das Fallback-Modell eine Stufe höher und die eine Prüfung, die belegen würde, dass die Stufe bestanden hat. Der Skill weist den Agenten an, wieder eine Stufe hinunterzugehen, sobald eine Stufe ein Eval besteht; dort liegt die Ersparnis.

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

Zu den Zahlen: Stufen sind Preisbänder nach Output-Preis (fast bis $3 pro 1M Output-Tokens, smart bis $15, premium darüber) plus die Benennung des Anbieters. Das Repository enthält keine Benchmark-Werte und behauptet nicht, dass jedes Modell in einem Band gleich gut ist; Zeilen, bei denen Band und Positionierung auseinandergehen, tragen eine `tier_note`. Die vollständige Tabelle mit Quellen steht in [`references/price-table.md`](references/price-table.md), erzeugt mit `node scripts/table.mjs --write`.

## Beispiele

Alle Ausgaben unten sind aus [`examples/expected/`](examples/) kopiert und werden von `node tests/run.mjs` reproduziert.

<details open>
<summary><b>50,000 Tickets klassifizieren → Stufe fast, unter $4 bei drei von vier Anbietern</b></summary>

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
<summary><b>Sporadischer Deadlock, hohes Risiko → premium, und was xAI stattdessen bekommt</b></summary>

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
<summary><b>Fast- und Premium-Signale in einer Aufgabe → Hinweis auf zwei Stufen</b></summary>

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
<summary><b>Rechner: ein Prompt mit 120k Tokens auf Claude Haiku 5.5 mit gecachtem Prefix und Batch-Preis</b></summary>

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

Die Long-Context-Zeile hat gegriffen, weil der Prompt über 100,000 Tokens liegt; deshalb beträgt der Input-Preis $0.50 und nicht $0.10.

</details>

Elf geroutete Aufgaben und vier Rechnerläufe sind in [`examples/README.md`](examples/README.md) aufgeführt.

## Installation

Funktioniert mit jedem Agenten, der Instruktionsdateien liest. Wählen Sie Ihren. Voraussetzung: Node 18+. Keine Pakete zu installieren.

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

Dann `/model-router` in einer beliebigen Sitzung, oder fragen Sie einfach „welches Modell soll ich dafür nehmen“ oder „was kostet das“; die `description` des Skills löst ihn aus. Sobald der uniqaiapp-Marketplace veröffentlicht ist: `/plugin marketplace add uniqaiapp/skills`, dann `/plugin install model-router@uniqaiapp`.

</details>

<details>
<summary><b>Cursor</b></summary>

Kopieren Sie `SKILL.md`, `scripts/`, `data/` und [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc) in Ihr Projekt. Die Regeldatei bindet den Skill über `@SKILL.md` ein.

</details>

<details>
<summary><b>Codex / jeder AGENTS.md-Agent</b></summary>

Kopieren Sie `SKILL.md`, `scripts/` und `data/` nach `.agents/skills/model-router/` und hängen Sie den Ausschnitt aus [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md) an Ihre `AGENTS.md` an. Die [`AGENTS.md`](AGENTS.md) dieses Repositorys ist ein funktionierendes Beispiel.

</details>

<details>
<summary><b>Reiner Prompt, oder ganz ohne Agent</b></summary>

Fügen Sie [`SKILL.md`](SKILL.md) in den System-Prompt eines beliebigen Modells ein; außerhalb des Frontmatters enthält sie keine agentenspezifische Syntax. Die Skripte laufen auch eigenständig: `node scripts/route.mjs --help`, `node scripts/cost.mjs --help`.

</details>

## FAQ

<details>
<summary><b>Woher kommen die Preise, und wie veraltet sind sie?</b></summary>

Von der Preisseite des jeweiligen Anbieters, von Hand übertragen: OpenAI, Anthropic, Google AI (Gemini API) und xAI. Jede Zeile in `data/prices.json` hat die URL und das Datum der Prüfung; die gesamte Tabelle wurde am 2026-10-28 geprüft. `node scripts/check.mjs` warnt bei Zeilen, die älter als 90 Tage sind. Aktionspreise mit Enddatum und Long-Context-Aufschläge werden neben dem Standardpreis gespeichert, und der Rechner wählt den richtigen.

</details>

<details>
<summary><b>Ist „fast / smart / premium“ eine Qualitätsrangfolge?</b></summary>

Nein. Stufen sind Preisbänder nach Output-Preis plus die Benennung des Anbieters (nano, flash, haiku gegenüber pro, opus, astra). Das Repository enthält keine Benchmark-Werte und behauptet nicht, dass Modelle innerhalb eines Bands gleich abschneiden. Der Router ordnet Modelle innerhalb einer Stufe nach den Kosten für Ihre Form; zwischen den Anbietern entscheidet Ihre eigene Stichprobe.

</details>

<details>
<summary><b>Was, wenn das günstige Modell danebenliegt?</b></summary>

Jedes Ergebnis nennt den Fallback eine Stufe höher und die eine Prüfung, die belegt, dass die Stufe bestanden hat (exakte Übereinstimmung der Labels, grüne Tests, Stichprobe durch einen Reviewer). Die Regel des Skills lautet: an einer Stichprobe validieren, eine Stufe nach der anderen eskalieren, und sobald eine Stufe besteht, die darunter ausprobieren, bevor Sie sich festlegen.

</details>

<details>
<summary><b>Kann ich einen eigenen Anbieter oder eine interne Preisliste ergänzen?</b></summary>

Ja. Fügen Sie Zeilen in `data/prices.json` hinzu (oder zeigen Sie mit `--prices` auf eine andere Datei), führen Sie `node scripts/check.mjs` aus, dann `node scripts/table.mjs --write`. Zeilen brauchen eine `source`-URL und ein `checked`-Datum; der Validator lehnt Zeilen ohne diese Felder ab.

</details>

<details>
<summary><b>Zählt es Tokens?</b></summary>

Grob: `--file prompt.txt` schätzt Zeichen / 4 und sagt das in der Ausgabe. Für abrechnungsgenaue Zahlen nutzen Sie den Token-Zähler des Anbieters und übergeben den Wert mit `--input`.

</details>

## Grenzen und Ehrlichkeit

- Der Klassifikator matcht englische Aufgabenformulierungen und die vier Form-Flags; Ihre Daten liest er nicht. Eine vage Beschreibung bekommt den Standard smart mit niedriger Konfidenz.
- Keinerlei Qualitätsdaten. Gleichstände zwischen Anbietern bleiben Gleichstände.
- Preise für Bild, Video, Audio und Embeddings sind außerhalb des Umfangs; selbst gehostete Modelle ebenso.
- Alle Dollarbeträge oben werden von `node scripts/regen-examples.mjs` auf der eingecheckten Preistabelle erzeugt und von den Tests Byte für Byte geprüft. Ändert sich die Tabelle, ändern sich die Beträge mit.

## Verwandte Projekte

- [token-diet](https://github.com/uniqaiapp/token-diet): Prompt- und Kontext-Tokens kürzen, ohne Bedeutung zu verlieren; die andere Hälfte der Rechnung.
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): jede SKILL.md oder Agenten-Instruktionsdatei verkleinern, damit der Agent pro Zug weniger Tokens lädt.
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): dieselbe Regel „Quell-URL und Prüfdatum in jeder Zeile“, angewandt auf KI-Videopreise pro Sekunde.

## Mitwirken

Issues und Pull Requests sind willkommen; Preiskorrekturen mit Anbieter-URL und Datum sind die nützlichste Sorte. Die lokalen Prüfungen stehen in [CONTRIBUTING.md](CONTRIBUTING.md) (`node tests/run.mjs`, `node scripts/check.mjs`, keine Abhängigkeiten).

## Lizenz

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub>Entwickelt von <a href="https://uniqai.app/?utm_source=github&utm_medium=readme-de&utm_campaign=model-router">UniqAI</a> — Kling 3.0, Veo 3, Flux, Nano Banana und GPT-5/Claude/Gemini/Grok in einer App.</sub>

</div>
