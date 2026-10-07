import { randomUUID } from "node:crypto";
import {
  safeText,
  summarize,
  coverage,
  hash,
  type Json,
  type Check,
  type Status,
} from "../contracts/index.js";
import { assessmentAllowed, RULES } from "../rules/index.js";
export function suppressionFor(
  c: Check,
  config: Json,
  now = new Date(),
): Json | null {
  const active = (config.suppressions || []).filter((s: Json) => {
    if (!RULES.some((r) => r.ruleId === s.ruleId))
      throw Error("CONFIG_INVALID unknown suppressed rule");
    let expiry: number;
    if (s.expiresAt.length === 10) {
      const local = new Intl.DateTimeFormat("en-CA", {
        timeZone: config.policy.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      if (s.expiresAt < local) return false;
      expiry = Infinity;
    } else expiry = Date.parse(s.expiresAt);
    if (
      Date.parse(s.createdAt) > now.getTime() ||
      Date.parse(s.createdAt) >= Date.parse(s.expiresAt)
    )
      throw Error("CONFIG_INVALID suppression dates");
    return (
      s.ruleId === c.ruleId &&
      hash(s.subjectKey) === hash(c.subject.subjectKey) &&
      expiry > now.getTime()
    );
  });
  if (active.length > 1)
    throw Error("CONFIG_INVALID duplicate active suppression");
  return active[0] || null;
}
export function mergeReport(
  audit: Json,
  auditHash: string,
  config: Json,
  assessment: Json | null = null,
  assessmentHash: string | null = null,
): Json {
  const reviews = new Map(
    (assessment?.reviews || []).map((x: Json) => [x.checkId, x]),
  );
  const rows = audit.checks.map((scanner: Check) => {
    const review: any = reviews.get(scanner.checkId),
      ai: Check | null = review?.result || null;
    let effective = { ...scanner },
      conflicts: string[] = [];
    if (ai) {
      if (["FAIL", "ERROR"].includes(scanner.status)) {
        conflicts.push("Static result retained; AI cannot clear it.");
      } else if (scanner.status === "PASS") {
        if (["NEEDS_REVIEW", "NOT_APPLICABLE"].includes(ai.status)) {
          effective = {
            ...ai,
            status: "NEEDS_REVIEW",
            severity: RULES.find((x) => x.ruleId === scanner.ruleId)!.severity,
          };
          conflicts.push("Scanner and AI conclusions differ.");
        }
      } else if (scanner.status === "NOT_APPLICABLE") {
        if (["PASS", "NEEDS_REVIEW"].includes(ai.status)) {
          effective = {
            ...ai,
            status: "NEEDS_REVIEW",
            severity: RULES.find((x) => x.ruleId === scanner.ruleId)!.severity,
          };
          conflicts.push("Applicability requires re-evaluation.");
        }
      } else if (
        ["PASS", "NOT_APPLICABLE"].includes(ai.status) &&
        review.outstandingVerificationSteps.length === 0
      )
        effective = { ...ai };
      else if (ai.status === "NEEDS_REVIEW") effective = { ...ai };
    }
    return {
      scannerResult: scanner,
      assessmentResult: ai,
      attestationResult: scanner.provenance === "user" ? scanner : null,
      effectiveResult: effective,
      conflicts,
      suppression: suppressionFor(effective, config),
    };
  });
  const checks = effectiveChecks({ checks: rows });
  return {
    schemaVersion: "1.0.0",
    reportId: randomUUID(),
    createdAt: new Date().toISOString(),
    auditId: audit.auditId,
    auditHash,
    assessmentRef: assessment
      ? {
          assessmentId: assessment.assessmentId,
          assessmentHash,
          execution: assessment.execution,
        }
      : null,
    mode: assessment ? "assisted" : "static",
    execution: assessment?.execution || null,
    policyContext: audit.policyContext,
    scope: audit.scope,
    checks: rows,
    coverage: coverage(
      checks,
      audit.coverage.partial,
      audit.coverage.excludedInputCount,
      audit.coverage.unreadInputCount,
    ),
    summary: summarize(checks),
    diagnostics: audit.diagnostics,
  };
}
export const effectiveChecks = (report: Json): Check[] =>
  report.checks.map((r: Json) => ({
    ...r.effectiveResult,
    suppression: r.suppression,
  }));
const esc = (s: any) =>
  safeText(String(s)).replace(/([\\`*_{}\[\]()<>#!|])/g, "\\$1");
export function render(report: Json, language = "ja"): string {
  const en = language === "en",
    s = report.summary;
  let text = `# SmoothSubmit Audit\n\n${en ? "Target" : "対象"}: ${esc(report.scope.targetName)} / ${esc(report.scope.configuration)}  \n${en ? "Scope" : "範囲"}: ${report.mode === "assisted" ? "CLI + AI review" : "CLI static"}  \n${en ? "Snapshot" : "監査記録"}: ${report.auditId}\n\n`;
  text += `| ${en ? "Risk" : "リスク"} | ${en ? "Count" : "件数"} |\n| --- | ---: |\n| HIGH | ${s.riskCounts.HIGH} |\n| MEDIUM | ${s.riskCounts.MEDIUM} |\n| LOW | ${s.riskCounts.LOW} |\n| UNKNOWN | ${s.unknownCount} |\n| ERROR | ${s.errorCount} |\n| ${en ? "Suppressed" : "抑制"} | ${s.suppressedCount} |\n\n`;
  text += en
    ? "Completed audit does not imply App Store approval. PASS applies only to the stated scope.\n\n"
    : "監査完了は審査通過を意味しません。PASSは記載した確認範囲に限ります。\n\n";
  text += en
    ? `Definite failures: ${s.failCounts.HIGH + s.failCounts.MEDIUM + s.failCounts.LOW}; contextual review candidates: ${s.needsReviewCount}. Risk counts include both.\n\n`
    : `確定した設定不備: ${s.failCounts.HIGH + s.failCounts.MEDIUM + s.failCounts.LOW}件 / 文脈の確認が必要な候補: ${s.needsReviewCount}件。リスク件数は両方を含みます。\n\n`;
  if (report.coverage.partial)
    text += en
      ? "Partial coverage: inspect diagnostics before relying on this audit.\n\n"
      : "確認範囲に制限があります。診断一覧と未確認の入力を確認してください。\n\n";
  const rank: Record<string, number> = {
    FAIL: 0,
    ERROR: 1,
    NEEDS_REVIEW: 2,
    UNKNOWN: 3,
    PASS: 4,
    NOT_APPLICABLE: 5,
  };
  const severityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const rows = [...report.checks].sort((a: Json, b: Json) => {
    const ac = a.effectiveResult,
      bc = b.effectiveResult;
    return (
      rank[ac.status] - rank[bc.status] ||
      (severityRank[ac.severity] ?? 3) - (severityRank[bc.severity] ?? 3) ||
      ac.checkId.localeCompare(bc.checkId)
    );
  });
  const actions = rows
    .filter(
      (row: Json) =>
        !row.suppression &&
        ["FAIL", "NEEDS_REVIEW"].includes(row.effectiveResult.status) &&
        row.effectiveResult.subject.subjectKey.component !== "scope",
    )
    .slice(0, 5);
  if (actions.length) {
    text += en ? "## Start here\n\n" : "## 先に確認・対応する項目\n\n";
    for (const row of actions) {
      const c = row.effectiveResult;
      const location = c.evidence.find((e: Json) => e.kind === "file");
      text += `- ${c.status} · ${c.severity} — ${esc(c.title)} (${esc(c.subject.subjectKey.permissionKey || c.subject.subjectKey.component)})${location ? " · " + esc(location.path) + (location.lineStart ? ":" + location.lineStart : "") : ""}: ${esc(c.remediation[0] || c.reason)}\n`;
    }
    text += "\n";
  }
  for (const row of rows) {
    const c: Check = row.effectiveResult;
    if (c.subject.subjectKey.component === "scope") continue;
    text += `## ${c.status}${c.severity ? " · " + c.severity : ""} — ${esc(c.title)}\n\n${esc(c.ruleId)} / ${esc(c.subject.subjectKey.component)}  \n${esc(c.verificationLevel)} · ${c.checkId}\n\n${esc(c.reason)}\n\n`;
    for (const e of c.evidence) {
      if (e.kind === "file")
        text += `- ${esc(e.path)}${e.lineStart ? ":" + e.lineStart : e.keyPath ? " " + esc(e.keyPath) : ""}: ${esc(e.observation)}\n`;
      else text += `- ${esc(e.observation)}\n`;
    }
    if (c.remediation.length)
      text += "\n" + c.remediation.map((x) => `- ${esc(x)}`).join("\n") + "\n";
    if (c.limitations.length)
      text += "\n" + c.limitations.map((x) => `- ${esc(x)}`).join("\n") + "\n";
    if (row.suppression)
      text += `\n${en ? "Suppressed" : "抑制中"}: ${esc(row.suppression.reason)} / ${esc(row.suppression.expiresAt)}\n`;
    if (row.conflicts.length)
      text += "\n" + row.conflicts.map((x: string) => esc(x)).join("\n") + "\n";
    for (const source of c.sources)
      text += `\n[${esc(source.title)}](${source.url}) · ${source.verifiedAt}\n`;
    text += "\n";
  }
  if (report.diagnostics.length)
    text +=
      "## Diagnostics\n\n" +
      report.diagnostics
        .map(
          (d: Json) =>
            `- ${esc(d.code)}: ${esc(d.path || "")} ${esc(d.message)}`,
        )
        .join("\n") +
      "\n";
  return text;
}
export function compare(
  oldAudit: Json,
  newAudit: Json,
  oldReport: Json,
  newReport: Json,
  oldHash: string,
  newHash: string,
): Json {
  const key = (s: Json) => ({
    project: s.project,
    targetId: s.targetId,
    configuration: s.configuration,
    sdk: s.sdk,
    arch: s.arch,
  });
  const scopeSame = hash(key(oldAudit.scope)) === hash(key(newAudit.scope)),
    versionSame = oldAudit.rulepackVersion === newAudit.rulepackVersion;
  const policyKey = (p: Json) => ({
    storefronts: p.storefronts,
    deviceFamilies: p.deviceFamilies,
    distributionChannel: p.distributionChannel,
    appliedRequirements: p.appliedRequirements,
    timeZone: p.timeZone,
  });
  const policySame =
    hash(policyKey(oldAudit.policyContext)) ===
    hash(policyKey(newAudit.policyContext));
  const previous = new Map<string, Json>(
      oldReport.checks.map((r: Json) => [r.effectiveResult.checkId, r]),
    ),
    current = new Map<string, Json>(
      newReport.checks.map((r: Json) => [r.effectiveResult.checkId, r]),
    );
  const items = [...new Set([...previous.keys(), ...current.keys()])]
    .sort()
    .map((id) => {
      const p = previous.get(id),
        n = current.get(id),
        before = p?.effectiveResult || null,
        after = n?.effectiveResult || null;
      let classification = "UNCHANGED",
        direction = "neutral",
        reason = "Same condition.";
      // A limited unrelated input does not invalidate a re-read structural
      // setting. Keep global partial coverage and all runtime checks visible.
      const scopedStaticProof =
        !!after &&
        after.verificationLevel === "static" &&
        after.provenance === "scanner" &&
        [
          "permission_key",
          "manifest_structure",
          "reason_declaration",
          "deployment_setting",
        ].includes(after.subject.subjectKey.component) &&
        newAudit.diagnostics.every((d: Json) =>
          [
            "LOCAL_PACKAGE_SCOPE",
            "PREPROCESSED_PLIST",
            "UNRESOLVED_BUILD_SETTING",
            "EXTERNAL_REFERENCE",
          ].includes(d.code),
        ) &&
        !newAudit.snapshot.files.some(
          (f: Json) => f.membership === "excluded" || !f.sha256,
        ) &&
        (before?.evidence || [])
          .filter((e: Json) => e.kind === "file")
          .every((e: Json) =>
            newAudit.snapshot.files.some(
              (f: Json) =>
                f.path === e.path && f.sha256 && f.membership !== "excluded",
            ),
          );
      if (
        !scopeSame ||
        !versionSame ||
        (!policySame &&
          !["scope", "manifest_structure"].includes(
            after?.subject.subjectKey.component || "",
          )) ||
        oldReport.mode !== newReport.mode
      ) {
        classification = "NOT_COMPARABLE";
        direction = "unknown";
        reason = "Scope, policy, rulepack, or verification method changed.";
      } else if (!before) {
        classification = "NEW";
        direction = "unknown";
        reason = "New check; only FAIL/NEEDS_REVIEW counts as a new problem.";
      } else if (
        !after ||
        (["UNKNOWN", "ERROR"].includes(after.status) &&
          ["FAIL", "NEEDS_REVIEW"].includes(before.status)) ||
        (newAudit.coverage.partial &&
          ["FAIL", "NEEDS_REVIEW"].includes(before.status) &&
          after.status === "PASS" &&
          !scopedStaticProof) ||
        (before.verificationLevel === "ai_review" &&
          after.verificationLevel !== "ai_review")
      ) {
        classification = "NEEDS_RECHECK";
        direction = "unknown";
        reason = "Missing evidence or required verification was not repeated.";
      } else if (
        ["FAIL", "NEEDS_REVIEW"].includes(before.status) &&
        after.status === "PASS"
      ) {
        classification = "RESOLVED";
        direction = "improved";
        reason = newAudit.coverage.partial
          ? "Same structural setting rechecked and now PASS; unrelated input/runtime limitations remain."
          : "Same required condition rechecked and now PASS.";
      } else if (
        before.status !== after.status ||
        before.severity !== after.severity ||
        before.verificationLevel !== after.verificationLevel ||
        hash(p?.suppression ?? null) !== hash(n?.suppression ?? null)
      ) {
        classification = "CHANGED";
        direction =
          ["UNKNOWN", "ERROR"].includes(before.status) ||
          ["UNKNOWN", "ERROR"].includes(after.status)
            ? "unknown"
            : ["FAIL", "NEEDS_REVIEW"].includes(after.status) &&
                !["FAIL", "NEEDS_REVIEW"].includes(before.status)
              ? "worsened"
              : "neutral";
        reason =
          "Condition/status changed; NOT_APPLICABLE is not a proven fix.";
      }
      return {
        checkId: id,
        previousResult: before,
        currentResult: after,
        classification,
        direction,
        reason,
      };
    });
  const summary: Json = {
    NOT_COMPARABLE: 0,
    NEEDS_RECHECK: 0,
    RESOLVED: 0,
    CHANGED: 0,
    UNCHANGED: 0,
    NEW: 0,
    newProblemCount: 0,
    changedProblemCount: 0,
  };
  items.forEach((i) => {
    summary[i.classification]++;
    if (["FAIL", "NEEDS_REVIEW"].includes(i.currentResult?.status)) {
      if (i.classification === "NEW") summary.newProblemCount++;
      if (i.classification === "CHANGED") summary.changedProblemCount++;
    }
  });
  const ref = (a: Json, h: string, r: Json) => ({
    auditId: a.auditId,
    auditHash: h,
    assessmentId: r.assessmentRef?.assessmentId || null,
    assessmentHash: r.assessmentRef?.assessmentHash || null,
  });
  return {
    schemaVersion: "1.0.0",
    verificationId: randomUUID(),
    createdAt: new Date().toISOString(),
    mode: newReport.mode,
    baselineRef: ref(oldAudit, oldHash, oldReport),
    currentRef: ref(newAudit, newHash, newReport),
    scopeComparison: scopeSame ? "same" : "different",
    versionComparison: versionSame ? "same" : "different",
    policyComparison: policySame ? "same" : "different",
    items,
    summary,
  };
}
export function fixPrompt(audit: Json, c: Check): string {
  return `# SmoothSubmit Fix\n\nAudit: ${audit.auditId}\nCheck: ${c.checkId}\nRule: ${c.ruleId}\nSnapshot: ${audit.snapshot.semanticSnapshotHash}\nTarget: ${esc(audit.scope.targetName)} / ${esc(audit.scope.configuration)}\n\n${esc(c.title)}\n\n${esc(c.reason)}\n\nEvidence:\n${c.evidence.map((e) => `- ${e.kind === "file" ? esc(e.path) + (e.lineStart ? ":" + e.lineStart : "") : esc(e.kind)}: ${esc(e.observation)}`).join("\n")}\n\nRequired behavior:\n${c.remediation.map((x) => "- " + esc(x)).join("\n")}\n\nConstraints:\n- Change only the requested check and preserve existing work.\n- Do not add credentials, submit an app, accept agreements, or perform actual purchases/deletions.\n- Do not treat a button or SDK identifier alone as completed functionality.\n- Explain backend and runtime verification that remains outside the local code.\n\nVerification:\n${c.verificationSteps.map((x) => "- " + esc(x)).join("\n")}\n- Run appropriate focused tests, then a fresh audit on the same target.\n- Keep prior artifacts unchanged.\n`;
}
