import { z } from "zod";
import { WorkloadCalculator } from "@railway/workforce";
import {
  CORE_BALANCE as B,
  CORE_PRODUCTS,
  CORE_FARES,
  CORE_STATION_PROVINCE,
  CoreClass,
  JAVA_STATION_CATALOG as STATIONS,
  JAVA_TRACK_CORRIDOR_SEGMENTS as TRACKS,
} from "@railway/game-data";

export const coreProduct = (id: string) => {
  const p = CORE_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error("Varian sarana tidak ditemukan.");
  return p;
};
export const stationName = (id: string) =>
  STATIONS.find((x) => x.id === id)?.name.replace("Stasiun ", "") ?? id;
export interface CoreUnit {
  id: string;
  productId: string;
  location: string;
  condition: number;
  km: number;
  fuel: number;
  fuelCost: number;
  commissionedAt: number;
  nextService: number;
  lastServiceKm?: number;
  job?: { end: number; kind: "P1" | "retrofit"; target?: string };
}
export interface CoreTrainset {
  id: string;
  name: string;
  units: string[];
  location: string;
  readyAt: number;
  parked: boolean;
  crew: boolean;
}
export interface CoreService {
  id: string;
  name: string;
  stations: string[];
  segments: string[];
  stops?: string[];
  category: string;
  fares: Record<CoreClass, number>;
  autoFare: boolean;
}
export interface CorePlan {
  id: string;
  trainsetId: string;
  serviceId: string;
  reverse: boolean;
  cycle: number;
  offset: number;
  nextAt: number;
  active: boolean;
}
export interface CoreBooking {
  from: number;
  to: number;
  cls: CoreClass;
  count: number;
  fare: number;
}
export interface CoreRun {
  id: string;
  planId: string;
  trainsetId: string;
  serviceId: string;
  name: string;
  unitIds: string[];
  status: "running" | "held" | "stopped" | "completed";
  reason: string;
  origin: string;
  destination: string;
  start: number;
  end: number;
  nextEvent: number;
  leg: number;
  phase: "move" | "dwell";
  legs: {
    segmentId: string;
    from: string;
    to: string;
    km: number;
    speed: number;
    minutes: number;
    commercialStop?: boolean;
  }[];
  bookings: CoreBooking[];
  seats: Record<CoreClass, number>;
  revenue: number;
  cost: number;
  fuelLiters: number;
  passengerKm: number;
  seatKm: number;
  delay: number;
  stopRequested?: boolean;
  recallRequested?: boolean;
  recalling?: boolean;
  stoppedAt?: number;
  recallCashDue?: number;
}
export interface CoreState {
  version: 7;
  minute: number;
  anchorMs: number;
  mode: "Realism" | "Casual";
  hub: string;
  cash: number;
  reputation: number;
  units: CoreUnit[];
  trainsets: CoreTrainset[];
  services: CoreService[];
  plans: CorePlan[];
  runs: CoreRun[];
  depots: {
    station: string;
    stock: number;
    cost: number;
    capacity: number;
    upgradeEnd?: number;
  }[];
  orders: {
    id: string;
    productId: string;
    quantity: number;
    station: string;
    due: number;
    accepted: boolean;
  }[];
  ledger: {
    id: string;
    minute: number;
    label: string;
    cash: number;
    expense: number;
    revenue: number;
  }[];
  actions: string[];
  demandUsed: Record<string, number>;
  access: string[];
  campaigns: {
    station: string;
    end: number;
    lift: number;
    scope?: "hub" | "corridor" | "regional";
  }[];
  nextOverhead: number;
}
const classes: CoreClass[] = ["EC", "EX", "LX"];
export const pace = (s: CoreState) => (s.mode === "Casual" ? 1.5 : 1);
export function createCoreState(
  now: number,
  hub: string = B.starterHub,
): CoreState {
  if (!STATIONS.some((x) => x.id === hub))
    throw new Error("Hub tidak tersedia.");
  const starterCost =
    coreProduct("cc201").price +
    coreProduct("ec-standard").price * 4 +
    coreProduct("generator").price;
  return {
    version: 7,
    minute: 420,
    anchorMs: now,
    mode: "Casual",
    hub,
    cash: starterCost + B.starterReserveCash,
    reputation: 50,
    units: [],
    trainsets: [],
    services: [],
    plans: [],
    runs: [],
    depots: [{ station: hub, stock: 0, cost: 0, capacity: B.depotCapacity }],
    orders: [],
    ledger: [],
    actions: [],
    demandUsed: {},
    access: TRACKS.filter(
      (x) => x.originStationId === hub || x.destinationStationId === hub,
    ).map((x) => x.id),
    campaigns: [],
    nextOverhead: 1440,
  };
}
export function findCorePath(
  from: string,
  to: string,
  allowed?: string[],
): { stations: string[]; segments: string[] } {
  const distances = new Map([[from, 0]]),
    previous = new Map<string, { station: string; segment: string }>();
  const visited = new Set<string>();
  while (true) {
    const current = [...distances]
      .filter(([s]) => !visited.has(s))
      .sort((a, b) => a[1] - b[1])[0];
    if (!current)
      throw new Error("Tidak ada lintas terhubung yang dapat diakses.");
    const [id, d] = current;
    if (id === to) break;
    visited.add(id);
    for (const edge of TRACKS) {
      if (allowed && !allowed.includes(edge.id)) continue;
      const next =
        edge.originStationId === id
          ? edge.destinationStationId
          : edge.destinationStationId === id
            ? edge.originStationId
            : undefined;
      if (next && d + edge.distanceKm < (distances.get(next) ?? Infinity)) {
        distances.set(next, d + edge.distanceKm);
        previous.set(next, { station: id, segment: edge.id });
      }
    }
  }
  const stations = [to],
    segments: string[] = [];
  while (stations[0] !== from) {
    const prev = previous.get(stations[0]!);
    if (!prev) throw new Error("Path tidak lengkap.");
    stations.unshift(prev.station);
    segments.unshift(prev.segment);
  }
  if (!segments.length) throw new Error("Asal dan tujuan harus berbeda.");
  return { stations, segments };
}
export function coreFormation(s: CoreState, t: CoreTrainset) {
  const units = t.units.map((id) => s.units.find((u) => u.id === id)!);
  if (units.some((u) => !u)) throw new Error("Unit rangkaian hilang.");
  const products = units.map((u) => coreProduct(u.productId));
  const seats = { EC: 0, EX: 0, LX: 0 };
  for (const p of products)
    if (p.serviceClass) seats[p.serviceClass] += p.seats;
  return {
    units,
    products,
    seats,
    length: products.reduce((a, p) => a + p.length, 0),
    weight: products.reduce((a, p) => a + p.weight, 0),
    speed: Math.min(...products.map((p) => p.speed)),
    power: products.reduce((a, p) => a + p.powerKw, 0),
    capacity: seats.EC + seats.EX + seats.LX,
  };
}
function legsFor(
  s: CoreState,
  t: CoreTrainset,
  r: CoreService,
  reverse: boolean,
) {
  const f = coreFormation(s, t),
    stationIds = reverse ? [...r.stations].reverse() : r.stations;
  return (reverse ? [...r.segments].reverse() : r.segments).map((id, i) => {
    const edge = TRACKS.find((x) => x.id === id)!;
    const speed = Math.min(f.speed, edge.trackSpeedLimitKmh);
    return {
      segmentId: id,
      from: stationIds[i]!,
      to: stationIds[i + 1]!,
      commercialStop: (r.stops ?? r.stations).includes(stationIds[i + 1]!),
      km: edge.distanceKm,
      speed,
      minutes: (edge.distanceKm / speed) * 60,
    };
  });
}
function accounting(
  s: CoreState,
  id: string,
  label: string,
  cash: number,
  expense = 0,
  revenue = 0,
) {
  if (s.ledger.some((x) => x.id === id)) return;
  if (s.cash + cash < -0.01)
    throw new Error("Kas tidak mencukupi; kurangi jumlah atau frekuensi.");
  s.cash += cash;
  s.ledger.push({ id, minute: s.minute, label, cash, expense, revenue });
}
export function fuelQuote(now: number) {
  const bucket = Math.floor(now / 1_800_000);
  // Public, deterministic single-player market. Never advertised as a trusted server quote.
  const price =
    Math.round((B.fuelBasePrice * (1 + 0.1 * Math.sin(bucket / 6))) / 10) * 10;
  return { bucket, price, expires: (bucket + 1) * 1_800_000 };
}
function book(s: CoreState, r: CoreService, run: CoreRun, commit: boolean) {
  const loads = run.legs.map(() => ({ EC: 0, EX: 0, LX: 0 }));
  const stopIds = [run.origin, ...run.legs.map((x) => x.to)];
  for (let a = 0; a < stopIds.length - 1; a++)
    for (let b = a + 1; b < stopIds.length; b++)
      for (const cls of classes) {
        if (
          !run.seats[cls] ||
          !(r.stops ?? r.stations).includes(stopIds[a]!) ||
          !(r.stops ?? r.stations).includes(stopIds[b]!)
        )
          continue;
        const dist = run.legs.slice(a, b).reduce((v, l) => v + l.km, 0);
        const ref = CORE_FARES[cls],
          fare = Math.round((ref.boarding + ref.perKm * dist) * r.fares[cls]);
        const origin = STATIONS.find((x) => x.id === stopIds[a])!,
          dest = STATIONS.find((x) => x.id === stopIds[b])!;
        const departure =
          run.start +
          run.legs
            .slice(0, a)
            .reduce(
              (v, l) =>
                v +
                l.minutes +
                (l.commercialStop === false ? 0 : B.dwellMinutes),
              0,
            );
        const key = `${stopIds[a]}:${stopIds[b]}:${cls}:${Math.floor(departure / 120)}`;
        const hour = (departure % 1440) / 60;
        const time =
          (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20) ? 1.25 : 0.75;
        const lift = Math.max(
          0,
          ...s.campaigns
            .filter((x) => {
              if (x.end <= departure) return false;
              if (x.scope === "corridor") return r.stations.includes(x.station);
              if (x.scope === "regional")
                return (
                  STATIONS.find((st) => st.id === x.station)?.region ===
                  STATIONS.find((st) => st.id === stopIds[a])?.region
                );
              return x.station === stopIds[a] || x.station === stopIds[b];
            })
            .map((x) => x.lift),
        );
        const classFactor = cls === "EC" ? 0.8 : cls === "EX" ? 0.16 : 0.04;
        const market = Math.floor(
          ((Math.min(
            origin.demandProfile.baseDailyDemand,
            dest.demandProfile.baseDailyDemand,
          ) *
            B.marketShare *
            time *
            classFactor *
            (0.5 + (0.5 * s.reputation) / 100)) /
            0.75) *
            (1 + lift),
        );
        const demand = Math.max(
          0,
          Math.floor(market * Math.pow(r.fares[cls], -ref.elasticity)) -
            (s.demandUsed[key] ?? 0),
        );
        const available = Math.min(
          ...loads.slice(a, b).map((l) => run.seats[cls] - l[cls]),
        );
        const count = Math.min(demand, available);
        if (count) {
          run.bookings.push({ from: a, to: b, cls, count, fare });
          run.revenue += count * fare;
          run.passengerKm += count * dist;
          for (let i = a; i < b; i++) loads[i]![cls] += count;
          if (commit) s.demandUsed[key] = (s.demandUsed[key] ?? 0) + count;
        }
      }
  run.seatKm =
    run.legs.reduce((v, l) => v + l.km, 0) *
    classes.reduce((v, c) => v + run.seats[c], 0);
}
export function forecastCore(
  s: CoreState,
  trainsetId: string,
  serviceId: string,
  reverse = false,
  start = s.minute,
): CoreRun {
  const t = s.trainsets.find((x) => x.id === trainsetId),
    r = s.services.find((x) => x.id === serviceId);
  if (!t || !r) throw new Error("Pilih trainset dan relasi.");
  const legs = legsFor(s, t, r, reverse),
    f = coreFormation(s, t);
  const distance = legs.reduce((v, l) => v + l.km, 0),
    minutes =
      legs.reduce((v, l) => v + l.minutes, 0) +
      legs.slice(0, -1).filter((l) => l.commercialStop !== false).length *
        B.dwellMinutes;
  const liters = f.products.reduce((v, p) => v + p.litersPerKm, 0) * distance;
  const tac = distance * (B.tacBase + (B.tacWeightSurcharge * f.weight) / 100);
  const run: CoreRun = {
    id: "forecast",
    planId: "",
    trainsetId: t.id,
    serviceId: r.id,
    name: r.name,
    unitIds: [...t.units],
    status: "running",
    reason: "",
    origin: legs[0]!.from,
    destination: legs.at(-1)!.to,
    start,
    end: start + minutes,
    nextEvent: start + legs[0]!.minutes,
    leg: 0,
    phase: "move",
    legs,
    bookings: [],
    seats: f.seats,
    revenue: 0,
    cost:
      tac +
      (minutes / 60) * B.crewPerHour +
      distance * B.maintenancePerKm +
      liters * fuelQuote(s.anchorMs).price,
    fuelLiters: liters,
    passengerKm: 0,
    seatKm: 0,
    delay: 0,
  };
  book(s, r, run, false);
  return run;
}
/** Contract roster adapts to formation and the largest active duty requirement. */
export function coreCrewNeeds(s: CoreState, t: CoreTrainset) {
  const f = coreFormation(s, t);
  const duties = s.plans.filter((p) => p.trainsetId === t.id && p.active);
  const rosters = (duties.length ? duties : [undefined]).map((plan) => {
    const run = plan
      ? forecastCore(s, t.id, plan.serviceId, plan.reverse, plan.nextAt)
      : undefined;
    return WorkloadCalculator.calculateServiceWorkload({
      transitMinutes: run ? run.end - run.start : 1,
      dwellMinutes: 0,
      departureMinuteOfDay: run ? ((run.start % 1440) + 1440) % 1440 : 720,
      passengerCarriageCount: f.products.filter((p) => p.kind === "coach")
        .length,
      hasDiningCar: f.products.some((p) => p.kind === "dining"),
      hasLuxuryCarriage: f.products.some((p) => p.serviceClass === "LX"),
      isFreightOnly: false,
      consistWeightTons: f.weight,
    }).roster;
  });
  const masinis = Math.max(...rosters.map((r) => r.masinis));
  const tractionSupport = Math.max(...rosters.map((r) => r.tractionSupport));
  const kondektur = Math.max(...rosters.map((r) => r.kondektur));
  const onboardService = Math.max(...rosters.map((r) => r.onboardService));
  return {
    masinis,
    tractionSupport,
    kondektur,
    onboardService,
    totalCrew: masinis + tractionSupport + kondektur + onboardService,
  };
}
export function coreReadiness(
  s: CoreState,
  t: CoreTrainset,
  r: CoreService,
  reverse = false,
): string[] {
  const f = coreFormation(s, t),
    legs = legsFor(s, t, r, reverse),
    reasons: string[] = [];
  if (s.runs.some((x) => x.trainsetId === t.id && x.status === "running"))
    reasons.push("Trainset sedang berjalan.");
  if (t.location !== legs[0]!.from)
    reasons.push(
      `Trainset berada di ${stationName(t.location)}, bukan ${stationName(legs[0]!.from)}.`,
    );
  if (t.readyAt > s.minute)
    reasons.push("Jeda turnaround atau persiapan belum selesai.");
  if (!t.crew) reasons.push("Kontrak kru belum diaktifkan.");
  if (f.products.filter((p) => p.kind === "loco").length !== 1)
    reasons.push("Satu lokomotif diperlukan.");
  if (!f.capacity) reasons.push("Rangkaian belum memiliki kursi penumpang.");
  if (f.power < 0)
    reasons.push("Daya listrik rangkaian tidak cukup. Tambahkan pembangkit.");
  if (
    f.units.some(
      (u) =>
        u.job ||
        u.condition < 70 ||
        u.nextService <= s.minute ||
        u.km - (u.lastServiceKm ?? 0) >= 10_000,
    )
  )
    reasons.push("Unit membutuhkan servis atau masih Pending.");
  if (
    (r.stops ?? r.stations).some(
      (id) =>
        f.length >
        (STATIONS.find((x) => x.id === id)?.maxTrainLengthMeters ?? 0),
    )
  )
    reasons.push("Panjang rangkaian melebihi peron.");
  if (r.segments.some((id) => !s.access.includes(id)))
    reasons.push("Hak akses lintas belum tersedia.");
  const depot = s.depots.find((d) => d.station === t.location);
  let refill = 0;
  for (const u of f.units) {
    const p = coreProduct(u.productId),
      need =
        legs.reduce((v, l) => v + l.km, 0) *
        p.litersPerKm *
        (1 + B.fuelReserve);
    if (need > p.tank + 0.001)
      reasons.push(
        `Tangki ${p.name} tidak cukup sampai terminus; gunakan relasi lebih pendek.`,
      );
    refill += Math.max(0, need - u.fuel);
  }
  if (refill > (depot?.stock ?? 0) + 0.001)
    reasons.push(
      `Fuel tidak cukup: perlu tambahan ${Math.ceil(refill - (depot?.stock ?? 0))} L di ${stationName(t.location)}.`,
    );
  const preview = forecastCore(s, t.id, r.id, reverse);
  const cashCost =
    preview.cost - preview.fuelLiters * fuelQuote(s.anchorMs).price;
  if (s.cash < cashCost)
    reasons.push("Cadangan kas untuk TAC, kru dan maintenance tidak cukup.");
  return [...new Set(reasons)];
}
function startRun(s: CoreState, run: CoreRun) {
  const t = s.trainsets.find((x) => x.id === run.trainsetId)!,
    r = s.services.find((x) => x.id === run.serviceId)!;
  const reverse = run.origin !== r.stations[0];
  const reasons = coreReadiness(s, t, r, reverse);
  if (reasons.length) {
    run.status = "held";
    run.reason = reasons.join(" ");
    run.nextEvent = Infinity;
    return;
  }
  const fresh = forecastCore(s, t.id, r.id, reverse, s.minute);
  Object.assign(run, fresh, {
    id: run.id,
    planId: run.planId,
    status: "running",
  });
  run.bookings = [];
  run.revenue = 0;
  run.passengerKm = 0;
  book(s, r, run, true);
  const f = coreFormation(s, t),
    depot = s.depots.find((d) => d.station === t.location);
  let fuelCost = 0;
  for (const u of f.units) {
    const p = coreProduct(u.productId),
      consumed = run.legs.reduce((v, l) => v + l.km, 0) * p.litersPerKm;
    const refill = Math.max(0, consumed * (1 + B.fuelReserve) - u.fuel);
    if (refill && depot) {
      const oldValue = u.fuel * u.fuelCost;
      u.fuel += refill;
      u.fuelCost = (oldValue + refill * depot.cost) / u.fuel;
      depot.stock -= refill;
    }
    fuelCost += consumed * u.fuelCost;
  }
  const cashCost = fresh.cost - fresh.fuelLiters * fuelQuote(s.anchorMs).price;
  run.cost = cashCost + fuelCost;
  accounting(
    s,
    `${run.id}:dispatch`,
    `${run.name} • TAC, kru, cadangan perawatan`,
    -cashCost,
    cashCost,
  );
  t.parked = false;
}
function conflictDelay(s: CoreState, run: CoreRun): number {
  const leg = run.legs[run.leg]!,
    track = TRACKS.find((x) => x.id === leg.segmentId)!;
  let until = s.minute;
  for (const other of s.runs) {
    if (
      other.id === run.id ||
      other.status !== "running" ||
      other.phase !== "move"
    )
      continue;
    const active = other.legs[other.leg]!;
    if (
      active.segmentId === leg.segmentId &&
      (!track.isDoubleTrack || active.from === leg.from)
    )
      until = Math.max(until, other.nextEvent + B.headwayMinutes);
  }
  return Math.max(0, until - s.minute);
}
function advanceOwned(s: CoreState, target: number) {
  let events = 0;
  while (true) {
    if (++events > 100_000)
      throw new Error(
        "Catch-up terlalu panjang; impor checkpoint yang lebih baru.",
      );
    const next = Math.min(
      s.nextOverhead,
      ...s.orders
        .filter((o) => !o.accepted && o.due > s.minute)
        .map((o) => o.due),
      ...s.units.filter((u) => u.job).map((u) => u.job!.end),
      ...s.depots
        .filter((d) => d.upgradeEnd !== undefined)
        .map((d) => d.upgradeEnd!),
      ...s.plans.filter((p) => p.active).map((p) => p.nextAt),
      ...s.runs.filter((r) => r.status === "running").map((r) => r.nextEvent),
    );
    if (next > target) break;
    s.minute = next;
    for (const u of s.units)
      if (u.job && u.job.end <= next) {
        if (u.job.target) u.productId = u.job.target;
        u.condition = 100;
        u.nextService = next + 30 * 1440;
        u.lastServiceKm = u.km;
        delete u.job;
      }
    for (const d of s.depots)
      if (d.upgradeEnd !== undefined && d.upgradeEnd <= next) {
        d.capacity *= 2;
        delete d.upgradeEnd;
      }
    for (const run of s.runs.filter(
      (r) => r.status === "running" && r.nextEvent <= next,
    )) {
      const t = s.trainsets.find((x) => x.id === run.trainsetId)!;
      if (run.phase === "dwell") {
        const delay = conflictDelay(s, run);
        if (delay) {
          run.delay += delay;
          run.end += delay;
          run.nextEvent = next + delay;
          run.reason = "Menunggu blok lintas bebas.";
          continue;
        }
        run.phase = "move";
        run.reason = "";
        run.nextEvent = next + run.legs[run.leg]!.minutes;
        continue;
      }
      const leg = run.legs[run.leg]!;
      for (const id of run.unitIds) {
        const u = s.units.find((x) => x.id === id)!,
          p = coreProduct(u.productId);
        const burn = leg.km * p.litersPerKm;
        u.fuel = Math.max(0, u.fuel - burn);
        u.km += leg.km;
        u.condition = Math.max(0, u.condition - leg.km * 0.0005);
        accounting(
          s,
          `${run.id}:fuel:${run.recalling ? "recall:" : ""}${run.leg}:${id}`,
          `${run.name} • konsumsi fuel`,
          0,
          burn * u.fuelCost,
        );
        u.location = leg.to;
      }
      t.location = leg.to;
      run.leg++;
      if (run.recallRequested) {
        run.recallRequested = false;
        run.recalling = true;
        run.stopRequested = false;
        const path = findCorePath(t.location, run.origin, s.access);
        const f = coreFormation(s, t);
        const back = path.segments.map((id, i) => {
          const edge = TRACKS.find((e) => e.id === id)!;
          const speed = Math.min(f.speed, edge.trackSpeedLimitKmh);
          return {
            segmentId: id,
            from: path.stations[i]!,
            to: path.stations[i + 1]!,
            km: edge.distanceKm,
            speed,
            minutes: (edge.distanceKm / speed) * 60,
          };
        });
        const cashCost = back.reduce(
          (v, l) =>
            v +
            l.km * (B.tacBase + (B.tacWeightSurcharge * f.weight) / 100) +
            (l.minutes / 60) * B.crewPerHour +
            l.km * B.maintenancePerKm,
          0,
        );
        if (s.cash >= cashCost)
          accounting(
            s,
            `${run.id}:recall`,
            "Recall • perjalanan kembali kosong",
            -cashCost,
            cashCost,
          );
        else run.recallCashDue = cashCost;
        const fuelExpense = s.ledger
          .filter((e) => e.id.startsWith(`${run.id}:fuel:`))
          .reduce((v, e) => v + e.expense, 0);
        const paidCosts = s.ledger
          .filter(
            (e) => e.id.startsWith(`${run.id}:`) && !e.id.includes(":fuel:"),
          )
          .reduce((v, e) => v + e.expense, 0);
        run.cost =
          paidCosts +
          fuelExpense +
          back.reduce(
            (v, l) =>
              v +
              l.km *
                f.units.reduce(
                  (w, u) =>
                    w + coreProduct(u.productId).litersPerKm * u.fuelCost,
                  0,
                ),
            0,
          );
        run.revenue = 0;
        run.bookings = [];
        run.name = `${run.name} • Recall`;
        run.destination = run.origin;
        run.legs = back;
        run.leg = 0;
        run.phase = "dwell";
        run.nextEvent = next + B.dwellMinutes;
        run.end =
          next +
          back.reduce((v, l) => v + l.minutes, 0) +
          back.length * B.dwellMinutes;
        const need = back.reduce((v, l) => v + l.km, 0);
        if (
          f.units.some(
            (u) =>
              u.fuel <
              need * coreProduct(u.productId).litersPerKm * (1 + B.fuelReserve),
          )
        ) {
          run.status = "stopped";
          run.reason =
            "Recall menunggu fuel di lokasi saat ini. Kontrak dipo dan isi tangki diperlukan.";
          run.nextEvent = Infinity;
          run.stoppedAt = next;
        }
        if (run.recallCashDue) {
          run.status = "stopped";
          run.reason = "Recall menunggu cadangan kas untuk perjalanan pulang.";
          run.nextEvent = Infinity;
          run.stoppedAt = next;
        }
        // Passenger cash is deferred until delivery in this browser model: all unserved tickets are cancelled, never rewarded.
        continue;
      }
      if (run.leg === run.legs.length) {
        run.status = "completed";
        run.end = next;
        run.nextEvent = Infinity;
        run.cost = s.ledger
          .filter((e) => e.id.startsWith(`${run.id}:`))
          .reduce((v, e) => v + e.expense, 0);
        if (run.recalling) {
          const d = s.depots.find((depot) => depot.station === t.location);
          if (d)
            for (const uid of t.units) {
              const u = s.units.find((unit) => unit.id === uid)!,
                amount = Math.min(u.fuel, d.capacity - d.stock);
              if (amount > 0) {
                d.cost =
                  (d.stock * d.cost + amount * u.fuelCost) / (d.stock + amount);
                d.stock += amount;
                u.fuel -= amount;
              }
            }
        }
        const following = s.plans
          .filter((p) => p.active && p.trainsetId === t.id)
          .sort((a, b) => a.nextAt - b.nextAt)[0];
        t.readyAt =
          next +
          (following && following.serviceId !== run.serviceId
            ? B.changeServiceMinutes
            : B.turnaroundMinutes);
        accounting(
          s,
          `${run.id}:settlement`,
          `${run.name} • tiket terlayani`,
          run.revenue,
          0,
          run.revenue,
        );
        s.reputation = Math.max(
          0,
          Math.min(
            100,
            s.reputation + (run.recalling ? -0.5 : run.delay < 10 ? 0.1 : -0.2),
          ),
        );
      } else {
        run.phase = "dwell";
        run.nextEvent =
          next + (leg.commercialStop === false ? 0 : B.dwellMinutes);
        if (run.stopRequested) {
          run.stopRequested = false;
          run.status = "stopped";
          run.stoppedAt = next;
          run.nextEvent = Infinity;
          run.reason =
            "Berhenti luar biasa di stasiun. Konfirmasi manual diperlukan untuk melanjutkan.";
        }
      }
    }
    for (const p of s.plans.filter((p) => p.active && p.nextAt <= next)) {
      const at = p.nextAt;
      p.nextAt += p.cycle;
      if (
        s.runs.some(
          (r) =>
            r.trainsetId === p.trainsetId &&
            (r.status === "held" || r.status === "stopped"),
        )
      )
        continue;
      const run = forecastCore(s, p.trainsetId, p.serviceId, p.reverse, at);
      run.id = `${p.id}:${at}`;
      run.planId = p.id;
      // Current running services cause a held occurrence, never a duplicate departure.
      const block = conflictDelay(s, run);
      if (block) {
        run.status = "held";
        run.reason = "Blok lintas terpakai; tinjau lalu lanjutkan.";
        run.nextEvent = Infinity;
      } else startRun(s, run);
      s.runs.push(run);
    }
    if (s.nextOverhead <= next) {
      const due = s.depots.length * B.depotPerDay;
      accounting(
        s,
        `overhead:${next}`,
        "Biaya kontrak dipo harian",
        -Math.min(s.cash, due),
        Math.min(s.cash, due),
      );
      s.nextOverhead += 1440;
    }
  }
  s.minute = target;
}
export function catchUpCore(state: CoreState, now: number): CoreState {
  const s = structuredClone(state),
    delta = Math.max(0, now - s.anchorMs);
  advanceOwned(s, s.minute + (delta / 60000) * pace(s));
  s.anchorMs = Math.max(now, s.anchorMs);
  return s;
}
export type CoreAction =
  | { type: "hub"; station: string }
  | {
      type: "order";
      productId: string;
      quantity: number;
      station: string;
      starter?: boolean;
    }
  | { type: "accept"; orderId: string }
  | { type: "formation"; trainsetId?: string; name: string; units: string[] }
  | {
      type: "service";
      name: string;
      origin: string;
      destination: string;
      category: string;
      stops?: string[];
    }
  | {
      type: "fare";
      serviceId: string;
      cls: CoreClass;
      multiplier: number;
      auto: boolean;
    }
  | {
      type: "schedule";
      trainsetId: string;
      serviceId: string;
      cycle: number;
      offset: number;
      roundTrip: boolean;
    }
  | {
      type: "diagram";
      trainsetId: string;
      cycle: number;
      duties: { serviceId: string; reverse: boolean; offset: number }[];
    }
  | { type: "disablePlan"; planId: string }
  | { type: "disableDiagram"; trainsetId: string }
  | { type: "resume"; runId: string }
  | { type: "stop"; runId: string }
  | { type: "recall"; runId: string }
  | { type: "fuel"; station: string; liters: number; bucket: number }
  | { type: "fill"; trainsetId: string }
  | { type: "crew"; trainsetId: string }
  | { type: "recruitAuto" }
  | { type: "park"; trainsetId: string }
  | { type: "maintenance"; unitId: string; retrofit?: boolean }
  | { type: "swap"; trainsetId: string; oldUnitId: string; newUnitId: string }
  | { type: "depot"; station: string }
  | { type: "upgrade"; station: string }
  | { type: "access"; segmentId: string }
  | { type: "marketing"; tier: number }
  | { type: "mode"; mode: CoreState["mode"] };
export function applyCoreAction(
  state: CoreState,
  action: CoreAction,
  id: string,
  now: number,
): CoreState {
  const s = catchUpCore(state, now);
  if (s.actions.includes(id)) return s;
  const train = (tid: string) => {
    const t = s.trainsets.find((x) => x.id === tid);
    if (!t) throw new Error("Trainset tidak ditemukan.");
    return t;
  };
  const idle = (t: CoreTrainset) => {
    if (s.runs.some((r) => r.trainsetId === t.id && r.status === "running"))
      throw new Error("Tunggu trainset tiba.");
  };
  switch (action.type) {
    case "hub": {
      if (s.orders.length || s.units.length || s.trainsets.length)
        throw new Error(
          "Hub awal hanya dapat dipilih sebelum pengadaan pertama.",
        );
      const fresh = createCoreState(now, action.station);
      s.hub = fresh.hub;
      s.depots = fresh.depots;
      s.access = fresh.access;
      break;
    }
    case "order": {
      const p = coreProduct(action.productId);
      if (
        !Number.isInteger(action.quantity) ||
        action.quantity < 1 ||
        action.quantity > 20
      )
        throw new Error("Jumlah harus 1–20.");
      if (!s.depots.some((d) => d.station === action.station))
        throw new Error("Pilih dipo pengantaran.");
      const already = s.orders
        .filter((o) => o.productId === p.id)
        .reduce((v, o) => v + o.quantity, 0);
      const starter =
        action.starter &&
        action.station === s.hub &&
        ((p.id === "cc201" && already + action.quantity <= 1) ||
          (p.id === "ec-standard" && already + action.quantity <= 4) ||
          (p.id === "generator" && already + action.quantity <= 1));
      accounting(
        s,
        id,
        `Pesanan ${action.quantity} × ${p.name}`,
        -p.price * action.quantity,
      );
      s.orders.push({
        id,
        productId: p.id,
        quantity: action.quantity,
        station: action.station,
        due: s.minute + (starter ? 0 : p.deliveryMinutes),
        accepted: false,
      });
      break;
    }
    case "accept": {
      const o = s.orders.find((x) => x.id === action.orderId);
      if (!o || o.accepted || o.due > s.minute)
        throw new Error("Pesanan belum siap diterima.");
      for (let i = 0; i < o.quantity; i++)
        s.units.push({
          id: `${o.id}:unit:${i}`,
          productId: o.productId,
          location: o.station,
          condition: 100,
          km: 0,
          fuel: 0,
          fuelCost: 0,
          commissionedAt: s.minute,
          nextService: s.minute + 30 * 1440,
        });
      o.accepted = true;
      break;
    }
    case "formation": {
      if (
        !action.name.trim() ||
        !action.units.length ||
        new Set(action.units).size !== action.units.length
      )
        throw new Error("Nama dan unit unik diperlukan.");
      const existing = action.trainsetId ? train(action.trainsetId) : undefined;
      if (existing) {
        idle(existing);
        if (s.plans.some((p) => p.trainsetId === existing.id && p.active))
          throw new Error("Nonaktifkan diagram sebelum mengubah formasi.");
      }
      const units = action.units.map((uid) =>
        s.units.find((u) => u.id === uid),
      );
      if (
        units.some((u) => !u || u.job) ||
        new Set(units.map((u) => u?.location)).size !== 1
      )
        throw new Error("Unit harus tersedia di satu lokasi.");
      if (
        s.trainsets.some(
          (t) =>
            t.id !== existing?.id &&
            t.units.some((uid) => action.units.includes(uid)),
        )
      )
        throw new Error("Unit sudah digunakan trainset lain.");
      const location = units[0]!.location;
      if (!s.depots.some((d) => d.station === location))
        throw new Error("Edit formasi memerlukan fasilitas dipo.");
      const t: CoreTrainset = {
        id: existing?.id ?? id,
        name: action.name.trim(),
        units: [...action.units],
        location,
        readyAt: s.minute,
        parked: true,
        crew: existing?.crew ?? false,
      };
      const f = coreFormation(s, t);
      if (
        f.products.filter((p) => p.kind === "loco").length !== 1 ||
        !f.capacity ||
        f.power < 0
      )
        throw new Error(
          "Pilih satu loko, kereta penumpang dan sumber listrik yang cukup.",
        );
      if (existing) Object.assign(existing, t);
      else s.trainsets.push(t);
      break;
    }
    case "service": {
      if (!action.name.trim()) throw new Error("Nama relasi diperlukan.");
      const path = findCorePath(action.origin, action.destination, s.access);
      const stops = action.stops ?? path.stations;
      if (
        !stops.includes(action.origin) ||
        !stops.includes(action.destination) ||
        stops.some((st) => !path.stations.includes(st))
      )
        throw new Error(
          "Pemberhentian harus berada dalam path dan mencakup kedua endpoint.",
        );
      if (
        action.category === "Local" &&
        new Set(path.stations.map((st) => CORE_STATION_PROVINCE[st])).size > 1
      )
        throw new Error(
          "Preset Local harus berada dalam satu provinsi sepanjang path.",
        );
      s.services.push({
        id,
        name: action.name.trim(),
        ...path,
        stops: [...new Set(stops)],
        category: action.category,
        fares: { EC: 1, EX: 1, LX: 1 },
        autoFare: true,
      });
      break;
    }
    case "fare": {
      const r = s.services.find((x) => x.id === action.serviceId);
      if (!r) throw new Error("Relasi tidak ditemukan.");
      if (
        !Number.isFinite(action.multiplier) ||
        action.multiplier < 0.5 ||
        action.multiplier > 2
      )
        throw new Error("Tarif harus 50–200% tarif referensi.");
      r.fares[action.cls] = action.auto ? 1 : action.multiplier;
      r.autoFare = action.auto;
      break;
    }
    case "schedule": {
      const t = train(action.trainsetId),
        r = s.services.find((x) => x.id === action.serviceId);
      idle(t);
      if (
        !r ||
        ![1440, 2880, 4320].includes(action.cycle) ||
        !Number.isFinite(action.offset) ||
        action.offset < 0 ||
        action.offset >= action.cycle
      )
        throw new Error("Pilih diagram 24/48/72 jam dan waktu legal.");
      if (t.location !== r.stations[0])
        throw new Error("Trainset harus berada di asal relasi.");
      const duration = forecastCore(s, t.id, r.id).end - s.minute;
      if (
        action.roundTrip &&
        duration * 2 + B.turnaroundMinutes * 2 > action.cycle
      )
        throw new Error("PP dan turnaround tidak muat dalam siklus.");
      if (s.plans.some((p) => p.trainsetId === t.id && p.active))
        throw new Error("Nonaktifkan diagram sebelumnya sebelum menggantinya.");
      const base = Math.floor(s.minute / action.cycle) * action.cycle;
      let first = base + action.offset;
      if (first < s.minute) first += action.cycle;
      const p: CorePlan = {
        id,
        trainsetId: t.id,
        serviceId: r.id,
        reverse: false,
        cycle: action.cycle,
        offset: action.offset,
        nextAt: first,
        active: true,
      };
      s.plans.push(p);
      if (action.roundTrip)
        s.plans.push({
          ...p,
          id: `${id}:return`,
          reverse: true,
          offset:
            (action.offset + duration + B.turnaroundMinutes) % action.cycle,
          nextAt: first + duration + B.turnaroundMinutes,
        });
      else p.active = false;
      if (!action.roundTrip)
        throw new Error(
          "Diagram berulang memerlukan PP untuk kembali ke lokasi asal.",
        );
      break;
    }
    case "disablePlan": {
      const p = s.plans.find((x) => x.id === action.planId);
      if (p) p.active = false;
      break;
    }
    case "diagram": {
      const t = train(action.trainsetId);
      idle(t);
      if (
        ![1440, 2880, 4320].includes(action.cycle) ||
        action.duties.length < 2 ||
        action.duties.length > 24
      )
        throw new Error(
          "Diagram memerlukan 2–24 dinas dalam siklus 24/48/72 jam.",
        );
      if (s.plans.some((p) => p.trainsetId === t.id && p.active))
        throw new Error("Nonaktifkan diagram sebelumnya dahulu.");
      const duties = [...action.duties].sort((a, b) => a.offset - b.offset);
      const previews = duties.map((d) => {
        if (
          !Number.isFinite(d.offset) ||
          d.offset < 0 ||
          d.offset >= action.cycle
        )
          throw new Error("Waktu dinas di luar siklus.");
        return forecastCore(s, t.id, d.serviceId, d.reverse, d.offset);
      });
      if (previews[0]!.origin !== t.location)
        throw new Error("Awal diagram tidak sesuai lokasi trainset.");
      for (let i = 0; i < previews.length; i++) {
        const run = previews[i]!,
          following = previews[(i + 1) % previews.length]!;
        const turnaround =
          run.serviceId === following.serviceId &&
          run.origin === following.destination
            ? B.turnaroundMinutes
            : B.changeServiceMinutes;
        if (run.destination !== following.origin)
          throw new Error(
            `Lokasi ${stationName(run.destination)} tidak sama dengan ${stationName(following.origin)}; tambahkan dinas penghubung.`,
          );
        if (
          run.serviceId !== following.serviceId &&
          !s.depots.some((d) => d.station === run.destination)
        )
          throw new Error(
            "Pergantian relasi memerlukan fasilitas kontrak dipo/service.",
          );
        if (
          run.end + turnaround >
          following.start + (i === previews.length - 1 ? action.cycle : 0)
        )
          throw new Error(
            "Dinas bertumpuk atau jeda tidak cukup, termasuk sambungan siklus berikutnya.",
          );
      }
      const base = Math.floor(s.minute / action.cycle) * action.cycle;
      const shift = base + duties[0]!.offset < s.minute ? action.cycle : 0;
      duties.forEach((d, i) =>
        s.plans.push({
          id: `${id}:${i}`,
          trainsetId: t.id,
          serviceId: d.serviceId,
          reverse: d.reverse,
          cycle: action.cycle,
          offset: d.offset,
          nextAt: base + shift + d.offset,
          active: true,
        }),
      );
      break;
    }
    case "disableDiagram": {
      for (const p of s.plans)
        if (p.trainsetId === action.trainsetId) p.active = false;
      break;
    }
    case "resume": {
      const r = s.runs.find((x) => x.id === action.runId);
      if (!r || !["held", "stopped"].includes(r.status))
        throw new Error("Occurrence tidak tertahan.");
      if (conflictDelay(s, r)) throw new Error("Blok masih terpakai.");
      if (r.status === "stopped") {
        const t = train(r.trainsetId),
          f = coreFormation(s, t),
          km = r.legs.slice(r.leg).reduce((v, l) => v + l.km, 0);
        if (
          f.units.some(
            (u) =>
              u.job ||
              u.condition < 70 ||
              u.fuel <
                km * coreProduct(u.productId).litersPerKm * (1 + B.fuelReserve),
          )
        )
          throw new Error("Sarana atau fuel untuk sisa perjalanan belum siap.");
        if (r.recallCashDue) {
          accounting(
            s,
            `${r.id}:recall`,
            "Recall • perjalanan kembali kosong",
            -r.recallCashDue,
            r.recallCashDue,
          );
          delete r.recallCashDue;
        }
        r.delay += s.minute - (r.stoppedAt ?? s.minute);
        r.end += s.minute - (r.stoppedAt ?? s.minute);
        r.status = "running";
        r.phase = "dwell";
        r.nextEvent = s.minute + B.dwellMinutes;
        r.reason = "";
        delete r.stoppedAt;
        break;
      }
      startRun(s, r);
      if (r.status === "held") throw new Error(r.reason);
      break;
    }
    case "stop": {
      const r = s.runs.find((x) => x.id === action.runId);
      if (!r || r.status !== "running")
        throw new Error("Pilih dinas berjalan.");
      r.stopRequested = true;
      r.reason = "Permintaan berhenti: menuju stasiun aman berikutnya.";
      break;
    }
    case "recall": {
      const r = s.runs.find((x) => x.id === action.runId);
      if (!r || r.status !== "running" || r.recalling)
        throw new Error(
          "Recall hanya untuk dinas berjalan yang belum kembali.",
        );
      r.recallRequested = true;
      r.reason =
        "Recall diminta: kembali melalui lintas setelah stasiun berikutnya. Tiket yang belum dilayani dibatalkan.";
      break;
    }
    case "fuel": {
      const d = s.depots.find((x) => x.station === action.station),
        q = fuelQuote(now);
      if (q.bucket !== action.bucket)
        throw new Error("Quote kedaluwarsa; tinjau harga baru.");
      if (
        !d ||
        !Number.isFinite(action.liters) ||
        action.liters <= 0 ||
        d.stock + action.liters > d.capacity
      )
        throw new Error("Jumlah melampaui kapasitas atau tidak valid.");
      accounting(
        s,
        id,
        `Pembelian fuel ${action.liters} L`,
        -action.liters * q.price,
      );
      d.cost =
        (d.stock * d.cost + action.liters * q.price) /
        (d.stock + action.liters);
      d.stock += action.liters;
      break;
    }
    case "fill": {
      const t = train(action.trainsetId);
      idle(t);
      const d = s.depots.find((x) => x.station === t.location);
      const f = coreFormation(s, t),
        need = f.units.reduce(
          (v, u) => v + coreProduct(u.productId).tank - u.fuel,
          0,
        );
      if (!d || d.stock < need)
        throw new Error(
          `Perlu ${Math.ceil(need)} L di dipo ini untuk tangki penuh.`,
        );
      for (const u of f.units) {
        const p = coreProduct(u.productId),
          amount = p.tank - u.fuel;
        if (amount) {
          u.fuelCost = (u.fuel * u.fuelCost + amount * d.cost) / p.tank;
          u.fuel = p.tank;
          d.stock -= amount;
        }
      }
      break;
    }
    case "recruitAuto": {
      const missing = s.trainsets.filter((t) => !t.crew);
      if (!missing.length)
        throw new Error(
          s.trainsets.length
            ? "Seluruh kebutuhan kru sudah terpenuhi."
            : "Buat trainset terlebih dahulu agar kebutuhan SDM dapat dihitung.",
        );
      // Validate every target before assigning any contract.
      for (const t of missing) {
        idle(t);
        coreCrewNeeds(s, t);
      }
      for (const t of missing) t.crew = true;
      break;
    }
    case "crew": {
      const t = train(action.trainsetId);
      idle(t);
      t.crew = true;
      break;
    }
    case "park": {
      const t = train(action.trainsetId);
      idle(t);
      if (!s.depots.some((d) => d.station === t.location))
        throw new Error("Tidak ada dipo di lokasi ini.");
      t.parked = true;
      break;
    }
    case "maintenance": {
      const u = s.units.find((x) => x.id === action.unitId);
      if (!u || u.job) throw new Error("Unit tidak tersedia.");
      const t = s.trainsets.find((x) => x.units.includes(u.id));
      if (t) {
        idle(t);
        if (s.plans.some((p) => p.trainsetId === t.id && p.active))
          throw new Error("Jeda diagram atau ganti unit dahulu.");
      }
      if (!s.depots.some((d) => d.station === u.location))
        throw new Error("Servis harus di dipo.");
      const p = coreProduct(u.productId);
      if (action.retrofit && !["ec-standard", "ec-regular"].includes(p.id))
        throw new Error("Donor retrofit tidak kompatibel.");
      accounting(
        s,
        id,
        action.retrofit ? "Retrofit interior NG" : "P1 per unit",
        -p.price *
          (action.retrofit ? B.retrofitCostFraction : B.p1CostFraction),
        p.price * (action.retrofit ? B.retrofitCostFraction : B.p1CostFraction),
      );
      const bayFree = Math.max(
        s.minute,
        ...s.units
          .filter((other) => other.location === u.location && other.job)
          .map((other) => other.job!.end),
      );
      u.job = {
        end: bayFree + (action.retrofit ? 4320 : p.kind === "loco" ? 120 : 60),
        kind: action.retrofit ? "retrofit" : "P1",
        ...(action.retrofit ? { target: "ec-ng-retrofit" } : {}),
      };
      break;
    }
    case "swap": {
      const t = train(action.trainsetId);
      idle(t);
      const old = s.units.find((x) => x.id === action.oldUnitId),
        replacement = s.units.find((x) => x.id === action.newUnitId);
      if (
        !old ||
        !replacement ||
        !t.units.includes(old.id) ||
        replacement.job ||
        replacement.location !== t.location ||
        s.trainsets.some((x) => x.units.includes(replacement.id))
      )
        throw new Error("Unit pengganti tidak tersedia di lokasi yang sama.");
      if (
        coreProduct(old.productId).kind !==
        coreProduct(replacement.productId).kind
      )
        throw new Error("Jenis unit harus sama.");
      if (
        coreProduct(old.productId).kind === "coach" &&
        s.plans.some((p) => p.trainsetId === t.id && p.active)
      )
        throw new Error("Jeda diagram sebelum mengubah kursi.");
      const proposed = {
        ...t,
        units: t.units.map((uid) => (uid === old.id ? replacement.id : uid)),
      };
      if (coreFormation(s, proposed).power < 0)
        throw new Error("Daya formasi pengganti tidak cukup.");
      t.units = proposed.units;
      break;
    }
    case "depot": {
      if (
        !STATIONS.some((x) => x.id === action.station) ||
        s.depots.some((x) => x.station === action.station)
      )
        throw new Error("Lokasi dipo tidak valid.");
      if (
        !TRACKS.some(
          (e) =>
            s.access.includes(e.id) &&
            (e.originStationId === action.station ||
              e.destinationStationId === action.station),
        )
      )
        throw new Error("Dipo harus di jaringan yang terbuka.");
      accounting(s, id, "Kontrak fasilitas dipo", -B.depotContractCost);
      s.depots.push({
        station: action.station,
        stock: 0,
        cost: 0,
        capacity: B.depotCapacity,
      });
      break;
    }
    case "upgrade": {
      const d = s.depots.find((x) => x.station === action.station);
      if (!d || d.upgradeEnd)
        throw new Error("Upgrade sedang berjalan atau dipo tidak ditemukan.");
      accounting(s, id, "Upgrade gudang fuel", -B.storageUpgradeCost);
      d.upgradeEnd = s.minute + 360;
      break;
    }
    case "access": {
      const edge = TRACKS.find((x) => x.id === action.segmentId);
      if (!edge || s.access.includes(edge.id))
        throw new Error("Koridor tidak tersedia.");
      const network = new Set(
        s.access.flatMap((eid) => {
          const e = TRACKS.find((x) => x.id === eid)!;
          return [e.originStationId, e.destinationStationId];
        }),
      );
      if (
        !network.has(edge.originStationId) &&
        !network.has(edge.destinationStationId)
      )
        throw new Error("Akses baru harus terhubung.");
      if (s.runs.filter((r) => r.status === "completed").length < 2)
        throw new Error("Selesaikan satu PP sebelum ekspansi.");
      accounting(s, id, "Hak akses koridor", -B.corridorAccessCost);
      s.access.push(edge.id);
      break;
    }
    case "marketing": {
      const tier = B.marketing[action.tier];
      if (!tier) throw new Error("Paket tidak tersedia.");
      accounting(s, id, tier.name, -tier.cost, tier.cost);
      s.campaigns.push({
        station: s.hub,
        end: s.minute + tier.days * 1440,
        lift: tier.lift,
        scope:
          action.tier === 0
            ? "hub"
            : action.tier === 1
              ? "corridor"
              : "regional",
      });
      break;
    }
    case "mode": {
      if (!["Casual", "Realism"].includes(action.mode))
        throw new Error("Mode tidak valid.");
      if (
        s.runs.some((r) => r.status === "running") ||
        s.units.some((u) => u.job) ||
        s.orders.some((o) => !o.accepted) ||
        s.depots.some((d) => d.upgradeEnd)
      )
        throw new Error(
          "Selesaikan perjalanan dan pekerjaan sebelum mengubah tempo.",
        );
      s.mode = action.mode;
      break;
    }
  }
  s.actions.push(id);
  return s;
}

// A JSON save is deliberately separate from the legacy class-based demo state.
const finite = z.number().finite();
const unitSchema = z.object({
  id: z.string(),
  productId: z.string().refine((id) => CORE_PRODUCTS.some((p) => p.id === id)),
  location: z.string(),
  condition: finite.min(0).max(100),
  km: finite.nonnegative(),
  fuel: finite.nonnegative(),
  fuelCost: finite.nonnegative(),
  commissionedAt: finite,
  nextService: finite,
  lastServiceKm: finite.nonnegative().optional(),
  job: z
    .object({
      end: finite,
      kind: z.enum(["P1", "retrofit"]),
      target: z.string().optional(),
    })
    .optional(),
});
const legSchema = z.object({
  segmentId: z.string(),
  from: z.string(),
  to: z.string(),
  km: finite.positive(),
  speed: finite.positive(),
  minutes: finite.positive(),
  commercialStop: z.boolean().optional(),
});
const runSchema = z.object({
  id: z.string(),
  planId: z.string(),
  trainsetId: z.string(),
  serviceId: z.string(),
  name: z.string(),
  unitIds: z.array(z.string()),
  status: z.enum(["running", "held", "stopped", "completed"]),
  reason: z.string(),
  origin: z.string(),
  destination: z.string(),
  start: finite,
  end: finite,
  nextEvent: finite.nullable(),
  leg: finite.int().nonnegative(),
  phase: z.enum(["move", "dwell"]),
  legs: z.array(legSchema).min(1),
  bookings: z.array(
    z.object({
      from: finite.int().nonnegative(),
      to: finite.int().positive(),
      cls: z.enum(["EC", "EX", "LX"]),
      count: finite.int().positive(),
      fare: finite.nonnegative(),
    }),
  ),
  seats: z.object({
    EC: finite.int().nonnegative(),
    EX: finite.int().nonnegative(),
    LX: finite.int().nonnegative(),
  }),
  revenue: finite.nonnegative(),
  cost: finite.nonnegative(),
  fuelLiters: finite.nonnegative(),
  passengerKm: finite.nonnegative(),
  seatKm: finite.nonnegative(),
  delay: finite.nonnegative(),
  stopRequested: z.boolean().optional(),
  recallRequested: z.boolean().optional(),
  recalling: z.boolean().optional(),
  stoppedAt: finite.optional(),
  recallCashDue: finite.nonnegative().optional(),
});
const saveSchema = z.object({
  version: z.literal(7),
  minute: finite,
  anchorMs: finite,
  mode: z.enum(["Realism", "Casual"]),
  hub: z.string(),
  cash: finite.nonnegative(),
  reputation: finite.min(0).max(100),
  units: z.array(unitSchema),
  trainsets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      units: z.array(z.string()),
      location: z.string(),
      readyAt: finite,
      parked: z.boolean(),
      crew: z.boolean(),
    }),
  ),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      stations: z.array(z.string()).min(2),
      segments: z.array(z.string()).min(1),
      stops: z.array(z.string()).min(2).optional(),
      category: z.string(),
      fares: z.object({
        EC: finite.min(0.5).max(2),
        EX: finite.min(0.5).max(2),
        LX: finite.min(0.5).max(2),
      }),
      autoFare: z.boolean(),
    }),
  ),
  plans: z.array(
    z.object({
      id: z.string(),
      trainsetId: z.string(),
      serviceId: z.string(),
      reverse: z.boolean(),
      cycle: z.union([z.literal(1440), z.literal(2880), z.literal(4320)]),
      offset: finite,
      nextAt: finite,
      active: z.boolean(),
    }),
  ),
  runs: z.array(runSchema),
  depots: z.array(
    z.object({
      station: z.string(),
      stock: finite.nonnegative(),
      cost: finite.nonnegative(),
      capacity: finite.positive(),
      upgradeEnd: finite.optional(),
    }),
  ),
  orders: z.array(
    z.object({
      id: z.string(),
      productId: z.string(),
      quantity: finite.int().positive(),
      station: z.string(),
      due: finite,
      accepted: z.boolean(),
    }),
  ),
  ledger: z.array(
    z.object({
      id: z.string(),
      minute: finite,
      label: z.string(),
      cash: finite,
      expense: finite,
      revenue: finite,
    }),
  ),
  actions: z.array(z.string()),
  demandUsed: z.record(finite.nonnegative()),
  access: z.array(z.string()),
  campaigns: z.array(
    z.object({
      station: z.string(),
      end: finite,
      lift: finite,
      scope: z.enum(["hub", "corridor", "regional"]).optional(),
    }),
  ),
  nextOverhead: finite,
});
export function serializeCore(s: CoreState): string {
  return JSON.stringify(s);
}
export function restoreCore(json: string): CoreState {
  const s = saveSchema.parse(JSON.parse(json)) as CoreState;
  const ids = new Set(s.units.map((u) => u.id)),
    assigned = s.trainsets.flatMap((t) => t.units);
  if (
    new Set(assigned).size !== assigned.length ||
    assigned.some((id) => !ids.has(id))
  )
    throw new Error("Inventori save tidak konsisten.");
  for (const u of s.units)
    if (u.fuel > coreProduct(u.productId).tank)
      throw new Error("Fuel melampaui tangki.");
  const stationIds = new Set(STATIONS.map((st) => st.id)),
    segmentIds = new Set(TRACKS.map((t) => t.id));
  for (const collection of [
    s.units,
    s.trainsets,
    s.services,
    s.plans,
    s.runs,
    s.orders,
    s.ledger,
  ])
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      throw new Error("ID save tidak unik.");
  for (const d of s.depots)
    if (d.stock > d.capacity || !stationIds.has(d.station))
      throw new Error("Inventori dipo tidak valid.");
  for (const service of s.services) {
    if (service.stations.length !== service.segments.length + 1)
      throw new Error("Path save tidak lengkap.");
    service.segments.forEach((id, i) => {
      const edge = TRACKS.find((x) => x.id === id);
      if (
        !edge ||
        !(
          [edge.originStationId, edge.destinationStationId].includes(
            service.stations[i]!,
          ) &&
          [edge.originStationId, edge.destinationStationId].includes(
            service.stations[i + 1]!,
          )
        ) ||
        service.stations[i] === service.stations[i + 1]
      )
        throw new Error("Path save terputus.");
    });
  }
  if (s.access.some((id) => !segmentIds.has(id)) || !stationIds.has(s.hub))
    throw new Error("Jaringan save tidak dikenal.");
  for (const p of s.plans)
    if (
      !s.trainsets.some((t) => t.id === p.trainsetId) ||
      !s.services.some((r) => r.id === p.serviceId) ||
      (p.nextAt < s.minute && p.active)
    )
      throw new Error("Diagram save tidak konsisten.");
  for (const r of s.runs) {
    if (
      !s.trainsets.some((t) => t.id === r.trainsetId) ||
      !s.services.some((service) => service.id === r.serviceId) ||
      r.leg > r.legs.length ||
      r.bookings.some((b) => b.from >= b.to || b.to > r.legs.length) ||
      (r.status === "running" &&
        (r.nextEvent === null || r.leg >= r.legs.length))
    )
      throw new Error("Occurrence save tidak konsisten.");
    r.nextEvent = r.status === "running" ? r.nextEvent : Infinity;
  }
  return s;
}
/** Forecast processes a copy. It cannot advance the company clock or award cash. */
export function previewCoreRoundTrip(
  state: CoreState,
  trainsetId: string,
  serviceId: string,
) {
  const outbound = forecastCore(state, trainsetId, serviceId, false);
  const inbound = forecastCore(
    state,
    trainsetId,
    serviceId,
    true,
    outbound.end + B.turnaroundMinutes,
  );
  return {
    outbound,
    inbound,
    contribution:
      outbound.revenue + inbound.revenue - outbound.cost - inbound.cost,
  };
}
