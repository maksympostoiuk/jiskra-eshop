import { describe, expect, it } from "vitest";
import { sniffImageType } from "./sniff";

const bytes = (...parts: Array<number[] | string>) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

describe("sniffImageType", () => {
  it("recognizes supported formats", () => {
    expect(sniffImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(bytes("GIF89a"))).toBe("image/gif");
    expect(sniffImageType(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(bytes([0, 0, 0, 0x1c], "ftypavif"))).toBe("image/avif");
  });
  it("rejects disguised files", () => {
    expect(sniffImageType(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffImageType(bytes("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
