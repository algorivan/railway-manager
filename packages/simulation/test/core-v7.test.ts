import { describe, it, expect } from "vitest";
import { CORE_PRODUCTS } from "@railway/game-data";
import {
  applyCoreAction as apply,
  catchUpCore,
  coreFormation,
  createCoreState,
  fuelQuote,
  previewCoreRoundTrip,
  restoreCore,
  serializeCore,
  type CoreAction,
  type CoreState,
} from "../src/engine/core-v7.js";

const epoch = Date.UTC(2026, 9, 2);
function setup() {
  let s = createCoreState(epoch);
  let seq = 0;
  const action = (a: CoreAction) => {
    s = apply(s, a, `a${++seq}`, epoch);
  };
  for (const [productId, quantity] of [
    ["cc201", 1],
    ["ec-standard", 4],
    ["generator", 1],
  ] as const) {
    action({
      type: "order",
      productId,
      quantity,
      station: s.hub,
      starter: true,
    });
    action({ type: "accept", orderId: s.orders.at(-1)!.id });
  }
  action({ type: "formation", name: "TS-01", units: s.units.map((u) => u.id) });
  action({
    type: "service",
    name: "Lintas Bandung",
    origin: s.hub,
    destination: "STN_GMR_GAMBIR",
    category: "Custom",
  });
  action({ type: "crew", trainsetId: s.trainsets[0]!.id });
  return s;
}
function operating() {
  let s = setup();
  s = apply(
    s,
    {
      type: "fuel",
      station: s.hub,
      liters: 6000,
      bucket: fuelQuote(epoch).bucket,
    },
    "fuel",
    epoch,
  );
  s = apply(s, { type: "fill", trainsetId: s.trainsets[0]!.id }, "fill", epoch);
  s = apply(
    s,
    {
      type: "schedule",
      trainsetId: s.trainsets[0]!.id,
      serviceId: s.services[0]!.id,
      cycle: 1440,
      offset: 422,
      roundTrip: true,
    },
    "plan",
    epoch,
  );
  return s;
}
const at = (s: CoreState, minute: number) =>
  catchUpCore(s, epoch + ((minute - 420) / 1.5) * 60000);

describe("v7 browser operations", () => {
  it("distinguishes passed stations from commercial stops and does not add dwell to a pass", () => {
    let s = setup();
    s.access.push("SEG_GMR_CN");
    s = apply(
      s,
      {
        type: "service",
        name: "Express",
        origin: s.hub,
        destination: "STN_CN_CIREBON",
        category: "Custom",
        stops: [s.hub, "STN_CN_CIREBON"],
      },
      "express",
      epoch,
    );
    const run = previewCoreRoundTrip(s, s.trainsets[0]!.id, "express").outbound;
    expect(run.legs[0]!.commercialStop).toBe(false);
    expect(run.end - run.start).toBeCloseTo(
      run.legs.reduce((v, l) => v + l.minutes, 0),
    );
    expect(run.bookings.every((b) => b.from === 0 && b.to === 2)).toBe(true);
  });
  it("checks the whole Local path's province, not just matching endpoint provinces", () => {
    const s = setup();
    s.access.push("SEG_GMR_CN");
    expect(() =>
      apply(
        s,
        {
          type: "service",
          name: "Invalid Local",
          origin: s.hub,
          destination: "STN_CN_CIREBON",
          category: "Local",
        },
        "local",
        epoch,
      ),
    ).toThrow("provinsi");
    const central = createCoreState(epoch, "STN_SMT_SEMARANGTAWANG");
    expect(
      apply(
        central,
        {
          type: "service",
          name: "Central Local",
          origin: central.hub,
          destination: "STN_SLO_SOLOBALAPAN",
          category: "Local",
        },
        "valid-local",
        epoch,
      ).services,
    ).toHaveLength(1);
  });
  it("starts with separate inventory purchases and exactly 424 EC seats", () => {
    const empty = createCoreState(epoch);
    expect(empty.units).toHaveLength(0);
    const s = setup();
    expect(coreFormation(s, s.trainsets[0]!).seats).toEqual({
      EC: 424,
      EX: 0,
      LX: 0,
    });
    expect(s.cash).toBe(150_000_000);
  });
  it("does not commission an undelivered order or use it as a trainset", () => {
    const s = apply(
      createCoreState(epoch),
      {
        type: "order",
        productId: "cc201",
        quantity: 1,
        station: "STN_BD_BANDUNG",
      },
      "order",
      epoch,
    );
    expect(s.units).toHaveLength(0);
    expect(() =>
      apply(s, { type: "accept", orderId: "order" }, "accept", epoch),
    ).toThrow("belum siap");
  });
  it("makes purchase and acceptance idempotent", () => {
    const a: CoreAction = {
      type: "order",
      productId: "cc201",
      quantity: 1,
      station: "STN_BD_BANDUNG",
      starter: true,
    };
    const s = apply(createCoreState(epoch), a, "order", epoch);
    expect(apply(s, a, "order", epoch)).toEqual(s);
    const accepted = apply(
      s,
      { type: "accept", orderId: "order" },
      "accept",
      epoch,
    );
    expect(
      apply(accepted, { type: "accept", orderId: "order" }, "accept", epoch)
        .units,
    ).toHaveLength(1);
  });
  it("rejects duplicate assignment and electrical deficiency", () => {
    const s = setup();
    expect(() =>
      apply(
        s,
        {
          type: "formation",
          name: "duplicate",
          units: s.units.map((u) => u.id),
        },
        "duplicate",
        epoch,
      ),
    ).toThrow("sudah digunakan");
    const noGenerator = s.trainsets[0]!.units.filter(
      (id) => s.units.find((u) => u.id === id)!.productId !== "generator",
    );
    expect(() =>
      apply(
        s,
        {
          type: "formation",
          trainsetId: s.trainsets[0]!.id,
          name: "broken",
          units: noGenerator,
        },
        "broken",
        epoch,
      ),
    ).toThrow("sumber listrik");
  });
  it("dispatches automatically and settles each run exactly once", () => {
    const s = operating();
    const done = at(s, 800);
    expect(done.runs.filter((r) => r.status === "completed")).toHaveLength(2);
    expect(done.trainsets[0]!.location).toBe(s.hub);
    expect(done.ledger.filter((x) => x.id.endsWith("settlement"))).toHaveLength(
      2,
    );
    expect(at(done, 800)).toEqual(done);
    expect(done.runs.every((r) => r.passengerKm <= r.seatKm)).toBe(true);
  });
  it("matches incremental and offline event processing", () => {
    const s = operating();
    let incremental = s;
    for (let m = 421; m <= 800; m++) incremental = at(incremental, m);
    expect(serializeCore(incremental)).toEqual(serializeCore(at(s, 800)));
  });
  it("uses the same pace after reload and does not duplicate income", () => {
    const s = at(operating(), 550);
    const restored = restoreCore(serializeCore(s));
    expect(at(restored, 800)).toEqual(at(s, 800));
    expect(catchUpCore(restored, restored.anchorMs - 60000)).toEqual(restored);
  });
  it("holds once when fuel is missing and never buys automatically offline", () => {
    let s = setup();
    s = apply(
      s,
      {
        type: "schedule",
        trainsetId: s.trainsets[0]!.id,
        serviceId: s.services[0]!.id,
        cycle: 1440,
        offset: 422,
        roundTrip: true,
      },
      "plan",
      epoch,
    );
    const after = at(s, 10 * 1440);
    expect(after.runs).toHaveLength(1);
    expect(after.runs[0]!.status).toBe("held");
    expect(after.depots[0]!.stock).toBe(0);
    expect(after.ledger.some((e) => e.label.includes("Pembelian fuel"))).toBe(
      false,
    );
  });
  it("allows onboard fuel to finish a trip when the depot is empty", () => {
    const s = operating();
    s.depots[0]!.stock = 0;
    expect(
      at(s, 800).runs.filter((r) => r.status === "completed"),
    ).toHaveLength(2);
  });
  it("separates fuel purchase cash, transfer and consumption expenses", () => {
    const s = operating();
    const before = s.cash;
    const after = at(s, 800);
    const fuelExpenses = after.ledger.filter((e) =>
      e.label.includes("konsumsi fuel"),
    );
    expect(fuelExpenses.length).toBeGreaterThan(0);
    expect(fuelExpenses.every((e) => e.cash === 0 && e.expense >= 0)).toBe(
      true,
    );
    const cashMovement = after.ledger
      .slice(s.ledger.length)
      .reduce((v, e) => v + e.cash, 0);
    expect(after.cash).toBeCloseTo(before + cashMovement, 5);
    const allLiters =
      after.depots[0]!.stock + after.units.reduce((v, u) => v + u.fuel, 0);
    expect(allLiters).toBeCloseTo(6000 - 320 * 2.8, 5);
  });
  it("rejects expired quotes and negative/over-capacity purchases", () => {
    const s = setup();
    expect(() =>
      apply(
        s,
        {
          type: "fuel",
          station: s.hub,
          liters: 100,
          bucket: fuelQuote(epoch).bucket - 1,
        },
        "old",
        epoch,
      ),
    ).toThrow("kedaluwarsa");
    expect(() =>
      apply(
        s,
        {
          type: "fuel",
          station: s.hub,
          liters: -5,
          bucket: fuelQuote(epoch).bucket,
        },
        "negative",
        epoch,
      ),
    ).toThrow("tidak valid");
    expect(() =>
      apply(
        s,
        {
          type: "fuel",
          station: s.hub,
          liters: 15000,
          bucket: fuelQuote(epoch).bucket,
        },
        "large",
        epoch,
      ),
    ).toThrow("kapasitas");
  });
  it("preview cannot mutate state, cash, fuel or clock", () => {
    const s = operating(),
      before = serializeCore(s);
    const preview = previewCoreRoundTrip(
      s,
      s.trainsets[0]!.id,
      s.services[0]!.id,
    );
    expect(preview.outbound.bookings.length).toBeGreaterThan(0);
    expect(serializeCore(s)).toBe(before);
  });
  it("storage upgrades change capacity once, never tank specifications or stock", () => {
    const s = apply(
      setup(),
      { type: "upgrade", station: "STN_BD_BANDUNG" },
      "upgrade",
      epoch,
    );
    const after = at(s, 800);
    expect(after.depots[0]!.capacity).toBe(s.depots[0]!.capacity * 2);
    expect(after.depots[0]!.stock).toBe(s.depots[0]!.stock);
    expect(coreFormation(after, after.trainsets[0]!).products[0]!.tank).toBe(
      3028,
    );
    expect(at(after, 900).depots[0]!.capacity).toBe(after.depots[0]!.capacity);
  });
  it("maintenance preserves commissioning age and retrofit preserves original body", () => {
    const s = setup(),
      u = s.units.find((x) => x.productId === "ec-standard")!;
    s.cash = 10_000_000_000;
    const job = apply(
      s,
      { type: "maintenance", unitId: u.id, retrofit: true },
      "retrofit",
      epoch,
    );
    const after = at(job, 4800),
      changed = after.units.find((x) => x.id === u.id)!;
    expect(changed.commissionedAt).toBe(u.commissionedAt);
    expect(CORE_PRODUCTS.find((p) => p.id === changed.productId)!.body).toBe(
      "mild-steel",
    );
    expect(CORE_PRODUCTS.find((p) => p.id === changed.productId)!.seats).toBe(
      72,
    );
  });
  it("allows seat reuse at intermediate stops while keeping segment loads within capacity", () => {
    let s = setup();
    s.access.push("SEG_GMR_CN");
    s = apply(
      s,
      {
        type: "service",
        name: "Tiga simpul",
        origin: s.hub,
        destination: "STN_CN_CIREBON",
        category: "Custom",
      },
      "three",
      epoch,
    );
    const run = previewCoreRoundTrip(s, s.trainsets[0]!.id, "three").outbound;
    expect(run.bookings.reduce((v, b) => v + b.count, 0)).toBeGreaterThan(424);
    for (let i = 0; i < run.legs.length; i++) {
      const onboard = run.bookings
        .filter((b) => b.from <= i && b.to > i)
        .reduce((v, b) => v + b.count, 0);
      expect(onboard).toBeLessThanOrEqual(424);
    }
    expect(run.passengerKm / run.seatKm).toBeLessThanOrEqual(1);
  });
  it("validates location and turnaround through the boundary of a 72-hour multi-service cycle", () => {
    let s = setup();
    s = apply(
      s,
      { type: "depot", station: "STN_GMR_GAMBIR" },
      "gambir-depot",
      epoch,
    );
    s = apply(
      s,
      {
        type: "service",
        name: "Layanan kedua",
        origin: "STN_GMR_GAMBIR",
        destination: s.hub,
        category: "Custom",
      },
      "second",
      epoch,
    );
    const duties = [
      { serviceId: s.services[0]!.id, reverse: false, offset: 422 },
      { serviceId: "second", reverse: false, offset: 550 },
    ];
    const planned = apply(
      s,
      { type: "diagram", trainsetId: s.trainsets[0]!.id, cycle: 4320, duties },
      "chain",
      epoch,
    );
    expect(planned.plans).toHaveLength(2);
    expect(planned.plans.every((p) => p.cycle === 4320)).toBe(true);
    expect(() =>
      apply(
        s,
        {
          type: "diagram",
          trainsetId: s.trainsets[0]!.id,
          cycle: 4320,
          duties: [duties[0]!, { ...duties[1]!, offset: 500 }],
        },
        "overlap",
        epoch,
      ),
    ).toThrow("jeda");
    expect(() =>
      apply(
        s,
        {
          type: "diagram",
          trainsetId: s.trainsets[0]!.id,
          cycle: 4320,
          duties: [duties[0]!, { ...duties[1]!, reverse: true }],
        },
        "teleport",
        epoch,
      ),
    ).toThrow("Lokasi");
  });
  it("queues maintenance into a single contracted bay instead of servicing every unit simultaneously", () => {
    let s = setup();
    s = apply(
      s,
      { type: "maintenance", unitId: s.units[0]!.id },
      "p1-loco",
      epoch,
    );
    s = apply(
      s,
      { type: "maintenance", unitId: s.units[1]!.id },
      "p1-coach",
      epoch,
    );
    expect(s.units[0]!.job!.end).toBe(540);
    expect(s.units[1]!.job!.end).toBe(600);
  });
  it("rejects malformed saves and disconnected path references without mutating the original", () => {
    const s = operating();
    const broken = JSON.parse(serializeCore(s));
    broken.units[0].fuel = 999999;
    expect(() => restoreCore(JSON.stringify(broken))).toThrow("tangki");
    broken.units[0].fuel = 0;
    broken.services[0].stations[1] = "STN_SGU_SURABAYAGUBENG";
    expect(() => restoreCore(JSON.stringify(broken))).toThrow("Path");
    const missing = JSON.parse(serializeCore(s));
    missing.runs = [{}];
    expect(() => restoreCore(JSON.stringify(missing))).toThrow();
  });
  it("recall returns physically, burns fuel, cancels unsettled tickets and cannot refund twice", () => {
    let s = at(operating(), 430);
    const id = s.runs[0]!.id;
    s = apply(s, { type: "recall", runId: id }, "recall-request", s.anchorMs);
    const outbound = at(s, 520);
    expect(outbound.trainsets[0]!.location).toBe("STN_GMR_GAMBIR");
    expect(outbound.runs[0]!.status).toBe("running");
    expect(outbound.runs[0]!.revenue).toBe(0);
    const returned = at(outbound, 650);
    expect(returned.trainsets[0]!.location).toBe(s.hub);
    expect(returned.runs[0]!.status).toBe("completed");
    expect(returned.units.every((u) => u.fuel >= 0)).toBe(true);
    expect(
      returned.depots[0]!.stock +
        returned.units.reduce((v, u) => v + u.fuel, 0),
    ).toBeCloseTo(6000 - 896, 5);
    expect(returned.ledger.filter((e) => e.id === `${id}:recall`)).toHaveLength(
      1,
    );
    expect(() =>
      apply(
        returned,
        { type: "recall", runId: id },
        "again",
        returned.anchorMs,
      ),
    ).toThrow("Recall");
  });
  it("stops safely at an intermediate station and resumes without a second dispatch or ticket sale", () => {
    let s = setup();
    s.access.push("SEG_GMR_CN");
    s = apply(
      s,
      {
        type: "service",
        name: "Trois arrêts",
        origin: s.hub,
        destination: "STN_CN_CIREBON",
        category: "Custom",
      },
      "three",
      epoch,
    );
    s = apply(
      s,
      {
        type: "fuel",
        station: s.hub,
        liters: 6000,
        bucket: fuelQuote(epoch).bucket,
      },
      "fuel",
      epoch,
    );
    s = apply(
      s,
      { type: "fill", trainsetId: s.trainsets[0]!.id },
      "fill",
      epoch,
    );
    s = apply(
      s,
      {
        type: "schedule",
        trainsetId: s.trainsets[0]!.id,
        serviceId: "three",
        cycle: 1440,
        offset: 422,
        roundTrip: true,
      },
      "plan",
      epoch,
    );
    s = at(s, 430);
    const runId = s.runs[0]!.id;
    s = apply(s, { type: "stop", runId }, "stop", s.anchorMs);
    s = at(s, 530);
    expect(s.runs[0]!.status).toBe("stopped");
    expect(s.trainsets[0]!.location).toBe("STN_GMR_GAMBIR");
    const bookings = structuredClone(s.runs[0]!.bookings);
    s = apply(s, { type: "resume", runId }, "resume", s.anchorMs);
    const after = at(s, 700);
    expect(after.runs[0]!.bookings).toEqual(bookings);
    expect(
      after.ledger.filter((e) => e.id === `${runId}:dispatch`),
    ).toHaveLength(1);
  });
});
