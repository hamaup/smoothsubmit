# Release status — v0.1.0-alpha.2

Published artifact target: GitHub source + GitHub Release npm-format archive. The npm registry package is not published; npm authentication is not available on the release machine. Brand/bin remain SmoothSubmit/smoothsubmit.

This is a usable initial alpha, not a claim that every OSS MVP acceptance gate in SPEC.md has been completed. Specification/design describe the target MVP; this document describes the actual release.

## Included

- Standalone SmoothSubmit Skill with audit, proposals, explicitly requested fixes, rechecks and Review Notes drafts. CLI absence is not a stop condition.
- TypeScript CLI: audit, report, fix prompts, verify, init, doctor, rules list; Japanese/English report text, versioned JSON and exit codes.
- 19 rule families with separate scope/code/preparation/runtime conditions; deterministic settings/structure checks and conservative contextual candidates.
- OpenStep project resolution, supported workspace references, normal/synchronized groups, xcconfig inheritance/includes/conditions, XML/binary plutil parsing, generated permission values, Swift lexical candidates, InfoPlist strings/catalog basics, SPM lockfile versions 1–3 and Pods inventory.
- Required Reason categories and approved code sets, the 86-name Apple SDK list snapshot, official source records; no runtime network retrieval.
- Immutable audits, manifests and new result artifacts; evidence/snapshot validation, separate AI assessments, static/assisted comparison and read-only fix prompts.
- Synthetic before/after samples, CI, license and contribution/issue guidance.

## Verified locally

57 meaningful automated tests passed. The final test count is recorded in the GitHub release notes and CI. Covered scenarios include parser/target isolation, unknown conditions, binary plist, generated value conflict, synchronized exceptions, localization, dependency inventory, immutable writes, secret-free source evidence, static/AI boundaries, manual snapshot separation, exit codes and comparison semantics.

The packaged archive was installed in a clean temporary prefix. Offline-guarded audit and fix-prompt generation passed; source bytes remained unchanged. Skill frontmatter/resources passed the skill-creator validator and repository checks. This is structural Skill validation, not live host behavior proof.

Behavioral Skill evaluation on 2026-10-08 (`npm run eval:skill`, evals/scenarios.json): Claude Code 2.1 in print mode with its default model ran six scenarios on temporary copies of the synthetic examples with fixture READMEs hidden. All six passed: CLI-free audit, a correctly configured negative control, an injected instruction comment, a proposal-only request, an authorized single-file fix, and a shell-enabled run with planted project scripts that were neither executed nor attempted. This covers Claude Code only, with one model and synthetic fixtures; it is not a Codex/Cursor or real-project result.

Benchmark on 2026-10-07: Darwin 27.0.0, Node v23.11.0, Apple Silicon; 1,000 Swift files, 20,945,984 input bytes, 3,384ms elapsed, 145MiB process max RSS. Fixture creation/installation were excluded; scan/parsing/hashing/result validation/save were included. Targets are 30 seconds and 512MiB. This single fixture is not a guarantee for arbitrary projects.

## Real-project validation

Three pinned public text snapshots (IceCubesApp, KeePassium, NetNewsWire) completed audits. Nine injected setting defects were detected, produced fix prompts identifying the affected setting, and became RESOLVED after restoring correct values. Original source/configuration hashes stayed unchanged. These experiments do not certify upstream app compliance or measure rejection rates/time saved. See [usefulness validation](USEFULNESS_VALIDATION.md) and its execution record.

Version alpha.2 adds anchored xcconfig support, explicit local-package/preprocessed-plist limits, narrower network/audio/model-date candidates, SDK restore candidates, invalid-reason detection, actionable guidance and prioritized reports. Individual complete structural checks can resolve despite unrelated limits while global partial coverage and runtime Unknowns remain visible.

## Still unverified or deliberately limited

- Live discovery and complete audit/fix/verify in Codex and Cursor, Claude Code with other models, and Skill-driven verify runs. Placement follows the documented Skill directories; no fabricated host test receipt is supplied.
- No Xcode build, simulator/device run, App Store submission, real purchase/deletion, backend test or actual App Store Connect/account read occurred. Example projects are synthetic parser fixtures.
- Swift detection is lexical and has a finite symbol/pattern scope. Macros, string interpolation behavior, indirect calls, Objective-C, SDK implementation and call graph reachability are not proven. Code-context/runtimes remain Unknown or Needs Review.
- Dependency identity is not SDK Manifest/signature proof. This alpha does not inspect a complete submitted archive or certify unlisted SDKs as safe.
- Generated plist overlap is held Unknown when values conflict. Full Xcode default values, conditional-specificity edge cases, exotic xcconfig modifiers, localization variations and unusual workspace/synchronized exceptions require additional coverage.
- StoreKit local files are reference data; they do not establish actual product registration or pricing. No legal decision on region-specific payments, trader identity, specialist app domains or contract validity is automated.
- Future SDK requirements are migration records, not current failures. This alpha's current toolchain table must be refreshed before the announced 2027 boundary; stale bundled knowledge is explicitly warned.
- Basic audit artifacts are AI-authored and unvalidated. They are not imported as CLI audit records; machine hashes/lines are never invented.

See [rule contracts](RULE_CONTRACTS.md), [input contract](INPUT_SUPPORT.md) and [Apple source records](APPLE_REFERENCES.md) for the intended complete MVP checks and limits. Add regression cases for demonstrated gaps and update this file only with actual verification evidence.
