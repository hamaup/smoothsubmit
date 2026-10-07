import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
export type Json = Record<string, any>;
export type Status =
  "PASS" | "FAIL" | "NEEDS_REVIEW" | "NOT_APPLICABLE" | "UNKNOWN" | "ERROR";
export type Severity = "HIGH" | "MEDIUM" | "LOW";
export interface Evidence {
  evidenceId: string;
  kind: "file" | "config" | "search";
  observation: string;
  [key: string]: any;
}
export interface Check {
  checkId: string;
  ruleId: string;
  ruleVersion: string;
  subject: Json;
  status: Status;
  severity: Severity | null;
  confidence: Severity;
  confidenceReason: string;
  title: string;
  reason: string;
  evidence: Evidence[];
  sources: Json[];
  provenance: "scanner" | "ai" | "user";
  verificationLevel: "static" | "ai_review" | "user_attestation";
  limitations: string[];
  remediation: string[];
  verificationSteps: string[];
}
export interface Diagnostic {
  code: string;
  level: "warning" | "error";
  stage: string;
  path: string | null;
  message: string;
  affectedRuleIds: string[];
  affectedCheckIds: string[];
  remedy: string;
}
export const VERSION = "0.1.0-alpha.1";
export const KNOWLEDGE = "2026-10-07";
export function sha(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function normalize(x: any): any {
  if (Array.isArray(x)) return x.map(normalize);
  if (x && typeof x === "object")
    return Object.fromEntries(
      Object.keys(x)
        .sort()
        .map((k) => [k, normalize(x[k])]),
    );
  return typeof x === "string" ? x.normalize("NFC") : x;
}
export function canonical(x: any): string {
  return JSON.stringify(normalize(x));
}
export const hash = (x: any) => sha(canonical(x));
export function safeText(x: string, limit = 8000): string {
  return x
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, "")
    .replace(
      /(?:sk-[\w-]{16,}|gh[pousr]_[\w]{20,}|AKIA[\w]{16}|Bearer\s+[\w.\-]{12,})/gi,
      "[REDACTED]",
    )
    .slice(0, limit);
}
export function safePath(s: string): boolean {
  return (
    !!s &&
    !s.startsWith("/") &&
    !s.split(/[\\/]/).includes("..") &&
    !/[\x00-\x1f\\]/.test(s)
  );
}
const ajv = new (Ajv2020 as any)({ allErrors: true, strict: true });
(addFormats as any)(ajv);
const validators = new Map<string, any>();
export function validate(kind: string, value: any): void {
  if (
    /sk-[\w-]{16,}|gh[pousr]_[\w]{20,}|AKIA[\w]{16}|Bearer\s+[\w.\-]{12,}/i.test(
      JSON.stringify(value),
    )
  )
    throw Error("CONFIG_INVALID secret-like value in document");
  let v = validators.get(kind);
  if (!v) {
    const s = JSON.parse(
      readFileSync(
        new URL(`../../schemas/${kind}.schema.json`, import.meta.url),
        "utf8",
      ),
    );
    v = ajv.compile(s);
    validators.set(kind, v);
  }
  if (!v(value))
    throw new Error(
      `CONFIG_INVALID ${kind}: ${ajv.errorsText(v.errors, { separator: "; " })}`,
    );
}
export function normalizeConfig(input: Json = {}): Json {
  validate("config", { schemaVersion: "1.0.0", ...input });
  const f = {
    accountCreation: "unknown",
    loginRequired: "unknown",
    authProviders: "unknown",
    productTypes: "unknown",
    permissions: "unknown",
    thirdPartyDataSharing: "unknown",
    thirdPartyAI: "unknown",
    tracking: "unknown",
    paidApp: "unknown",
    socialNetworking: "unknown",
    kidsCategory: "unknown",
    ...input.features,
  };
  const policy = {
    storefronts: "unknown",
    deviceFamilies: "unknown",
    distributionChannel: "app_store",
    plannedSubmissionDate: null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    ...input.policy,
  };
  try {
    new Intl.DateTimeFormat("en", { timeZone: policy.timeZone });
  } catch {
    throw new Error("CONFIG_INVALID policy.timeZone");
  }
  const reviewAccess = {
    method: "unknown",
    prepared: "unknown",
    note: null,
    ...input.reviewAccess,
  };
  if (
    reviewAccess.prepared === true &&
    ["none", "unknown"].includes(reviewAccess.method)
  )
    throw new Error(
      "CONFIG_INVALID reviewAccess.method conflicts with prepared",
    );
  if (input.project && input.workspace)
    throw new Error("CONFIG_INVALID choose project or workspace");
  for (const p of [
    input.project,
    input.workspace,
    ...(input.storekitFiles || []),
  ].filter(Boolean))
    if (!safePath(p)) throw new Error("CONFIG_INVALID unsafe relative path");
  for (const e of input.exclude || [])
    if (
      !safePath(e.pathPattern) ||
      ["*", "**", "**/*"].includes(e.pathPattern) ||
      e.pathPattern.startsWith("!")
    )
      throw new Error("CONFIG_INVALID exclude");
  for (const k of ["authProviders", "productTypes", "permissions"])
    if (Array.isArray(f[k])) {
      if (new Set(f[k]).size !== f[k].length)
        throw Error("CONFIG_INVALID duplicate feature declaration");
      f[k] = [...f[k]].sort();
    }
  for (const k of ["storefronts", "deviceFamilies"])
    if (Array.isArray(policy[k])) policy[k] = [...policy[k]].sort();
  const raw = JSON.stringify(input);
  if (
    /sk-[\w-]{16,}|gh[pousr]_[\w]{20,}|AKIA[\w]{16}|Bearer\s+[\w.\-]{12,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|"(?:password|token|secret|apiKey)"\s*:/i.test(
      raw,
    )
  )
    throw Error(
      "CONFIG_INVALID credentials or personal email must not be stored",
    );
  const c: Json = {
    schemaVersion: "1.0.0",
    project: null,
    workspace: null,
    target: null,
    targetId: null,
    configuration: "Release",
    sdk: "iphoneos",
    arch: "unknown",
    language: "ja",
    authProviderDetails: null,
    privacyPolicyURL: null,
    reportedBuild: null,
    reviewNotesPrepared: "unknown",
    preparationDetails: [],
    metadataDeclarations: null,
    storekitFiles: [],
    manualVerifications: [],
    exclude: [],
    suppressions: [],
    ...input,
    features: f,
    policy,
    reviewAccess,
    submissionPreparation: {
      ageRating: "unknown",
      socialNetworking: "unknown",
      appPrivacy: "unknown",
      dpla: "unknown",
      paidAppsAgreement: "unknown",
      traderStatus: "unknown",
      traderInformation: "unknown",
      ...input.submissionPreparation,
    },
  };
  const now = Date.now();
  for (const m of c.manualVerifications)
    if (Date.parse(m.observedAt) > now)
      throw new Error("CONFIG_INVALID future manual verification");
  return c;
}
export function semanticConfig(c: Json): Json {
  const { manualVerifications, suppressions, language, ...rest } = c;
  return rest;
}
export function scopeKey(scope: Json): Json {
  const { project, targetId, configuration, sdk, arch } = scope;
  return { project, targetId, configuration, sdk, arch };
}
export const checkId = (ruleId: string, scope: Json, subjectKey: Json) =>
  hash({ ruleId, scopeKey: scopeKey(scope), subjectKey });
export const evidence = (
  kind: Evidence["kind"],
  fields: Json,
  observation: string,
): Evidence => ({
  evidenceId: hash({ kind, ...fields }),
  kind,
  ...fields,
  observation: safeText(observation),
});
export function summarize(checks: Check[]): Json {
  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 },
    failCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 },
    statusCounts: Json = {
      PASS: 0,
      FAIL: 0,
      NEEDS_REVIEW: 0,
      NOT_APPLICABLE: 0,
      UNKNOWN: 0,
      ERROR: 0,
    };
  let suppressedCount = 0;
  for (const c of checks) {
    statusCounts[c.status]++;
    if ((c as any).suppression) suppressedCount++;
    if (c.status === "FAIL") failCounts[c.severity!]++;
    if (["FAIL", "NEEDS_REVIEW"].includes(c.status) && !(c as any).suppression)
      riskCounts[c.severity!]++;
  }
  return {
    riskCounts,
    failCounts,
    needsReviewCount: statusCounts.NEEDS_REVIEW,
    unknownCount: statusCounts.UNKNOWN,
    errorCount: statusCounts.ERROR,
    suppressedCount,
  };
}
export function coverage(
  checks: Check[],
  partial: boolean,
  excluded = 0,
  unread = 0,
): Json {
  const statusCounts: Json = {
    PASS: 0,
    FAIL: 0,
    NEEDS_REVIEW: 0,
    NOT_APPLICABLE: 0,
    UNKNOWN: 0,
    ERROR: 0,
  };
  checks.forEach((c) => statusCounts[c.status]++);
  const executedCheckCount = checks.filter(
    (c) => !["UNKNOWN", "ERROR"].includes(c.status),
  ).length;
  return {
    totalChecks: checks.length,
    statusCounts,
    executedCheckCount,
    executedCheckRatio: checks.length
      ? executedCheckCount / checks.length
      : null,
    partial,
    excludedInputCount: excluded,
    unreadInputCount: unread,
  };
}
export function exitCode(
  checks: Check[],
  partial: boolean,
  opts: Json,
): number {
  if (checks.some((c) => c.status === "ERROR")) return 4;
  const grades: Severity[] =
    opts.failOn === "high"
      ? ["HIGH"]
      : opts.failOn === "medium"
        ? ["HIGH", "MEDIUM"]
        : ["HIGH", "MEDIUM", "LOW"];
  if (
    opts.failOn &&
    checks.some(
      (c) =>
        c.status === "FAIL" &&
        grades.includes(c.severity!) &&
        !(c as any).suppression,
    )
  )
    return 2;
  if (
    opts.requireComplete &&
    (partial ||
      checks.some(
        (c) =>
          ["UNKNOWN", "NEEDS_REVIEW"].includes(c.status) ||
          (c as any).suppression,
      ))
  )
    return 3;
  return 0;
}
