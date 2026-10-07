import test from "node:test";
import assert from "node:assert/strict";
import {
  writeFile,
  readFile,
  symlink,
  mkdir,
  cp,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { fixture, audit, patch, condition } from "./helpers.mjs";
import { parseOpenStep } from "../dist/scanner/openstep.js";
import { lexSwift } from "../dist/scanner/swift.js";
import { resolveSettings } from "../dist/scanner/settings.js";
import {
  normalizeConfig,
  hash,
  scopeKey,
  validate,
  exitCode,
} from "../dist/contracts/index.js";
import {
  createReport,
  createFix,
  verifyProject,
  loadAudit,
  loadAssessment,
  saveNew,
} from "../dist/core/index.js";
import { compare, mergeReport, effectiveChecks } from "../dist/report/index.js";
import { RULES } from "../dist/rules/index.js";

test("OpenStep parses nesting/escaped names and rejects duplicate keys and cycles of syntax", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        parseOpenStep('//x\n{ k=(a,"b c",); z={ q="a\\\"b"; }; }'),
      ),
    ),
    { k: ["a", "b c"], z: { q: 'a"b' } },
  );
  assert.throws(() => parseOpenStep("{ a=1; a=2; }"), /Duplicate/);
  assert.throws(() => parseOpenStep("{ a=(a b); }"));
});
test("Swift lexer ignores comments, nested comments, raw/multiline literals and inactive branches", () => {
  const source =
    '// UserDefaults\n/* outer /* UserDefaults */ inner */\nlet s = #"UserDefaults"#\nlet m = """\nUserDefaults\n"""\n#if os(macOS)\nUserDefaults.standard\n#else\nAVCaptureDevice.requestAccess(for: .video)\n#endif';
  const tokens = lexSwift(source);
  assert.equal(
    tokens.filter(
      (x) => x.text === "UserDefaults" && x.condition !== "inactive",
    ).length,
    0,
  );
  assert.equal(
    tokens.find((x) => x.text === "AVCaptureDevice").condition,
    "active",
  );
  assert.throws(() => lexSwift("/* unterminated"));
});
test("Unknown conditional compilation cannot become certain API use", () => {
  assert.equal(
    lexSwift("#if CUSTOM\nUserDefaults.standard\n#endif")[0].condition,
    "unknown",
  );
});
test("xcconfig inheritance/conditions/includes/target precedence resolve without host env", async () => {
  const files = {
    "base.xcconfig":
      'X = first\nFLAGS = alpha\n#include "next.xcconfig"\nOS[sdk=iphoneos*] = 14.0\nARCH[arch=arm64] = arm',
    "next.xcconfig": "X = second\nFLAGS = $(inherited) beta",
  };
  const s = await resolveSettings(
    ["base.xcconfig", { X: "last", COPY: "$(X)", HOST: "$(UNDECLARED)" }],
    {},
    async (p) => files[p] ?? null,
    { sdk: "iphoneos", arch: "unknown", config: "Release" },
  );
  assert.equal(s.values.X, "last");
  assert.equal(s.values.COPY, "last");
  assert.equal(s.values.OS, "14.0");
  assert.equal(s.values.FLAGS, "alpha beta");
  assert.equal(s.values.ARCH, null);
  assert.equal(s.values.HOST, null);
});
test("xcconfig includes cannot recur indefinitely", async () => {
  const s = await resolveSettings(
    ["a"],
    {},
    async () => '#include "a"\nX = 1',
    {},
  );
  assert.equal(s.values.X, null);
  assert(s.diagnostics.some((x) => /cycle/.test(x)));
});
test("config rejects typos, external paths, empty regions and unsafe access declarations", () => {
  for (const c of [
    { featurs: {} },
    { project: "../bad.xcodeproj" },
    { policy: { storefronts: [] } },
    { reviewAccess: { method: "unknown", prepared: true } },
    { features: { authProviders: ["made_up"] } },
  ])
    assert.throws(() => normalizeConfig(c));
  assert.equal(normalizeConfig({}).features.accountCreation, "unknown");
  assert.equal(normalizeConfig({}).policy.storefronts, "unknown");
});
test("real CLI audit catches three independent missing settings and keeps 19 rule scopes", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  assert.equal(new Set(r.audit.checks.map((c) => c.ruleId)).size, 19);
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "FAIL");
  assert.equal(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "FAIL",
  );
  assert.equal(
    condition(r, "ARG-BUILD-001", "deployment_setting").status,
    "FAIL",
  );
  assert.equal(
    condition(r, "ARG-AUTH-001", "deletion_code").status,
    "NEEDS_REVIEW",
  );
  assert.equal(
    condition(r, "ARG-AUTH-001", "deletion_runtime").status,
    "UNKNOWN",
  );
  validate("audit", r.audit);
  validate("report", r.report);
  await loadAudit(join(r.directory, "audit.json"));
});
test("fixed sample changes static conditions but code never proves runtime completion", async (t) => {
  const r = await audit(await fixture(t, true));
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "PASS");
  assert.equal(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "PASS",
  );
  assert.equal(
    condition(r, "ARG-BUILD-001", "deployment_setting").status,
    "PASS",
  );
  assert.equal(
    condition(r, "ARG-AUTH-001", "deletion_runtime").status,
    "UNKNOWN",
  );
});
test("same semantic input has stable check IDs; timestamps do not affect identity", async (t) => {
  const root = await fixture(t),
    a = await audit(root),
    b = await audit(root);
  assert.equal(
    a.audit.snapshot.semanticSnapshotHash,
    b.audit.snapshot.semanticSnapshotHash,
  );
  assert.deepEqual(a.audit.checks, b.audit.checks);
  assert.notEqual(a.audit.auditId, b.audit.auditId);
});
test("target ambiguity returns candidates without mixing apps", async (t) => {
  const root = await fixture(t);
  await cp(join(root, "ReviewDemo.xcodeproj"), join(root, "Other.xcodeproj"), {
    recursive: true,
  });
  const c = normalizeConfig({});
  await assert.rejects(() => auditProjectLike(root, c), /AMBIGUOUS_TARGET/);
});
async function auditProjectLike(root, c) {
  const { auditProject } = await import("../dist/core/index.js");
  return auditProject(root, c, {
    kind: "default",
    path: null,
    sourceFileHash: null,
  });
}
test("excluded source lowers coverage instead of falsely clearing risk", async (t) => {
  const root = await fixture(t),
    r = await audit(root, {
      exclude: [{ pathPattern: "App/*.swift", reason: "fixture exclusion" }],
    });
  assert.equal(r.audit.coverage.partial, true);
  assert.equal(
    exitCode(effectiveChecks(r.report), true, { requireComplete: true }),
    3,
  );
});
test("external symlink is not read and makes the audit partial", async (t) => {
  const root = await fixture(t);
  await symlink("/etc/passwd", join(root, "External.swift"));
  const r = await audit(root);
  assert(r.audit.diagnostics.some((d) => d.code === "EXTERNAL_REFERENCE"));
  assert(r.audit.coverage.partial);
  assert(!JSON.stringify(r.audit).includes("root:*"));
});
test("broken manifest is structural FAIL, not a fabricated AI result", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "App/PrivacyInfo.xcprivacy"), "not a plist");
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "FAIL",
  );
});
test("unknown Swift condition prevents definite permission FAIL", async (t) => {
  const root = await fixture(t);
  await patch(
    root,
    "App/App.swift",
    (s) => "#if UNKNOWN_FLAG\n" + s + "\n#endif",
  );
  const r = await audit(root);
  assert.notEqual(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "FAIL",
  );
});
test("generated plist supports known keys and defers conflicting generated/manual values", async (t) => {
  const root = await fixture(t, true);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "GENERATE_INFOPLIST_FILE = NO",
      'GENERATE_INFOPLIST_FILE = YES; INFOPLIST_KEY_NSCameraUsageDescription = "different"',
    ),
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "UNKNOWN",
  );
});
test("AI cannot override a structural FAIL; forged evidence rejected", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    p = join(r.directory, "assessment-template.json"),
    a = JSON.parse(await readFile(p, "utf8")),
    c = condition(r, "ARG-PERM-001", "permission_key");
  a.reviews = [
    {
      checkId: c.checkId,
      result: {
        ...c,
        status: "PASS",
        severity: null,
        provenance: "ai",
        verificationLevel: "ai_review",
      },
      reviewedEvidenceIds: [],
      outstandingVerificationSteps: [],
    },
  ];
  const ap = join(root, "assessment.json");
  await writeFile(ap, JSON.stringify(a));
  await assert.rejects(
    () => createReport(join(r.directory, "audit.json"), root, ap),
    /prohibited/,
  );
  const d = condition(r, "ARG-AUTH-001", "deletion_code");
  a.reviews = [
    {
      checkId: d.checkId,
      result: {
        ...d,
        status: "NEEDS_REVIEW",
        provenance: "ai",
        verificationLevel: "ai_review",
        evidence: [{ ...d.evidence[0], path: "missing.swift" }],
      },
      reviewedEvidenceIds: [],
      outstandingVerificationSteps: [],
    },
  ];
  await writeFile(ap, JSON.stringify(a));
  await assert.rejects(
    () => createReport(join(r.directory, "audit.json"), root, ap),
    /file hash/,
  );
});
test("valid AI assessment preserves base result and separates runtime Unknown", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    a = JSON.parse(
      await readFile(join(r.directory, "assessment-template.json"), "utf8"),
    ),
    d = condition(r, "ARG-AUTH-001", "deletion_code");
  a.reviews = [
    {
      checkId: d.checkId,
      result: {
        ...d,
        provenance: "ai",
        verificationLevel: "ai_review",
        reason: "Reviewed creation path; deletion remains unconfirmed.",
      },
      reviewedEvidenceIds: d.evidence.map((e) => e.evidenceId),
      outstandingVerificationSteps: ["Confirm deletion UI"],
    },
  ];
  const ap = join(root, "assessment.json");
  await writeFile(ap, JSON.stringify(a));
  const out = await createReport(join(r.directory, "audit.json"), root, ap);
  assert.equal(out.report.mode, "assisted");
  assert.equal(
    out.report.checks.find((x) => x.scannerResult.checkId === d.checkId)
      .scannerResult.provenance,
    "scanner",
  );
  assert.equal(
    out.report.checks.find(
      (x) =>
        x.effectiveResult.subject.subjectKey.component === "deletion_runtime",
    ).effectiveResult.status,
    "UNKNOWN",
  );
});
test("historical static report works; fresh fix/assessment rejects changed input", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  await patch(root, "App/App.swift", (s) => s + "\n// modification");
  await createReport(join(r.directory, "audit.json"), root);
  await assert.rejects(
    () =>
      createFix(
        join(r.directory, "audit.json"),
        root,
        r.audit.checks[0].checkId,
      ),
    /STALE_SNAPSHOT/,
  );
});
test("fix generates a prompt and never edits source/config", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    before = await readFile(join(root, "App/App.swift")),
    c = condition(r, "ARG-PERM-001", "permission_key"),
    out = await createFix(join(r.directory, "audit.json"), root, c.checkId);
  assert(out.prompt.includes(c.checkId));
  assert.deepEqual(before, await readFile(join(root, "App/App.swift")));
  await access(out.path);
});
test("manual verification avoids circular config hash and never clears code condition", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    runtime = condition(r, "ARG-AUTH-001", "deletion_runtime");
  const p = join(root, "smoothsubmit.config.json"),
    c = JSON.parse(await readFile(p, "utf8"));
  c.manualVerifications = [
    {
      checkId: runtime.checkId,
      scopeKey: scopeKey(r.audit.scope),
      method: "device_test",
      conclusion: "pass",
      observedAt: new Date().toISOString(),
      semanticSnapshotHash: r.audit.snapshot.semanticSnapshotHash,
      limitations: ["Local demonstration only."],
    },
  ];
  await writeFile(p, JSON.stringify(c));
  const n = await audit(root);
  assert.equal(
    n.audit.snapshot.semanticSnapshotHash,
    r.audit.snapshot.semanticSnapshotHash,
  );
  assert.notEqual(
    n.audit.snapshot.inputManifestHash,
    r.audit.snapshot.inputManifestHash,
  );
  assert.equal(condition(n, "ARG-AUTH-001", "deletion_runtime").status, "PASS");
  assert.equal(
    condition(n, "ARG-AUTH-001", "deletion_code").status,
    "NEEDS_REVIEW",
  );
});
test("payment candidates are never automatic FAIL, including negative user attestation", async (t) => {
  const r = await audit(await fixture(t));
  assert(
    r.audit.checks
      .filter((c) => c.ruleId === "ARG-PAY-001")
      .every((c) => c.status !== "FAIL"),
  );
});
test("static missing setting is resolved only when the same condition is actually rechecked", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace("12.0", "13.0"),
  );
  const out = await verifyProject(join(r.directory, "audit.json"), root, {});
  const id = condition(r, "ARG-BUILD-001", "deployment_setting").checkId;
  assert.equal(
    out.verification.items.find((i) => i.checkId === id).classification,
    "RESOLVED",
  );
  assert(out.verification.summary.RESOLVED >= 1);
});
test("removed/excluded findings require recheck instead of resolving", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    n = await audit(root, {
      exclude: [{ pathPattern: "App/*.swift", reason: "omit" }],
    });
  const v = compare(
    r.audit,
    n.audit,
    r.report,
    n.report,
    r.manifest.auditHash,
    n.manifest.auditHash,
  );
  assert(!v.items.some((i) => i.classification === "RESOLVED"));
  assert(v.items.some((i) => i.classification === "NEEDS_RECHECK"));
});
test("artifact overwrite is refused; existing audit is immutable", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    raw = await readFile(join(r.directory, "audit.json"));
  await assert.rejects(
    () => saveNew(r.directory, { "audit.json": "{}" }),
    /overwrite/,
  );
  assert.deepEqual(raw, await readFile(join(r.directory, "audit.json")));
});
test("failure thresholds distinguish risk, incomplete coverage and ERROR", () => {
  const c = { status: "FAIL", severity: "HIGH" };
  assert.equal(exitCode([c], false, {}), 0);
  assert.equal(exitCode([c], false, { failOn: "high" }), 2);
  assert.equal(
    exitCode([{ status: "UNKNOWN" }], false, { requireComplete: true }),
    3,
  );
  assert.equal(
    exitCode([{ status: "ERROR" }], false, {
      failOn: "high",
      requireComplete: true,
    }),
    4,
  );
});
