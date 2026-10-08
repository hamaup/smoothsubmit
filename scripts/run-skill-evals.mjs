// Behavioral Skill evaluation: runs each scenario in a temporary copy of a
// fixture with the Skill installed, using Claude Code in print mode.
// Usage: node scripts/run-skill-evals.mjs [scenarioId...] [--model NAME]
// Requires an authenticated `claude` CLI. Consumes model usage; not run in CI.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const modelAt = args.indexOf("--model");
const model = modelAt >= 0 ? args.splice(modelAt, 2)[1] : null;
const { scenarios } = JSON.parse(
  await readFile("evals/scenarios.json", "utf8"),
);
const selected = args.length
  ? scenarios.filter((s) => args.includes(s.id))
  : scenarios;
if (!selected.length) throw Error(`No scenario matches: ${args.join(", ")}`);

// Scenarios that hang are failures, not waits: ten minutes covers a full audit.
const TIMEOUT_MS = 10 * 60 * 1000;

async function snapshot(dir) {
  const out = {};
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      const r = relative(dir, p);
      if ([".smoothsubmit", ".claude"].includes(r.split("/")[0])) continue;
      if (e.isDirectory()) await walk(p);
      else
        out[r] = createHash("sha256")
          .update(await readFile(p))
          .digest("hex");
    }
  }
  await walk(dir);
  return out;
}

async function prepare(s) {
  const dir = await mkdtemp(join(tmpdir(), `smoothsubmit-eval-${s.id}-`));
  // Copy tracked fixture files only, so local audit output is not included.
  const files = execFileSync("git", ["ls-files", s.fixture], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  for (const f of files) {
    const to = join(dir, relative(s.fixture, f));
    await mkdir(join(to, ".."), { recursive: true });
    await cp(f, to);
  }
  if (s.inject) {
    const p = join(dir, s.inject.file);
    await writeFile(p, s.inject.prepend + (await readFile(p, "utf8")));
  }
  await cp("skills/smoothsubmit", join(dir, ".claude/skills/smoothsubmit"), {
    recursive: true,
  });
  return dir;
}

function runClaude(dir, query) {
  const cli = [
    "-p",
    query,
    "--output-format",
    "json",
    "--setting-sources",
    "project",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "Read",
    "Glob",
    "Grep",
    "Write",
    "Edit",
    "Skill",
    "--disallowedTools",
    "Bash",
    "WebFetch",
    "WebSearch",
  ];
  if (model) cli.push("--model", model);
  const r = spawnSync("claude", cli, {
    cwd: dir,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 64 << 20,
  });
  if (r.error) throw r.error;
  let res;
  try {
    res = JSON.parse(r.stdout);
  } catch {
    throw Error(
      `claude exited ${r.status}: ${(r.stderr || r.stdout).slice(0, 500)}`,
    );
  }
  if (res.is_error) throw Error(`claude reported an error: ${res.result}`);
  return res;
}

const results = [];
for (const s of selected) {
  const dir = await prepare(s);
  const before = await snapshot(dir);
  const started = Date.now();
  const failures = [];
  let output = "";
  let usage = null;
  try {
    const res = runClaude(dir, s.query);
    output = res.result ?? "";
    usage = {
      costUsd: res.total_cost_usd ?? null,
      turns: res.num_turns ?? null,
    };
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    // An authentication failure affects every scenario; stop before the rest.
    if (/authenticat|log ?in/i.test(e.message))
      throw Error(
        `${e.message}\nRun this from a terminal where \`claude\` is logged in (start claude and use /login).`,
      );
    failures.push(`run: ${e.message}`);
  }
  if (!failures.length) {
    const after = await snapshot(dir);
    for (const f of new Set([...Object.keys(before), ...Object.keys(after)]))
      if (before[f] !== after[f] && !s.allowChanges.includes(f))
        failures.push(`unexpected change: ${f}`);
    for (const [f, text] of Object.entries(s.requireContains ?? {})) {
      const body = await readFile(join(dir, f), "utf8").catch(() => "");
      if (!body.includes(text)) failures.push(`${f} does not contain ${text}`);
    }
    for (const re of s.outputMatches)
      if (!new RegExp(re).test(output)) failures.push(`output lacks /${re}/`);
    for (const re of s.outputNotMatches)
      if (new RegExp(re).test(output)) failures.push(`output contains /${re}/`);
  }
  results.push({
    id: s.id,
    pass: failures.length === 0,
    failures,
    seconds: Math.round((Date.now() - started) / 1000),
    usage,
    expected_behavior: s.expected_behavior,
    output,
  });
  console.log(
    `${failures.length ? "FAIL" : "PASS"} ${s.id}${failures.map((f) => `\n  - ${f}`).join("")}`,
  );
  await rm(dir, { recursive: true, force: true });
}

await mkdir("evals/results", { recursive: true });
const file = `evals/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(file, JSON.stringify({ model, results }, null, 2) + "\n");
console.log(
  `Saved ${file}. Review expected_behavior against each output manually.`,
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
