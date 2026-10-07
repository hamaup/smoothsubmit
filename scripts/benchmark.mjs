import { mkdtemp, cp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, platform, release } from "node:os";
import { auditProject, configFor } from "../dist/core/index.js";
const dir = await mkdtemp(join(tmpdir(), "smoothsubmit-bench-"));
try {
  await cp("examples/ReviewDemo", dir, {
    recursive: true,
    filter: (p) => !p.includes(".smoothsubmit"),
  });
  const p = join(dir, "ReviewDemo.xcodeproj/project.pbxproj");
  let pbx = await readFile(p, "utf8");
  pbx = pbx
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
    );
  await writeFile(p, pbx);
  const body = 'let benchLiteral = "' + "x".repeat(20940) + '"\n';
  for (let i = 0; i < 999; i++)
    await writeFile(join(dir, `App/Bench${i}.swift`), body);
  const { config, origin } = await configFor(dir, {});
  const start = performance.now(),
    r = await auditProject(dir, config, origin);
  const elapsedMs = performance.now() - start;
  console.log(
    JSON.stringify(
      {
        date: "2026-10-07",
        platform: platform(),
        osRelease: release(),
        node: process.version,
        swiftFiles: r.audit.snapshot.files.filter((x) => x.role === "swift")
          .length,
        bytes: r.audit.snapshot.files.reduce((n, x) => n + x.sizeBytes, 0),
        elapsedMs: Math.round(elapsedMs),
        maxRSSMiB: Math.round(process.resourceUsage().maxRSS / 1024),
        targetSeconds: 30,
        targetMiB: 512,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
