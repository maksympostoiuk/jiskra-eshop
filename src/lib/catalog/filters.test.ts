import { describe, expect, it } from "vitest";
import { countActiveFilters, niceCeil, parseFilters, pricePresets, serializeFilters, toggleValue } from "./filters";

const specs = [
  { key: "ram", type: "NUMBER" as const },
  { key: "os", type: "TEXT" as const },
  { key: "nfc", type: "BOOLEAN" as const },
];

describe("parseFilters", () => {
  it("returns defaults for an empty query", () => {
    expect(parseFilters({}, specs)).toEqual({
      sort: "popular",
      view: "grid",
      page: 1,
      priceMin: null,
      priceMax: null,
      brands: [],
      inStock: false,
      minRating: null,
      specs: {},
    });
  });

  it("parses all supported parameters", () => {
    const f = parseFilters(
      { sort: "price_asc", view: "list", page: "3", pmin: "1000", pmax: "25000", brand: "nordvik,kestrel", stock: "1", rating: "4", f_ram: "8,12", f_os: "Android 16", f_nfc: "1" },
      specs,
    );
    expect(f).toMatchObject({
      sort: "price_asc",
      view: "list",
      page: 3,
      priceMin: 100000,
      priceMax: 2500000,
      brands: ["nordvik", "kestrel"],
      inStock: true,
      minRating: 4,
      specs: { ram: ["8", "12"], os: ["Android 16"], nfc: ["1"] },
    });
  });

  it("accepts URLSearchParams", () => {
    expect(parseFilters(new URLSearchParams("brand=orbis&f_ram=16"), specs)).toMatchObject({ brands: ["orbis"], specs: { ram: ["16"] } });
  });

  it("sanitizes invalid input", () => {
    const f = parseFilters({ sort: "evil", page: "-2", pmin: "abc", rating: "9", brand: "ok,<script>", f_ram: "8,lots", f_nfc: "yes", f_unknown: "x" }, specs);
    expect(f).toMatchObject({ sort: "popular", page: 1, priceMin: null, minRating: null, brands: ["ok"], specs: { ram: ["8"] } });
    expect(f.specs.nfc).toBeUndefined();
  });

  it("swaps an inverted price range and dedupes values", () => {
    const f = parseFilters({ pmin: "500", pmax: "100", brand: "a,a,b" }, specs);
    expect([f.priceMin, f.priceMax]).toEqual([10000, 50000]);
    expect(f.brands).toEqual(["a", "b"]);
  });

  it("uses the first value of repeated params", () => {
    expect(parseFilters({ sort: ["newest", "rating"] }).sort).toBe("newest");
  });
});

describe("serializeFilters", () => {
  it("round-trips and omits defaults", () => {
    const query = "brand=kestrel,nordvik&f_os=Android 16&f_ram=12,8&page=2&pmin=1000&sort=newest&stock=1";
    const parsed = parseFilters(new URLSearchParams(query), specs);
    const serialized = serializeFilters(parsed);
    expect(parseFilters(new URLSearchParams(serialized), specs)).toEqual(parsed);
    expect(serializeFilters(parseFilters({}, specs))).toBe("");
  });
});

describe("filter helpers", () => {
  it("toggles values and resets the page", () => {
    let f = parseFilters({ page: "4" }, specs);
    f = toggleValue(f, "brand", "orbis");
    expect(f).toMatchObject({ brands: ["orbis"], page: 1 });
    f = toggleValue(f, "spec:ram", "8");
    f = toggleValue(f, "spec:ram", "8");
    expect(f.specs.ram).toBeUndefined();
  });
  it("counts active filters", () => {
    expect(countActiveFilters(parseFilters({ brand: "a,b", stock: "1", f_ram: "8", pmax: "10" }, specs))).toBe(5);
  });
});

describe("price presets", () => {
  it("rounds to nice numbers", () => {
    expect([niceCeil(1), niceCeil(3), niceCeil(2300), niceCeil(7100), niceCeil(0)]).toEqual([1, 5, 2500, 10000, 0]);
  });
  it("builds open-ended buckets", () => {
    expect(pricePresets(99000, 5499000)).toEqual([
      [null, 2000000],
      [2000000, 5000000],
      [5000000, null],
    ]);
    expect(pricePresets(1000, 1000)).toEqual([]);
  });
});
