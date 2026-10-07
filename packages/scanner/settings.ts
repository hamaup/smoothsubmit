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
  function apply(key: string, raw: any, origin: string) {
    const match = key.match(/^([^\[]+)((?:\[[^\]]+\])*)$/);
    if (!match) {
      diagnostics.push(`Unsupported setting ${key}`);
      return;
    }
    key = match[1];
    let applicable = true,
      uncertain = false;
    for (const m of match[2].matchAll(/\[([^=]+)=([^\]]+)\]/g)) {
      const ctx = context[m[1]];
      if (!ctx || ctx === "unknown") {
        uncertain = true;
        continue;
      }
      const re = new RegExp(
        "^" + m[2].replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
      );
      if (!re.test(ctx)) applicable = false;
    }
    if (!applicable) return;
    if (uncertain) {
      values[key] = null;
      unknown.add(key);
      diagnostics.push(`Unresolved condition ${key}`);
      return;
    }
    const str = (Array.isArray(raw) ? raw.join(" ") : String(raw)).replace(
      /\$\(inherited\)|\$\{inherited\}/g,
      values[key] || "",
    );
    values[key] = str;
    origins[key] = origin;
    unknown.delete(key);
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
        const p = posix.normalize(posix.join(posix.dirname(path), inc[2]));
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
