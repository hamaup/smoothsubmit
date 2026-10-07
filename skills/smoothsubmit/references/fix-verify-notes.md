# Fix → Verify; Review Notes

## Fix

A proposal contains audit/check (or localCheck) reference, evidence, intended behavior, minimal relevant changes, constraints, tests and re-audit conditions. CLI `fix --audit FILE --check ID` only produces a prompt. `--assessment FILE` includes validated AI context.

Apply requested changes only after the user asks to fix. Respect existing changes. For account deletion connect an in-app initiation flow to the existing authentication/backend, document what remains untested, and avoid claiming a decorative button completes deletion. For restore use the app's purchase model; only invoke AppStore.sync from explicit user action when relevant. Do not introduce a single mandatory API pattern where valid alternatives exist.

Run relevant tests after an authorized change, within the user's environment and test permissions. Do not perform real purchases, real account deletion, submit a build or accept terms under a code-fix request. Report any test/tool unavailable; never claim it passed.

## Verify

Basic: create a new record and reread related source and settings. Pair the same target/component, preserve evidence and limits, and distinguish AI-reviewed improvements from static verification.

CLI:

```sh
smoothsubmit verify --baseline <old-audit.json> --format json
```

For AI concerns, read the new audit, create a fresh assessment, then compare both assessments:

```sh
smoothsubmit verify --baseline <old-audit.json> --audit <new-audit.json> --baseline-assessment <old-assessment.json> --assessment <new-assessment.json> --format json
```

A lost/unread/excluded cited input or omitted check is NEEDS_RECHECK; changed target/configuration/noncompatible rulepack/mode is NOT_COMPARABLE. NOT_APPLICABLE is CHANGED, not RESOLVED. Previous UNKNOWN/ERROR becoming PASS is CHANGED. Only the same required condition rechecked from FAIL/NEEDS_REVIEW to PASS can be RESOLVED. A complete static permission key, manifest structure, reason declaration or deployment setting may resolve despite unrelated local-package/preprocessing/setting-reference limits when its prior cited inputs remain readable and no input is excluded; the global partial flag and runtime Unknowns stay visible. Other partial/uncertain conditions require recheck. Runtime subjects are separate and need user tests, not code presence.

## Notes

Produce a draft from observed features and reviewer steps. Include access method, navigation, purchase access, backend/environment requirements and unresolved items. Use [assets/review-notes.md](../assets/review-notes.md). Reviewer credentials remain placeholders to be entered by the developer in App Store Connect. Do not register or send the draft.
