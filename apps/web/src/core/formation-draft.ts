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
export type FormationDrag =
  | { source: "inventory"; productId: string }
  | { source: "formation"; productId: string; unitId: string };
export type FormationDrop = {
  area: "inventory" | "formation";
  /** Insert before this particular unit, including copies of the same product. */
  before?: string;
};
/** Every drag transfers/reorders a single unit. Only available stock is grouped. */
export function dropFormationUnits(
  ids: readonly string[],
  available: readonly FormationUnit[],
  drag: FormationDrag,
  target: FormationDrop,
): string[] {
  const unit =
    drag.source === "inventory"
      ? available.find(
          (u) => u.productId === drag.productId && !ids.includes(u.id),
        )
      : available.find(
          (u) =>
            u.id === drag.unitId &&
            u.productId === drag.productId &&
            ids.includes(u.id),
        );
  if (!unit || (drag.source === "inventory" && target.area === "inventory"))
    return [...ids];
  if (target.area === "inventory") return ids.filter((id) => id !== unit.id);
  if (target.before === unit.id) return [...ids];
  const next = ids.filter((id) => id !== unit.id);
  const before = target.before ? next.indexOf(target.before) : -1;
  next.splice(before >= 0 ? before : next.length, 0, unit.id);
  return next;
}
