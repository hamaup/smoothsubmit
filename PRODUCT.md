# SmoothSubmit

<!-- impeccable:product-schema 1 -->

## Platform

web

The public introduction surface is web. The product is an agent Skill and optional macOS CLI for iOS repositories.

## Stack

Static HTML/CSS/JavaScript, deployed with GitHub Pages. User chose direct code-first creation and multilingual content; the initial languages are Japanese and English.

## Users

Solo developers and teams of 1–5 using Claude Code, Codex, or Cursor to build iOS apps.

## Product Purpose

Find submission risks before App Store submission and explain actionable fixes. The intended value is less resubmission work and waiting; those savings have not been measured.

## Positioning

Audit → Fix → Verify in the coding agent developers already use, with evidence and explicit unknowns. CLI installation is optional for basic Skill audits.

## Operating Context

Read local Xcode configuration, privacy manifests, entitlements, and relevant code. Audit first, then ask only questions that can change findings. A normal audit proposes fixes; source changes require an explicit request. No automatic App Store Connect writes or submissions.

## Capabilities and Constraints

Public alpha 0.1.0-alpha.2; Apache-2.0. CLI supports macOS 14+ and Node 22.18+. Static evidence, agent judgment, and user attestation remain distinct. No approval probability or guarantee. Runtime behavior, archives, backends and actual App Store Connect state require further verification. Full native discovery across all three coding-agent hosts is not yet verified. Source of current shipped capabilities: docs/RELEASE_STATUS.md.

## Brand Commitments

SmoothSubmit is the confirmed product name. Use clear Japanese and English. Apple affiliation must not be implied.

## Evidence on Hand

docs/USEFULNESS_VALIDATION.md and docs/validation/real-projects.json: public source snapshots from 3 real iOS projects; 9 deliberately injected setting defects detected and verified resolved after restoring the original values. 57 automated tests passed. These are bounded experiments, not rejection-rate estimates or endorsements by those projects.

## Product Principles

- Complete a useful basic audit without the CLI.
- Audit before asking for missing information.
- Explain evidence, uncertainty, proposed fixes and rechecks.
- Preserve the boundary between observation and actual runtime verification.
- Keep audit execution local; use the existing coding agent's model.
