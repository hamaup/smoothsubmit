import { readFile, readdir, access } from "node:fs/promises";
import { join, basename, posix } from "node:path";
const root = "skills/smoothsubmit";
const errors = [];
const s = await readFile(`${root}/SKILL.md`, "utf8");
const fm = s.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) throw Error("Invalid skill discovery metadata");
const field = (k) => fm[1].match(new RegExp(`^${k}: (.*)$`, "m"))?.[1];
const name = field("name");
const description = field("description");

// Agent Skills specification: name/description constraints.
if (
  !name ||
  name.length > 64 ||
  !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) ||
  name !== basename(root)
)
  errors.push(`name: invalid or does not match directory (${name})`);
if (!description || description.length > 1024 || /<[^>]+>/.test(description))
  errors.push("description: empty, over 1024 characters or contains tags");

// Every bundled file is linked directly from SKILL.md (one level deep).
const linked = new Set();
for (const m of s.matchAll(/\]\(([^)]+)\)/g)) {
  if (/^https?:/.test(m[1])) continue;
  linked.add(posix.normalize(m[1]));
  await access(join(root, m[1])).catch(() =>
    errors.push(`SKILL.md: missing ${m[1]}`),
  );
}
for (const dir of ["references", "assets"])
  for (const f of await readdir(join(root, dir)))
    if (!linked.has(`${dir}/${f}`))
      errors.push(`SKILL.md: ${dir}/${f} is not linked directly`);

// Reference files must not chain to other bundled files via Markdown links.
for (const f of await readdir(join(root, "references"))) {
  const r = await readFile(join(root, "references", f), "utf8");
  for (const m of r.matchAll(/\]\(([^)]+)\)/g))
    if (!/^https?:/.test(m[1]))
      errors.push(`references/${f}: nested local link ${m[1]}`);
}

// Skill, template and CLI versions stay in sync with package.json.
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const a = JSON.parse(
  await readFile(`${root}/assets/basic-audit.template.json`, "utf8"),
);
if (a.mode !== "basic" || a.execution.validation !== "unvalidated")
  errors.push("Invalid basic record boundary");
if (a.skillVersion !== version || a.rulepackVersion !== version)
  errors.push(`basic-audit.template.json: version is not ${version}`);
if (!s.includes(`matches CLI \`${version}\``))
  errors.push(`SKILL.md: CLI compatibility is not ${version}`);

if (errors.length) throw Error(errors.join("\n"));
console.log(
  `Skill ${name} ${version}: metadata, ${linked.size} direct resources and versions valid. Behavioral host validation is tracked separately.`,
);
