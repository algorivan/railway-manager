import { describe, it, expect } from "vitest";
import { CORE_PRODUCTS } from "@railway/game-data";
import {
  applyCoreAction as apply,
  catchUpCore,
  coreFormation,
  coreServiceName,
  findCorePath,
  forecastCore,
  coreCrewNeeds,
  createCoreState,
  fuelQuote,
  previewCoreRoundTrip,
  previewCoreDiagram,
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
      liters: 16000,
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
  it("automatically names reusable relations from station codes", () => {
    const s = setup();
    const next = apply(s, { type: "service", origin: s.hub, destination: "STN_GMR_GAMBIR", category: "Custom" }, "auto-name", epoch);
    expect(next.services.at(-1)!.name).toBe(coreServiceName(s.hub, "STN_GMR_GAMBIR"));
    expect(next.services.at(-1)!.name).toBe("BD – GMR");
  });
  it("runs once each way on the same relation and keeps location and turnaround across reload", () => {
    let s = operating();
    const tid = s.trainsets[0]!.id, rid = s.services[0]!.id;
    s = apply(s, { type: "disableDiagram", trainsetId: tid }, "pause-pp", epoch);
    const schedule = (reverse: boolean, offset: number, id: string) => apply(s, { type: "schedule", trainsetId: tid, serviceId: rid, reverse, offset, cycle: 1440, roundTrip: false }, id, epoch);
    expect(() => schedule(true, 422, "wrong-direction")).toThrow("pilih arah");
    s = schedule(false, 422, "out-once");
    expect(() => schedule(false, 423, "duplicate")).toThrow("diagram sebelumnya");
    const end = forecastCore(s, tid, rid, false, 422).end;
    s = at(s, end + 1);
    expect(s.trainsets[0]!.location).toBe("STN_GMR_GAMBIR");
    expect(s.plans.some((p) => p.active)).toBe(false);
    expect(() => schedule(true, Math.ceil(end + 2), "early")).toThrow("Jeda persiapan");
    const departure = Math.ceil(s.trainsets[0]!.readyAt + 1);
    s = schedule(true, departure, "return-once");
    s = restoreCore(serializeCore(s))!;
    expect(s.plans.at(-1)!.once).toBe(true);
    s = at(s, forecastCore(s, tid, rid, true, departure).end + 1);
    expect(s.trainsets[0]!.location).toBe(s.hub);
    expect(s.runs.filter((r) => r.status === "completed")).toHaveLength(2);
    s = at(s, s.minute + 1440);
    expect(s.runs).toHaveLength(2);
  });
  it("saves one trainset pattern across BD–GMR and BD–YK without teleporting or overlaps", () => {
    let s = setup();
    s = apply(s, { type: "service", origin: s.hub, destination: "STN_YK_YOGYAKARTA", category: "Custom" }, "bd-yk", epoch);
    const tid = s.trainsets[0]!.id, rid = s.services[0]!.id;
    const duties = [{ serviceId: rid, reverse: false, offset: 422 }];
    const add = (serviceId: string, reverse: boolean, rest: number) => {
      const last = duties.at(-1)!;
      const arrival = forecastCore(s, tid, last.serviceId, last.reverse, last.offset).end;
      duties.push({ serviceId, reverse, offset: Math.ceil(arrival + rest) });
    };
    add(rid, true, 60);
    add("bd-yk", false, 30);
    const open = [...duties];
    add("bd-yk", true, 60);
    const action = { type: "diagram" as const, trainsetId: tid, cycle: 2880, duties };
    const saved = restoreCore(serializeCore(apply(s, action, "pattern", epoch)))!;
    expect(saved.plans.filter((p) => p.active)).toHaveLength(4);
    expect(new Set(saved.plans.map((p) => p.trainsetId)).size).toBe(1);
    expect(() => apply(s, { ...action, duties: open }, "open", epoch)).toThrow("Lokasi");
    expect(() => apply(s, { ...action, duties: duties.map((d, i) => i === 2 ? { ...d, offset: duties[1]!.offset + 1 } : d) }, "overlap", epoch)).toThrow("jeda");
  });
  it("previews time blocks through midnight without mutating the saved company", () => {
    const s = setup(), tid = s.trainsets[0]!.id, serviceId = s.services[0]!.id;
    const first = forecastCore(s, tid, serviceId, false, 1380);
    const duties = [{ serviceId, reverse: false, offset: 1380 }, { serviceId, reverse: true, offset: Math.ceil(first.end + 60) }];
    const before = serializeCore(s);
    const preview = previewCoreDiagram(s, tid, 2880, duties);
    expect(preview.issues).toEqual([]);
    expect(preview.runs[0]!.end).toBeGreaterThan(1440);
    expect(preview.runs[1]!.start).toBeGreaterThan(1440);
    expect(serializeCore(s)).toBe(before);
    const invalid = previewCoreDiagram(s, tid, 2880, [duties[0]!, { ...duties[1]!, offset: 1400 }]);
    expect(invalid.issues.some((issue) => issue.includes("jeda"))).toBe(true);
    expect(() => apply(s, { type: "diagram", trainsetId: tid, cycle: 2880, duties: invalid.duties }, "bad-blocks", epoch)).toThrow(invalid.issues[0]);
  });
  it("makes intermediate stations selectable endpoints and honors optional stops/dwell", () => {
    let s = setup();
    const station = findCorePath(s.hub, "STN_GMR_GAMBIR", s.access).stations[1]!;
    const destination = findCorePath(s.hub, "STN_GMR_GAMBIR", s.access).stations[2]!;
    s = apply(s, { type: "service", origin: s.hub, destination, category: "Local" }, "with-stop", epoch);
    s = apply(s, { type: "service", origin: s.hub, destination, category: "Local", stops: [s.hub, destination] }, "pass-stop", epoch);
    const stopped = forecastCore(s, s.trainsets[0]!.id, "with-stop"), passed = forecastCore(s, s.trainsets[0]!.id, "pass-stop");
    expect(stopped.legs[0]!.to).toBe(station);
    expect(stopped.legs[0]!.commercialStop).toBe(true);
    expect(passed.legs[0]!.commercialStop).toBe(false);
    expect(stopped.end - stopped.start).toBeCloseTo(stopped.legs.reduce((sum, leg) => sum + leg.minutes, 0) + 3);
    expect(stopped.end).toBeGreaterThan(passed.end);
    s = apply(s, { type: "service", origin: s.hub, destination: station, category: "Local" }, "small-endpoint", epoch);
    expect(s.services.at(-1)!.stations.at(-1)).toBe(station);
    expect(restoreCore(serializeCore(s))!.services.at(-1)!.id).toBe("small-endpoint");
  });
  it("preserves old saved corridor services and their running train after stations are added", () => {
    let s = setup();
    s.services[0]!.stations = [s.hub, "STN_GMR_GAMBIR"];
    s.services[0]!.segments = ["SEG_GMR_BD"];
    s.services[0]!.stops = [...s.services[0]!.stations];
    s = apply(s, { type: "fuel", station: s.hub, liters: 16000, bucket: fuelQuote(epoch).bucket }, "legacy-fuel", epoch);
    s = apply(s, { type: "fill", trainsetId: s.trainsets[0]!.id }, "legacy-fill", epoch);
    s = apply(s, { type: "schedule", trainsetId: s.trainsets[0]!.id, serviceId: s.services[0]!.id, cycle: 1440, offset: 422, roundTrip: false }, "legacy-plan", epoch);
    s = at(s, 430);
    s = restoreCore(serializeCore(s))!;
    expect(s.runs[0]!.legs.map((leg) => leg.segmentId)).toEqual(["SEG_GMR_BD"]);
    s = at(s, s.runs[0]!.end + 1);
    expect(s.runs[0]!.status).toBe("completed");
    expect(s.trainsets[0]!.location).toBe("STN_GMR_GAMBIR");
  });
  it("preserves numbered segments from the first intermediate-station release", () => {
    let s = setup();
    const relation = s.services[0]!;
    relation.stations = [s.hub, "STN_OSMN10693460259", "STN_OSMN6483392223", "STN_OSMN7835804886", "STN_OSMN1228413279", "STN_OSMN3469731328", "STN_GMR_GAMBIR"];
    relation.segments = [5, 4, 3, 2, 1, 0].map((i) => `SEG_GMR_BD:stop:${i}`);
    relation.stops = [...relation.stations];
    const restored = restoreCore(serializeCore(s))!;
    const forecast = forecastCore(restored, restored.trainsets[0]!.id, relation.id);
    expect(forecast.legs).toHaveLength(6);
    expect(forecast.legs[0]!.to).toBe("STN_OSMN10693460259");
    expect(forecast.legs.reduce((sum, leg) => sum + leg.km, 0)).toBeCloseTo(160);
    expect(forecast.destination).toBe("STN_GMR_GAMBIR");
  });
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
    expect(run.bookings.every((b) => b.from === 0 && b.to === run.legs.length)).toBe(true);
  });
  it("checks the whole Local path's province, not just matching endpoint provinces", () => {
    // Same-province endpoints forced through East Java; the new Cikampek connection
    // correctly lets Bandung–Cirebon stay within West Java now.
    const s = createCoreState(epoch, "STN_SMT_SEMARANGTAWANG");
    s.access = ["SEG_SMT_SGU", "SEG_SLO_SGU"];
    expect(() => apply(s, { type: "service", origin: s.hub, destination: "STN_SLO_SOLOBALAPAN", category: "Local" }, "local", epoch)).toThrow("provinsi");
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
    expect(s.cash).toBe(500_000_000);
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
    expect(allLiters).toBeCloseTo(16000 - 320 * 2.8, 5);
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
          liters: s.depots[0]!.capacity + 1,
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
      9084,
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
      { serviceId: "second", reverse: false, offset: Math.ceil(forecastCore(s, s.trainsets[0]!.id, s.services[0]!.id, false, 422).end + 31) },
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
    expect(s.units[0]!.job!.end).toBe(450);
    expect(s.units[1]!.job!.end).toBe(465);
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
    let s = at(operating(), 422.5);
    const id = s.runs[0]!.id;
    s = apply(s, { type: "recall", runId: id }, "recall-request", s.anchorMs);
    const firstArrival = s.runs[0]!.nextEvent;
    const safeStation = s.runs[0]!.legs[s.runs[0]!.leg]!.to;
    const forwardKm = s.runs[0]!.legs.slice(0, s.runs[0]!.leg + 1).reduce((sum, leg) => sum + leg.km, 0);
    const outbound = at(s, firstArrival + 1);
    expect(outbound.trainsets[0]!.location).toBe(safeStation);
    expect(outbound.runs[0]!.status).toBe("running");
    expect(outbound.runs[0]!.revenue).toBe(0);
    const returnKm = outbound.runs[0]!.legs.reduce((sum, leg) => sum + leg.km, 0);
    const fuelPerKm = coreFormation(s, s.trainsets[0]!).products.reduce((sum, product) => sum + product.litersPerKm, 0);
    const returned = at(outbound, outbound.runs[0]!.end + 1);
    expect(returned.trainsets[0]!.location).toBe(s.hub);
    expect(returned.runs[0]!.status).toBe("completed");
    expect(returned.units.every((u) => u.fuel >= 0)).toBe(true);
    expect(
      returned.depots[0]!.stock +
        returned.units.reduce((v, u) => v + u.fuel, 0),
    ).toBeCloseTo(16000 - (forwardKm + returnKm) * fuelPerKm, 5);
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
        liters: 16000,
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
    s = at(s, 422.5);
    const runId = s.runs[0]!.id;
    s = apply(s, { type: "stop", runId }, "stop", s.anchorMs);
    const safeStation = s.runs[0]!.legs[s.runs[0]!.leg]!.to;
    s = at(s, s.runs[0]!.nextEvent + 1);
    expect(s.runs[0]!.status).toBe("stopped");
    expect(s.trainsets[0]!.location).toBe(safeStation);
    const bookings = structuredClone(s.runs[0]!.bookings);
    s = apply(s, { type: "resume", runId }, "resume", s.anchorMs);
    const after = at(s, 700);
    expect(after.runs[0]!.bookings).toEqual(bookings);
    expect(
      after.ledger.filter((e) => e.id === `${runId}:dispatch`),
    ).toHaveLength(1);
  });
});

describe("automatic crew recruitment", () => {
  it("reports no demand before a trainset exists and rejects recruitment", () => {
    const s = createCoreState(epoch);
    expect(() => apply(s, { type: "recruitAuto" }, "recruit", epoch)).toThrow(
      "Buat trainset",
    );
    expect(s.trainsets).toHaveLength(0);
  });
  it("fills missing contracts, persists them, and leaves cash unchanged", () => {
    const s = setup();
    s.trainsets[0]!.crew = false;
    const next = apply(s, { type: "recruitAuto" }, "recruit", epoch);
    expect(next.trainsets.every((t) => t.crew)).toBe(true);
    expect(s.trainsets[0]!.crew).toBe(false);
    expect(next.cash).toBe(s.cash);
    expect(restoreCore(serializeCore(next)).trainsets[0]!.crew).toBe(true);
    expect(apply(next, { type: "recruitAuto" }, "recruit", epoch)).toEqual(
      next,
    );
    expect(() =>
      apply(next, { type: "recruitAuto" }, "another", epoch),
    ).toThrow("sudah terpenuhi");
  });
  it("recruits for multiple trainsets while retaining existing contracts", () => {
    const s = setup(),
      first = s.trainsets[0]!;
    const extra = s.units.map((u) => ({ ...u, id: `reserve-${u.id}` }));
    s.units.push(...extra);
    s.trainsets.push({
      ...first,
      id: "reserve",
      name: "Reserve",
      units: extra.map((u) => u.id),
      crew: false,
    });
    const next = apply(s, { type: "recruitAuto" }, "bulk-recruit", epoch);
    expect(next.trainsets.map((t) => t.crew)).toEqual([true, true]);
    expect(next.cash).toBe(s.cash);
  });
  it("rejects recruitment while a target is moving without changing contracts", () => {
    const s = at(operating(), 423);
    expect(s.runs.some((r) => r.status === "running")).toBe(true);
    s.trainsets[0]!.crew = false;
    expect(() =>
      apply(s, { type: "recruitAuto" }, "moving-recruit", s.anchorMs),
    ).toThrow("Tunggu trainset tiba");
    expect(s.trainsets[0]!.crew).toBe(false);
  });
  it("derives staff roles from coaches, dining and luxury cars", () => {
    const s = setup(),
      t = s.trainsets[0]!;
    const base = coreCrewNeeds(s, t);
    expect(base.masinis).toBe(1);
    expect(base.kondektur).toBe(1);
    expect(base.onboardService).toBe(0);
    // Roster preview also supports formation growth without inventing employees.
    const coach = s.units.find((u) => u.productId === "ec-standard")!;
    s.units.push({ ...coach, id: "extra-coach" });
    t.units.push("extra-coach");
    expect(coreCrewNeeds(s, t).kondektur).toBe(2);
    const dining = { ...coach, id: "dining", productId: "dining" };
    s.units.push(dining);
    t.units.push(dining.id);
    expect(coreCrewNeeds(s, t).onboardService).toBe(2);
  });
  it("adds an assistant for a night duty and keeps an active contract", () => {
    const s = operating(),
      t = s.trainsets[0]!;
    s.plans[0]!.nextAt = 1380;
    expect(coreCrewNeeds(s, t).tractionSupport).toBe(1);
    expect(t.crew).toBe(true);
  });
});
