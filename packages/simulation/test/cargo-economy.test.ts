import { describe, it, expect } from "vitest";
import {
  CORE_CARGO_OFFERS,
  CORE_PRODUCTS,
  CORE_BALANCE,
} from "@railway/game-data";
import {
  applyCoreAction,
  createCoreState,
  catchUpCore,
  coreFormation,
  coreReadiness,
  coreStationCanRefuel,
  forecastCore,
  serializeCore,
  restoreCore,
  type CoreState,
  type CoreAction,
} from "../src/engine/core-v7.js";
import { coreAutomaticRoundTrips, previewCoreDiagram } from "../src/index.js";
const epoch = Date.UTC(2026, 9, 3);
const act = (s: CoreState, a: CoreAction, id: string) =>
  applyCoreAction(s, a, id, s.anchorMs);
const advance = (s: CoreState, m: number) =>
  catchUpCore(s, s.anchorMs + ((m - s.minute) / 1.5) * 60000);
function fixture() {
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
  s = act(
    s,
    { type: "cargoContract", offerId: "oil", serviceId: s.services[0]!.id },
    "contract",
  );
  for (const [productId, quantity] of [
    ["cc201", 1],
    ["cargo-oil", 2],
  ] as const) {
    s = act(
      s,
      { type: "order", productId, quantity, station: s.hub, starter: true },
      `order:${productId}`,
    );
  }
  s = advance(s, 480);
  for (const o of s.orders)
    s = act(s, { type: "accept", orderId: o.id }, `accept:${o.id}`);
  s = act(
    s,
    { type: "formation", name: "Kargo Migas", units: s.units.map((u) => u.id) },
    "train",
  );
  s = act(s, { type: "crew", trainsetId: s.trainsets[0]!.id }, "crew");
  return s;
}
describe("planning-first cargo economy", () => {
  it("provides one-time investment separately from operating revenue and rejects invalid or duplicate contracts", () => {
    let s = createCoreState(epoch);
    expect(() =>
      act(
        s,
        { type: "cargoContract", offerId: "oil", serviceId: "missing" },
        "bad",
      ),
    ).toThrow();
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
    const before = s.cash;
    s = act(
      s,
      { type: "cargoContract", offerId: "oil", serviceId: s.services[0]!.id },
      "contract",
    );
    expect(s.cash - before).toBe(CORE_CARGO_OFFERS[0].investment);
    expect(s.ledger.at(-1)!.revenue).toBe(0);
    expect(
      act(
        s,
        { type: "cargoContract", offerId: "oil", serviceId: s.services[0]!.id },
        "contract",
      ),
    ).toEqual(s);
    expect(() =>
      act(
        s,
        {
          type: "cargoContract",
          offerId: "mineral",
          serviceId: s.services[0]!.id,
        },
        "again",
      ),
    ).toThrow();
    s = advance(s, s.cargoContracts![0]!.deadline + 1);
    expect(s.cargoContracts![0]!.status).toBe("expired");
    expect(() =>
      act(
        s,
        { type: "cargoContract", offerId: "oil", serviceId: s.services[0]!.id },
        "again-old",
      ),
    ).toThrow();
  });
  it("pays only delivered outbound cargo, returns empty, awards the target bonus once and preserves reload", () => {
    let s = fixture();
    const t = s.trainsets[0]!,
      r = s.services[0]!,
      duties = coreAutomaticRoundTrips(s, t.id, r.id, false, 490);
    expect(duties.length).toBeGreaterThan(2);
    expect(previewCoreDiagram(s, t.id, 1440, duties).issues).toEqual([]);
    const quote = forecastCore(s, t.id, r.id, false, 490);
    expect(quote.cargoTons).toBe(80);
    expect(quote.revenue).toBe(80 * 160 * CORE_CARGO_OFFERS[0].paymentPerTonKm);
    expect(forecastCore(s, t.id, r.id, true, 490).revenue).toBe(0);
    expect(
      quote.revenue - quote.cost - forecastCore(s, t.id, r.id, true, 490).cost,
    ).toBeGreaterThan(0);
    s = act(
      s,
      {
        type: "diagram",
        trainsetId: t.id,
        cycle: 1440,
        duties,
        stationRefuel: true,
      },
      "schedule",
    );
    s = advance(s, 500);
    expect(s.cargoContracts![0]!.delivered).toBe(0);
    expect(s.ledger.some((e) => e.id.endsWith(":settlement"))).toBe(false);
    s = advance(s, s.cargoContracts![0]!.deadline + 200);
    expect(s.cargoContracts![0]!.status).toBe("completed");
    expect(s.cargoContracts![0]!.delivered).toBe(6);
    expect(s.runs.filter((r) => r.cargoContractId)).toHaveLength(6);
    expect(
      s.runs.filter((r) => r.origin !== s.hub).every((r) => r.revenue === 0),
    ).toBe(true);
    expect(
      s.ledger.filter((e) => e.id.startsWith("cargo-bonus:")),
    ).toHaveLength(1);
    expect(s.plans.every((p) => !p.active)).toBe(true);
    expect(s.trainsets[0]!.location).toBe(s.hub);
    const saved = restoreCore(serializeCore(s));
    expect(catchUpCore(saved, saved.anchorMs)).toEqual(saved);
    expect(
      saved.ledger.filter((e) => e.id.startsWith("cargo-bonus:")),
    ).toHaveLength(1);
  });
  it("matches bulk/offline processing, including fuel quote buckets and contract expiry", () => {
    const s = fixture(),
      duties = coreAutomaticRoundTrips(
        s,
        s.trainsets[0]!.id,
        s.services[0]!.id,
        false,
        490,
      ),
      planned = act(
        s,
        {
          type: "diagram",
          trainsetId: s.trainsets[0]!.id,
          cycle: 1440,
          duties,
          stationRefuel: true,
        },
        "schedule",
      );
    let chunks = planned;
    for (let m = 510; m < 7000; m += 30) chunks = advance(chunks, m);
    chunks = advance(chunks, 7000);
    const bulk = advance(planned, 7000);
    expect(chunks.cargoContracts).toEqual(bulk.cargoContracts);
    expect(chunks.runs).toEqual(bulk.runs);
    expect(chunks.cash).toBeCloseTo(bulk.cash, 3);
    expect(chunks.ledger).toEqual(bulk.ledger);
  });
  it("refills manually at large stations, pays the vendor and counts consumption separately; no free refill", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      p = CORE_PRODUCTS.find((p) => p.id === "cc201")!;
    expect(p.tank).toBe(9084);
    expect(CORE_BALANCE.depotCapacity).toBe(50000);
    expect(coreStationCanRefuel(t.location)).toBe(true);
    const before = s.cash;
    s = act(s, { type: "fill", trainsetId: t.id }, "fill");
    expect(s.units[0]!.fuel).toBe(p.tank);
    expect(s.cash).toBeLessThan(before);
    expect(s.ledger.at(-1)!.expense).toBe(0);
    expect(act(s, { type: "fill", trainsetId: t.id }, "repeat").cash).toBe(
      s.cash,
    );
    const poor = structuredClone(fixture());
    poor.cash = 1;
    expect(() =>
      act(poor, { type: "fill", trainsetId: poor.trainsets[0]!.id }, "poor"),
    ).toThrow();
    expect(poor.units[0]!.fuel).toBe(0);
    const off = structuredClone(fixture());
    const station = "OSM_STATION_";
    off.trainsets[0]!.location = station;
    off.units.forEach((u) => (u.location = station));
    expect(() =>
      act(off, { type: "fill", trainsetId: off.trainsets[0]!.id }, "off"),
    ).toThrow();
  });
  it("keeps automatic vendor purchasing opt-in and rejects incompatible cargo formations", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      r = s.services[0]!;
    expect(
      coreReadiness(s, t, r, false).some((reason) => reason.includes("Fuel")),
    ).toBe(true);
    t.stationRefuel = true;
    expect(coreReadiness(s, t, r, false)).toEqual([]);
    s.units.find((u) => u.productId === "cargo-oil")!.productId =
      "cargo-mineral";
    expect(
      coreReadiness(s, t, r, false).some((reason) =>
        reason.includes("gerbong sesuai"),
      ),
    ).toBe(true);
    expect(coreFormation(s, t).cargoTons).toBe(80);
  });
  it("penalises missed targets once and rejects broken saved references", () => {
    let s = fixture(),
      end = s.cargoContracts![0]!.deadline + 1;
    s = advance(s, end);
    expect(
      s.ledger.filter((e) => e.id.startsWith("cargo-penalty:")),
    ).toHaveLength(1);
    expect(
      advance(s, end + 100).ledger.filter((e) =>
        e.id.startsWith("cargo-penalty:"),
      ),
    ).toHaveLength(1);
    const broken = JSON.parse(serializeCore(s));
    broken.cargoContracts[0].serviceId = "missing";
    expect(() => restoreCore(JSON.stringify(broken))).toThrow("Kontrak");
  });
  it("lets the last reserved held delivery resume after recovery", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      r = s.services[0]!;
    s.cargoContracts![0]!.delivered = 5;
    t.crew = false;
    s = act(
      s,
      {
        type: "schedule",
        trainsetId: t.id,
        serviceId: r.id,
        cycle: 1440,
        offset: 490,
        roundTrip: false,
        stationRefuel: true,
      },
      "last",
    );
    s = advance(s, 491);
    expect(s.runs[0]!.status).toBe("held");
    s = act(s, { type: "crew", trainsetId: t.id }, "crew-recovery");
    s = act(s, { type: "resume", runId: s.runs[0]!.id }, "resume-last");
    expect(s.runs[0]!.status).toBe("running");
    s = advance(s, 1000);
    expect(s.cargoContracts![0]!.delivered).toBe(6);
    expect(s.cargoContracts![0]!.status).toBe("completed");
  });
  it("does not pay cargo arriving after its deadline and leaves one empty return", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      r = s.services[0]!;
    s = act(s, { type: "fill", trainsetId: t.id }, "fill-late");
    const departure = s.cargoContracts![0]!.deadline - 10;
    s = advance(s, departure - 5);
    s = act(
      s,
      {
        type: "schedule",
        trainsetId: t.id,
        serviceId: r.id,
        cycle: 1440,
        offset: departure % 1440,
        roundTrip: true,
      },
      "late",
    );
    s = advance(s, departure + 1000);
    expect(s.cargoContracts![0]!.status).toBe("expired");
    expect(s.cargoContracts![0]!.delivered).toBe(0);
    expect(
      s.runs.filter((r) => r.cargoContractId).every((r) => r.revenue === 0),
    ).toBe(true);
    expect(s.trainsets[0]!.location).toBe(s.hub);
    expect(s.plans.every((p) => !p.active)).toBe(true);
  });
  it("cancels an unstarted held departure at expiry and frees the trainset without charging a trip", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      r = s.services[0]!;
    t.crew = false;
    s = act(
      s,
      {
        type: "schedule",
        trainsetId: t.id,
        serviceId: r.id,
        cycle: 1440,
        offset: 490,
        roundTrip: true,
      },
      "held-expiry",
    );
    s = advance(s, 491);
    expect(s.runs[0]!.status).toBe("held");
    s = advance(s, s.cargoContracts![0]!.deadline + 1);
    expect(s.runs[0]!.status).toBe("cancelled");
    expect(s.runs[0]!.revenue).toBe(0);
    expect(s.runs[0]!.cost).toBe(0);
    expect(s.trainsets[0]!.location).toBe(s.hub);
    expect(s.plans.every((p) => !p.active)).toBe(true);
    expect(s.ledger.some((e) => e.id.endsWith(":dispatch"))).toBe(false);
    s = act(
      s,
      {
        type: "formation",
        trainsetId: t.id,
        name: "Kargo siap dijadwalkan ulang",
        units: t.units,
      },
      "reform",
    );
    expect(restoreCore(serializeCore(s)).runs[0]!.status).toBe("cancelled");
  });
  it("does not pay recalled cargo", () => {
    let s = fixture(),
      t = s.trainsets[0]!,
      r = s.services[0]!;
    s = act(s, { type: "fill", trainsetId: t.id }, "fill");
    s = act(
      s,
      {
        type: "schedule",
        trainsetId: t.id,
        serviceId: r.id,
        cycle: 1440,
        offset: 490,
        roundTrip: false,
      },
      "once",
    );
    s = advance(s, 491);
    s = act(s, { type: "recall", runId: s.runs[0]!.id }, "recall");
    s = advance(s, 1000);
    expect(s.runs[0]!.revenue).toBe(0);
    expect(s.cargoContracts![0]!.delivered).toBe(0);
    expect(
      s.ledger
        .filter((e) => e.id.endsWith(":settlement"))
        .every((e) => e.cash === 0),
    ).toBe(true);
  });
});
