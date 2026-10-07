# Audit workflow

## First pass, before questions

Recognize .xcodeproj/.xcworkspace and app targets. If selection is ambiguous, inspect candidates separately and leave target-dependent conclusions Unknown. Do not mix one target's source with another target's Manifest. Release is the CLI default, not evidence of the user's chosen configuration.

Inspect files with host read/search tools. Existence is weaker evidence than target inclusion. For generated Info.plist inspect GENERATE_INFOPLIST_FILE and known INFOPLIST_KEY_* build settings; unknown inheritance, conditional settings, preprocessors or scripts mean the final value is unverified. Use source-relative paths with observed line numbers/key paths; never invent locations for missing code.

Review these independent conditions:

- Permission keys and meaningful purpose text for camera, microphone, location, photos and contacts; system pickers and add-only photos may differ.
- Privacy Manifest structure, required-reason API declarations, actual declared purposes, SDK-specific Manifests and unverified binary signatures.
- Account creation (including automatic accounts), in-app deletion initiation and backend completion separately.
- Guideline 4.8 main-account authentication, exceptions and equivalent alternatives; third-party SDK presence alone does not mandate Sign in with Apple.
- StoreKit 1/2 restoration, entitlement updates, subscription presentation; consumables are not restoration targets. A missing AppStore.sync token alone is not a failure.
- Reviewer full access, Review Notes, privacy policy, metadata and agreement preparation versus actual App Store Connect/account state.
- Third-party personal data/AI sharing, disclosure, explicit consent and send order. Developing with AI does not imply the app sends personal data to an AI service.
- Tracking definition and permission gating. Analytics alone is not tracking.
- External purchase candidates, product type, storefront, device, OS, distribution, agreement and entitlement. Always contextual review; never an automatic payment FAIL.
- Deployment Target versus SDK version, prepared toolchain declaration versus the actual submitted archive.

## Optional installed CLI

From the app root, use the installed binary only:

```sh
smoothsubmit --version
smoothsubmit doctor
smoothsubmit audit --project App.xcodeproj --target App --configuration Release --format json
```

Replace arguments with observed/user-selected scope. Omit explicit target only when unambiguous. Never use npx/package installation as a default audit step. Read stderr for saved paths; stdout in JSON mode is one audit object. Exit 2/3 may mean findings/incomplete verification, not a crash. Do not delete the saved audit because it contains risks.

Read the emitted assessment-template.json; copy it to a new assessment ID. Read only needed input files and bundled rules. For detailed records see records.md. Generate a separate assessment.json; never edit the static audit. Keep definite FAIL/ERROR and structural checks intact. An AI concern is NEEDS_REVIEW, not an invented deterministic FAIL. Merge with:

```sh
smoothsubmit report --audit <saved-audit.json> --assessment <assessment.json> --format json
```

If citations/snapshot are invalid, retain the static result and rerun affected work. Do not weaken the validator to accept the AI answer.

## Report, then questions

Sort risks by severity. Explain observed evidence, why the condition matters, specific proposed change, remaining limits and how to verify. Include all Unknowns. Only afterward group questions that can change judgment: selected target/configuration, storefronts, digital/physical purchases, reviewer access prepared, Kids Category, or other genuinely missing applicability.

Do not ask for credentials. Unanswered questions stay in the report. Noninteractive requests receive the question list without blocking. Answered facts are user attestations, not code observations.
