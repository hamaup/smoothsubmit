import {
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  lstat,
  realpath,
} from "node:fs/promises";
import { resolve, join, dirname, relative } from "node:path";
import { randomUUID } from "node:crypto";
import {
  validate,
  normalizeConfig,
  semanticConfig,
  sha,
  hash,
  canonical,
  summarize,
  coverage,
  scopeKey,
  VERSION,
  KNOWLEDGE,
  type Json,
  type Check,
} from "../contracts/index.js";
import { scan, inputsChanged, listFiles } from "../scanner/index.js";
import { evaluate, RULES, SOURCES, assessmentAllowed } from "../rules/index.js";
import {
  mergeReport,
  render,
  compare,
  fixPrompt,
  effectiveChecks,
} from "../report/index.js";
export { VERSION, RULES };
const bytes = (o: Json) => JSON.stringify(o, null, 2) + "\n";
export async function jsonFile(
  path: string,
): Promise<{ value: Json; raw: Buffer }> {
  const b = await readFile(path);
  if (b.length > 20 * 1048576) throw Error("CONFIG_INVALID document too large");
  let value: Json;
  try {
    value = JSON.parse(b.toString());
  } catch {
    throw Error("CONFIG_INVALID malformed JSON document");
  }
  return { value, raw: b };
}
async function secureDir(path: string): Promise<void> {
  try {
    const s = await lstat(path);
    if (!s.isDirectory() || s.isSymbolicLink())
      throw Error("WRITE_FAILED unsafe output directory");
  } catch (e) {
    if ((e as any).code !== "ENOENT") throw e;
    await secureDir(dirname(path));
    await mkdir(path, { mode: 0o700 });
  }
}
export async function saveNew(
  directory: string,
  files: Record<string, string>,
): Promise<void> {
  await secureDir(dirname(directory));
  const tmp = directory + ".tmp-" + randomUUID();
  await mkdir(tmp, { mode: 0o700 });
  try {
    for (const [p, content] of Object.entries(files)) {
      await secureDir(join(tmp, dirname(p)));
      await writeFile(join(tmp, p), content, { mode: 0o600, flag: "wx" });
    }
    try {
      await lstat(directory);
      throw Error("WRITE_FAILED refusing to overwrite existing artifact");
    } catch (e) {
      if ((e as any).code !== "ENOENT") throw e;
    }
    await rename(tmp, directory);
  } catch (e) {
    await rm(tmp, { recursive: true, force: true });
    throw e;
  }
}
export async function configFor(
  root: string,
  options: Json,
  stdin?: string,
): Promise<{ config: Json; origin: Json }> {
  root = await realpath(root);
  let input: Json = {},
    origin: Json = { kind: "default", path: null, sourceFileHash: null };
  const configPath =
    options.config === "-"
      ? null
      : resolve(root, options.config || "smoothsubmit.config.json");
  if (options.config === "-") {
    if (!stdin || Buffer.byteLength(stdin) > 1048576)
      throw Error("CONFIG_INVALID stdin configuration");
    try {
      input = JSON.parse(stdin);
    } catch {
      throw Error("CONFIG_INVALID malformed stdin JSON");
    }
    origin = { kind: "stdin", path: null, sourceFileHash: null };
  } else {
    try {
      const real = await realpath(configPath!);
      if (!real.startsWith(root + "/"))
        throw Error("CONFIG_INVALID external configuration");
      const { value, raw } = await jsonFile(real);
      if (raw.length > 1048576) throw Error("CONFIG_INVALID config too large");
      input = value;
      origin = {
        kind: "file",
        path: relative(root, real).split("\\").join("/"),
        sourceFileHash: sha(raw),
      };
    } catch (e) {
      if ((e as any).code !== "ENOENT" || options.config) throw e;
    }
  }
  const overlay: Json = {};
  for (const k of [
    "target",
    "targetId",
    "configuration",
    "sdk",
    "arch",
    "language",
  ])
    if (options[k]) overlay[k] = options[k];
  if (options.project) {
    overlay.project = options.project;
    overlay.workspace = null;
  }
  if (options.workspace) {
    overlay.workspace = options.workspace;
    overlay.project = null;
  }
  return { config: normalizeConfig({ ...input, ...overlay }), origin };
}
export async function auditProject(
  rootPath: string,
  config: Json,
  origin: Json,
  output?: string,
): Promise<Json> {
  const started = new Date(),
    s = await scan(rootPath, config);
  if (await inputsChanged(s)) {
    s.partial = true;
    s.diagnostics.push({
      code: "INPUT_CHANGED_DURING_AUDIT",
      level: "warning",
      stage: "snapshot",
      path: null,
      message: "Input changed while auditing; repeat the audit.",
      affectedRuleIds: RULES.map((x) => x.ruleId),
      affectedCheckIds: [],
      remedy: "Rerun with stable inputs.",
    });
  }
  const semanticSnapshotHash = hash({
      scope: scopeKey(s.scope),
      files: s.files.filter((f) => f.role !== "config"),
      config: semanticConfig(config),
    }),
    inputManifestHash = hash({ files: s.files, config });
  const checks = evaluate(s, semanticSnapshotHash, started);
  for (const d of s.diagnostics) {
    if (d.code === "INVALID_PLIST") continue;
    const impacted = checks.filter(
      (c) =>
        c.subject.subjectKey.component !== "scope" &&
        (d.path
          ? c.evidence.some((e) => e.kind === "file" && e.path === d.path) ||
            c.subject.subjectKey.path === d.path
          : !["PASS", "NOT_APPLICABLE"].includes(c.status)),
    );
    d.affectedCheckIds = impacted.map((c) => c.checkId);
    d.affectedRuleIds = [...new Set(impacted.map((c) => c.ruleId))];
    for (const c of impacted)
      if (d.level === "error") {
        c.status = "ERROR";
        c.severity = null;
      }
  }
  if (
    s.diagnostics.some((d) => d.level === "error") &&
    !checks.some((c) => c.status === "ERROR")
  ) {
    checks[0].status = "ERROR";
    checks[0].severity = null;
  }
  const assessmentCalendarDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.policy.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(started);
  if (started.getTime() - Date.parse(KNOWLEDGE) > 90 * 86400000)
    s.diagnostics.push({
      code: "STALE_KNOWLEDGE",
      level: "warning",
      stage: "policy",
      path: null,
      message:
        "Bundled Apple sources are over 90 days old; verify current requirements.",
      affectedRuleIds: RULES.map((x) => x.ruleId),
      affectedCheckIds: [],
      remedy: "Update the release or verify official sources.",
    });
  const policyContext = {
    assessmentDate: started.toISOString(),
    assessmentCalendarDate,
    timeZone: config.policy.timeZone,
    plannedSubmissionDate: config.policy.plannedSubmissionDate,
    knowledgeAsOf: KNOWLEDGE,
    storefronts: config.policy.storefronts,
    deviceFamilies: config.policy.deviceFamilies,
    distributionChannel: config.policy.distributionChannel,
    appliedRequirements: [
      "SDK26-20260428-v1",
      ...(assessmentCalendarDate >= "2026-09-09"
        ? ["MINOS13-20260909-v1"]
        : []),
    ],
    futureRequirements: ["SDK27-202704-MONTH-v1"],
    unresolvedRequirements:
      config.policy.storefronts === "unknown" ? ["STOREFRONT_REQUIRED"] : [],
  };
  const audit: Json = {
    schemaVersion: "1.0.0",
    auditId: randomUUID(),
    createdAt: started.toISOString(),
    toolVersion: VERSION,
    rulepackVersion: VERSION,
    policyContext,
    scope: s.scope,
    snapshot: {
      gitHead: null,
      gitDirty: null,
      files: s.files,
      configHash: hash(config),
      inputManifestHash,
      semanticSnapshotHash,
    },
    execution: {
      mode: "static",
      completion: s.partial ? "partial" : "complete",
      startedAt: started.toISOString(),
      finishedAt: new Date().toISOString(),
    },
    coverage: coverage(
      checks,
      s.partial,
      s.files.filter((f) => f.membership === "excluded").length,
      s.files.filter((f) => !f.sha256 && f.membership !== "excluded").length,
    ),
    summary: summarize(checks),
    checks,
    diagnostics: s.diagnostics,
  };
  validate("audit", audit);
  semanticChecks(audit);
  const auditRaw = bytes(audit),
    auditHash = sha(auditRaw),
    manifest = {
      schemaVersion: "1.0.0",
      auditId: audit.auditId,
      auditHash,
      inputManifestHash,
      semanticSnapshotHash,
      normalizedConfig: config,
      configOrigin: origin,
      files: s.files,
      enumerationHash: s.enumerationHash,
    };
  validate("manifest", manifest);
  const report = mergeReport(audit, auditHash, config);
  validate("report", report);
  const template = {
    schemaVersion: "1.0.0",
    assessmentId: randomUUID(),
    auditId: audit.auditId,
    auditHash,
    inputManifestHash,
    createdAt: new Date().toISOString(),
    execution: { tool: "other", model: null },
    reviews: [],
  };
  validate("assessment", template);
  const directory = resolve(
    output || join(s.root, ".smoothsubmit", "runs"),
    audit.auditId,
  );
  await saveNew(directory, {
    "audit.json": auditRaw,
    "manifest.json": bytes(manifest),
    "assessment-template.json": bytes(template),
    [`reports/${report.reportId}/report.json`]: bytes(report),
    [`reports/${report.reportId}/report.md`]: render(report, config.language),
  });
  return { audit, manifest, report, directory };
}
export function semanticChecks(audit: Json): void {
  const seen = new Set<string>();
  for (const c of audit.checks as Check[]) {
    if (
      seen.has(c.checkId) ||
      c.checkId !==
        hash({
          ruleId: c.ruleId,
          scopeKey: scopeKey(audit.scope),
          subjectKey: c.subject.subjectKey,
        })
    )
      throw Error("CONFIG_INVALID check identity");
    seen.add(c.checkId);
    if (
      !RULES.some((r) => r.ruleId === c.ruleId) ||
      c.subject.targetId !== audit.scope.targetId
    )
      throw Error("CONFIG_INVALID rule or target");
    if (["FAIL", "NEEDS_REVIEW"].includes(c.status) !== (c.severity !== null))
      throw Error("CONFIG_INVALID severity/status");
    if (c.ruleId === "ARG-PAY-001" && c.status === "FAIL")
      throw Error("CONFIG_INVALID external payment FAIL prohibited");
    if (
      (c.verificationLevel === "ai_review" && c.provenance !== "ai") ||
      (c.verificationLevel === "user_attestation" && c.provenance !== "user")
    )
      throw Error("CONFIG_INVALID provenance");
  }
  if (
    hash(audit.summary) !== hash(summarize(audit.checks)) ||
    hash(audit.coverage) !==
      hash(
        coverage(
          audit.checks,
          audit.coverage.partial,
          audit.coverage.excludedInputCount,
          audit.coverage.unreadInputCount,
        ),
      )
  )
    throw Error("CONFIG_INVALID inconsistent summary");
}
export async function loadAudit(path: string): Promise<Json> {
  const p = resolve(path),
    { value: audit, raw } = await jsonFile(p);
  validate("audit", audit);
  semanticChecks(audit);
  const { value: manifest } = await jsonFile(join(dirname(p), "manifest.json"));
  validate("manifest", manifest);
  if (
    manifest.auditId !== audit.auditId ||
    manifest.auditHash !== sha(raw) ||
    manifest.inputManifestHash !== audit.snapshot.inputManifestHash ||
    manifest.semanticSnapshotHash !== audit.snapshot.semanticSnapshotHash ||
    hash(manifest.files) !== hash(audit.snapshot.files) ||
    hash(manifest.normalizedConfig) !== audit.snapshot.configHash ||
    hash({ files: manifest.files, config: manifest.normalizedConfig }) !==
      manifest.inputManifestHash
  )
    throw Error("CONFIG_INVALID manifest mismatch");
  return { audit, manifest, auditHash: sha(raw), directory: dirname(p) };
}
export async function fresh(rootPath: string, bundle: Json): Promise<void> {
  const root = await realpath(rootPath),
    { manifest } = bundle;
  const current = await listFiles(root);
  if (hash(current.paths) !== manifest.enumerationHash)
    throw Error("STALE_SNAPSHOT input enumeration changed");
  for (const f of manifest.files.filter((x: Json) => x.sha256)) {
    const full = await realpath(join(root, f.path));
    if (!full.startsWith(root + "/") || sha(await readFile(full)) !== f.sha256)
      throw Error("STALE_SNAPSHOT input file changed");
  }
}
function pointer(o: Json, p: string): any {
  if (p === "") return o;
  if (!p.startsWith("/")) throw Error("Invalid JSON pointer");
  let x: any = o;
  for (const k of p
    .slice(1)
    .split("/")
    .map((x) => x.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (x === null || typeof x !== "object" || !Object.hasOwn(x, k))
      throw Error("Missing JSON pointer");
    x = x[k];
  }
  return x;
}
export async function loadAssessment(
  path: string,
  bundle: Json,
  root: string,
  historical = false,
): Promise<Json> {
  const { value: assessment, raw } = await jsonFile(resolve(path));
  validate("assessment", assessment);
  const { audit, manifest, auditHash } = bundle;
  if (
    assessment.auditId !== audit.auditId ||
    assessment.auditHash !== auditHash ||
    assessment.inputManifestHash !== manifest.inputManifestHash
  )
    throw Error("ASSESSMENT_INVALID snapshot reference");
  const ids = new Set<string>();
  for (const r of assessment.reviews) {
    const original: Check = audit.checks.find(
      (c: Check) => c.checkId === r.checkId,
    );
    const c: Check = r.result;
    if (
      !original ||
      ids.has(r.checkId) ||
      c.checkId !== r.checkId ||
      c.ruleId !== original.ruleId ||
      c.ruleVersion !== original.ruleVersion ||
      hash(c.subject) !== hash(original.subject)
    )
      throw Error("ASSESSMENT_INVALID check identity");
    ids.add(r.checkId);
    if (
      c.provenance !== "ai" ||
      c.verificationLevel !== "ai_review" ||
      !["PASS", "NEEDS_REVIEW", "NOT_APPLICABLE", "UNKNOWN"].includes(
        c.status,
      ) ||
      c.severity !==
        (["NEEDS_REVIEW"].includes(c.status)
          ? RULES.find((x) => x.ruleId === c.ruleId)!.severity
          : null)
    )
      throw Error("ASSESSMENT_INVALID status/provenance");
    if (["FAIL", "ERROR"].includes(original.status)) {
      if (["PASS", "NOT_APPLICABLE"].includes(c.status))
        throw Error("ASSESSMENT_INVALID prohibited state change");
    } else if (!assessmentAllowed(original) && c.status !== original.status)
      throw Error("ASSESSMENT_INVALID prohibited state change");
    if (
      ["PASS", "NOT_APPLICABLE"].includes(c.status) &&
      ["UNKNOWN", "NEEDS_REVIEW"].includes(original.status) &&
      (!c.evidence.length || r.outstandingVerificationSteps.length)
    )
      throw Error("ASSESSMENT_INVALID incomplete verification");
    for (const src of c.sources)
      if (!SOURCES.some((s) => hash(s) === hash(src)))
        throw Error("ASSESSMENT_INVALID source reference");
    for (const id of r.reviewedEvidenceIds)
      if (!original.evidence.some((e) => e.evidenceId === id))
        throw Error("ASSESSMENT_INVALID evidence reference");
    for (const e of c.evidence) {
      if (e.kind === "file") {
        const f = manifest.files.find(
          (f: Json) => f.path === e.path && f.sha256 === e.fileHash,
        );
        if (!f) throw Error("ASSESSMENT_INVALID file hash");
        const b = historical ? null : await readFile(join(root, e.path));
        if (b && sha(b) !== e.fileHash)
          throw Error("STALE_SNAPSHOT quoted file changed");
        if (e.lineStart !== null) {
          const lines = b ? b.toString().split("\n").length : Infinity;
          if (e.lineStart < 1 || e.lineEnd < e.lineStart || e.lineEnd > lines)
            throw Error("ASSESSMENT_INVALID line");
        } else if (e.keyPath !== null) {
          const matches = original.evidence.some(
            (o) =>
              o.kind === "file" && o.path === e.path && o.keyPath === e.keyPath,
          );
          if (!matches) throw Error("ASSESSMENT_INVALID unverified keyPath");
        } else throw Error("ASSESSMENT_INVALID file location missing");
        const { evidenceId, observation, ...fields } = e;
        if (hash(fields) !== evidenceId)
          throw Error("ASSESSMENT_INVALID evidence identity");
      } else if (!original.evidence.some((o) => hash(o) === hash(e)))
        throw Error("ASSESSMENT_INVALID forged config/search evidence");
    }
  }
  return { assessment, assessmentHash: sha(raw) };
}
export async function createReport(
  path: string,
  root: string,
  assessmentPath?: string,
  output?: string,
): Promise<Json> {
  const bundle = await loadAudit(path);
  let a: Json | null = null;
  if (assessmentPath) {
    await fresh(root, bundle);
    a = await loadAssessment(assessmentPath, bundle, root);
  }
  const report = mergeReport(
    bundle.audit,
    bundle.auditHash,
    bundle.manifest.normalizedConfig,
    a?.assessment || null,
    a?.assessmentHash || null,
  );
  validate("report", report);
  const dir = resolve(
    output || join(bundle.directory, "reports"),
    report.reportId,
  );
  await saveNew(dir, {
    "report.json": bytes(report),
    "report.md": render(report, bundle.manifest.normalizedConfig.language),
  });
  return { report, directory: dir };
}
export async function createFix(
  path: string,
  root: string,
  id: string,
  assessmentPath?: string,
  output?: string,
): Promise<Json> {
  const bundle = await loadAudit(path);
  await fresh(root, bundle);
  const a = assessmentPath
    ? await loadAssessment(assessmentPath, bundle, root)
    : null;
  const report = mergeReport(
    bundle.audit,
    bundle.auditHash,
    bundle.manifest.normalizedConfig,
    a?.assessment || null,
    a?.assessmentHash || null,
  );
  const c = effectiveChecks(report).find((c) => c.checkId === id);
  if (!c) throw Error("CONFIG_INVALID unknown check");
  const dir = resolve(
    output || join(bundle.directory, "fix-prompts"),
    randomUUID(),
  );
  const prompt = fixPrompt(bundle.audit, c);
  await saveNew(dir, { "prompt.md": prompt });
  return {
    checkId: id,
    auditId: bundle.audit.auditId,
    path: join(dir, "prompt.md"),
    prompt,
  };
}
export async function verifyProject(
  baseline: string,
  root: string,
  options: Json,
  stdin?: string,
): Promise<Json> {
  const old = await loadAudit(baseline);
  let current: Json;
  if (options.audit) {
    current = await loadAudit(options.audit);
    await fresh(root, current);
  } else {
    let config: Json, origin: Json;
    if (options.config || old.manifest.configOrigin.kind !== "stdin") {
      const loaded = await configFor(
        await realpath(root),
        { ...scopeKey(old.audit.scope), ...options },
        stdin,
      );
      config = loaded.config;
      origin = loaded.origin;
    } else {
      config = normalizeConfig({
        ...old.manifest.normalizedConfig,
        ...Object.fromEntries(
          ["project", "target", "configuration", "sdk", "arch", "language"]
            .filter((k) => options[k])
            .map((k) => [k, options[k]]),
        ),
      });
      origin = old.manifest.configOrigin;
    }
    const result = await auditProject(root, config, origin, options.output);
    current = { ...result, auditHash: result.manifest.auditHash };
  }
  if (!!options.baselineAssessment !== !!options.assessment)
    throw Error("CONFIG_INVALID assisted comparison requires both assessments");
  const oa = options.baselineAssessment
    ? await loadAssessment(options.baselineAssessment, old, root, true)
    : null;
  const na = options.assessment
    ? await loadAssessment(options.assessment, current, root)
    : null;
  const oldReport = mergeReport(
      old.audit,
      old.auditHash,
      old.manifest.normalizedConfig,
      oa?.assessment || null,
      oa?.assessmentHash || null,
    ),
    newReport = mergeReport(
      current.audit,
      current.auditHash,
      current.manifest.normalizedConfig,
      na?.assessment || null,
      na?.assessmentHash || null,
    );
  const verification = compare(
    old.audit,
    current.audit,
    oldReport,
    newReport,
    old.auditHash,
    current.auditHash,
  );
  validate("verification", verification);
  const dir = join(
    current.directory,
    "verifications",
    verification.verificationId,
  );
  await saveNew(dir, { "verification.json": bytes(verification) });
  return {
    verification,
    report: newReport,
    audit: current.audit,
    directory: dir,
  };
}
