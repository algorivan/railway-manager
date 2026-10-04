/** Group display cards without losing the identities needed by the simulation. */
export type FormationUnit = { id: string; productId: string };
export function groupFormationUnits(units: readonly FormationUnit[]) {
  const groups = new Map<string, string[]>();
  for (const unit of units) {
    const ids = groups.get(unit.productId) ?? [];
    ids.push(unit.id);
    groups.set(unit.productId, ids);
  }
  return [...groups].map(([productId, unitIds]) => ({ productId, unitIds }));
}
export type FormationDrag = {
  source: "inventory" | "formation";
  productId: string;
};
export type FormationDrop = {
  area: "inventory" | "formation";
  before?: string;
};
/** An inventory drag transfers one unit; a formation drag moves/returns its group. */
export function dropFormationUnits(
  ids: readonly string[],
  available: readonly FormationUnit[],
  drag: FormationDrag,
  target: FormationDrop,
): string[] {
  const sameProduct = (id: string) =>
    available.some((u) => u.id === id && u.productId === drag.productId);
  const moving =
    drag.source === "inventory"
      ? available
          .filter((u) => u.productId === drag.productId && !ids.includes(u.id))
          .slice(0, 1)
          .map((u) => u.id)
      : ids.filter(sameProduct);
  if (
    !moving.length ||
    (drag.source === "inventory" && target.area === "inventory")
  )
    return [...ids];
  if (target.area === "inventory")
    return ids.filter((id) => !moving.includes(id));
  if (target.before === drag.productId && drag.source === "formation")
    return [...ids];
  const next = ids.filter((id) => !moving.includes(id));
  // New copies stay together with the existing card for their product.
  let lastSame = -1;
  next.forEach((id, index) => {
    if (sameProduct(id)) lastSame = index;
  });
  const before = target.before
    ? next.findIndex((id) =>
        available.some((u) => u.id === id && u.productId === target.before),
      )
    : -1;
  const index =
    drag.source === "inventory" && lastSame >= 0
      ? lastSame + 1
      : before >= 0
        ? before
        : next.length;
  next.splice(index, 0, ...moving);
  return next;
}
