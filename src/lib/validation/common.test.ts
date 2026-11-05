import { describe, expect, it } from "vitest";
import { imagePath, link } from "./common";

describe("link and image path validation", () => {
  it.each(["", "/category/sluchatka", "https://example.com/promo", "http://x.cz"])("accepts link %s", (v) => {
    expect(link.safeParse(v).success).toBe(true);
  });
  it.each(["//evil.example", "javascript:alert(1)", "ftp://x", "category/x", "https:// x"])("rejects link %s", (v) => {
    expect(link.safeParse(v).success).toBe(false);
  });
  it.each(["/uploads/2026/11/abc_-1.webp", "/ph/phone/1f2125/1.svg"])("accepts image %s", (v) => {
    expect(imagePath.safeParse(v).success).toBe(true);
  });
  it.each(["https://cdn.example.com/a.png", "//cdn.example.com/a.png", "/uploads/<script>.png", "data:image/png;base64,AAA", ""])("rejects image %s", (v) => {
    expect(imagePath.safeParse(v).success).toBe(false);
  });
});
