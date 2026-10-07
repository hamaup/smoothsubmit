import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fixture, audit, patch, condition } from "./helpers.mjs";
import { verifyProject, createFix } from "../dist/core/index.js";

test("the native iOS non-Catalyst branch is evaluated instead of hiding an observed API", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "App/App.swift"),
    '#if !targetEnvironment(macCatalyst)\nUserDefaults.standard.set(true, forKey: "preference")\n#endif',
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "FAIL",
  );
});

test("new Xcode xcconfig anchor resolves an iOS target and its deployment setting", async (t) => {
  const root = await fixture(t, true);
  await writeFile(
    join(root, "App/release.xcconfig"),
    "SDKROOT = iphoneos\nIPHONEOS_DEPLOYMENT_TARGET = 18.0\nINFOPLIST_FILE = App/Info.plist\nGENERATE_INFOPLIST_FILE = NO\n",
  );
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace("SDKROOT = iphoneos;", "")
      .replace(
        "TCONFIG = { isa = XCBuildConfiguration;",
        "TCONFIG = { isa = XCBuildConfiguration; baseConfigurationReferenceAnchor = APPGROUP; baseConfigurationReferenceRelativePath = release.xcconfig;",
      )
      .replace("IPHONEOS_DEPLOYMENT_TARGET = 13.0;", ""),
  );
  const r = await audit(root);
  assert.equal(r.audit.scope.targetName, "ReviewDemo");
  assert.equal(
    condition(r, "ARG-BUILD-001", "deployment_setting").status,
    "PASS",
  );
  assert.match(
    condition(r, "ARG-BUILD-001", "deployment_setting").reason,
    /18\.0/,
  );
});

test("preprocessed plist is an explicit limitation, not malformed app configuration", async (t) => {
  const root = await fixture(t);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace(
      "GENERATE_INFOPLIST_FILE = NO;",
      "GENERATE_INFOPLIST_FILE = NO; INFOPLIST_PREPROCESS = YES;",
    ),
  );
  await patch(root, "App/Info.plist", (s) =>
    s.replace(
      "<dict>",
      "<dict>\n#if PAIDAPP\n<key>Paid</key><true/>\n#endif\n",
    ),
  );
  const r = await audit(root);
  assert(r.audit.diagnostics.some((d) => d.code === "PREPROCESSED_PLIST"));
  assert(!r.audit.diagnostics.some((d) => d.code === "INVALID_PLIST"));
  assert.equal(
    condition(r, "ARG-PERM-001", "permission_key").status,
    "UNKNOWN",
  );
});

test("ordinary web links and URLSession are not payment or personal sharing evidence", async (t) => {
  const root = await fixture(t, true);
  await writeFile(
    join(root, "App/App.swift"),
    'import SwiftUI\nimport Foundation\nlet about = Link("About", destination: URL(string: "https://example.com")!)\nlet data = URLSession.shared\n',
  );
  const r = await audit(root);
  assert(
    r.audit.checks
      .filter(
        (c) =>
          c.ruleId === "ARG-PAY-001" &&
          c.subject.subjectKey.component !== "scope",
      )
      .every((c) => c.status === "UNKNOWN"),
  );
  assert(
    r.audit.checks
      .filter(
        (c) =>
          c.ruleId === "ARG-PRIV-004" &&
          c.subject.subjectKey.component !== "scope",
      )
      .every((c) => c.status === "NOT_APPLICABLE"),
  );
});

test("ambient playback does not demand a microphone purpose; recording still does", async (t) => {
  const root = await fixture(t, true);
  await writeFile(
    join(root, "App/App.swift"),
    "import AVFoundation\ntry AVAudioSession.sharedInstance().setCategory(.ambient)\ntry AVAudioSession.sharedInstance().setActive(true)",
  );
  let r = await audit(root);
  assert(
    !r.audit.checks.some(
      (c) =>
        c.subject.subjectKey.permissionKey === "NSMicrophoneUsageDescription",
    ),
  );
  await writeFile(
    join(root, "App/App.swift"),
    "import AVFAudio\nAVAudioApplication.requestRecordPermission { allowed in }",
  );
  r = await audit(root);
  assert.equal(
    r.audit.checks.find(
      (c) =>
        c.ruleId === "ARG-PERM-001" &&
        c.subject.subjectKey.permissionKey === "NSMicrophoneUsageDescription",
    ).status,
    "FAIL",
  );
});

test("a model creationDate is not file timestamp evidence, but URL resource values remain candidates", async (t) => {
  const root = await fixture(t, true);
  await writeFile(
    join(root, "App/App.swift"),
    "struct Article { let creationDate: Date }\nlet sorted = articles.sorted { $0.creationDate < $1.creationDate }",
  );
  let r = await audit(root);
  assert(
    !r.audit.checks.some(
      (c) =>
        c.subject.subjectKey.permissionKey ===
        "NSPrivacyAccessedAPICategoryFileTimestamp",
    ),
  );
  await writeFile(
    join(root, "App/App.swift"),
    "let values = try fileURL.resourceValues(forKeys: [.creationDateKey])\nlet date = values.creationDate",
  );
  r = await audit(root);
  assert.equal(
    r.audit.checks.find(
      (c) =>
        c.ruleId === "ARG-PRIV-002" &&
        c.subject.subjectKey.component === "reason_declaration" &&
        c.subject.subjectKey.permissionKey ===
          "NSPrivacyAccessedAPICategoryFileTimestamp",
    ).status,
    "NEEDS_REVIEW",
  );
});

test("an invalid declared reason cannot be hidden by another valid reason declaration", async (t) => {
  const root = await fixture(t, true);
  await patch(root, "App/PrivacyInfo.xcprivacy", (s) =>
    s.replace(
      "\t</array>\n\t<key>NSPrivacyCollectedDataTypes",
      "\t\t<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>INVALID</string></array></dict>\n\t</array>\n\t<key>NSPrivacyCollectedDataTypes",
    ),
  );
  const r = await audit(root);
  assert.equal(
    condition(r, "ARG-PRIV-002", "reason_declaration").status,
    "FAIL",
  );
});

test("local package gaps stay visible while a verified deployment-setting repair can resolve", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "Packages/Feature"), { recursive: true });
  await writeFile(
    join(root, "Packages/Feature/Package.swift"),
    '// swift-tools-version: 6.0\nimport PackageDescription\nlet package = Package(name: "Feature")',
  );
  const r = await audit(root);
  assert(r.audit.coverage.partial);
  assert(r.audit.diagnostics.some((d) => d.code === "LOCAL_PACKAGE_SCOPE"));
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace("12.0", "13.0"),
  );
  const v = await verifyProject(join(r.directory, "audit.json"), root, {});
  const id = condition(r, "ARG-BUILD-001", "deployment_setting").checkId;
  assert.equal(
    v.verification.items.find((i) => i.checkId === id).classification,
    "RESOLVED",
  );
  const fresh = v.audit;
  assert(fresh.coverage.partial);
  assert.equal(
    fresh.checks.find(
      (c) =>
        c.ruleId === "ARG-AUTH-001" &&
        c.subject.subjectKey.component === "deletion_runtime",
    ).status,
    "UNKNOWN",
  );
});

test("an excluded input prevents a false resolution even after deployment improves", async (t) => {
  const root = await fixture(t);
  const r = await audit(root);
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace("12.0", "13.0"),
  );
  await patch(root, "smoothsubmit.config.json", (s) => {
    const c = JSON.parse(s);
    c.exclude = [{ pathPattern: "App/App.swift", reason: "test exclusion" }];
    return JSON.stringify(c);
  });
  const v = await verifyProject(join(r.directory, "audit.json"), root, {});
  assert.notEqual(
    v.verification.items.find(
      (i) =>
        i.checkId ===
        condition(r, "ARG-BUILD-001", "deployment_setting").checkId,
    ).classification,
    "RESOLVED",
  );
});

test("fix instructions identify the missing key and required-reason category without touching source", async (t) => {
  const root = await fixture(t),
    r = await audit(root);
  const source = await readFile(join(root, "App/App.swift"));
  for (const [id, component, required] of [
    ["ARG-PERM-001", "permission_key", "NSCameraUsageDescription"],
    [
      "ARG-PRIV-002",
      "reason_declaration",
      "NSPrivacyAccessedAPICategoryUserDefaults",
    ],
    ["ARG-BUILD-001", "deployment_setting", "IPHONEOS_DEPLOYMENT_TARGET"],
  ]) {
    const fix = await createFix(
      join(r.directory, "audit.json"),
      root,
      condition(r, id, component).checkId,
    );
    assert.match(fix.prompt.replaceAll("\\_", "_"), new RegExp(required));
  }
  assert.deepEqual(await readFile(join(root, "App/App.swift")), source);
});

test("the --root release command works and rejects conflicting paths", async (t) => {
  const root = await fixture(t);
  const cli = fileURLToPath(new URL("../dist/cli/index.js", import.meta.url));
  const a = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "audit", "--root", root, "--format", "json"],
      { encoding: "utf8" },
    ),
  );
  assert.equal(a.summary.failCounts.HIGH, 3);
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [cli, "audit", "--root", root, "--path", root],
      { stdio: "pipe" },
    ),
  );
});
