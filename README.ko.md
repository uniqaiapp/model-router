<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="model-router: pick the cheapest model that still passes the task" src="assets/banner.svg" width="1280" height="320">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-d1fe17?style=flat-square&labelColor=0d0f12)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-d1fe17?style=flat-square&labelColor=0d0f12)](#설치)
[![Cursor](https://img.shields.io/badge/Cursor-rules-d1fe17?style=flat-square&labelColor=0d0f12)](#설치)
[![Codex](https://img.shields.io/badge/Codex-AGENTS.md-d1fe17?style=flat-square&labelColor=0d0f12)](#설치)
[![UniqAI](https://img.shields.io/badge/made_by-UniqAI-fdfc07?style=flat-square&labelColor=0d0f12)](https://uniqai.app/?utm_source=github&utm_medium=readme-ko&utm_campaign=model-router)

**LLM 모델 라우터: GPT, Claude, Gemini, Grok을 fast / smart / premium으로 나누는 결정표. 날짜가 붙은 가격표와 비용 계산기를 포함합니다.**

[빠른 시작](#빠른-시작) · [작동 방식](#작동-방식) · [예시](#예시) · [설치](#설치) · [FAQ](#faq)

</div>

[English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Português (BR)](README.pt-BR.md) · [日本語](README.ja.md) · 한국어 · [Deutsch](README.de.md)

**model-router**는 사람이 읽을 수 있는 LLM 모델 라우터입니다. 작업의 형태를 보고 세 등급(fast, smart, premium) 중 하나로 분류하고, OpenAI, Anthropic, Google, xAI 각 제공사별로 가장 저렴한 모델을 추천하며, 실행하기 전에 비용을 추정하는 결정표입니다. Claude Code 스킬, `AGENTS.md` 섹션, Cursor 규칙으로 제공되며, 의존성 없는 Node 스크립트 두 개가 함께 들어 있습니다. 이 표를 관리하는 이유는 [UniqAI 채팅](https://uniqai.app/chat?utm_source=github&utm_medium=readme-ko&utm_campaign=model-router)에서 같은 네 모델 계열이 나란히 돌아가고, "이 요청은 어느 모델이 답해야 하나"를 매 요청마다 결정해야 하기 때문입니다. [`data/prices.json`](data/prices.json)의 모든 가격 셀에는 제공사 가격 페이지 URL과 "checked" 날짜가 붙어 있습니다. 표는 2026-10-28에 마지막으로 확인했으며, 이 README의 모든 숫자는 이 저장소에 있는 스크립트가 출력해서 커밋한 값입니다.

| **감이 아니라 형태로 분류** | **실행 전에 가격부터 계산** | **근거가 붙은 가격** |
|:---|:---|:---|
| 가중치가 붙은 규칙 스물여섯 개가 작업 설명, 토큰 수, 호출 횟수, 위험도를 등급으로 바꾸고, 적용된 규칙을 전부 출력합니다. | 모델 하나, 등급 하나, 또는 34개 모델 전체에 대한 계산기. 캐시된 프리픽스, 배치 할인, 긴 컨텍스트 할증을 반영합니다. | 34개 행마다 출처 URL과 확인 날짜가 있습니다. 검증기가 오래된 행과, 가격대와 맞지 않는 등급을 표시합니다. |

## 빠른 시작

```bash
git clone https://github.com/uniqaiapp/model-router && cd model-router
node scripts/route.mjs "Classify 50,000 support tickets into billing / bug / feature / other" --input 600 --output 20 --calls 50000 --risk low
```

등급, 그 이유, 제공사별 가장 저렴한 모델과 호출당·전체 비용, 그리고 한 등급 위의 대체 모델이 출력됩니다. 설치 단계는 없고, Node 18 이상이면 됩니다.

## 데모

<img alt="model-router demo: installing the skill, routing a 50,000-ticket classification job to the fast tier, pricing it per provider and naming the smart fallback" src="assets/demo.svg" width="980">

## 작동 방식

1. **형태가 먼저입니다.** 네 가지 사실이 등급을 결정합니다. 호출당 입력 토큰, 호출당 출력 토큰, 호출 횟수, 그리고 위험도(답이 틀리면 얼마나 곤란한가)입니다. 플래그로 넘기며, 기본값은 출력에 명시됩니다.
2. **규칙을 합산합니다.** 규칙은 `scripts/lib/classify.mjs`에 있습니다. 분류, 추출, 대량 문구 작성은 fast에 투표하고, 초안 작성, 범위가 정해진 코딩, 리뷰는 smart에 투표하며, 증명, 아키텍처, 보안·법률·의료 도메인, 여러 파일에 걸친 에이전트 실행, 높은 위험도는 premium에 투표합니다. 합계가 가장 높은 등급이 이기고, 동점이면 위로 올라갑니다. 같은 표가 [`SKILL.md`](SKILL.md)에도 적혀 있어서 Node가 없는 에이전트도 손으로 같은 답에 도달합니다.
3. **등급 안에서 제공사별 최저가.** `scripts/lib/prices.mjs`가 등급 안의 모든 모델에 대해 그 형태의 비용을 계산하고 제공사별로 가장 저렴한 모델을 돌려줍니다. 어떤 제공사에 그 등급의 모델이 없으면 한 단계 올라가고 그 사실을 알립니다(xAI는 premium 가격대의 텍스트 모델이 없으므로 가장 성능이 높은 smart 모델을 메모와 함께 제시합니다).
4. **한 번에 한 등급씩 올립니다.** 출력에는 한 등급 위의 대체 모델과, 그 등급이 통과했음을 증명할 검사 하나가 나옵니다. 스킬은 어떤 등급이 평가를 통과하면 다시 한 등급 내려가 보라고 에이전트에게 지시합니다. 절감은 거기서 나옵니다.

```
task ──► classify (rules + shape) ──► tier ──► cheapest model per provider ──► cost estimate
                                        │
                                        └──► fallback one tier up · two-stage hint when fast and premium signals collide
```

숫자에 대해: 등급은 출력 가격 기준 가격대(fast는 출력 1M 토큰당 $3까지, smart는 $15까지, premium은 그 이상)에 제공사 자체의 명명을 더한 것입니다. 이 저장소에는 벤치마크 점수가 없으며, 같은 가격대의 모든 모델이 같은 성능을 낸다고 주장하지 않습니다. 가격대와 포지셔닝이 어긋나는 행에는 `tier_note`가 붙어 있습니다. 출처가 포함된 전체 표는 [`references/price-table.md`](references/price-table.md)에 있고, `node scripts/table.mjs --write`로 생성됩니다.

## 예시

아래 출력은 모두 [`examples/expected/`](examples/)에서 복사한 것이며 `node tests/run.mjs`로 재현됩니다.

<details open>
<summary><b>티켓 50,000건 분류 → fast 등급, 네 제공사 중 셋에서 $4 미만</b></summary>

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
<summary><b>간헐적 데드락, 높은 위험도 → premium, 그리고 xAI는 대신 무엇을 받는가</b></summary>

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
<summary><b>한 작업에 fast와 premium 신호가 함께 → 2단계 힌트</b></summary>

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
<summary><b>계산기: 캐시된 프리픽스와 배치 가격을 적용한 Claude Haiku 5.5의 120k 토큰 프롬프트</b></summary>

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

프롬프트가 100,000 토큰을 넘어서 긴 컨텍스트 행이 적용됐고, 그래서 입력 가격이 $0.10이 아니라 $0.50입니다.

</details>

라우팅된 작업 열한 개와 계산기 실행 네 건이 [`examples/README.md`](examples/README.md)에 정리되어 있습니다.

## 설치

지시 파일을 읽는 모든 에이전트에서 동작합니다. 사용하는 것을 고르세요. 요구 사항: Node 18+. 설치할 패키지는 없습니다.

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

그다음 아무 세션에서나 `/model-router`를 입력하거나, 그냥 "이 작업에는 어떤 모델을 써야 하나" 또는 "이거 비용이 얼마나 나오나"라고 물어보세요. 스킬의 `description`이 트리거합니다. uniqaiapp 마켓플레이스가 공개되면 `/plugin marketplace add uniqaiapp/skills` 다음 `/plugin install model-router@uniqaiapp`로 설치할 수 있습니다.

</details>

<details>
<summary><b>Cursor</b></summary>

`SKILL.md`, `scripts/`, `data/`, [`.cursor/rules/model-router.mdc`](.cursor/rules/model-router.mdc)를 프로젝트에 복사하세요. 규칙 파일이 `@SKILL.md`로 스킬을 포함합니다.

</details>

<details>
<summary><b>Codex / AGENTS.md를 쓰는 모든 에이전트</b></summary>

`SKILL.md`, `scripts/`, `data/`를 `.agents/skills/model-router/`에 복사하고, [`codex/INSTRUCTIONS.md`](codex/INSTRUCTIONS.md)의 스니펫을 `AGENTS.md`에 덧붙이세요. 이 저장소의 [`AGENTS.md`](AGENTS.md)가 실제 동작하는 예시입니다.

</details>

<details>
<summary><b>일반 프롬프트, 또는 에이전트 없이</b></summary>

[`SKILL.md`](SKILL.md)를 아무 모델의 시스템 프롬프트에 붙여 넣으세요. 프런트매터 밖에는 특정 에이전트 전용 문법이 없습니다. 스크립트도 단독으로 실행됩니다: `node scripts/route.mjs --help`, `node scripts/cost.mjs --help`.

</details>

## FAQ

<details>
<summary><b>가격은 어디서 가져오고, 얼마나 오래된 값인가요?</b></summary>

각 제공사의 가격 페이지(OpenAI, Anthropic, Google AI(Gemini API), xAI)에서 손으로 옮겨 적습니다. `data/prices.json`의 모든 행에는 URL과 확인한 날짜가 있고, 표 전체는 2026-10-28에 확인했습니다. `node scripts/check.mjs`는 90일이 넘은 행에 경고를 냅니다. 종료일이 있는 프로모션 가격과 긴 컨텍스트 할증은 표준 가격 옆에 저장되며, 계산기가 알맞은 값을 고릅니다.

</details>

<details>
<summary><b>"fast / smart / premium"은 품질 순위인가요?</b></summary>

아닙니다. 등급은 출력 가격 기준 가격대에 제공사 자체의 명명(nano, flash, haiku 대 pro, opus, astra)을 더한 것입니다. 이 저장소에는 벤치마크 점수가 없으며, 같은 가격대 안의 모델들이 비슷하게 동작한다고 주장하지 않습니다. 라우터는 등급 안의 모델을 주어진 형태의 비용순으로 정렬할 뿐이고, 제공사 사이의 선택은 직접 돌려 본 샘플이 결정합니다.

</details>

<details>
<summary><b>저렴한 모델이 틀리면 어떻게 하나요?</b></summary>

모든 결과에는 한 등급 위의 대체 모델과, 그 등급이 통과했음을 증명하는 검사 하나(레이블 완전 일치, 테스트 통과, 리뷰어 표본 검토)가 명시됩니다. 스킬의 규칙은 이렇습니다. 샘플로 검증하고, 한 번에 한 등급씩 올리고, 어떤 등급이 통과하면 확정하기 전에 그 아래 등급을 시도해 보라는 것입니다.

</details>

<details>
<summary><b>제공사나 내부 가격표를 직접 추가할 수 있나요?</b></summary>

네. `data/prices.json`에 행을 추가하거나(`--prices`로 다른 파일을 지정해도 됩니다) `node scripts/check.mjs`를 실행한 뒤 `node scripts/table.mjs --write`를 실행하세요. 행에는 `source` URL과 `checked` 날짜가 필요하며, 검증기는 이 둘이 없는 행을 거부합니다.

</details>

<details>
<summary><b>토큰을 세어 주나요?</b></summary>

대략적으로만 셉니다. `--file prompt.txt`를 주면 문자 수 / 4로 추정하고 출력에 그렇게 표시합니다. 과금 수준의 정확한 숫자가 필요하면 제공사의 토큰 카운터를 쓰고 그 값을 `--input`으로 넘기세요.

</details>

## 한계와 솔직한 고지

- 분류기는 영어 작업 설명과 네 가지 형태 플래그만 봅니다. 사용자 데이터는 읽지 않습니다. 설명이 모호하면 낮은 신뢰도로 smart 기본값이 나옵니다.
- 품질 데이터는 어떤 종류도 없습니다. 제공사 간 동점은 그냥 동점입니다.
- 이미지, 비디오, 오디오, 임베딩 가격은 범위 밖이고, 자체 호스팅 모델도 마찬가지입니다.
- 위의 모든 달러 수치는 커밋된 가격표에 대해 `node scripts/regen-examples.mjs`가 생성한 것이며, 테스트가 바이트 단위로 대조합니다. 표가 바뀌면 수치도 함께 바뀝니다.

## 관련 프로젝트

- [token-diet](https://github.com/uniqaiapp/token-diet): 의미를 잃지 않고 프롬프트와 컨텍스트 토큰을 줄입니다. 청구서의 나머지 절반입니다.
- [skill-shrinker](https://github.com/uniqaiapp/skill-shrinker): SKILL.md나 에이전트 지시 파일을 줄여서 에이전트가 매 턴마다 읽어 들이는 토큰을 줄입니다.
- [ai-video-pricing](https://github.com/uniqaiapp/ai-video-pricing): "모든 행에 출처 URL과 확인 날짜"라는 같은 규칙을 AI 비디오의 초당 가격에 적용한 것입니다.

## 기여하기

이슈와 풀 리퀘스트를 환영합니다. 제공사 URL과 날짜가 붙은 가격 정정이 가장 유용합니다. 로컬 검사(`node tests/run.mjs`, `node scripts/check.mjs`, 의존성 없음)는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

[MIT](LICENSE) © UniqAI

---

<div align="center">

<sub><a href="https://uniqai.app/?utm_source=github&utm_medium=readme-ko&utm_campaign=model-router">UniqAI</a> 제작 — Kling 3.0, Veo 3, Flux, Nano Banana, GPT-5/Claude/Gemini/Grok을 앱 하나에서.</sub>

</div>
