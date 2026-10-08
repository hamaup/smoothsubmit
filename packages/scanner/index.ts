import {
  opendir,
  readFile,
  lstat,
  realpath,
  mkdtemp,
  writeFile,
  rm,
} from "node:fs/promises";
import { join, relative, dirname, resolve, posix, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  sha,
  hash,
  evidence,
  safePath,
  type Json,
  type Diagnostic,
} from "../contracts/index.js";
import { parseOpenStep } from "./openstep.js";
import { resolveSettings } from "./settings.js";
import { lexSwift, type Token } from "./swift.js";
const run = promisify(execFile);
const SKIP = new Set([
  ".git",
  "node_modules",
  "DerivedData",
  ".build",
  "Pods",
  "Carthage",
  "build",
  "dist",
  ".smoothsubmit",
  ".artifact-tmp",
  ".test-cache",
  ".swiftpm",
  ".pytest_cache",
  "__pycache__",
  ".playwright-mcp",
]);
const interesting = (p: string) =>
  /project\.pbxproj$|contents\.xcworkspacedata$|\.(xcconfig|plist|entitlements|xcprivacy|swift|storekit|strings|xcstrings)$|Package\.resolved$|Podfile\.lock$|smoothsubmit\.config\.json$/.test(
    p,
  );
export function glob(pattern: string): RegExp {
  return new RegExp(
    "^" +
      pattern
        .split(/(\*\*\/|\*\*|\*|\?)/)
        .map((s) =>
          s === "**/"
            ? "(?:.*/)?"
            : s === "**"
              ? ".*"
              : s === "*"
                ? "[^/]*"
                : s === "?"
                  ? "[^/]"
                  : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("") +
      "$",
  );
}
interface EnumerationSkip {
  path: string;
  code:
    | "GENERATED_DIRECTORY_SKIPPED"
    | "EXCLUDED_DIRECTORY"
    | "INPUT_LIMIT_EXCEEDED"
    | "ENUMERATION_READ_FAILED";
  reason: string;
}
export interface EnumerationLimits {
  maxEntries: number;
  maxDirectories: number;
  maxFiles: number;
  maxDepth: number;
  maxMilliseconds: number;
}
const ENUMERATION_LIMITS: EnumerationLimits = {
  maxEntries: 100000,
  maxDirectories: 10000,
  maxFiles: 10000,
  maxDepth: 64,
  maxMilliseconds: 30000,
};
// Explicit references are loaded separately; generated directories are never
// treated as proof that a selected target has no sources in that directory.
export async function listFiles(
  root: string,
  exclusions: Json[] = [],
  limits: EnumerationLimits = ENUMERATION_LIMITS,
): Promise<{
  paths: string[];
  unread: string[];
  skipped: EnumerationSkip[];
  fingerprint: string;
}> {
  const paths: string[] = [],
    unread: string[] = [],
    skipped: EnumerationSkip[] = [];
  const directoryExclusions = exclusions
    .filter((x) => x.pathPattern.endsWith("/**"))
    .map((x) => ({ re: glob(x.pathPattern.slice(0, -3)), reason: x.reason }));
  let entries = 0,
    directories = 0,
    stopped = false;
  const deadline = Date.now() + limits.maxMilliseconds;
  function stop(path: string, reason: string) {
    if (!stopped) skipped.push({ path, code: "INPUT_LIMIT_EXCEEDED", reason });
    stopped = true;
  }
  async function walk(dir: string, depth: number) {
    if (stopped) return;
    if (depth > limits.maxDepth) {
      skipped.push({
        path: dir,
        code: "INPUT_LIMIT_EXCEEDED",
        reason: "Directory depth limit exceeded",
      });
      return;
    }
    if (++directories > limits.maxDirectories)
      return stop(dir, "Directory count limit exceeded");
    if (Date.now() > deadline)
      return stop(dir, "Enumeration time limit exceeded");
    const children = [];
    try {
      const handle = await opendir(join(root, dir));
      for await (const d of handle) {
        if (++entries > limits.maxEntries) {
          stop(dir, "Directory entry limit exceeded");
          break;
        }
        if (Date.now() > deadline) {
          stop(dir, "Enumeration time limit exceeded");
          break;
        }
        children.push(d);
      }
    } catch {
      skipped.push({
        path: dir,
        code: "ENUMERATION_READ_FAILED",
        reason: "Directory could not be enumerated",
      });
      return;
    }
    for (const d of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if (stopped) break;
      const p = posix.join(dir, d.name);
      if (
        d.name.startsWith(".env") ||
        /\.(p8|p12|pem|key|mobileprovision|cer)$/.test(d.name)
      )
        continue;
      if (d.isSymbolicLink()) {
        if (SKIP.has(d.name) || /\.(xcarchive|xcresult|dSYM)$/.test(d.name))
          skipped.push({
            path: p,
            code: "GENERATED_DIRECTORY_SKIPPED",
            reason: "Generated output or dependency cache link; not followed",
          });
        else unread.push(p);
        continue;
      }
      if (d.isDirectory()) {
        const exclusion = directoryExclusions.find((x) => x.re.test(p));
        if (exclusion)
          skipped.push({
            path: p,
            code: "EXCLUDED_DIRECTORY",
            reason: exclusion.reason,
          });
        else if (
          SKIP.has(d.name) ||
          /\.(xcarchive|xcresult|dSYM)$/.test(d.name)
        )
          skipped.push({
            path: p,
            code: "GENERATED_DIRECTORY_SKIPPED",
            reason:
              "Generated output or dependency cache; contents not enumerated",
          });
        else await walk(p, depth + 1);
      } else if (d.isFile() && interesting(p)) {
        if (paths.length >= limits.maxFiles) {
          stop(p, "Input file count limit exceeded");
          break;
        }
        paths.push(p);
      }
    }
  }
  await walk("", 0);
  paths.sort();
  unread.sort();
  skipped.sort((a, b) => a.path.localeCompare(b.path));
  return {
    paths,
    unread,
    skipped,
    fingerprint: hash({
      paths,
      unread,
      skipped: skipped.filter(
        (x) => posix.basename(x.path) !== ".smoothsubmit",
      ),
    }),
  };
}
export interface Scan {
  root: string;
  scope: Json;
  settings: Json;
  config: Json;
  files: Json[];
  buffers: Map<string, Buffer>;
  tokens: Map<string, Token[]>;
  info: Json | null;
  infoUnknown: Set<string>;
  infoEvidence: Json;
  manifests: Json[];
  entitlements: Json | null;
  dependencies: Json[];
  products: Json[];
  localizations: Json[];
  diagnostics: Diagnostic[];
  partial: boolean;
  enumerationHash: string;
}
export async function scan(
  rootPath: string,
  config: Json,
  configPath?: string,
): Promise<Scan> {
  const root = await realpath(rootPath),
    initial = await listFiles(root, config.exclude),
    files: Json[] = [],
    buffers = new Map<string, Buffer>(),
    diagnostics: Diagnostic[] = [];
  let total = 0,
    partial = false;
  const diag = (
    code: string,
    path: string | null,
    message: string,
    level: "warning" | "error" = "warning",
  ) => {
    diagnostics.push({
      code,
      level,
      stage: "scanner",
      path,
      message,
      affectedRuleIds: [],
      affectedCheckIds: [],
      remedy: "Confirm the input and rerun the audit.",
    });
  };
  for (const skipped of initial.skipped) {
    diag(
      skipped.code,
      skipped.path || null,
      skipped.reason,
      skipped.code === "ENUMERATION_READ_FAILED" ? "error" : "warning",
    );
    if (skipped.code !== "GENERATED_DIRECTORY_SKIPPED") partial = true;
  }
  const overlaps = (a: string, b: string) =>
    !a || !b || a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
  const normalizedPaths = new Set<string>();
  for (const path of initial.paths) {
    const normalized = path.normalize("NFC");
    if (normalizedPaths.has(normalized))
      throw Error("CONFIG_INVALID colliding normalized paths");
    normalizedPaths.add(normalized);
  }
  const ignored = config.exclude.map((x: Json) => ({
    re: glob(x.pathPattern),
    reason: x.reason,
  }));
  async function load(
    p: string,
    role: string,
    membership = "supporting",
  ): Promise<Buffer | null> {
    if (buffers.has(p)) return buffers.get(p)!;
    if (files.some((f) => f.path === p)) return null;
    if (!safePath(p)) {
      diag("EXTERNAL_REFERENCE", null, "Unsafe or external reference");
      partial = true;
      return null;
    }
    const ex = ignored.find((e: any) => e.re.test(p));
    if (ex) {
      files.push({
        path: p,
        sizeBytes: 0,
        sha256: null,
        role,
        membership: "excluded",
        reason: ex.reason,
      });
      partial = true;
      return null;
    }
    const generated = initial.skipped.find(
      (x) =>
        x.code === "GENERATED_DIRECTORY_SKIPPED" &&
        (p === x.path || p.startsWith(x.path + "/")),
    );
    if (generated) {
      diag(
        "GENERATED_INPUT_REFERENCED",
        p,
        "Project/config explicitly references a skipped generated directory; referenced file is read, wider membership remains unverified.",
      );
      partial = true;
    }
    try {
      const full = await realpath(join(root, p));
      if (!full.startsWith(root + "/")) {
        partial = true;
        diag("EXTERNAL_REFERENCE", p, "Reference leaves audit root");
        return null;
      }
      const stat = await lstat(join(root, p));
      if (stat.isSymbolicLink()) {
        partial = true;
        diag("EXTERNAL_REFERENCE", p, "Symbolic link skipped");
        return null;
      }
      if (!stat.isFile()) throw Error("Referenced input is not a regular file");
      if (stat.size > 5 * 1048576 || total + stat.size > 100 * 1048576) {
        partial = true;
        files.push({
          path: p,
          sizeBytes: stat.size,
          sha256: null,
          role,
          membership: "unknown",
          reason: "INPUT_LIMIT_EXCEEDED",
        });
        diag("INPUT_LIMIT_EXCEEDED", p, "Input byte limit exceeded");
        return null;
      }
      const b = await readFile(full);
      total += b.length;
      files.push({
        path: p,
        sizeBytes: b.length,
        sha256: sha(b),
        role,
        membership,
      });
      buffers.set(p, b);
      return b;
    } catch (e) {
      partial = true;
      files.push({
        path: p,
        sizeBytes: 0,
        sha256: null,
        role,
        membership: "unknown",
        reason: "READ_FAILED",
      });
      diag("READ_FAILED", p, "Unable to read referenced input", "error");
      return null;
    }
  }
  let projects = initial.paths.filter((p) =>
    p.endsWith(".xcodeproj/project.pbxproj"),
  );
  if (config.workspace) {
    const p = posix.join(config.workspace, "contents.xcworkspacedata"),
      b = await load(p, "project");
    if (!b) throw Error("AMBIGUOUS_TARGET workspace unreadable");
    const refs = [
      ...b.toString().matchAll(/location="(group|container|self):([^"<>]+)"/g),
    ].map((m) =>
      posix.normalize(
        posix.join(posix.dirname(config.workspace), m[2], "project.pbxproj"),
      ),
    );
    projects = projects.filter((p) => refs.includes(p));
  }
  if (config.project)
    projects = projects.filter(
      (p) => p === posix.join(config.project, "project.pbxproj"),
    );
  const models: Json[] = [];
  for (const p of projects) {
    const b = await load(p, "project");
    if (!b) continue;
    let obj: Json;
    try {
      obj = parseOpenStep(b.toString());
    } catch {
      diag("PARSE_ERROR", p, "Cannot parse Xcode project", "error");
      continue;
    }
    const objects = obj.objects;
    if (!objects) continue;
    const filePaths: Json = {},
      visiting = new Set<string>();
    function paths(id: string, parent = "") {
      if (visiting.has(id)) return;
      visiting.add(id);
      const x = objects[id];
      if (!x) return;
      let path = parent;
      if (x.sourceTree === "SOURCE_ROOT") path = "";
      if (x.path) {
        if (
          x.sourceTree &&
          !["<group>", "SOURCE_ROOT"].includes(x.sourceTree)
        ) {
          filePaths[id] = null;
          return;
        }
        path = posix.normalize(posix.join(path, x.path));
      }
      filePaths[id] = path;
      for (const child of x.children || []) paths(child, path);
    }
    const project = objects[obj.rootObject];
    paths(project?.mainGroup);
    for (const [id, x] of Object.entries(objects) as [string, Json][])
      if (
        x.isa === "PBXFileSystemSynchronizedRootGroup" &&
        !Object.hasOwn(filePaths, id)
      )
        paths(id);
    for (const [id, t] of Object.entries(objects) as [string, Json][]) {
      if (
        t.isa !== "PBXNativeTarget" ||
        t.productType !== "com.apple.product-type.application"
      )
        continue;
      const cfg = (listId: string) =>
        objects[
          objects[listId]?.buildConfigurations?.find(
            (k: string) => objects[k]?.name === config.configuration,
          )
        ];
      const pc = cfg(project?.buildConfigurationList),
        tc = cfg(t.buildConfigurationList);
      if (!tc) {
        if (config.target === t.name || config.targetId === id)
          throw Error("CONFIG_INVALID configuration does not exist");
        continue;
      }
      const projectDir = posix.dirname(posix.dirname(p));
      const rootRelative = (q: string) =>
        posix.normalize(posix.join(projectDir, q));
      const xc = (c: Json) => {
        if (c?.baseConfigurationReference)
          return filePaths[c.baseConfigurationReference]
            ? rootRelative(filePaths[c.baseConfigurationReference])
            : null;
        if (c?.baseConfigurationReferenceAnchor) {
          const anchor = filePaths[c.baseConfigurationReferenceAnchor];
          if (
            anchor === undefined ||
            anchor === null ||
            !c.baseConfigurationReferenceRelativePath
          ) {
            diag(
              "UNRESOLVED_BUILD_SETTING",
              p,
              "xcconfig anchor/path could not be resolved",
            );
            partial = true;
            return null;
          }
          return rootRelative(
            posix.join(anchor, c.baseConfigurationReferenceRelativePath),
          );
        }
        return null;
      };
      const st = await resolveSettings(
        [xc(pc), pc?.buildSettings, xc(tc), tc?.buildSettings],
        {
          SRCROOT: posix.join(root, projectDir),
          PROJECT_DIR: posix.join(root, projectDir),
          PROJECT_NAME:
            project?.name || posix.basename(posix.dirname(p), ".xcodeproj"),
          TARGET_NAME: t.name,
          CONFIGURATION: config.configuration,
        },
        async (q) => (await load(q, "settings"))?.toString() ?? null,
        { sdk: config.sdk, arch: config.arch, config: config.configuration },
      );
      const platform = st.values.SUPPORTED_PLATFORMS || st.values.SDKROOT;
      const ios = !!platform && /iphone/.test(platform);
      if (!ios) continue;
      const members: Json = {};
      const membershipOmissions = new Set<string>();
      const unresolvedMembers: string[] = [];
      for (const phaseId of t.buildPhases || []) {
        const phase = objects[phaseId];
        if (!phase) continue;
        for (const buildId of phase.files || []) {
          const b = objects[buildId],
            f = filePaths[b?.fileRef];
          if (f) {
            const path = rootRelative(f);
            members[path] =
              (b.platformFilter &&
                !["ios", "iphonesimulator"].includes(b.platformFilter)) ||
              (Array.isArray(b.platformFilters) &&
                b.platformFilters.some((x: string) => x !== "ios")) ||
              (path.endsWith("PrivacyInfo.xcprivacy") &&
                phase.isa !== "PBXResourcesBuildPhase")
                ? "unknown"
                : "included";
          } else if (
            [
              "PBXSourcesBuildPhase",
              "PBXResourcesBuildPhase",
              "PBXCopyFilesBuildPhase",
            ].includes(phase.isa)
          ) {
            unresolvedMembers.push(buildId);
          }
        }
      }
      for (const groupId of t.fileSystemSynchronizedGroups || []) {
        const g = objects[groupId],
          gp = filePaths[groupId];
        if (!gp) {
          partial = true;
          diag("UNRESOLVED_MEMBERSHIP", p, "Synchronized root unresolved");
          continue;
        }
        const prefix = rootRelative(gp);
        for (const skipped of initial.skipped)
          if (overlaps(prefix, skipped.path))
            membershipOmissions.add(skipped.path);
        const excluded = new Set<string>(),
          uncertain = new Set<string>();
        for (const exId of g.exceptions || []) {
          const ex = objects[exId];
          if (!ex) {
            partial = true;
            continue;
          }
          if (ex.target && ex.target !== id) continue;
          if (ex.buildPhase && !t.buildPhases?.includes(ex.buildPhase))
            continue;
          for (const ep of ex.membershipExceptions || [])
            excluded.add(posix.join(prefix, ep));
          for (const [rp, filter] of Object.entries(
            ex.platformFiltersByRelativePath || {},
          )) {
            if (
              !Array.isArray(filter) ||
              (filter as string[]).some((x) => x !== "ios")
            )
              uncertain.add(posix.join(prefix, rp));
          }
        }
        for (const f of initial.paths.filter((f) =>
          f.startsWith(prefix + "/"),
        )) {
          if (!excluded.has(f))
            members[f] = uncertain.has(f) ? "unknown" : "included";
        }
      }
      const hasScript = (t.buildPhases || []).some(
        (x: string) => objects[x]?.isa === "PBXShellScriptBuildPhase",
      );
      models.push({
        project: posix.dirname(p),
        targetId: id,
        targetName: t.name,
        configuration: config.configuration,
        sdk: config.sdk,
        arch: config.arch,
        platforms: ["ios"],
        workspace: config.workspace,
        exclusions: config.exclude,
        settings: st.values,
        settingsDiagnostics: st.diagnostics,
        members,
        membershipOmissions: [...membershipOmissions],
        unresolvedMembers,
        hasScript,
      });
    }
  }
  const choices = models.filter(
    (m) =>
      (!config.target || m.targetName === config.target) &&
      (!config.targetId || m.targetId === config.targetId),
  );
  if (!choices.length) {
    const gaps = initial.skipped.filter((x) =>
      ["INPUT_LIMIT_EXCEEDED", "ENUMERATION_READ_FAILED"].includes(x.code),
    );
    if (gaps.length)
      throw Error(
        `${gaps[0].code} target selection interrupted; omitted inputs: ${JSON.stringify(gaps)}`,
      );
  }
  if (choices.length !== 1)
    throw Error(
      `AMBIGUOUS_TARGET ${choices.length ? JSON.stringify(choices.map(({ project, targetName, targetId }) => ({ project, targetName, targetId }))) + " Select --project and --target (or --target-id)." : "No matching iOS application target. Check --configuration and xcconfig references."}`,
    );
  const model = choices[0];
  model.settingsDiagnostics.forEach((m: string) => {
    diag("UNRESOLVED_BUILD_SETTING", null, m);
    partial = true;
  });
  const {
    settings,
    members,
    hasScript,
    settingsDiagnostics,
    membershipOmissions,
    unresolvedMembers,
    ...scope
  } = model;
  if (unresolvedMembers.length) {
    partial = true;
    diag(
      "UNRESOLVED_MEMBERSHIP",
      posix.join(scope.project, "project.pbxproj"),
      `Selected target references unresolved source/resource build files: ${unresolvedMembers.join(", ")}`,
    );
  }
  for (const [path, membership] of Object.entries(members)) {
    if (membership !== "unknown") continue;
    partial = true;
    diag(
      "UNRESOLVED_MEMBERSHIP",
      path,
      "Selected file has unresolved platform filtering or app resource membership.",
    );
  }
  for (const path of membershipOmissions) {
    partial = true;
    diag(
      "UNRESOLVED_MEMBERSHIP",
      path || null,
      "Selected synchronized source group overlaps a directory omitted from enumeration; source/API absence remains unverified.",
    );
  }
  for (const p of initial.paths.filter((p) => p.endsWith("/Package.swift"))) {
    if (await load(p, "dependency_lock")) {
      partial = true;
      diag(
        "LOCAL_PACKAGE_SCOPE",
        p,
        "Local Swift package implementation is outside resolved Xcode source membership. The Skill should trace used products; the CLI does not execute Package.swift or resolve dependencies.",
      );
    }
  }
  const tokens = new Map<string, Token[]>(),
    manifests: Json[] = [],
    localizations: Json[] = [],
    dependencies: Json[] = [],
    products: Json[] = [];
  async function plist(
    p: string,
    role: string,
    membership = "included",
  ): Promise<Json | null> {
    const b = await load(p, role, membership);
    if (!b) return null;
    const dir = await mkdtemp(join(tmpdir(), "smoothsubmit-"));
    try {
      const xml = b.toString("utf8");
      if (/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(xml))
        throw Error("Unsafe XML entity declaration");
      if (xml.includes("<plist")) {
        const stack: Set<string>[] = [];
        for (const tag of xml.matchAll(
          /<dict\s*>|<\/dict\s*>|<key\s*>([\s\S]*?)<\/key\s*>/g,
        )) {
          if (tag[0].startsWith("</dict")) stack.pop();
          else if (tag[0].startsWith("<dict")) stack.push(new Set());
          else if (stack.length) {
            const key = tag[1]
              .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
              .replace(/&amp;/g, "&");
            const keys = stack.at(-1)!;
            if (keys.has(key)) throw Error("Duplicate plist key");
            keys.add(key);
          }
        }
      }
      const f = join(dir, "snapshot");
      await writeFile(f, b, { mode: 0o600 });
      const { stdout } = await run(
        "/usr/bin/plutil",
        ["-convert", "json", "-o", "-", "--", f],
        { timeout: 5000, maxBuffer: 10 * 1048576, shell: false },
      );
      const data = JSON.parse(stdout);
      if (
        ["plist", "entitlements", "localization"].includes(role) &&
        (!data || typeof data !== "object" || Array.isArray(data))
      )
        throw Error("Expected a plist dictionary");
      return data;
    } catch (e) {
      const timeout =
        (e as any).killed ||
        (e as any).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
      diag(
        timeout ? "PROCESS_ERROR" : "INVALID_PLIST",
        p,
        timeout ? "Plist process limit" : "Malformed or unsupported plist",
        timeout ? "error" : "warning",
      );
      return null;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const infoUnknown = new Set<string>(),
    infoEvidence: Json = {};
  let info: Json | null = null,
    entitlements: Json | null = null;
  const projectDir = posix.dirname(scope.project);
  const settingPath = (value: string) => {
    const full = posix.isAbsolute(value)
      ? posix.normalize(value)
      : posix.normalize(posix.join(root, projectDir, value));
    return full.startsWith(root + "/") ? full.slice(root.length + 1) : full;
  };
  // SRCROOT/PROJECT_DIR expansions already refer to the audit root. Keep them
  // absolute while resolving settings so relative literal paths can be rebased.
  if (settings.INFOPLIST_FILE) {
    const p = settingPath(settings.INFOPLIST_FILE);
    if (settings.INFOPLIST_PREPROCESS === "YES") {
      await load(p, "plist", "supporting");
      partial = true;
      diag(
        "PREPROCESSED_PLIST",
        p,
        "INFOPLIST_PREPROCESS=YES: final values require preprocessing/build verification; no project script was executed.",
      );
    } else info = await plist(p, "plist", "supporting");
    if (!info) infoUnknown.add("*");
    else
      for (const k of Object.keys(info))
        infoEvidence[k] = { path: p, keyPath: "/" + k };
  } else if (settings.GENERATE_INFOPLIST_FILE !== "YES") infoUnknown.add("*");
  if (
    settings.GENERATE_INFOPLIST_FILE === null ||
    settings.INFOPLIST_FILE === null
  )
    infoUnknown.add("*");
  const knownKeys = [
    "NSCameraUsageDescription",
    "NSMicrophoneUsageDescription",
    "NSLocationWhenInUseUsageDescription",
    "NSLocationAlwaysAndWhenInUseUsageDescription",
    "NSPhotoLibraryUsageDescription",
    "NSPhotoLibraryAddUsageDescription",
    "NSContactsUsageDescription",
    "NSUserTrackingUsageDescription",
  ];
  if (settings.GENERATE_INFOPLIST_FILE === "YES") {
    info ??= {};
    for (const key of knownKeys) {
      const v = settings["INFOPLIST_KEY_" + key];
      if (v === null) infoUnknown.add(key);
      if (v !== undefined && v !== null) {
        if (info[key] !== undefined && info[key] !== v) infoUnknown.add(key);
        else {
          info[key] = v;
          infoEvidence[key] = {
            path: posix.join(scope.project, "project.pbxproj"),
            keyPath: null,
          };
        }
      }
    }
  }
  for (const k of Object.keys(info || {})) {
    if (typeof info![k] === "string") {
      info![k] = info![k].replace(
        /\$\(([^)]+)\)|\$\{([^}]+)\}/g,
        (_: string, a: string, b: string) => {
          const v = settings[a || b];
          if (v === undefined || v === null) {
            infoUnknown.add(k);
            return "";
          }
          return v;
        },
      );
    }
  }
  if (hasScript || settings.INFOPLIST_PREPROCESS === "YES")
    infoUnknown.add("*");
  if (settings.CODE_SIGN_ENTITLEMENTS)
    entitlements = await plist(
      settingPath(settings.CODE_SIGN_ENTITLEMENTS),
      "entitlements",
      "supporting",
    );
  for (const [p, m] of Object.entries(members) as [string, string][]) {
    if (p.endsWith(".swift")) {
      const b = await load(p, "swift", m);
      if (b)
        try {
          tokens.set(
            p,
            lexSwift(
              b.toString(),
              config.sdk,
              config.arch,
              (settings.SWIFT_ACTIVE_COMPILATION_CONDITIONS || "").split(/\s+/),
            ),
          );
        } catch {
          diag("PARSE_ERROR", p, "Cannot tokenize Swift", "error");
        }
    }
    if (p.endsWith("PrivacyInfo.xcprivacy")) {
      const data = await plist(p, "manifest", m);
      manifests.push({
        path: p,
        data,
        membership: m,
        fileHash: buffers.has(p) ? sha(buffers.get(p)!) : null,
      });
    }
    if (/InfoPlist\.(strings|xcstrings)$/.test(p)) {
      const b = await load(p, "localization", m);
      if (b) {
        try {
          if (p.endsWith(".xcstrings")) {
            const x = JSON.parse(b.toString());
            if (x.version !== "1.0") throw Error();
            for (const [key, entry] of Object.entries(x.strings || {}) as [
              string,
              Json,
            ][])
              for (const [locale, v] of Object.entries(
                entry.localizations || {},
              ) as [string, Json][])
                localizations.push({
                  path: p,
                  key,
                  locale,
                  value: v.stringUnit?.value ?? null,
                });
          } else {
            const data = await plist(p, "localization", m);
            if (data)
              for (const [key, value] of Object.entries(data))
                localizations.push({
                  path: p,
                  key,
                  locale: p.match(/([^/]+)\.lproj\//)?.[1] || "base",
                  value,
                });
          }
        } catch {
          diag("UNSUPPORTED_LOCALIZATION", p, "Unsupported localization");
          partial = true;
        }
      }
    }
  }
  for (const p of initial.paths.filter(
    (p) => p.endsWith("Package.resolved") || p.endsWith("Podfile.lock"),
  )) {
    const b = await load(p, "dependency_lock");
    if (!b) continue;
    try {
      if (p.endsWith("Package.resolved")) {
        const j = JSON.parse(b.toString());
        if (![1, 2, 3].includes(j.version)) throw Error();
        for (const pin of j.pins || j.object?.pins || [])
          dependencies.push({
            manager: "spm",
            name: pin.identity || pin.package,
            version: pin.state?.version || "unknown",
            bundleKey: scope.targetId,
          });
      } else {
        if (/(^|\s)[&*!][A-Za-z]/m.test(b.toString())) throw Error();
        const section =
          b
            .toString()
            .match(/^PODS:\s*\n([\s\S]*?)(?=^[A-Z_]+:|$(?![\s\S]))/m)?.[1] ||
          "";
        for (const m of section.matchAll(/^  - ([\w.+/-]+) \(([^)]+)\)/gm))
          dependencies.push({
            manager: "pods",
            name: m[1],
            version: m[2],
            bundleKey: scope.targetId,
          });
      }
    } catch {
      diag("UNSUPPORTED_DEPENDENCY_LOCK", p, "Unsupported lockfile");
      partial = true;
    }
  }
  for (const p of config.storekitFiles) {
    const b = await load(p, "storekit");
    if (b)
      try {
        const j = JSON.parse(b.toString());
        if (!j.version) throw Error();
        products.push(
          ...(j.products || []),
          ...(j.subscriptionGroups || []).flatMap(
            (g: Json) => g.subscriptions || [],
          ),
        );
      } catch {
        diag("UNSUPPORTED_STOREKIT", p, "Unsupported StoreKit configuration");
        partial = true;
      }
  }
  if (initial.paths.includes("smoothsubmit.config.json"))
    await load("smoothsubmit.config.json", "config");
  if (configPath) await load(configPath, "config");
  initial.unread.forEach((p) => {
    diag("EXTERNAL_REFERENCE", p, "Symbolic link was skipped");
    partial = true;
  });
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    root,
    scope,
    settings,
    config,
    files,
    buffers,
    tokens,
    info,
    infoUnknown,
    infoEvidence,
    manifests,
    entitlements,
    dependencies,
    products,
    localizations,
    diagnostics,
    partial,
    enumerationHash: initial.fingerprint,
  };
}
export async function inputsChanged(s: Scan): Promise<boolean> {
  if (
    (await listFiles(s.root, s.config.exclude)).fingerprint !==
    s.enumerationHash
  )
    return true;
  for (const f of s.files.filter((f) => f.sha256)) {
    try {
      const real = await realpath(join(s.root, f.path));
      const stat = await lstat(real);
      if (
        !real.startsWith(s.root + "/") ||
        !stat.isFile() ||
        stat.size !== f.sizeBytes ||
        sha(await readFile(real)) !== f.sha256
      )
        return true;
    } catch {
      return true;
    }
  }
  return false;
}
export function fileEvidence(
  s: Scan,
  path: string,
  line: number | null,
  observation: string,
  keyPath: string | null = null,
) {
  return evidence(
    "file",
    {
      path,
      fileHash: sha(s.buffers.get(path)!),
      lineStart: line,
      lineEnd: line,
      keyPath,
    },
    observation,
  );
}
