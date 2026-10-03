import { describe, expect, it } from "vitest";
import {
  CORE_BALANCE,
  CORE_GAME_CORRIDORS,
  CORE_ROUTING_TRACKS,
  CORE_SELECTABLE_STATIONS,
} from "@railway/game-data";
import {
  applyCoreAction,
  createCoreState,
  forecastCore,
} from "../src/engine/core-v7.js";
import { coreRunStationTimes } from "../src/engine/schedule-planning.js";
const now = Date.UTC(2026, 9, 3);
function train() {
  let s = createCoreState(now);
  s.access = CORE_GAME_CORRIDORS.map((c) => c.id);
  let i = 0;
  for (const [productId, quantity] of [
    ["cc201", 1],
    ["ec-standard", 4],
    ["generator", 1],
  ] as const) {
    s = applyCoreAction(
      s,
      { type: "order", productId, quantity, station: s.hub, starter: true },
      "f" + ++i,
      now,
    );
    s = applyCoreAction(
      s,
      { type: "accept", orderId: s.orders.at(-1)!.id },
      "f" + ++i,
      now,
    );
  }
  s = applyCoreAction(
    s,
    {
      type: "formation",
      name: "Speed reference",
      units: s.units.map((u) => u.id),
    },
    "train",
    now,
  );
  return s;
}
describe("section speed travel estimates", () => {
  it("uses actual section distances, 30 km/h hill caps, rolling-stock limits and three-minute stops", () => {
    let s = train();
    s = applyCoreAction(
      s,
      {
        type: "service",
        origin: s.hub,
        destination: "STN_GMR_GAMBIR",
        category: "Custom",
      },
      "relation",
      now,
    );
    const run = forecastCore(
      s,
      s.trainsets[0]!.id,
      s.services[0]!.id,
      false,
      480,
    );
    expect(run.legs.some((l) => l.speed === 30)).toBe(true);
    for (const leg of run.legs) {
      const edge = CORE_ROUTING_TRACKS.find((t) => t.id === leg.segmentId)!;
      expect(leg.km).toBe(edge.distanceKm);
      expect(leg.speed).toBeLessThanOrEqual(
        Math.min(100, edge.trackSpeedLimitKmh),
      );
      expect(leg.motion!.peakKmh).toBeLessThanOrEqual(leg.speed + 0.0001);
      expect(leg.minutes).toBeGreaterThan((leg.km / leg.speed) * 60);
    }
    const moving = run.legs.reduce((n, l) => n + l.minutes, 0),
      dwell = (run.legs.length - 1) * CORE_BALANCE.dwellMinutes;
    expect(run.end - run.start).toBeCloseTo(moving + dwell);
    const rows = coreRunStationTimes(run);
    for (const row of rows.slice(1, -1))
      expect(row.departure! - row.arrival!).toBe(CORE_BALANCE.dwellMinutes);
    expect(rows.at(-1)!.arrival).toBeCloseTo(run.end);
  });
  it("caps a 110 km/h line at the CC201 trainset's 100 km/h and applies the same distance in reverse", () => {
    let s = train();
    const solo = CORE_SELECTABLE_STATIONS.find((s) => s.code === "SLO")!;
    s = applyCoreAction(
      s,
      {
        type: "service",
        origin: "STN_YK_YOGYAKARTA",
        destination: solo.id,
        category: "Custom",
      },
      "fast",
      now,
    );
    const outbound = forecastCore(
        s,
        s.trainsets[0]!.id,
        s.services[0]!.id,
        false,
        0,
      ),
      reverse = forecastCore(s, s.trainsets[0]!.id, s.services[0]!.id, true, 0);
    expect(outbound.legs.every((l) => l.speed === 100)).toBe(true);
    expect(outbound.legs.reduce((n, l) => n + l.km, 0)).toBeCloseTo(60);
    expect(reverse.end).toBeCloseTo(outbound.end);
  });
});
