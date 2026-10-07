import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, cp, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const run = promisify(execFile),
  root = process.cwd(),
  manifest = JSON.parse(await readFile("package.json", "utf8")),
  dir = await mkdtemp(join(tmpdir(), "smoothsubmit-pack-"));
try {
  await run("npm", [
    "install",
    "--prefix",
    dir,
    "--ignore-scripts",
    join(root, `smoothsubmit-cli-${manifest.version}.tgz`),
  ]);
  await cp("examples/ReviewDemo", join(dir, "app"), {
    recursive: true,
    filter: (p) => !p.includes(".smoothsubmit"),
  });
  const bin = join(dir, "node_modules/@smoothsubmit/cli/dist/cli/index.js");
  const guard = join(root, "tests/offline-guard.mjs");
  const { stdout } = await run(process.execPath, [
    "--import",
    guard,
    bin,
    "audit",
    "--path",
    join(dir, "app"),
    "--format",
    "json",
  ]);
  const audit = JSON.parse(stdout);
  if (audit.summary.failCounts.HIGH !== 3)
    throw Error("Pack audit did not detect the sample omissions.");
  const before = await readFile(join(dir, "app/App/App.swift"));
  const fail = audit.checks.find(
    (c) => c.ruleId === "ARG-PERM-001" && c.status === "FAIL",
  );
  const appRoot = await realpath(join(dir, "app"));
  const { stdout: fix } = await run(process.execPath, [
    bin,
    "fix",
    "--path",
    appRoot,
    "--audit",
    join(appRoot, ".smoothsubmit/runs", audit.auditId, "audit.json"),
    "--check",
    fail.checkId,
    "--format",
    "json",
  ]);
  if (
    !JSON.parse(fix).prompt.includes(fail.checkId) ||
    !before.equals(await readFile(join(dir, "app/App/App.swift")))
  )
    throw Error("Pack fix modified source.");
  console.log(
    `Package install, offline audit and read-only fix passed (${manifest.version}).`,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
