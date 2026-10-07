import { readFile, access } from "node:fs/promises";
const s = await readFile("skills/smoothsubmit/SKILL.md", "utf8");
if (
  !s.startsWith("---\nname: smoothsubmit\ndescription: ") ||
  !s.includes("\n---\n")
)
  throw Error("Invalid skill discovery metadata");
for (const m of s.matchAll(/\]\(([^)]+)\)/g))
  await access("skills/smoothsubmit/" + m[1]);
for (const p of [
  "audit",
  "records",
  "rules",
  "apple-sources",
  "fix-verify-notes",
])
  await access(`skills/smoothsubmit/references/${p}.md`);
const a = JSON.parse(
  await readFile(
    "skills/smoothsubmit/assets/basic-audit.template.json",
    "utf8",
  ),
);
if (a.mode !== "basic" || a.execution.validation !== "unvalidated")
  throw Error("Invalid basic record boundary");
console.log(
  "Skill metadata/resources valid. Behavioral host validation is tracked separately.",
);
