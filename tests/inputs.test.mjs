import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { fixture, audit, patch, condition } from "./helpers.mjs";
import {
  configFor,
  auditProject,
  createReport,
  loadAudit,
} from "../dist/core/index.js";
import { normalizeConfig, sha, hash } from "../dist/contracts/index.js";
import { RULES, evaluate } from "../dist/rules/index.js";
import { scan } from "../dist/scanner/index.js";
import {
  suppressionFor,
  mergeReport,
  effectiveChecks,
  compare,
} from "../dist/report/index.js";
const run = promisify(execFile),
  cli = fileURLToPath(new URL("../dist/cli/index.js", import.meta.url));

test("binary plist is read with hashes from original bytes", async (t) => {
  const root = await fixture(t, true);
  await run("/usr/bin/plutil", [
    "-convert",
    "binary1",
    "--",
    join(root, "App/Info.plist"),
  ]);
  const r = await audit(root);
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "PASS");
});
test("synchronized group resolves target membership exceptions", async (t) => {
  const root = await fixture(t);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace(
        "children = (APPGROUP, PRODUCTS,);",
        "children = (SYNC, PRODUCTS,);",
      )
      .replace(
        "objects = {",
        'objects = { SYNC = { isa = PBXFileSystemSynchronizedRootGroup; path = App; sourceTree = "<group>"; exceptions = (EXCEPTION,); }; EXCEPTION = { isa = PBXFileSystemSynchronizedBuildFileExceptionSet; target = TARGET; membershipExceptions = (Info.plist,); };',
      )
      .replace(
        "productName = ReviewDemo;",
        "productName = ReviewDemo; fileSystemSynchronizedGroups = (SYNC,);",
      )
      .replace("files = (SWIFTBUILD,);", "files = ();")
      .replace("files = (PRIVBUILD,);", "files = ();"),
  );
  const r = await audit(root);
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "FAIL");
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "PASS",
  );
});
test("phase exception does not silently include excluded Swift source", async (t) => {
  const root = await fixture(t);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace(
        "children = (APPGROUP, PRODUCTS,);",
        "children = (SYNC, PRODUCTS,);",
      )
      .replace(
        "objects = {",
        'objects = { SYNC = { isa = PBXFileSystemSynchronizedRootGroup; path = App; sourceTree = "<group>"; exceptions = (EXCEPTION,); }; EXCEPTION = { isa = PBXFileSystemSynchronizedGroupBuildPhaseMembershipExceptionSet; buildPhase = SOURCES; membershipExceptions = (App.swift,); };',
      )
      .replace(
        "productName = ReviewDemo;",
        "productName = ReviewDemo; fileSystemSynchronizedGroups = (SYNC,);",
      )
      .replace("files = (SWIFTBUILD,);", "files = ();"),
  );
  const r = await audit(root);
  assert(
    !r.audit.checks.some(
      (c) => c.ruleId === "ARG-PERM-001" && c.status === "FAIL",
    ),
  );
});
test("workspace selection ignores an unrelated project", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "Review.xcworkspace"));
  await writeFile(
    join(root, "Review.xcworkspace/contents.xcworkspacedata"),
    '<Workspace><FileRef location="group:ReviewDemo.xcodeproj"/></Workspace>',
  );
  const r = await audit(root, {
    project: null,
    workspace: "Review.xcworkspace",
  });
  assert.equal(r.audit.scope.workspace, "Review.xcworkspace");
});
for (const version of [1, 2, 3])
  test(`Package.resolved version ${version} lists SDKs without acquiring them`, async (t) => {
    const root = await fixture(t);
    const pin = {
      identity: "alamofire",
      package: "Alamofire",
      state: { version: "5.10.0" },
    };
    await writeFile(
      join(root, "Package.resolved"),
      JSON.stringify(
        version === 1
          ? { version, object: { pins: [pin] } }
          : { version, pins: [pin] },
      ),
    );
    const r = await audit(root);
    assert.equal(condition(r, "ARG-SDK-001", "sdk_manifest").status, "UNKNOWN");
    assert.equal(
      condition(r, "ARG-SDK-001", "sdk_signature").status,
      "UNKNOWN",
    );
  });
test("Podfile.lock inventory remains separate from SDK binary proof", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "Podfile.lock"),
    "PODS:\n  - Alamofire (5.10.0)\nDEPENDENCIES:\n  - Alamofire\n",
  );
  const r = await audit(root);
  assert.equal(condition(r, "ARG-SDK-001", "sdk_manifest").status, "UNKNOWN");
});
test("InfoPlist strings and catalog are distinct localized purpose checks", async (t) => {
  const root = await fixture(t, true);
  await mkdir(join(root, "App/en.lproj"));
  await writeFile(
    join(root, "App/en.lproj/InfoPlist.strings"),
    '"NSCameraUsageDescription" = "For local camera access";',
  );
  await writeFile(
    join(root, "App/InfoPlist.xcstrings"),
    JSON.stringify({
      version: "1.0",
      sourceLanguage: "en",
      strings: {
        NSCameraUsageDescription: {
          localizations: {
            ja: { stringUnit: { value: "カメラを利用します" } },
          },
        },
      },
    }),
  );
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace(
        "path = App; children = (SWIFTFILE, INFOFILE, PRIVFILE,);",
        "path = App; children = (SWIFTFILE, INFOFILE, PRIVFILE, STRFILE, CATFILE,);",
      )
      .replace(
        "objects = {",
        'objects = { STRFILE = { isa = PBXFileReference; path = en.lproj/InfoPlist.strings; sourceTree = "<group>"; }; CATFILE = { isa = PBXFileReference; path = InfoPlist.xcstrings; sourceTree = "<group>"; }; STRBUILD = { isa = PBXBuildFile; fileRef = STRFILE; }; CATBUILD = { isa = PBXBuildFile; fileRef = CATFILE; };',
      )
      .replace(
        "files = (PRIVBUILD,);",
        "files = (PRIVBUILD, STRBUILD, CATBUILD,);",
      ),
  );
  const r = await audit(root);
  assert.deepEqual(
    r.audit.checks
      .filter((c) => c.ruleId === "ARG-PERM-002" && c.subject.subjectKey.locale)
      .map((c) => c.subject.subjectKey.locale)
      .sort(),
    ["en", "ja"],
  );
});
test("shadowed API names are not certain Apple API usage", async (t) => {
  const root = await fixture(t);
  await patch(
    root,
    "App/App.swift",
    (s) => "struct AVCaptureDevice {}\nstruct UserDefaults {}\n" + s,
  );
  const r = await audit(root);
  assert.notEqual(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "FAIL",
  );
  assert.notEqual(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "FAIL",
  );
});
test("stdin session config supports evaluation without modifying the project config", async (t) => {
  const root = await fixture(t),
    before = await readFile(join(root, "smoothsubmit.config.json"));
  const c = JSON.parse(before.toString());
  c.policy.storefronts = ["US"];
  const loaded = await configFor(root, { config: "-" }, JSON.stringify(c));
  const r = await auditProject(root, loaded.config, loaded.origin);
  assert.deepEqual(r.audit.policyContext.storefronts, ["US"]);
  assert.deepEqual(
    before,
    await readFile(join(root, "smoothsubmit.config.json")),
  );
});
test("CLI stdout is one JSON object; --fail-on/require-complete return meaningful codes", async (t) => {
  const root = await fixture(t);
  const out = await run(process.execPath, [
    cli,
    "audit",
    "--path",
    root,
    "--format",
    "json",
  ]);
  assert.equal(JSON.parse(out.stdout).execution.mode, "static");
  assert.match(out.stderr, /Saved/);
  await assert.rejects(
    () =>
      run(process.execPath, [
        cli,
        "audit",
        "--path",
        root,
        "--fail-on",
        "high",
        "--format",
        "json",
      ]),
    (e) => e.code === 2 && JSON.parse(e.stdout).summary.failCounts.HIGH === 3,
  );
  await assert.rejects(
    () =>
      run(process.execPath, [
        cli,
        "audit",
        "--path",
        root,
        "--require-complete",
        "--format",
        "json",
      ]),
    (e) => e.code === 3,
  );
});
test("suppression preserves original failure and requires a reason/expiry", async (t) => {
  const root = await fixture(t),
    r = await audit(root),
    c = condition(r, "ARG-BUILD-001", "deployment_setting");
  const config = r.manifest.normalizedConfig;
  config.suppressions = [
    {
      ruleId: c.ruleId,
      subjectKey: c.subject.subjectKey,
      reason: "Test only",
      createdAt: "2026-10-06T00:00:00Z",
      expiresAt: "2099-10-08",
    },
  ];
  const report = mergeReport(r.audit, r.manifest.auditHash, config);
  assert.equal(report.summary.failCounts.HIGH, 3);
  assert.equal(report.summary.suppressedCount, 1);
  assert.equal(
    report.checks.find((x) => x.scannerResult.checkId === c.checkId)
      .scannerResult.status,
    "FAIL",
  );
  assert.equal(
    suppressionFor(
      c,
      {
        ...config,
        suppressions: [{ ...config.suppressions[0], expiresAt: "2026-10-06" }],
      },
      new Date("2026-10-07T00:00:00Z"),
    ),
    null,
  );
});
test("future planned submission never changes current static FAIL count", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  const n = await audit(root, {
    policy: {
      ...r.manifest.normalizedConfig.policy,
      plannedSubmissionDate: "2027-04-15",
    },
  });
  assert.deepEqual(n.audit.summary.failCounts, r.audit.summary.failCounts);
  assert(
    n.audit.policyContext.futureRequirements.includes("SDK27-202704-MONTH-v1"),
  );
});
test("all 19 rules retain scope and unresolved conditions rather than vacuous PASS", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  for (const rule of RULES) {
    assert(
      r.audit.checks.some(
        (c) =>
          c.ruleId === rule.ruleId &&
          c.subject.subjectKey.component === "scope",
      ),
    );
    assert(
      r.audit.checks.some(
        (c) =>
          c.ruleId === rule.ruleId &&
          c.subject.subjectKey.component !== "scope",
      ),
    );
  }
  assert(
    !r.audit.checks.some(
      (c) => c.ruleId === "ARG-PAY-001" && c.status === "FAIL",
    ),
  );
});
test("unknown to pass is CHANGED, target change NOT_COMPARABLE", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  const n = structuredClone(r);
  const c = n.audit.checks.find((c) => c.status === "UNKNOWN");
  const row = n.report.checks.find(
    (x) => x.effectiveResult.checkId === c.checkId,
  );
  c.status = "PASS";
  row.effectiveResult.status = "PASS";
  const v = compare(
    r.audit,
    n.audit,
    r.report,
    n.report,
    r.manifest.auditHash,
    n.manifest.auditHash,
  );
  assert.equal(
    v.items.find((i) => i.checkId === c.checkId).classification,
    "CHANGED",
  );
  n.audit.scope.targetId = "OTHER";
  assert(
    compare(
      r.audit,
      n.audit,
      r.report,
      n.report,
      r.manifest.auditHash,
      n.manifest.auditHash,
    ).items.every((i) => i.classification === "NOT_COMPARABLE"),
  );
});
test("Photos add-only request requires add-purpose rather than read-purpose", async (t) => {
  const root = await fixture(t);
  await patch(
    root,
    "App/App.swift",
    (s) =>
      s + "\nPHPhotoLibrary.requestAuthorization(for: .addOnly) { _ in }\n",
  );
  const r = await audit(root);
  const cs = r.audit.checks.filter(
    (c) =>
      c.ruleId === "ARG-PERM-001" &&
      c.subject.subjectKey.permissionKey?.startsWith("NSPhoto"),
  );
  assert(
    cs.some(
      (c) =>
        c.subject.subjectKey.permissionKey ===
          "NSPhotoLibraryAddUsageDescription" && c.status === "FAIL",
    ),
  );
  assert(
    !cs.some(
      (c) =>
        c.subject.subjectKey.permissionKey ===
          "NSPhotoLibraryUsageDescription" && c.status === "FAIL",
    ),
  );
});
test("StoreKit import alone does not override an explicit consumables-only declaration", async (t) => {
  const root = await fixture(t),
    c = JSON.parse(
      await readFile(join(root, "smoothsubmit.config.json"), "utf8"),
    );
  c.features.productTypes = ["consumable"];
  await writeFile(join(root, "smoothsubmit.config.json"), JSON.stringify(c));
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-IAP-001", "restore_code").status,
    "NOT_APPLICABLE",
  );
});
test("duplicate XML Manifest keys are not normalized into a false PASS", async (t) => {
  const root = await fixture(t);
  await patch(root, "App/PrivacyInfo.xcprivacy", (s) =>
    s.replace(
      "<key>NSPrivacyTracking</key>",
      "<key>NSPrivacyTracking</key><false/><key>NSPrivacyTracking</key>",
    ),
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "FAIL",
  );
});
test("XML entity declarations are rejected without reading external values", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "App/PrivacyInfo.xcprivacy"),
    '<!DOCTYPE plist [<!ENTITY secret SYSTEM "file:///etc/passwd">]><plist><dict><key>NSPrivacyTracking</key><string>&secret;</string></dict></plist>',
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-001", "manifest_structure").status,
    "FAIL",
  );
  assert(!JSON.stringify(r.audit).includes("root:"));
});
test("source credentials never enter evidence and credential-like config values are refused", async (t) => {
  const root = await fixture(t);
  const fake = "sk-" + "synthetic".repeat(4);
  await patch(
    root,
    "App/App.swift",
    (s) => s + '\nlet localSecret = "' + fake + '"\n',
  );
  const r = await audit(root);
  assert(!JSON.stringify(r.audit).includes(fake));
  assert.throws(
    () => normalizeConfig({ authProviderDetails: fake }),
    /secret|credentials/,
  );
  assert.throws(
    () =>
      normalizeConfig({
        reviewAccess: {
          method: "demo_account",
          prepared: true,
          note: "reviewer@example.com",
        },
      }),
    /email|credentials/,
  );
});
