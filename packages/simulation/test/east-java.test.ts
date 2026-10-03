import { describe, expect, it } from "vitest";
import { CORE_SELECTABLE_STATIONS, CORE_GAME_CORRIDORS, EAST_JAVA_CORRIDORS } from "@railway/game-data";
import { applyCoreAction, createCoreState, findCorePath, forecastCore, restoreCore, serializeCore, fuelQuote, catchUpCore } from "../src/engine/core-v7.js";
const epoch = Date.UTC(2026, 9, 2);
const station = (code: string) => CORE_SELECTABLE_STATIONS.find((s) => s.code === code)!;

describe("eastern Java services", () => {
  it("connects the requested destinations to Surabaya without granting access implicitly", () => {
    const rights = CORE_GAME_CORRIDORS.map((track) => track.id);
    for (const code of ["BL", "ML", "PB", "JR", "BWI", "KTG"]) {
      const path = findCorePath(station("SGU").id, station(code).id, rights);
      expect(path.stations.at(-1)).toBe(station(code).id);
      expect(path.segments.length).toBeGreaterThan(1);
      expect(() => findCorePath(station("SGU").id, station(code).id, [])).toThrow();
    }
    const blitar = findCorePath(station("KTS").id, station("BL").id, ["SEG_KTS_BL"]);
    expect(blitar.stations.map((id) => CORE_SELECTABLE_STATIONS.find((s) => s.id === id)!.code)).toEqual(["KTS", "PWA", "PPR", "MGN", "SS", "KD", "NDL", "KRS", "NJG", "TA", "SBL", "NT", "RJ", "BL"]);
    const coast = findCorePath(station("JR").id, station("KTG").id, ["SEG_JR_BWI", "SEG_BWI_KTG"]);
    expect(coast.stations).toContain(station("BWI").id);
    expect(coast.stations).toContain(station("RGP").id);
    expect(station("BWI").id).not.toBe(station("KTG").id);
  });
  it("creates reversible local relations, forecasts braking/dwell and keeps them across saves", () => {
    let s = createCoreState(epoch, station("ML").id);
    for (const [productId, quantity] of [["cc201", 1], ["ec-standard", 4], ["generator", 1]] as const) {
      s = applyCoreAction(s, { type: "order", productId, quantity, station: s.hub, starter: true }, `order:${productId}`, epoch);
      s = applyCoreAction(s, { type: "accept", orderId: s.orders.at(-1)!.id }, `accept:${productId}`, epoch);
    }
    s = applyCoreAction(s, { type: "formation", name: "TS-Malang", units: s.units.map((u) => u.id) }, "formation", epoch);
    s = applyCoreAction(s, { type: "service", origin: station("ML").id, destination: station("BL").id, category: "Local" }, "service", epoch);
    expect(s.services[0]!.name).toBe("ML – BL");
    const out = forecastCore(s, s.trainsets[0]!.id, s.services[0]!.id);
    const back = forecastCore(s, s.trainsets[0]!.id, s.services[0]!.id, true);
    expect(out.destination).toBe(station("BL").id);
    expect(back.destination).toBe(station("ML").id);
    expect(out.legs.some((leg) => leg.commercialStop)).toBe(true);
    expect(out.end).toBeGreaterThan(out.start + 80);
    expect(out.bookings.length).toBeGreaterThan(0);
    expect(restoreCore(serializeCore(s)).services).toEqual(s.services);
    expect(s.access.some((id) => id === "SEG_JR_BWI")).toBe(false);
    expect(EAST_JAVA_CORRIDORS.every((track) => !track.provenance.verified)).toBe(true);
    expect(() => applyCoreAction(s, { type: "access", segmentId: "SEG_BG_PB" }, "too-early", epoch)).toThrow("PP");
    s = applyCoreAction(s, { type: "crew", trainsetId: s.trainsets[0]!.id }, "crew", epoch);
    s = applyCoreAction(s, { type: "fuel", station: s.hub, liters: 16000, bucket: fuelQuote(epoch).bucket }, "fuel", epoch);
    s = applyCoreAction(s, { type: "fill", trainsetId: s.trainsets[0]!.id }, "fill", epoch);
    s = applyCoreAction(s, { type: "schedule", trainsetId: s.trainsets[0]!.id, serviceId: s.services[0]!.id, offset: 422, cycle: 1440, roundTrip: true }, "schedule", epoch);
    s = catchUpCore(s, epoch + 8 * 60 * 60 * 1000);
    expect(s.runs.filter((run) => run.status === "completed")).toHaveLength(2);
    expect(s.trainsets[0]!.location).toBe(station("ML").id);
    expect(() => applyCoreAction(s, { type: "access", segmentId: "SEG_JR_BWI" }, "disconnected", s.anchorMs)).toThrow("terhubung");
    const expanded = applyCoreAction(s, { type: "access", segmentId: "SEG_BG_PB" }, "expand", s.anchorMs);
    expect(expanded.access).toContain("SEG_BG_PB");
    expect(expanded.cash).toBe(s.cash - 25_000_000);
    expect(findCorePath(station("ML").id, station("PB").id, expanded.access).stations).toContain(station("BG").id);
  });
});
