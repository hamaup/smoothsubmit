export interface Token {
  text: string;
  line: number;
  condition: "active" | "inactive" | "unknown";
}
type Tri = true | false | null;
function and(a: Tri, b: Tri): Tri {
  return a === false || b === false
    ? false
    : a === null || b === null
      ? null
      : true;
}
function or(a: Tri, b: Tri): Tri {
  return a === true || b === true
    ? true
    : a === null || b === null
      ? null
      : false;
}
export function condition(
  expr: string,
  sdk: string,
  arch: string,
  flags: string[],
): Tri {
  expr = expr.trim();
  if (expr.includes("||"))
    return expr
      .split("||")
      .map((x) => condition(x, sdk, arch, flags))
      .reduce(or);
  if (expr.includes("&&"))
    return expr
      .split("&&")
      .map((x) => condition(x, sdk, arch, flags))
      .reduce(and);
  if (expr[0] === "!") {
    const x = condition(expr.slice(1), sdk, arch, flags);
    return x === null ? null : !x;
  }
  if (/^os\(iOS\)$/.test(expr)) return true;
  if (/^os\((macOS|tvOS|watchOS|visionOS|Linux)\)$/.test(expr)) return false;
  if (expr === "targetEnvironment(simulator)") return sdk === "iphonesimulator";
  const a = expr.match(/^arch\((\w+)\)$/);
  if (a) return arch === "unknown" ? null : arch === a[1];
  if (/^[A-Z][A-Z0-9_]*$/.test(expr)) return flags.includes(expr) ? true : null;
  return null;
}
export function lexSwift(
  source: string,
  sdk = "iphoneos",
  arch = "unknown",
  flags: string[] = [],
): Token[] {
  const out: Token[] = [];
  let i = 0,
    line = 1,
    block = 0;
  const stack: { parent: Tri; seen: Tri; current: Tri }[] = [];
  let active: Tri = true;
  const state = () =>
    active === true ? "active" : active === false ? "inactive" : "unknown";
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (block) {
      if (source.startsWith("/*", i)) {
        block++;
        i += 2;
      } else if (source.startsWith("*/", i)) {
        block--;
        i += 2;
      } else i++;
      continue;
    }
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] != "\n") i++;
      continue;
    }
    if (source.startsWith("/*", i)) {
      block = 1;
      i += 2;
      continue;
    }
    if (
      c === "#" &&
      /^\s*$/.test(source.slice(source.lastIndexOf("\n", i - 1) + 1, i))
    ) {
      const m = source.slice(i).match(/^#(if|elseif|else|endif)\b([^\n]*)/);
      if (m) {
        if (m[1] === "if") {
          const x = condition(m[2], sdk, arch, flags);
          stack.push({ parent: active, seen: x, current: x });
          active = and(active, x);
        } else {
          const t = stack.at(-1);
          if (!t) throw Error("Unbalanced #if");
          if (m[1] === "endif") {
            stack.pop();
            active = t.parent;
          } else {
            const x =
              m[1] === "else" ? true : condition(m[2], sdk, arch, flags);
            const unused = t.seen === null ? null : !t.seen;
            t.current = and(unused, x);
            active = and(t.parent, t.current);
            t.seen = or(t.seen, x);
          }
        }
        i += m[0].length;
        continue;
      }
    }
    const raw = source.slice(i).match(/^(#*)"/);
    if (raw) {
      const hashes = raw[1];
      i += hashes.length;
      const multi = source.startsWith('"""', i),
        q = multi ? '"""' : '"';
      i += q.length;
      let closed = false;
      while (i < source.length) {
        if (source.startsWith(q + hashes, i)) {
          i += q.length + hashes.length;
          closed = true;
          break;
        }
        if (source[i] === "\n") line++;
        if (!hashes && source[i] === "\\") {
          i++;
          if (source[i] === "\n") line++;
        }
        i++;
      }
      if (!closed) throw Error("Unclosed Swift string");
      continue;
    }
    const ident = source.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);
    if (ident) {
      out.push({ text: ident[0], line, condition: state() });
      i += ident[0].length;
    } else i++;
  }
  if (block || stack.length)
    throw Error("Unclosed Swift comment or conditional");
  return out;
}
