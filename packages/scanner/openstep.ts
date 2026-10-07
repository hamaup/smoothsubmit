export function parseOpenStep(source: string): Record<string, any> {
  let i = 0;
  const skip = () => {
    while (i < source.length) {
      if (/\s/.test(source[i])) {
        i++;
        continue;
      }
      if (source.startsWith("//", i)) {
        while (i < source.length && source[i] != "\n") i++;
        continue;
      }
      if (source.startsWith("/*", i)) {
        const e = source.indexOf("*/", i + 2);
        if (e < 0) throw Error("Unclosed comment");
        i = e + 2;
        continue;
      }
      break;
    }
  };
  function token(): string {
    skip();
    if (source[i] === '"') {
      i++;
      let s = "";
      while (i < source.length) {
        const c = source[i++];
        if (c === '"') return s;
        if (c === "\\") {
          const x = source[i++];
          s += x === "n" ? "\n" : x === "r" ? "\r" : x === "t" ? "\t" : x;
        } else s += c;
      }
      throw Error("Unclosed string");
    }
    const start = i;
    while (i < source.length && !/[\s{}()=;,]/.test(source[i])) i++;
    if (i === start) throw Error(`Unexpected token at ${i}`);
    return source.slice(start, i);
  }
  function expect(c: string) {
    skip();
    if (source[i++] !== c) throw Error(`Expected ${c} at ${i - 1}`);
  }
  function value(depth = 0): any {
    if (depth > 64) throw Error("Nesting limit");
    skip();
    if (source[i] === "{") {
      i++;
      const o: Record<string, any> = Object.create(null);
      skip();
      while (source[i] !== "}") {
        const k = token();
        if (Object.hasOwn(o, k)) throw Error(`Duplicate key ${k}`);
        expect("=");
        o[k] = value(depth + 1);
        expect(";");
        skip();
      }
      i++;
      return o;
    }
    if (source[i] === "(") {
      i++;
      const a = [];
      skip();
      while (source[i] !== ")") {
        a.push(value(depth + 1));
        skip();
        if (source[i] === ",") i++;
        else if (source[i] !== ")") throw Error("Expected comma");
        skip();
      }
      i++;
      return a;
    }
    return token();
  }
  const result = value();
  skip();
  if (
    i < source.length ||
    !result ||
    Array.isArray(result) ||
    typeof result !== "object"
  )
    throw Error("Invalid OpenStep root");
  return result;
}
