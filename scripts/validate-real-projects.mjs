// Opt-in integration experiment. Only copies are mutated; no upstream scripts
// are executed. Inputs are public source snapshots prepared by the fetch script.
import assert from "node:assert/strict";
import {
  readFile,
  writeFile,
  cp,
  readdir,
  mkdtemp,
  mkdir,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseOpenStep } from "../dist/scanner/openstep.js";
const [sourceDir, outputFile] = process.argv.slice(2);
if (!sourceDir || !outputFile)
  throw Error(
    "Usage: node scripts/validate-real-projects.mjs INPUT_DIR OUTPUT_JSON",
  );
const sources = JSON.parse(
  await readFile(join(resolve(sourceDir), "sources.json"), "utf8"),
);
const cli = fileURLToPath(new URL("../dist/cli/index.js", import.meta.url));
const work = await mkdtemp(join(tmpdir(), "smoothsubmit-real-validation-"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function sourceHash(root) {
  const entries = [];
  async function walk(dir = "") {
    for (const e of (
      await readdir(join(root, dir), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if ([".smoothsubmit", ".git", "node_modules"].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile())
        entries.push([p, sha(await readFile(join(root, p)))]);
    }
  }
  await walk();
  return sha(JSON.stringify(entries));
}
function call(root, command, extra = []) {
  const t = performance.now();
  const stdout = execFileSync(
    process.execPath,
    [cli, command, "--path", root, ...extra, "--format", "json"],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return {
    value: JSON.parse(stdout),
    elapsedMs: Math.round(performance.now() - t),
  };
}
const serialize = (x) =>
  Array.isArray(x)
    ? "(" + x.map(serialize).join(",") + ")"
    : x && typeof x === "object"
      ? "{" +
        Object.entries(x)
          .map(([k, v]) => JSON.stringify(k) + " = " + serialize(v) + ";")
          .join("\n") +
        "}"
      : JSON.stringify(String(x));
const runDir = (root, a) => join(root, ".smoothsubmit/runs", a.auditId);
const results = {
  date: new Date().toISOString(),
  toolVersion: call(process.cwd(), "doctor").value.version,
  projects: [],
  mutations: [],
  negativeControls: [],
  limits: [
    "Pinned text inputs only; assets and dependency checkout were not fetched.",
    "No build, device/backend run, user usability study or App Store outcome was measured.",
    "External projects are not represented as defective or certified compliant.",
  ],
};
for (const source of sources) {
  const original = resolve(source.path),
    name = source.repo.split("/")[1];
  const originalHash = await sourceHash(original);
  const root = join(work, name);
  await cp(original, root, {
    recursive: true,
    filter: (p) => !p.includes("/.smoothsubmit"),
  });
  const target =
    name === "KeePassium"
      ? "KeePassium"
      : name === "NetNewsWire"
        ? "NetNewsWire-iOS"
        : null;
  const options = target ? ["--target", target] : [];
  const baseline = call(root, "audit", options);
  const a = baseline.value;
  results.projects.push({
    repo: source.repo,
    commit: source.commit,
    inputFiles: source.files,
    inputBytes: source.bytes,
    selectedTarget: a.scope.targetName,
    elapsedMs: baseline.elapsedMs,
    summary: a.summary,
    partial: a.coverage.partial,
    diagnostics: [...new Set(a.diagnostics.map((d) => d.code))],
  });
  for (const kind of ["deployment", "manifest_structure", "reason_code"]) {
    const caseRoot = join(work, name + "-" + kind);
    await cp(root, caseRoot, {
      recursive: true,
      filter: (p) => !p.includes("/.smoothsubmit"),
    });
    const pbxPath = join(caseRoot, a.scope.project, "project.pbxproj");
    const originalPbx = await readFile(pbxPath, "utf8");
    let changedPath, originalBytes, rule, component, expectedInPrompt;
    if (kind === "deployment") {
      const project = parseOpenStep(originalPbx);
      const native = project.objects[a.scope.targetId];
      const config = project.objects[
        native.buildConfigurationList
      ].buildConfigurations
        .map((id) => project.objects[id])
        .find((c) => c.name === "Release");
      config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "12.0";
      await writeFile(pbxPath, serialize(project));
      changedPath = pbxPath;
      originalBytes = Buffer.from(originalPbx);
      rule = "ARG-BUILD-001";
      component = "deployment_setting";
      expectedInPrompt = "IPHONEOS_DEPLOYMENT_TARGET";
    } else {
      let manifest = a.snapshot.files.find(
        (f) => f.role === "manifest" && f.membership === "included",
      )?.path;
      if (!manifest) {
        manifest = "SmoothSubmitValidation/PrivacyInfo.xcprivacy";
        await mkdir(join(caseRoot, "SmoothSubmitValidation"));
        const project = parseOpenStep(originalPbx),
          native = project.objects[a.scope.targetId];
        const group =
          project.objects[project.objects[project.rootObject].mainGroup];
        group.children.push("SMOOTHSUBMIT_VALIDATION_FILE");
        project.objects.SMOOTHSUBMIT_VALIDATION_FILE = {
          isa: "PBXFileReference",
          path: manifest,
          sourceTree: "SOURCE_ROOT",
        };
        project.objects.SMOOTHSUBMIT_VALIDATION_BUILD = {
          isa: "PBXBuildFile",
          fileRef: "SMOOTHSUBMIT_VALIDATION_FILE",
        };
        const phase = native.buildPhases
          .map((id) => project.objects[id])
          .find((p) => p.isa === "PBXResourcesBuildPhase");
        phase.files.push("SMOOTHSUBMIT_VALIDATION_BUILD");
        await writeFile(pbxPath, serialize(project));
        await writeFile(
          join(caseRoot, manifest),
          '<?xml version="1.0"?><plist version="1.0"><dict><key>NSPrivacyAccessedAPITypes</key><array><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array></dict></array></dict></plist>',
        );
      }
      changedPath = join(caseRoot, manifest);
      originalBytes = await readFile(changedPath);
      const obj = JSON.parse(
        execFileSync(
          "/usr/bin/plutil",
          ["-convert", "json", "-o", "-", "--", changedPath],
          { encoding: "utf8" },
        ),
      );
      if (kind === "manifest_structure") {
        obj.NSPrivacyTracking = "invalid";
        rule = "ARG-PRIV-001";
        component = "manifest_structure";
        expectedInPrompt = "Manifest";
      } else {
        obj.NSPrivacyAccessedAPITypes.find(
          (x) =>
            x.NSPrivacyAccessedAPIType ===
            "NSPrivacyAccessedAPICategoryUserDefaults",
        ).NSPrivacyAccessedAPITypeReasons = ["INVALID"];
        rule = "ARG-PRIV-002";
        component = "reason_declaration";
        expectedInPrompt = "NSPrivacyAccessedAPICategoryUserDefaults";
      }
      await writeFile(changedPath, JSON.stringify(obj));
      execFileSync("/usr/bin/plutil", ["-convert", "xml1", "--", changedPath]);
    }
    const mutatedHash = await sourceHash(caseRoot);
    const bad = call(caseRoot, "audit", options).value;
    const finding = bad.checks.find(
      (c) =>
        c.ruleId === rule &&
        c.subject.subjectKey.component === component &&
        c.status === "FAIL",
    );
    assert(finding, `${name}/${kind}: deterministic defect was missed`);
    const fix = call(caseRoot, "fix", [
      ...options,
      "--audit",
      join(runDir(caseRoot, bad), "audit.json"),
      "--check",
      finding.checkId,
    ]).value;
    const prompt = await readFile(fix.path, "utf8");
    assert(
      prompt.replaceAll("\\_", "_").includes(expectedInPrompt),
      `${name}/${kind}: fix did not identify the affected setting`,
    );
    assert.equal(
      await sourceHash(caseRoot),
      mutatedHash,
      "audit/fix modified source",
    );
    await writeFile(changedPath, originalBytes);
    const v = call(caseRoot, "verify", [
      ...options,
      "--baseline",
      join(runDir(caseRoot, bad), "audit.json"),
    ]).value;
    const item = v.items.find((i) => i.checkId === finding.checkId);
    assert.equal(item?.currentResult?.status, "PASS");
    assert.equal(item.classification, "RESOLVED");
    results.mutations.push({
      repo: source.repo,
      case: kind,
      ruleId: rule,
      before: finding.status,
      after: item.currentResult.status,
      verification: item.classification,
      fixIdentifiesSetting: true,
      readOnlyPreserved: true,
    });
  }
  if (name === "IceCubesApp") {
    const mic = a.checks.filter(
      (c) =>
        c.subject.subjectKey.permissionKey === "NSMicrophoneUsageDescription",
    );
    assert.equal(
      mic.length,
      0,
      "ambient playback falsely demanded recording permission",
    );
    const pay = a.checks.filter(
      (c) =>
        c.ruleId === "ARG-PAY-001" &&
        c.subject.subjectKey.component !== "scope",
    );
    assert(
      pay.every((c) => c.status === "UNKNOWN"),
      "ordinary links were promoted to a payment risk",
    );
    assert(
      !a.checks.some(
        (c) =>
          c.subject.subjectKey.permissionKey ===
          "NSPrivacyAccessedAPICategoryFileTimestamp",
      ),
      "model date falsely promoted to file API evidence",
    );
    const restore = a.checks.find(
      (c) =>
        c.ruleId === "ARG-IAP-001" &&
        c.subject.subjectKey.component === "restore_code",
    );
    assert(
      restore.status === "NEEDS_REVIEW" &&
        restore.evidence.some((e) =>
          e.observation.includes("restorePurchases"),
        ),
      "existing SDK restoration was missed",
    );
    results.negativeControls.push({
      repo: source.repo,
      ambientPlaybackNotRecording: true,
      ordinaryLinkNotPaymentRisk: true,
      modelDateNotFileTimestamp: true,
      existingSdkRestoreDetectedWithoutDeclaringRuntimePass: true,
    });
  }
  assert.equal(
    await sourceHash(original),
    originalHash,
    "original source/config changed",
  );
  results.projects.at(-1).originalSourceUnchanged = true;
  console.log(`${name}: baseline + 3 defect/fix/verify cases passed`);
}
await writeFile(resolve(outputFile), JSON.stringify(results, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  `Saved ${resolve(outputFile)}; temporary evidence retained in ${work}`,
);
