# SmoothSubmit

**Catch App Store submission risks before they become rework.**

[紹介ページ（日本語）](https://hamaup.github.io/smoothsubmit/) · [Introduction (English)](https://hamaup.github.io/smoothsubmit/en/)

SmoothSubmit helps iOS developers using Claude Code, Codex or Cursor audit an app, understand the evidence, generate focused fix instructions, and check the result again.

**Audit → Fix → Verify**

```text
SmoothSubmit Audit — Skill基本監査

HIGH     1  Account deletion: initiation flow not confirmed
MEDIUM   3
UNKNOWN  4  Storefront / product type / review access / Kids Category

→ Evidence, proposed fixes, and verification steps
→ Ask only the missing facts that change the judgment
```

**v0.1.0-alpha.2 is an initial OSS alpha.** It includes a standalone Skill and an optional macOS CLI. See [release status](docs/RELEASE_STATUS.md) for tested behavior and remaining limits. There is no approval prediction or readiness score.

Three pinned public iOS projects were audited, and nine injected setting defects were detected and rechecked after repair. See [usefulness validation](docs/USEFULNESS_VALIDATION.md) for observed gaps, fixes, reproducible experiments and unmeasured user outcomes.

## Start with the Skill

You do not need the CLI, Node, an LLM API key or a SmoothSubmit account to use the Skill. Your existing coding agent supplies file-reading tools and the model.

Clone this repository, then copy **the whole** `skills/smoothsubmit/` folder into one of these project directories:

| Agent | Destination | Explicit invocation |
| --- | --- | --- |
| Codex | `.agents/skills/smoothsubmit/` | `$smoothsubmit` |
| Claude Code | `.claude/skills/smoothsubmit/` | `/smoothsubmit` |
| Cursor | `.cursor/skills/smoothsubmit/` | Select `/smoothsubmit` in Agent chat |

For example, for a new Codex installation:

```sh
git clone https://github.com/hamaup/smoothsubmit.git
mkdir -p /path/to/your-ios-project/.agents/skills
cp -R smoothsubmit/skills/smoothsubmit /path/to/your-ios-project/.agents/skills/
```

If a destination already exists, inspect its differences before replacing it. Keep references and assets with SKILL.md. Agent discovery and invocation depend on the host's version; cross-host live validation is listed separately in the release status.

In your app's coding-agent session, ask:

> SmoothSubmitで確認して

SmoothSubmit recognizes the project, collects readable information, completes the available audit, and returns risks and proposed fixes. It asks consequential missing questions **after** the initial report. No CLI installation or configuration initialization interrupts that first audit.

The normal request does not edit code or app settings, write App Store Connect, or submit the app. Ask “修正案を作って” for instructions, or “この指摘を修正して” to authorize the relevant source change. Audit artifacts can be saved under `.smoothsubmit/`; project configuration is not changed by default.

## Optional CLI

The CLI provides repeatable target/settings/structure checks and saved JSON/Markdown records. It requires **macOS 14+ and Node 22.18+**. Audits do not call an LLM, contact a backend, download SDKs, run xcodebuild, or send telemetry.

From the source checkout:

```sh
cd smoothsubmit
npm ci
npm run build
node "$PWD/dist/cli/index.js" --help
```

The npm registry package is **not published yet**. A prebuilt npm-format archive is available in [GitHub Releases](https://github.com/hamaup/smoothsubmit/releases). Install a downloaded archive with:

```sh
npm install -g /path/to/smoothsubmit-cli-0.1.0-alpha.2.tgz
```

Then from your app root:

```sh
smoothsubmit audit --project App.xcodeproj --target App --configuration Release
```

A config file is optional. Unknown business conditions remain Unknown. `init` is an explicit optional operation; an audit never creates app configuration or edits .gitignore.

| Command | Result |
| --- | --- |
| `audit` | Static checks, immutable audit/manifest, Markdown and JSON report |
| `report --audit FILE --assessment FILE` | Validate and merge the agent's separate AI assessment |
| `fix --audit FILE --check ID` | Generate a focused fix prompt; never edit application source |
| `verify --baseline FILE` | Re-audit the same target and compare conditions |
| `rules list` | List the 19 bundled rules and knowledge date |
| `doctor` | Read-only environment diagnostic |

`--format json` emits one JSON object to stdout; progress and save locations use stderr. `--fail-on high|medium|low` considers definite unsuppressed FAILs. `--require-complete` also flags Unknown, Needs Review, suppression and partial coverage. Exit codes: 0 completed, 1 invalid input/snapshot, 2 failure threshold, 3 incomplete, 4 execution/save error.

## What it checks

19 rule families cover permission keys and purpose strings, Privacy Manifest structure, Required Reason API, SDK declarations/signature verification gaps, account deletion, login alternatives, purchase restoration/entitlements/subscription display, review access, privacy policy, external payment context, minimum OS/toolchain declarations, personal-data sharing/AI consent, ATT, metadata and agreement preparation.

The CLI reads Xcode project structure, supported xcconfig, XML/binary plist, Swift API candidates, InfoPlist localization, Package.resolved and Podfile.lock. It separates code, declaration and runtime conditions. Indirect calls, macros, SDK binaries, backend behavior and actual App Store Connect state can remain Unknown. A token or button alone is never working-functionality proof.

| State | Meaning |
| --- | --- |
| PASS | The named condition was checked within the stated scope |
| FAIL | A supported deterministic condition is violated |
| NEEDS_REVIEW | Evidence suggests a risk or contextual verification is needed |
| UNKNOWN | Necessary evidence or applicability is missing |
| NOT_APPLICABLE | A reasoned applicability determination, with provenance |
| ERROR | A read/parser/process fault, separate from app compliance |

Basic Skill judgments are labeled `ai_review`. CLI observations are `static`; developer verification is `user_attestation`. External payments never receive an automatic FAIL. Static FAIL/ERROR cannot be cleared by an AI opinion. Final archive and device/backend checks remain separate.

## Try the demo

```sh
npm run demo
```

[ReviewDemo](examples/ReviewDemo/README.md) contains synthetic SwiftUI source and Xcode parser input with three definite omissions: camera purpose text, a UserDefaults reason declaration, and minimum OS. [ReviewDemoFixed](examples/ReviewDemoFixed/README.md) adds those settings and a local demo deletion flow. These examples are not submitted or device-tested apps.

The walkthrough in [examples/DEMO.md](examples/DEMO.md) shows audit, fix-prompt generation, and same-target verification. It keeps remaining semantic/runtime checks visible after settings improve.

## Apple knowledge and data

Bundled sources were checked on **2026-10-07**. Official URLs, knowledge date and limits accompany findings. Region/OS/product-dependent requirements are contextual; announced future requirements are separate from current failures. Check [Apple source records](docs/APPLE_REFERENCES.md) before relying on a stale release.

No project source is sent by the CLI. The Skill uses your coding tool's model and data-retention settings. Credentials and reviewer account secrets are not required; outputs omit code snippets by default. Excluded inputs and unverified scope remain visible. Keep audit artifacts out of public commits unless deliberately sharing redacted results.

## Development and contributing

```sh
npm ci
npm test
npm run check:docs
npm run check:skill
npm pack
node scripts/pack-smoke.mjs
```

Tests use synthetic projects to check targeting, privacy/permission failures, unsafe references, AI evidence validation, configuration provenance, immutable artifacts, meaningful exit codes and verification. CI tests Node 22.18 and 24 on macOS. The pack smoke test installs the archive, blocks Node networking during the audit, and confirms `fix` leaves source unchanged.

See [contributing](CONTRIBUTING.md), [product specification](SPEC.md), [technical design](DESIGN.md), [rule contracts](docs/RULE_CONTRACTS.md) and [release status](docs/RELEASE_STATUS.md). Report false positives with a minimal synthetic reproduction and rule/tool version, without app credentials or private source.

[Apache-2.0](LICENSE). SmoothSubmit is an independent project and is not affiliated with Apple.
