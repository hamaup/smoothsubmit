import type { Json } from "../contracts/index.js";
export interface Settings {
  values: Json;
  unknown: Set<string>;
  origins: Json;
  diagnostics: string[];
}
export async function resolveSettings(
  layers: (Json | string | null)[],
  builtin: Json,
  read: (path: string) => Promise<string | null>,
  context: Json,
): Promise<Settings> {
  const values: Json = { ...builtin },
    unknown = new Set<string>(),
    origins: Json = {},
    diagnostics: string[] = [];
  type Assignment = { value: string | null; rank: number; origin: string };
  let assignments = new Map<string, Map<string, Assignment>>();
  function apply(key: string, raw: any, origin: string) {
    const match = key.match(/^([^\[]+)((?:\[[^\]]+\])*)$/);
    if (!match) {
      diagnostics.push(`Unsupported setting ${key}`);
      const base = key.match(/^[A-Za-z_][A-Za-z_0-9]*/)?.[0];
      if (base) {
        values[base] = null;
        unknown.add(base);
        const candidates =
          assignments.get(base) || new Map<string, Assignment>();
        candidates.set(key, { value: null, rank: 1, origin });
        assignments.set(base, candidates);
      }
      return;
    }
    key = match[1];
    let applicable = true,
      uncertain = false;
    const conditions = [...match[2].matchAll(/\[([^\]]+)\]/g)]
      .map((m) => m[1].trim())
      .sort();
    for (const text of conditions) {
      const m = text.match(/^(sdk|config|arch)=([^=]+)$/);
      if (!m) {
        uncertain = true;
        continue;
      }
      const ctx = context[m[1]];
      if (!ctx || ctx === "unknown") {
        uncertain = true;
        continue;
      }
      const re = new RegExp(
        "^" +
          m[2].replace(/[.+?^${}()|\\[\]]/g, "\\$&").replace(/\*/g, ".*") +
          "$",
      );
      if (!re.test(ctx)) {
        const platformPattern = m[2].replace(/[0-9.]+/g, "");
        const platformRe = new RegExp(
          "^" +
            platformPattern
              .replace(/[.+?^${}()|\\[\]]/g, "\\$&")
              .replace(/\*/g, ".*") +
            "$",
        );
        if (
          m[1] === "sdk" &&
          /^(iphoneos|iphonesimulator)$/.test(ctx) &&
          /[0-9]/.test(m[2]) &&
          platformRe.test(ctx)
        )
          uncertain = true;
        else applicable = false;
      }
    }
    if (!applicable) return;
    const str = (Array.isArray(raw) ? raw.join(" ") : String(raw)).replace(
      /\$\(inherited\)|\$\{inherited\}/g,
      () => {
        if (values[key] === null) uncertain = true;
        return values[key] || "";
      },
    );
    const candidates = assignments.get(key) || new Map<string, Assignment>();
    candidates.set(conditions.join("\0"), {
      value: uncertain ? null : str,
      rank: conditions.length,
      origin,
    });
    assignments.set(key, candidates);
    const all = [...candidates.values()];
    const rank = Math.max(...all.map((x) => x.rank));
    const selected = all.filter((x) => x.rank === rank);
    // An unknown condition could override any known assignment. Distinct
    // matching conditions of equal specificity must agree before we certify it.
    if (
      all.some((x) => x.value === null) ||
      new Set(selected.map((x) => x.value)).size !== 1
    ) {
      values[key] = null;
      unknown.add(key);
    } else {
      values[key] = selected[0].value;
      origins[key] = selected[0].origin;
      unknown.delete(key);
    }
  }
  async function config(path: string, chain: string[] = []): Promise<void> {
    if (chain.length >= 32 || chain.includes(path)) {
      diagnostics.push(`Include cycle/limit ${path}`);
      unknown.add("*");
      return;
    }
    const text = await read(path);
    if (text === null) {
      diagnostics.push(`Missing include ${path}`);
      unknown.add("*");
      return;
    }
    for (const line of text
      .replace(/\\\r?\n/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(/\r?\n/)) {
      const inc = line.match(/^\s*#include(\?)?\s+"([^"]+)"/);
      if (inc) {
        const { posix } = await import("node:path");
        const p = posix.isAbsolute(inc[2])
          ? inc[2]
          : posix.normalize(posix.join(posix.dirname(path), inc[2]));
        if (inc[1] && (await read(p)) === null) continue;
        await config(p, [...chain, path]);
        continue;
      }
      const m = line.match(
        /^\s*([A-Za-z_][A-Za-z_0-9]*(?:\[[^\]]+\])*)\s*=\s*(.*?)\s*$/,
      );
      if (m) apply(m[1].trim(), m[2].replace(/\s+\/\/.*$/, ""), path);
    }
  }
  for (const layer of layers) {
    assignments = new Map();
    if (typeof layer === "string") await config(layer);
    else if (layer)
      for (const [k, v] of Object.entries(layer)) apply(k, v, "pbxproj");
  }
  function expand(key: string, chain: string[] = []): string | null {
    if (
      chain.length >= 32 ||
      chain.includes(key) ||
      unknown.has(key) ||
      unknown.has("*")
    ) {
      unknown.add(key);
      return null;
    }
    if (values[key] === undefined) return null;
    let bad = false;
    const v = String(values[key]).replace(
      /\$\(([^)]+)\)|\$\{([^}]+)\}/g,
      (_, a, b) => {
        const x = expand(a || b, [...chain, key]);
        if (x === null) {
          bad = true;
          return "";
        }
        return x;
      },
    );
    if (bad) {
      unknown.add(key);
      return null;
    }
    return v;
  }
  const expanded: Json = {};
  for (const k of Object.keys(values)) {
    expanded[k] = expand(k);
    if (expanded[k] === null) diagnostics.push(`Unresolved setting ${k}`);
  }
  return { values: expanded, unknown, origins, diagnostics };
}
