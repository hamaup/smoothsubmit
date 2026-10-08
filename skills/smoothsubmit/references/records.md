# Record boundaries

## Basic audit

Use assets/basic-audit.template.json as the starting shape; replace the null record ID/time with actual host UUID/time if obtainable. Without them, return the audit in chat rather than fabricate a machine-readable record.

Basic mode has provenance=ai and verificationLevel=ai_review. Allowed judgments: PASS, NEEDS_REVIEW, NOT_APPLICABLE, UNKNOWN. A host reading fault can be ERROR. For a clear missing setting report NEEDS_REVIEW with the rule's fixed severity from rules.md and evidence. Do not forge a scanner FAIL.

Create one condition per localCheckId and candidateKey. Check fields: localCheckId, checkId (correct hash or null), candidateKey, ruleId, ruleVersion, subjectKey, status, severity (only NEEDS_REVIEW), confidence, confidenceReason, title, reason, evidence, sources, provenance, verificationLevel, limitations, remediation, verificationSteps. Evidence contains path, observation, observed lines/keyPath or null, and hash or null. Scope candidates must not be merged.

Count unsuppressed NEEDS_REVIEW by HIGH/MEDIUM/LOW; count Unknown/Error separately. Internal scope checks are not user-visible functional PASS. Known input exclusions and incomplete reads are visible limitations. No CLI alone is not partial execution.

unknownQuestions contain questionId, prompt, reason and affectedLocalCheckIds. Store answers as attestations (questionId, nonsecret answer, observedAt or null, affectedLocalCheckIds), never as model-observed facts. additionalCliChecks contains count or null and items (ruleId, subjectKey, methodId, reason) only for missing structural/target/settings checks the CLI actually provides. Deduplicate the subject+method combinations.

All saved basic artifacts remain unvalidated. Prior records are immutable. A fresh record replaces neither old audit nor app configuration.

## CLI assessments

The template references an immutable auditId, auditHash and inputManifestHash. For each reviewed existing check, preserve identity, rule, target and subject. Result provenance=ai, verificationLevel=ai_review, with PASS/NEEDS_REVIEW/NOT_APPLICABLE/UNKNOWN only. Record execution.tool and the actual model or null.

Do not add checks or remove planned checks. Do not change scope/unresolved, permission_key, manifest_structure, reason_declaration, deployment_setting, sdk_signature, or manual-only/preparation conditions. Definite static FAIL/ERROR is retained. Add comments without pretending a structural result was cleared.

Copy approved SourceReference records from the audit. File evidence must name an input-manifest file, exact hash and existing line/key path. Reuse evidence IDs only for the same observation target/position; new evidence IDs use canonical sorted JSON and SHA-256, excluding observation text and evidenceId itself. If host tools cannot compute required hashes/locations, retain the static report and present supplemental AI analysis as basic/unvalidated instead of submitting forged assessment JSON.

reviews[].reviewedEvidenceIds must refer to the original check's evidence. Mark outstandingVerificationSteps; do not propose PASS/NOT_APPLICABLE while required evidence or verification is missing. An AI PASS covers only that code/context condition, never the separate runtime subject.

Session answers can be passed as a full validated config via `audit --config -`; do not modify smoothsubmit.config.json by default. The full config must include existing user settings and new answers, without secrets. Changes in input/semantic assumptions require a new audit.
