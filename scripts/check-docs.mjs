import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
const files = [];
async function walk(dir) {
  for (const d of await readdir(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", ".smoothsubmit"].includes(d.name))
      continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) await walk(p);
    else if (p.endsWith(".md")) files.push(p);
  }
}
await walk(".");
let links = 0;
const errors = [];
for (const p of files) {
  const s = await readFile(p, "utf8");
  if ((s.match(/^```/gm) || []).length % 2) errors.push(`${p}: code fence`);
  for (const m of s.matchAll(/^```json\n([\s\S]*?)^```/gm)) {
    try {
      JSON.parse(m[1]);
    } catch {
      errors.push(`${p}: JSON example`);
    }
  }
  for (const m of s.matchAll(/\]\(([^)]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|app:|#)/.test(target)) continue;
    if (/[<>]/.test(target)) continue;
    try {
      await access(join(dirname(p), target.split("#")[0]));
      links++;
    } catch {
      errors.push(`${p}: ${target}`);
    }
  }
}
if (errors.length) throw Error(errors.join("\n"));
console.log(
  `Verified ${files.length} Markdown files and ${links} local links.`,
);
