import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, cp, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fixture, audit, patch, condition } from "./helpers.mjs";
import {
  auditProject,
  configFor,
  createFix,
  verifyProject,
} from "../dist/core/index.js";
import { evaluate } from "../dist/rules/index.js";
import { scan } from "../dist/scanner/index.js";
import { scopeKey } from "../dist/contracts/index.js";
import { resolveSettings } from "../dist/scanner/settings.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { inputsChanged } from "../dist/scanner/index.js";
import { compare, mergeReport } from "../dist/report/index.js";

test("custom configuration changes invalidate saved fix evidence", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "config"));
  const path = join(root, "config/review.json");
  const input = JSON.parse(
    await readFile(join(root, "smoothsubmit.config.json")),
  );
  await writeFile(path, JSON.stringify(input));
  const loaded = await configFor(root, { config: "config/review.json" });
  const result = await auditProject(root, loaded.config, loaded.origin);
  const check = condition(result, "ARG-AUTH-001", "deletion_code");
  input.features.accountCreation = false;
  await writeFile(path, JSON.stringify(input));
  await assert.rejects(
    () => createFix(join(result.directory, "audit.json"), root, check.checkId),
    /STALE_SNAPSHOT/,
  );
});

test("verification reloads the baseline custom config and refuses a missing one", async (t) => {
  const root = await fixture(t);
  const input = JSON.parse(
    await readFile(join(root, "smoothsubmit.config.json")),
  );
  input.policy.storefronts = ["US"];
  await writeFile(join(root, "review.json"), JSON.stringify(input));
  const loaded = await configFor(root, { config: "review.json" });
  const result = await auditProject(root, loaded.config, loaded.origin);
  const next = await verifyProject(
    join(result.directory, "audit.json"),
    root,
    {},
  );
  assert.deepEqual(next.audit.policyContext.storefronts, ["US"]);
  assert.equal(next.verification.policyComparison, "same");
  await unlink(join(root, "review.json"));
  await assert.rejects(
    () => verifyProject(join(result.directory, "audit.json"), root, {}),
    /ENOENT/,
  );
});

test("malformed manifest entries produce structural FAIL without aborting other checks", async (t) => {
  const root = await fixture(t);
  const loaded = await configFor(root, {});
  const s = await scan(root, loaded.config);
  for (const data of [
    { NSPrivacyAccessedAPITypes: [null] },
    { NSPrivacyAccessedAPITypes: [false, "bad", []] },
    ["unknown root"],
    "unknown root",
  ]) {
    s.manifests[0].data = data;
    const checks = evaluate(s, "test-snapshot");
    assert.equal(
      checks.find(
        (c) => c.subject.subjectKey.component === "manifest_structure",
      ).status,
      "FAIL",
    );
    assert.equal(new Set(checks.map((c) => c.ruleId)).size, 19);
  }
});

test("a scalar Info.plist root cannot abort the rest of the audit", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "App/Info.plist"),
    '<?xml version="1.0"?><plist version="1.0"><string>invalid dictionary</string></plist>',
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "UNKNOWN",
  );
  assert.equal(new Set(r.audit.checks.map((c) => c.ruleId)).size, 19);
  assert(r.audit.diagnostics.some((d) => d.code === "INVALID_PLIST"));
});

test("an excluded manifest is UNKNOWN rather than a fabricated malformed-file FAIL", async (t) => {
  const root = await fixture(t, true);
  const r = await audit(root, {
    exclude: [
      { pathPattern: "App/PrivacyInfo.xcprivacy", reason: "fixture exclusion" },
    ],
  });
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "UNKNOWN",
  );
  assert.equal(r.audit.coverage.partial, true);
});

test("a manifest referenced only as source does not prove app-bundle reason declarations", async (t) => {
  const root = await fixture(t, true);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace("files = (SWIFTBUILD,);", "files = (SWIFTBUILD, PRIVBUILD,);")
      .replace("files = (PRIVBUILD,);", "files = ();"),
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "UNKNOWN",
  );
  assert.notEqual(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "PASS",
  );
  assert.equal(r.audit.coverage.partial, true);
});

test("unresolved generated permission values and generation flags cannot be definite FAIL or PASS", async (t) => {
  const root = await fixture(t);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "GENERATE_INFOPLIST_FILE = NO;",
      'GENERATE_INFOPLIST_FILE = YES; INFOPLIST_KEY_NSCameraUsageDescription = "$(UNDECLARED)";',
    ),
  );
  let r = await audit(root);
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "UNKNOWN",
  );
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "GENERATE_INFOPLIST_FILE = YES;",
      'GENERATE_INFOPLIST_FILE = "$(UNDECLARED)";',
    ),
  );
  r = await audit(root);
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "UNKNOWN",
  );
});

test("conditional build settings cannot be masked by later unconditional values", async () => {
  const s = await resolveSettings(
    [
      {
        "IPHONEOS_DEPLOYMENT_TARGET[sdk=iphoneos*]": "12.0",
        IPHONEOS_DEPLOYMENT_TARGET: "15.0",
      },
    ],
    {},
    async () => null,
    { sdk: "iphoneos", arch: "arm64", config: "Release" },
  );
  assert.equal(s.values.IPHONEOS_DEPLOYMENT_TARGET, "12.0");
});

test("conflicting conditions and malformed conditional syntax remain UNKNOWN", async () => {
  for (const layer of [
    { "VALUE[sdk=iphoneos*]": "12", "VALUE[arch=arm64]": "15" },
    { "VALUE[arch]": "15" },
    { "VALUE[arch=]": "15" },
    { "VALUE[arch=arm64][]": "12", VALUE: "15" },
    { "VALUE[sdk=iphoneos26.0]": "12", VALUE: "15" },
    { "VALUE[arch=arm64]": "12", "VALUE[arch=x86_64]": "15", VALUE: "16" },
  ]) {
    const s = await resolveSettings([layer], {}, async () => null, {
      sdk: "iphoneos",
      arch: "unknown",
      config: "Release",
    });
    assert.equal(s.values.VALUE, null);
    assert(s.diagnostics.length > 0);
  }
});

test("nonregular source inputs and replacements cannot block auditing or freshness checks", async (t) => {
  const root = await fixture(t);
  const loaded = await configFor(root, {});
  const s = await scan(root, loaded.config);
  await unlink(join(root, "App/App.swift"));
  await promisify(execFile)("/usr/bin/mkfifo", [join(root, "App/App.swift")]);
  assert.equal(await inputsChanged(s), true);
  const r = await auditProject(root, loaded.config, loaded.origin);
  assert.equal(r.audit.coverage.partial, true);
  assert(r.audit.diagnostics.some((d) => d.code === "READ_FAILED"));
  assert(r.audit.summary.errorCount > 0);
});

test("nested project plist paths do not read an unrelated root-level app's settings", async (t) => {
  const root = await fixture(t, true);
  await mkdir(join(root, "Nested"));
  await cp(
    join(root, "ReviewDemo.xcodeproj"),
    join(root, "Nested/ReviewDemo.xcodeproj"),
    { recursive: true },
  );
  await cp(join(root, "App"), join(root, "Nested/App"), { recursive: true });
  await patch(root, "Nested/App/Info.plist", (s) =>
    s.replace(
      /<key>NSCameraUsageDescription<\/key>\s*<string>[^<]*<\/string>/,
      "",
    ),
  );
  const loaded = await configFor(root, {
    project: "Nested/ReviewDemo.xcodeproj",
  });
  const r = await auditProject(root, loaded.config, loaded.origin);
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "FAIL");
  assert(
    r.audit.snapshot.files.some((f) => f.path === "Nested/App/Info.plist"),
  );
  await patch(root, "Nested/ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "INFOPLIST_FILE = App/Info.plist",
      'INFOPLIST_FILE = "$(SRCROOT)/App/Info.plist"',
    ),
  );
  const expanded = await auditProject(root, loaded.config, loaded.origin);
  assert.equal(
    condition(expanded, "ARG-PERM-001", "permission_key").status,
    "FAIL",
  );
});

test("unresolved source membership is partial and cannot certify absence of account creation", async (t) => {
  const root = await fixture(t);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      'path = App.swift; sourceTree = "<group>";',
      "path = App.swift; sourceTree = BUILT_PRODUCTS_DIR;",
    ),
  );
  const loaded = await configFor(root, {});
  loaded.config.features.accountCreation = false;
  const r = await auditProject(root, loaded.config, loaded.origin);
  assert.equal(r.audit.coverage.partial, true);
  assert(r.audit.diagnostics.some((d) => d.code === "UNRESOLVED_MEMBERSHIP"));
  assert.equal(condition(r, "ARG-AUTH-001", "deletion_code").status, "UNKNOWN");
});

test("an API name in an included file cannot certify a call in a file of unknown membership", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "App/App.swift"),
    "import AVFoundation\nlet kind = AVCaptureDevice.self",
  );
  await writeFile(
    join(root, "App/Other.swift"),
    "AVCaptureDevice.requestAccess(for: .video) { _ in }",
  );
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace(
        "children = (SWIFTFILE, INFOFILE, PRIVFILE,);",
        "children = (SWIFTFILE, OTHERFILE, INFOFILE, PRIVFILE,);",
      )
      .replace(
        "objects = {",
        'objects = { OTHERFILE = { isa = PBXFileReference; path = Other.swift; sourceTree = "<group>"; }; OTHERBUILD = { isa = PBXBuildFile; fileRef = OTHERFILE; platformFilter = macos; };',
      )
      .replace("files = (SWIFTBUILD,);", "files = (SWIFTBUILD, OTHERBUILD,);"),
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "NEEDS_REVIEW",
  );
});

test("conflicting attestations at the same instant with different UTC precision cannot become PASS", async (t) => {
  const root = await fixture(t);
  const baseline = await audit(root);
  const runtime = condition(baseline, "ARG-AUTH-001", "deletion_runtime");
  const record = {
    checkId: runtime.checkId,
    scopeKey: scopeKey(baseline.audit.scope),
    semanticSnapshotHash: baseline.audit.snapshot.semanticSnapshotHash,
    method: "device_test",
    limitations: [],
  };
  const r = await audit(root, {
    manualVerifications: [
      {
        ...record,
        conclusion: "pass",
        observedAt: "2026-01-01T00:00:00Z",
      },
      { ...record, conclusion: "fail", observedAt: "2026-01-01T00:00:00.000Z" },
    ],
  });
  assert.equal(
    condition(r, "ARG-AUTH-001", "deletion_runtime").status,
    "NEEDS_REVIEW",
  );
});

test("changed rule logic cannot resolve an old finding under the same package version", async (t) => {
  const root = await fixture(t);
  const before = await audit(root);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "IPHONEOS_DEPLOYMENT_TARGET = 12.0",
      "IPHONEOS_DEPLOYMENT_TARGET = 15.0",
    ),
  );
  const after = await audit(root);
  const oldAudit = structuredClone(before.audit);
  oldAudit.checks.forEach((c) => {
    c.ruleVersion = "1.0.0";
  });
  const oldReport = mergeReport(
    oldAudit,
    before.manifest.auditHash,
    before.manifest.normalizedConfig,
  );
  const v = compare(
    oldAudit,
    after.audit,
    oldReport,
    after.report,
    before.manifest.auditHash,
    after.manifest.auditHash,
  );
  assert.equal(v.versionComparison, "different");
  const id = condition(before, "ARG-BUILD-001", "deployment_setting").checkId;
  assert.equal(
    v.items.find((i) => i.checkId === id).classification,
    "NOT_COMPARABLE",
  );
  assert.equal(v.summary.RESOLVED, 0);
});
