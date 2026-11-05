import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Static check: every literal key passed to a translator obtained via
 * `useTranslations("ns")` / `getTranslations("ns")` / `getTranslations({ namespace: "ns" })`
 * must exist in messages/cs. Template-literal keys are checked by their static prefix.
 */
const root = process.cwd();
const messages: Record<string, unknown> = {};
for (const file of readdirSync(join(root, "messages/cs"))) {
  messages[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(root, "messages/cs", file), "utf8"));
}

function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), messages);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [full] : [];
  });
}

const DECL = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([^"]+)"|\{[^}]*namespace:\s*"([^"]+)"[^}]*\})\s*\)/g;

describe("translation keys used in code exist", () => {
  const problems: string[] = [];
  for (const file of walk(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    // Each call resolves to the nearest preceding declaration with the same name (per-component scoping).
    const decls = [...source.matchAll(DECL)].map((d) => ({ name: d[1], ns: d[2] ?? d[3], at: d.index ?? 0 }));
    for (const name of new Set(decls.map((d) => d.name))) {
      const call = new RegExp(`\\b${name}(?:\\.rich|\\.markup|\\.raw|\\.has)?\\(\\s*(?:"([^"]+)"|\`([^\`$]*)\\$\\{)`, "g");
      for (const m of source.matchAll(call)) {
        const at = m.index ?? 0;
        const ns = decls.filter((d) => d.name === name && d.at < at).at(-1)?.ns;
        if (!ns) continue;
        if (m[1] !== undefined) {
          if (lookup(`${ns}.${m[1]}`) === undefined) problems.push(`${file.replace(root + "/", "")}: ${ns}.${m[1]}`);
        } else if (m[2] !== undefined) {
          const prefix = `${ns}.${m[2]}`.replace(/\.$/, "");
          if (typeof lookup(prefix) !== "object") problems.push(`${file.replace(root + "/", "")}: ${prefix}.* (template)`);
        }
      }
    }
  }
  it("has no missing keys", () => {
    expect(problems).toEqual([]);
  });
});
