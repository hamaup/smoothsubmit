import { mkdtemp, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configFor, auditProject } from "../dist/core/index.js";
export async function fixture(t, fixed = false) {
  const dir = await mkdtemp(join(tmpdir(), "smoothsubmit-test-"));
  await cp(
    new URL(
      fixed ? "../examples/ReviewDemoFixed/" : "../examples/ReviewDemo/",
      import.meta.url,
    ),
    dir,
    { recursive: true, filter: (p) => !p.includes(".smoothsubmit") },
  );
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
export async function audit(root, overlay = {}) {
  const { config, origin } = await configFor(root, {});
  Object.assign(config, overlay);
  return auditProject(root, config, origin);
}
export async function patch(root, file, fn) {
  const p = join(root, file);
  await writeFile(p, fn(await readFile(p, "utf8")));
}
export const condition = (result, id, component) =>
  result.audit.checks.find(
    (c) => c.ruleId === id && c.subject.subjectKey.component === component,
  );
