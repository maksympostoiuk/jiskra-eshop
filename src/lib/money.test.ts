import { describe, expect, it } from "vitest";
import {
  convertCzkToUsd,
  discountPercent,
  formatMoney,
  formatRate,
  minorToMajorString,
  parseMajorToMinor,
  parseRate,
} from "./money";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

describe("formatMoney", () => {
  it("formats whole CZK without decimals in Czech", () => {
    expect(nbsp(formatMoney(2499000, "CZK", "cs"))).toBe("24 990 Kč");
  });
  it("shows haléře when present", () => {
    expect(nbsp(formatMoney(12350, "CZK", "cs"))).toBe("123,50 Kč");
  });
  it("formats USD with cents in English", () => {
    expect(formatMoney(104999, "USD", "en")).toBe("$1,049.99");
    expect(formatMoney(100000, "USD", "en")).toBe("$1,000.00");
  });
  it("formats USD in Czech locale", () => {
    expect(nbsp(formatMoney(4299, "USD", "cs"))).toBe("42,99 US$");
  });
  it("rejects non-integer amounts", () => {
    expect(() => formatMoney(10.5, "CZK", "cs")).toThrow(TypeError);
  });
});

describe("parseMajorToMinor", () => {
  it.each([
    ["1234", 123400],
    ["1 234,50", 123450],
    ["1234.5", 123450],
    ["0,05", 5],
    ["24 990 Kč", 2499000],
    [" 12 ", 1200],
  ])("parses %s", (input, expected) => {
    expect(parseMajorToMinor(input)).toBe(expected);
  });
  it.each(["", "abc", "1.234", "-5", "1,2,3"])("rejects %s", (input) => {
    expect(parseMajorToMinor(input)).toBeNull();
  });
  it("accepts numbers", () => {
    expect(parseMajorToMinor(19.99)).toBe(1999);
  });
});

describe("minorToMajorString", () => {
  it("round-trips", () => {
    expect(minorToMajorString(123450)).toBe("1234.50");
    expect(minorToMajorString(2499000)).toBe("24990");
    expect(minorToMajorString(5)).toBe("0.05");
  });
});

describe("convertCzkToUsd", () => {
  const rate = parseRate("23.45")!; // 234500
  it("converts with cent rounding", () => {
    // 24 990 CZK / 23.45 = 1065.6716... USD
    expect(convertCzkToUsd(2499000, rate, "CENT")).toBe(106567);
  });
  it("rounds to whole dollars", () => {
    expect(convertCzkToUsd(2499000, rate, "WHOLE")).toBe(106600);
  });
  it("rounds to .99", () => {
    expect(convertCzkToUsd(2499000, rate, "NINETY_NINE")).toBe(106599);
  });
  it("is exact for round numbers", () => {
    expect(convertCzkToUsd(234500, rate)).toBe(10000);
    expect(convertCzkToUsd(0, rate, "NINETY_NINE")).toBe(0);
  });
  it("rejects bad rates", () => {
    expect(() => convertCzkToUsd(100, 0)).toThrow(RangeError);
    expect(() => convertCzkToUsd(100, 1.5)).toThrow(RangeError);
  });
});

describe("rates", () => {
  it("parses and formats", () => {
    expect(parseRate("23,45")).toBe(234500);
    expect(parseRate("25")).toBe(250000);
    expect(parseRate("0")).toBeNull();
    expect(parseRate("x")).toBeNull();
    expect(formatRate(234500)).toBe("23.45");
    expect(formatRate(250000)).toBe("25");
  });
});

describe("discountPercent", () => {
  it("computes floor percentage", () => {
    expect(discountPercent(2199900, 2499900)).toBe(12);
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, 90)).toBe(0);
  });
});
