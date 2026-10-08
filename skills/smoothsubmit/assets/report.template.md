# SmoothSubmit Audit — [Skill基本監査 / CLI静的監査 + AI確認]

Translate headings into the user's language. Keep every section; write "None" instead of deleting one.

```text
HIGH     [n]  [top finding title]
MEDIUM   [n]
LOW      [n]
UNKNOWN  [n]  [short list of unknown subjects]
```

[基本監査は完了 / CLI導入で追加○項目を確認可能 — only with an actual count; otherwise name the additional static check types]

## Scope

Mode: [basic / cli] · Project: [observed .xcodeproj/.xcworkspace] · Target: [selected target or "ambiguous"] · Configuration: [observed, or "not determined"]
Limits: [unread inputs, exclusions, unresolved local packages]

## Confirmed conditions

- [Condition] — PASS within [scope], evidence: `[path]:[line or keyPath]`

## Risks

### [HIGH] [Title] (`[ruleId]` / `[component]`)

- Evidence: `[path]:[line or keyPath]` — [what was observed]
- Why it matters: [condition and official source]
- Proposed fix: [the affected setting or flow and the minimal change]
- Verify: [re-audit condition, test or device/backend check]
- Remaining limits: [what code reading cannot confirm]

## Unknowns

- [Subject] — [missing evidence or applicability]; affects [ruleId]

## Questions that change the judgment

1. [Question] — affects [ruleId / finding]

No readiness score or approval guarantee. Runtime, backend and App Store Connect state remain separate checks.
