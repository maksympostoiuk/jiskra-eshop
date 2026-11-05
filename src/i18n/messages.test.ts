import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function flatten(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

const root = join(process.cwd(), "messages");

describe("message catalogues", () => {
  const files = readdirSync(join(root, "cs"));
  it.each(files)("cs/%s and en/%s have the same keys", (file) => {
    const cs = flatten(JSON.parse(readFileSync(join(root, "cs", file), "utf8"))).sort();
    const en = flatten(JSON.parse(readFileSync(join(root, "en", file), "utf8"))).sort();
    expect(cs).toEqual(en);
  });
  it("every locale has the same namespaces", () => {
    expect(readdirSync(join(root, "en")).sort()).toEqual(files.sort());
  });
});
