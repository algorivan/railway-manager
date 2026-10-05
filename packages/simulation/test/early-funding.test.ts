import { describe, expect, it } from "vitest";
import {
  CORE_LEGACY_MISSION_CASH,
  CORE_GAME_CORRIDORS,
} from "@railway/game-data";
import {
  applyCoreAction,
  catchUpCore,
  createCompanyDraft,
  createCoreState,
  coreFormation,
  restoreCore,
  serializeCore,
  type CoreAction,
  type CoreState,
} from "../src/engine/core-v7.js";

const epoch = Date.UTC(2026, 9, 5);
const act = (s: CoreState, a: CoreAction, id: string) =>
  applyCoreAction(s, a, id, s.anchorMs);
const advance = (s: CoreState, minutes: number) =>
  catchUpCore(s, s.anchorMs + (minutes / 1.5) * 60000);
const passenger = [
  { productId: "cc201", quantity: 1 },
  { productId: "ec-standard", quantity: 4 },
  { productId: "generator", quantity: 1 },
];
function starter() {
  let s = act(
    createCompanyDraft(epoch),
    { type: "foundCompany", cityId: "bandung", hubStationId: "STN_BD_BANDUNG" },
    "found",
  );
  s = act(
    s,
    { type: "orderCart", station: s.hub, items: passenger },
    "starter",
  );
  for (const order of s.orders)
    s = act(s, { type: "accept", orderId: order.id }, `accept:${order.id}`);
  return act(
    s,
    {
      type: "formation",
      name: "Argo Pertama",
      units: s.units.map((u) => u.id),
    },
    "first-train",
  );
}
function contract(offerId: "oil" | "mineral" | "logistics") {
  let s = createCoreState(epoch);
  s = act(
    s,
    {
      type: "service",
      origin: s.hub,
      destination: "STN_GMR_GAMBIR",
      category: "Custom",
    },
    "relation",
  );
  s.cash = 0;
  return act(
    s,
    { type: "cargoContract", offerId, serviceId: s.services[0]!.id },
    "contract",
  );
}
function expand(s: CoreState) {
  // Find a connected, unpaid parent corridor through the same access validation as the UI.
  for (const edge of CORE_GAME_CORRIDORS) {
    try {
      return act(
        s,
        { type: "access", segmentId: edge.id },
        `expand:${edge.id}`,
      );
    } catch {}
  }
  throw Error("No purchasable connected corridor");
}

describe("early fleet and network funding", () => {
  it("funds three fully fueled passenger trainsets and connected expansion before a first departure", () => {
    const draft = createCoreState(epoch);
    expect(() => expand(draft)).toThrow();
    let s = starter();
    expect(s.progression!.claimed).toEqual([
      "company",
      "orders",
      "accept",
      "formation",
    ]);
    const before = s.cash;
    s = expand(s);
    expect(s.cash).toBe(before - 25_000_000);
    s = act(
      s,
      {
        type: "orderCart",
        station: s.hub,
        items: passenger.map((p) => ({ ...p, quantity: p.quantity * 2 })),
      },
      "more-trains",
    );
    s = advance(s, 120);
    for (const order of s.orders.filter((o) => !o.accepted))
      s = act(s, { type: "accept", orderId: order.id }, `accept:${order.id}`);
    for (let i = 0; i < 2; i++) {
      const unused = s.units.filter(
        (u) => !s.trainsets.some((t) => t.units.includes(u.id)),
      );
      const units = passenger.flatMap((p) =>
        unused
          .filter((u) => u.productId === p.productId)
          .slice(0, p.quantity)
          .map((u) => u.id),
      );
      s = act(
        s,
        { type: "formation", name: `Argo ${i + 2}`, units },
        `train:${i}`,
      );
    }
    s = act(s, { type: "recruitAuto" }, "crew");
    for (const t of s.trainsets)
      s = act(s, { type: "fill", trainsetId: t.id }, `fill:${t.id}`);
    expect(s.trainsets).toHaveLength(3);
    expect(
      s.trainsets.every((t) => coreFormation(s, t).capacity === 424 && t.crew),
    ).toBe(true);
    expect(s.cash).toBeGreaterThan(500_000_000);
    expect(s.runs).toHaveLength(0);
    expect(restoreCore(serializeCore(s)).cash).toBe(s.cash);
    expect(
      s.ledger
        .filter((e) => e.id.startsWith("mission:"))
        .every((e) => e.revenue === 0),
    ).toBe(true);
    expect(s.ledger.filter((e) => e.id === "mission:formation")).toHaveLength(
      1,
    );
  });

  it.each([
    ["oil", "cargo-oil", 6_000_000_000],
    ["mineral", "cargo-mineral", 5_500_000_000],
    ["logistics", "cargo-logistics", 5_000_000_000],
  ] as const)(
    "%s investment alone funds three cargo trainsets, expansion and operating reserve",
    (offerId, wagon, cash) => {
      let s = contract(offerId);
      expect(s.cash).toBe(cash);
      expect(s.cargoContracts![0]!.fundingVersion).toBe(3);
      s = act(
        s,
        {
          type: "orderCart",
          station: s.hub,
          items: [
            { productId: "cc201", quantity: 3 },
            { productId: wagon, quantity: 6 },
          ],
        },
        "cargo-fleet",
      );
      s = advance(s, 120);
      for (const o of s.orders)
        s = act(s, { type: "accept", orderId: o.id }, `accept:${o.id}`);
      for (let i = 0; i < 3; i++) {
        const unused = s.units.filter(
          (u) => !s.trainsets.some((t) => t.units.includes(u.id)),
        );
        const units = [
          unused.find((u) => u.productId === "cc201")!.id,
          ...unused
            .filter((u) => u.productId === wagon)
            .slice(0, 2)
            .map((u) => u.id),
        ];
        s = act(
          s,
          { type: "formation", name: `Kargo ${i}`, units },
          `train:${i}`,
        );
      }
      s = expand(s);
      s = act(s, { type: "recruitAuto" }, "crew");
      for (const t of s.trainsets)
        s = act(s, { type: "fill", trainsetId: t.id }, `fill:${t.id}`);
      expect(
        s.trainsets.every((t) => coreFormation(s, t).cargoTons === 80),
      ).toBe(true);
      expect(s.cash).toBeGreaterThan(1_000_000_000);
      expect(s.runs).toHaveLength(0);
      expect(restoreCore(serializeCore(s)).cash).toBe(s.cash);
      expect(
        act(
          s,
          { type: "cargoContract", offerId, serviceId: s.services[0]!.id },
          "contract",
        ),
      ).toEqual(s);
    },
  );
});

describe("funding migration", () => {
  it("tops up only previously claimed missions once, preserving XP and excluding grants from revenue", () => {
    const old = starter();
    old.economyVersion = 2;
    for (const e of old.ledger) {
      if (!e.id.startsWith("mission:")) continue;
      const legacy =
        CORE_LEGACY_MISSION_CASH[
          e.id.slice(8) as keyof typeof CORE_LEGACY_MISSION_CASH
        ];
      old.cash -= e.cash - legacy;
      e.cash = legacy;
    }
    const upgraded = restoreCore(serializeCore(old));
    expect(upgraded.cash - old.cash).toBe(4_750_000_000);
    expect(upgraded.progression).toEqual(old.progression);
    expect(upgraded.economyVersion).toBe(3);
    const grants = upgraded.ledger.filter((e) =>
      e.id.startsWith("mission:funding-v3:"),
    );
    expect(grants).toHaveLength(4);
    expect(grants.every((e) => e.revenue === 0 && e.expense === 0)).toBe(true);
    expect(
      catchUpCore(restoreCore(serializeCore(upgraded)), upgraded.anchorMs),
    ).toEqual(upgraded);
    upgraded.economyVersion = 2; // Ledger IDs also protect an interrupted/repeated upgrade.
    expect(restoreCore(serializeCore(upgraded)).cash).toBe(upgraded.cash);
  });
  it("funds an old active contract once without changing its deadline, target or penalty basis", () => {
    const old = contract("oil");
    old.economyVersion = 2;
    const c = old.cargoContracts![0]!;
    delete c.fundingVersion;
    c.investment = 1_800_000_000;
    old.cash = c.investment;
    old.ledger.find((e) => e.id === "cargo-investment:contract")!.cash =
      c.investment;
    const upgraded = restoreCore(serializeCore(old));
    expect(upgraded.cash).toBe(6_000_000_000);
    expect(upgraded.cargoContracts).toEqual(old.cargoContracts);
    expect(
      upgraded.ledger.find((e) => e.id === `cargo-expansion:${c.id}`),
    ).toMatchObject({ cash: 4_200_000_000, revenue: 0 });
    expect(restoreCore(serializeCore(upgraded)).cash).toBe(upgraded.cash);
    const expired = advance(upgraded, c.deadline - upgraded.minute + 1);
    expect(expired.cargoContracts![0]!.status).toBe("expired");
    expect(
      expired.ledger.find((e) => e.id.startsWith("cargo-penalty:"))?.cash,
    ).toBe(-180_000_000);
    old.cargoContracts![0]!.status = "expired";
    expect(restoreCore(serializeCore(old)).cash).toBe(old.cash);
  });
  it("rejects inconsistent contracts before awarding a funding upgrade", () => {
    const s = contract("oil");
    s.economyVersion = 2;
    s.cargoContracts![0]!.investment = 1_800_000_000; // Still marked as the new contract version.
    const cash = s.cash;
    expect(() => restoreCore(serializeCore(s))).toThrow("Kontrak kargo save");
    expect(s.cash).toBe(cash);
  });
});
