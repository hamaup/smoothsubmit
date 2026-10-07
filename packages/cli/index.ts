#!/usr/bin/env node
import { parseArgs } from "node:util";
import { realpath, lstat, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { release } from "node:os";
import {
  auditProject,
  configFor,
  createReport,
  createFix,
  verifyProject,
  saveNew,
  VERSION,
  RULES,
} from "../core/index.js";
import { exitCode, safeText, type Json } from "../contracts/index.js";
import { render, effectiveChecks } from "../report/index.js";
const help = `SmoothSubmit ${VERSION}
Audit → Fix → Verify your iOS app before submission.

Usage: smoothsubmit <command> [options]
  audit                 Read-only static audit (default)
  report --audit FILE [--assessment FILE]
  fix --audit FILE --check ID [--assessment FILE]  Generate instructions only
  verify --baseline FILE [--audit FILE] [--baseline-assessment FILE --assessment FILE]
  init                  Explicitly create a new configuration
  doctor                Diagnose environment; does not install anything
  rules list            Show all 19 bundled rules

Options:
  --path DIR --project FILE.xcodeproj | --workspace FILE.xcworkspace
  --target NAME --target-id ID --configuration Release
  --sdk iphoneos|iphonesimulator --arch arm64|x86_64|unknown
  --config FILE|- --output DIR --language ja|en --format text|json
  --fail-on high|medium|low --require-complete --help --version

Requires macOS 14+ and Node 22.18+. No network or LLM API in audits.
Skill-only audits work without this CLI. This CLI never modifies app code.
`;
const stringOpts = [
  "path",
  "project",
  "workspace",
  "target",
  "target-id",
  "configuration",
  "sdk",
  "arch",
  "config",
  "output",
  "language",
  "format",
  "fail-on",
  "audit",
  "assessment",
  "baseline",
  "baseline-assessment",
  "check",
];
async function stdinText(): Promise<string> {
  let result = "",
    size = 0;
  for await (const c of process.stdin) {
    size += Buffer.byteLength(c);
    if (size > 1048576) throw Error("CONFIG_INVALID stdin limit");
    result += c;
  }
  return result;
}
async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    options: Object.fromEntries([
      ...stringOpts.map((k) => [k, { type: "string" }]),
      ...["help", "version", "require-complete"].map((k) => [
        k,
        { type: "boolean" },
      ]),
    ]) as any,
    allowPositionals: true,
    strict: true,
  });
  const opts: Json = {};
  for (const [k, v] of Object.entries(values))
    opts[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  if (opts.help) {
    console.log(help);
    return 0;
  }
  if (opts.version) {
    console.log(VERSION);
    return 0;
  }
  const cmd = positionals[0] || "audit";
  if (
    !["audit", "report", "fix", "verify", "init", "doctor", "rules"].includes(
      cmd,
    ) ||
    positionals.length > (cmd === "rules" ? 2 : 1) ||
    (cmd === "rules" && positionals[1] !== "list")
  )
    throw Error("CONFIG_INVALID command");
  if (opts.project && opts.workspace)
    throw Error("CONFIG_INVALID choose project or workspace");
  if (opts.format && !["text", "json"].includes(opts.format))
    throw Error("CONFIG_INVALID format");
  if (opts.language && !["ja", "en"].includes(opts.language))
    throw Error("CONFIG_INVALID language");
  if (opts.failOn && !["high", "medium", "low"].includes(opts.failOn))
    throw Error("CONFIG_INVALID fail-on");
  const node = process.versions.node.split(".").map(Number);
  if (node[0] < 22 || (node[0] === 22 && node[1] < 18))
    throw Error("ENVIRONMENT_ERROR Node 22.18+ required");
  const root = await realpath(resolve(opts.path || process.cwd())),
    language = opts.language || "ja";
  function print(obj: any, text: string) {
    console.log(
      opts.format === "json" ? JSON.stringify(obj) : safeText(text, Infinity),
    );
  }
  if (cmd === "rules") {
    print(
      { version: VERSION, rules: RULES },
      RULES.map(
        (r) =>
          `${r.ruleId} ${r.severity} ${r.title[language]} · ${r.knowledgeAsOf}`,
      ).join("\n"),
    );
    return 0;
  }
  if (cmd === "doctor") {
    let plist = false;
    try {
      await access("/usr/bin/plutil");
      plist = true;
    } catch {}
    const good =
      process.platform === "darwin" &&
      Number(release().split(".")[0]) >= 23 &&
      plist;
    const result = {
      version: VERSION,
      node: process.versions.node,
      platform: process.platform,
      macOS14OrLater:
        process.platform === "darwin" && Number(release().split(".")[0]) >= 23,
      plutil: plist,
      ready: good,
      skillOptional: true,
    };
    print(result, JSON.stringify(result, null, 2));
    return good ? 0 : 4;
  }
  if (process.platform !== "darwin" || Number(release().split(".")[0]) < 23)
    throw Error(
      "ENVIRONMENT_ERROR macOS 14+ required; use the standalone Skill for basic audits",
    );
  if (cmd === "init") {
    const loaded = await configFor(root, opts);
    try {
      await lstat(join(root, "smoothsubmit.config.json"));
      throw Error("CONFIG_INVALID existing config will not be overwritten");
    } catch (e) {
      if ((e as any).code !== "ENOENT") throw e;
    }
    const result = await auditProject(
      root,
      loaded.config,
      loaded.origin,
      opts.output,
    );
    const { scope } = result.audit;
    const c = {
      schemaVersion: "1.0.0",
      project: scope.project,
      target: scope.targetName,
      configuration: scope.configuration,
      features: {
        accountCreation: "unknown",
        loginRequired: "unknown",
        authProviders: "unknown",
        productTypes: "unknown",
      },
      policy: {
        storefronts: "unknown",
        deviceFamilies: "unknown",
        distributionChannel: "app_store",
      },
    };
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      join(root, "smoothsubmit.config.json"),
      JSON.stringify(c, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    print(
      { path: "smoothsubmit.config.json" },
      "Created smoothsubmit.config.json. Consider excluding .smoothsubmit/ from Git.",
    );
    return 0;
  }
  if (cmd === "audit") {
    const input = await configFor(
        root,
        opts,
        opts.config === "-" ? await stdinText() : undefined,
      ),
      result = await auditProject(
        root,
        input.config,
        input.origin,
        opts.output,
      );
    console.error(`Saved ${result.directory}`);
    print(result.audit, render(result.report, input.config.language));
    return exitCode(
      effectiveChecks(result.report),
      result.audit.coverage.partial,
      opts,
    );
  }
  if (cmd === "report") {
    if (!opts.audit) throw Error("CONFIG_INVALID --audit required");
    const r = await createReport(
      opts.audit,
      root,
      opts.assessment,
      opts.output,
    );
    print(r.report, render(r.report, language));
    return exitCode(effectiveChecks(r.report), r.report.coverage.partial, opts);
  }
  if (cmd === "fix") {
    if (!opts.audit || !opts.check)
      throw Error("CONFIG_INVALID --audit and --check required");
    const r = await createFix(
      opts.audit,
      root,
      opts.check,
      opts.assessment,
      opts.output,
    );
    print(r, r.prompt);
    console.error(`Saved ${r.path}`);
    return 0;
  }
  if (!opts.baseline) throw Error("CONFIG_INVALID --baseline required");
  const r = await verifyProject(
    opts.baseline,
    root,
    opts,
    opts.config === "-" ? await stdinText() : undefined,
  );
  print(
    r.verification,
    `SmoothSubmit Verify\n${JSON.stringify(r.verification.summary, null, 2)}\n\n${render(r.report, language)}`,
  );
  console.error(`Saved ${r.directory}`);
  return exitCode(effectiveChecks(r.report), r.audit.coverage.partial, opts);
}
try {
  process.exitCode = await main();
} catch (e) {
  const message = (e as Error).message;
  console.error(safeText(message));
  process.exitCode =
    /CONFIG_INVALID|AMBIGUOUS_TARGET|STALE_SNAPSHOT|ASSESSMENT_INVALID|JSON|Unknown option|Unexpected/.test(
      message,
    )
      ? 1
      : 4;
}
