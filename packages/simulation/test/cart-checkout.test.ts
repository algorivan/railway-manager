import { describe, expect, it } from "vitest";
import {
  applyCoreAction,
  createCoreState,
  coreProduct,
  restoreCore,
  serializeCore,
} from "../src/engine/core-v7.js";
const now = Date.UTC(2026, 9, 3);
const items = [
  { productId: "cc201", quantity: 1 },
  { productId: "ec-standard", quantity: 4 },
  { productId: "generator", quantity: 1 },
];
describe("catalog checkout", () => {
  it("orders the starter basket atomically, with unique ids, immediate delivery and one mission reward", () => {
    const initial = applyCoreAction(
      createCoreState(now),
      { type: "enableMissions" },
      "missions",
      now,
    );
    const next = applyCoreAction(
      initial,
      { type: "orderCart", station: initial.hub, items },
      "checkout",
      now,
    );
    const cost = items.reduce(
      (n, item) => n + coreProduct(item.productId).price * item.quantity,
      0,
    );
    expect(next.progression!.xp).toBe(initial.progression!.xp + 30);
    expect(
      next.progression!.claimed.filter((id) => id === "orders"),
    ).toHaveLength(1);
    expect(next.orders).toHaveLength(3);
    expect(new Set(next.orders.map((o) => o.id)).size).toBe(3);
    expect(next.orders.every((o) => o.due === next.minute)).toBe(true);
    expect(
      next.ledger
        .filter((l) => l.id.startsWith("checkout:item:"))
        .reduce((n, l) => n + l.cash, 0),
    ).toBe(-cost);
    expect(initial.orders).toHaveLength(0);
    const restored = restoreCore(serializeCore(next));
    expect(
      applyCoreAction(
        restored,
        { type: "orderCart", station: initial.hub, items },
        "checkout",
        now,
      ),
    ).toEqual(restored);
    let accepted = next;
    for (const o of next.orders)
      accepted = applyCoreAction(
        accepted,
        { type: "accept", orderId: o.id },
        `accept:${o.id}`,
        now,
      );
    expect(accepted.units).toHaveLength(6);
    expect(new Set(accepted.units.map((u) => u.id)).size).toBe(6);
  });
  it("does not retain an earlier item or debit when a later line is invalid or unaffordable", () => {
    for (const cash of [1_000_000_000, 10_000_000_000]) {
      const state = createCoreState(now);
      state.cash = cash;
      const before = serializeCore(state);
      const cart =
        cash === 1_000_000_000
          ? items
          : [...items.slice(0, 1), { productId: "ec-standard", quantity: 21 }];
      expect(() =>
        applyCoreAction(
          state,
          { type: "orderCart", station: state.hub, items: cart },
          "bad",
          now,
        ),
      ).toThrow();
      expect(serializeCore(state)).toBe(before);
    }
  });
  it("rejects empty, duplicate, retrofit and invalid-depot baskets", () => {
    const state = createCoreState(now);
    for (const cart of [
      [],
      [items[0]!, items[0]!],
      [{ productId: "ec-ng-retrofit", quantity: 1 }],
    ])
      expect(() =>
        applyCoreAction(
          state,
          { type: "orderCart", station: state.hub, items: cart },
          "invalid",
          now,
        ),
      ).toThrow();
    expect(() =>
      applyCoreAction(
        state,
        { type: "orderCart", station: "missing", items },
        "depot",
        now,
      ),
    ).toThrow();
    expect(state.orders).toHaveLength(0);
  });
  it("keeps normal delivery time after the first starter purchase", () => {
    const state = createCoreState(now);
    let next = applyCoreAction(
      state,
      { type: "orderCart", station: state.hub, items },
      "first",
      now,
    );
    next.cash += 2_000_000_000;
    next = applyCoreAction(
      next,
      { type: "orderCart", station: state.hub, items: [items[0]!] },
      "second",
      now,
    );
    expect(next.orders.at(-1)!.due).toBe(
      next.minute + coreProduct("cc201").deliveryMinutes,
    );
  });
});
