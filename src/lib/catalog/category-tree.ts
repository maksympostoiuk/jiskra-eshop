/** Pure helpers for the category tree (works on flat lists loaded from the DB). */

export type FlatCategory = { id: string; parentId: string | null; sortOrder: number };

export type TreeNode<T extends FlatCategory> = T & { children: TreeNode<T>[]; depth: number };

export function buildTree<T extends FlatCategory>(items: T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>();
  for (const item of items) nodes.set(item.id, { ...item, children: [], depth: 0 });
  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (list: TreeNode<T>[], depth: number) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of list) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

/** Depth-first flattening (parents before children), keeping `depth`. */
export function flattenTree<T extends FlatCategory>(roots: TreeNode<T>[]): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  const walk = (list: TreeNode<T>[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

/** The id itself plus all descendant ids. */
export function descendantIds(items: FlatCategory[], id: string): string[] {
  const byParent = new Map<string, string[]>();
  for (const c of items) {
    if (!c.parentId) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c.id]);
  }
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    if (out.includes(current)) continue;
    out.push(current);
    stack.push(...(byParent.get(current) ?? []));
  }
  return out;
}

/** Ancestors from the root down to (and including) the given id. */
export function ancestorIds(items: FlatCategory[], id: string): string[] {
  const byId = new Map(items.map((c) => [c.id, c]));
  const chain: string[] = [];
  let current = byId.get(id);
  while (current && !chain.includes(current.id)) {
    chain.unshift(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/** Whether moving `id` under `newParentId` would create a cycle. */
export function wouldCreateCycle(items: FlatCategory[], id: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  return descendantIds(items, id).includes(newParentId);
}
