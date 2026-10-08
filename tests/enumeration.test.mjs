import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, symlink, chmod, rename } from "node:fs/promises";
import { join } from "node:path";
import { fixture, audit, patch, condition } from "./helpers.mjs";
import { listFiles } from "../dist/scanner/index.js";
import { fresh, loadAudit } from "../dist/core/index.js";

const limits = {
  maxEntries: 1000,
  maxDirectories: 100,
  maxFiles: 100,
  maxDepth: 64,
  maxMilliseconds: 30000,
};
async function file(
  root,
  path,
  text = 'UserDefaults.standard.set(true, forKey: "key")',
) {
  await mkdir(join(root, path, ".."), { recursive: true });
  await writeFile(join(root, path), text);
}
async function synchronized(root) {
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s
      .replace(
        "children = (APPGROUP, PRODUCTS,);",
        "children = (SYNC, PRODUCTS,);",
      )
      .replace(
        "objects = {",
        'objects = { SYNC = { isa = PBXFileSystemSynchronizedRootGroup; path = App; sourceTree = "<group>"; };',
      )
      .replace(
        "productName = ReviewDemo;",
        "productName = ReviewDemo; fileSystemSynchronizedGroups = (SYNC,);",
      )
      .replace("files = (SWIFTBUILD,);", "files = ();")
      .replace("files = (PRIVBUILD,);", "files = ();"),
  );
}

test("generated caches and archives are pruned, reported, and ordinary app sources remain audited", async (t) => {
  const root = await fixture(t);
  for (const path of [
    ".artifact-tmp/x/Cache.swift",
    ".test-cache/x/Cache.swift",
    "Archive.xcarchive/Cache.swift",
    "Run.xcresult/Cache.swift",
  ])
    await file(root, path);
  const files = await listFiles(root);
  assert(files.paths.includes("App/App.swift"));
  assert(!files.paths.some((p) => p.endsWith("Cache.swift")));
  assert.equal(files.skipped.length, 4);
  const r = await audit(root);
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "FAIL");
  assert.equal(r.audit.coverage.partial, false);
  assert.equal(
    r.audit.diagnostics.filter((d) => d.code === "GENERATED_DIRECTORY_SKIPPED")
      .length,
    4,
  );
});

test("an explicitly referenced source inside a generated directory is still read and its limitation is visible", async (t) => {
  const root = await fixture(t);
  await file(
    root,
    "App/.artifact-tmp/Required.swift",
    "import AVFoundation\nAVCaptureDevice.requestAccess(for: .video) { allowed in }",
  );
  await patch(root, "ReviewDemo.xcodeproj/project.pbxproj", (s) =>
    s.replace("path = App.swift;", "path = .artifact-tmp/Required.swift;"),
  );
  const r = await audit(root);
  assert(
    r.audit.snapshot.files.some(
      (f) => f.path === "App/.artifact-tmp/Required.swift" && f.sha256,
    ),
  );
  assert.equal(condition(r, "ARG-PERM-001", "permission_key").status, "FAIL");
  assert(r.audit.coverage.partial);
  assert(
    r.audit.diagnostics.some((d) => d.code === "GENERATED_INPUT_REFERENCED"),
  );
});

test("pruned content inside a synchronized source group is UNKNOWN, never a complete or absent-feature PASS", async (t) => {
  const root = await fixture(t, true);
  await synchronized(root);
  await file(root, "App/.artifact-tmp/Hidden.swift");
  const r = await audit(root, {
    features: {
      accountCreation: false,
      loginRequired: false,
      thirdPartyDataSharing: false,
      thirdPartyAI: false,
      tracking: false,
    },
  });
  assert(r.audit.coverage.partial);
  assert(
    r.audit.diagnostics.some(
      (d) =>
        d.code === "UNRESOLVED_MEMBERSHIP" && d.path === "App/.artifact-tmp",
    ),
  );
  assert(
    r.audit.checks
      .filter((c) => c.subject.subjectKey.component === "scope")
      .every((c) => c.status === "UNKNOWN"),
  );
  assert.equal(condition(r, "ARG-PRIV-004", "sharing_code").status, "UNKNOWN");
});

test("explicit directory exclusions prune before recursion and remain visible as partial scope", async (t) => {
  const root = await fixture(t, true);
  await synchronized(root);
  await file(root, "App/Vendor/Hidden.swift");
  const exclude = [
    { pathPattern: "App/Vendor/**", reason: "not provided for audit" },
  ];
  const enumerated = await listFiles(root, exclude);
  assert(!enumerated.paths.some((p) => p.startsWith("App/Vendor/")));
  const r = await audit(root, { exclude });
  assert(r.audit.coverage.partial);
  assert(
    r.audit.diagnostics.some(
      (d) =>
        d.code === "EXCLUDED_DIRECTORY" &&
        d.message === "not provided for audit",
    ),
  );
  const bundle = await loadAudit(join(r.directory, "audit.json"));
  await fresh(root, bundle);
});

for (const [key, value] of [
  ["maxEntries", 1],
  ["maxDirectories", 1],
  ["maxFiles", 1],
  ["maxDepth", 0],
  ["maxMilliseconds", -1],
])
  test(`enumeration ${key} limit returns an explicit bounded partial result`, async (t) => {
    const root = await fixture(t, true);
    const result = await listFiles(root, [], { ...limits, [key]: value });
    assert(result.skipped.some((s) => s.code === "INPUT_LIMIT_EXCEEDED"));
    assert(result.paths.length <= limits.maxFiles);
  });

test("depth-limited synchronized sources keep the audit partial while independent settings still resolve", async (t) => {
  const root = await fixture(t, true);
  await synchronized(root);
  await file(root, "App/" + "Nested/".repeat(65) + "Required.swift");
  const r = await audit(root);
  assert(r.audit.coverage.partial);
  assert(r.audit.diagnostics.some((d) => d.code === "INPUT_LIMIT_EXCEEDED"));
  assert.equal(
    condition(r, "ARG-BUILD-001", "deployment_setting").status,
    "PASS",
  );
  assert(
    r.audit.checks
      .filter((c) => c.subject.subjectKey.component === "scope")
      .every((c) => c.status === "UNKNOWN"),
  );
});

test("omitted-directory provenance participates in snapshot freshness", async (t) => {
  const root = await fixture(t, true);
  const r = await audit(root);
  await file(root, ".artifact-tmp/Cache.swift");
  const bundle = await loadAudit(join(r.directory, "audit.json"));
  await assert.rejects(fresh(root, bundle), /STALE_SNAPSHOT/);
});

test("a valid reason declaration without a covered API is UNKNOWN rather than a confirmed risk or PASS", async (t) => {
  const root = await fixture(t, true);
  await patch(root, "App/PrivacyInfo.xcprivacy", (s) =>
    s.replace(
      "\t</array>\n\t<key>NSPrivacyCollectedDataTypes",
      "\t\t<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict>\n\t</array>\n\t<key>NSPrivacyCollectedDataTypes",
    ),
  );
  let r = await audit(root);
  const usage = (r) =>
    r.audit.checks.find(
      (c) =>
        c.ruleId === "ARG-PRIV-002" &&
        c.subject.subjectKey.component === "reason_usage" &&
        c.subject.subjectKey.permissionKey ===
          "NSPrivacyAccessedAPICategoryFileTimestamp",
    );
  assert.equal(usage(r).status, "UNKNOWN");
  assert.equal(usage(r).severity, null);
  await writeFile(
    join(root, "App/App.swift"),
    "let values = try fileURL.resourceValues(forKeys: [.creationDateKey])\nlet date = values.creationDate",
  );
  r = await audit(root);
  assert.equal(usage(r).status, "NEEDS_REVIEW");
});

test("a symbolic source directory is not silently omitted from synchronized membership", async (t) => {
  const root = await fixture(t, true);
  await synchronized(root);
  await file(root, "External/Required.swift");
  await symlink(join(root, "External"), join(root, "App/LinkedSources"));
  const r = await audit(root);
  assert(r.audit.coverage.partial);
  assert(
    r.audit.diagnostics.some(
      (d) => d.code === "EXTERNAL_REFERENCE" && d.path === "App/LinkedSources",
    ),
  );
  assert(
    r.audit.checks
      .filter((c) => c.subject.subjectKey.component === "scope")
      .every((c) => c.status === "UNKNOWN"),
  );
});

test("unreadable source directories produce an explicit ERROR and partial coverage", async (t) => {
  const root = await fixture(t, true);
  await synchronized(root);
  await file(root, "App/Locked/Required.swift");
  await chmod(join(root, "App/Locked"), 0o000);
  try {
    const r = await audit(root);
    assert(r.audit.coverage.partial);
    assert(
      r.audit.diagnostics.some(
        (d) => d.code === "ENUMERATION_READ_FAILED" && d.level === "error",
      ),
    );
    assert(r.audit.coverage.statusCounts.ERROR > 0);
  } finally {
    await chmod(join(root, "App/Locked"), 0o700);
  }
});

test("a limit that hides the project reports omitted scope instead of misleading target ambiguity", async (t) => {
  const root = await fixture(t, true);
  const nested = "Nested/".repeat(66);
  await mkdir(join(root, nested), { recursive: true });
  await rename(
    join(root, "ReviewDemo.xcodeproj"),
    join(root, nested, "ReviewDemo.xcodeproj"),
  );
  await assert.rejects(audit(root), (error) => {
    assert.match(
      error.message,
      /^INPUT_LIMIT_EXCEEDED target selection interrupted/,
    );
    assert.match(error.message, /omitted inputs/);
    assert.match(error.message, /Directory depth limit/);
    return true;
  });
});
