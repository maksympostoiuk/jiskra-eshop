import { describe, expect, it } from "vitest";
import { ancestorIds, buildTree, descendantIds, flattenTree, wouldCreateCycle } from "./category-tree";

const items = [
  { id: "a", parentId: null, sortOrder: 1 },
  { id: "b", parentId: null, sortOrder: 0 },
  { id: "a1", parentId: "a", sortOrder: 1 },
  { id: "a0", parentId: "a", sortOrder: 0 },
  { id: "a0x", parentId: "a0", sortOrder: 0 },
];

describe("category tree", () => {
  it("builds and sorts", () => {
    const flat = flattenTree(buildTree(items)).map((n) => `${n.id}:${n.depth}`);
    expect(flat).toEqual(["b:0", "a:0", "a0:1", "a0x:2", "a1:1"]);
  });
  it("finds descendants and ancestors", () => {
    expect(descendantIds(items, "a").sort()).toEqual(["a", "a0", "a0x", "a1"]);
    expect(ancestorIds(items, "a0x")).toEqual(["a", "a0", "a0x"]);
  });
  it("detects cycles", () => {
    expect(wouldCreateCycle(items, "a", "a0x")).toBe(true);
    expect(wouldCreateCycle(items, "a0", "b")).toBe(false);
    expect(wouldCreateCycle(items, "a", null)).toBe(false);
  });
});
