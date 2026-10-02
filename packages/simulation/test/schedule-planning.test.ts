import { describe, expect, it } from "vitest";
import {
  createCoreState,
  applyCoreAction,
  forecastCore,
  previewCoreDiagram,
  serializeCore,
  restoreCore,
  catchUpCore,
} from "../src/engine/core-v7.js";
import {
  coreFixedRoundTrip,
  coreRunStationTimes,
  coreDailySchedule,
  coreDraftScheduleRuns,
} from "../src/engine/schedule-planning.js";
const now = Date.UTC(2026, 9, 3);
function fixture() {
  let s = createCoreState(now);
  for (const [productId, quantity] of [
    ["cc201", 1],
    ["ec-standard", 4],
    ["generator", 1],
  ] as const) {
    s = applyCoreAction(
      s,
      { type: "order", productId, quantity, station: s.hub, starter: true },
      productId,
      now,
    );
    s = applyCoreAction(
      s,
      { type: "accept", orderId: s.orders.at(-1)!.id },
      `accept:${productId}`,
      now,
    );
  }
  s = applyCoreAction(
    s,
    {
      type: "formation",
      name: "Argo Tutorial",
      units: s.units.map((u) => u.id),
    },
    "train",
    now,
  );
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
  return s;
}
describe("simple schedule planning", () => {
  it("generates fixed PP with preparation time, including an overnight daily loop", () => {
    let s = fixture();
    const tid = s.trainsets[0]!.id,
      rid = s.services[0]!.id;
    const duties = coreFixedRoundTrip(s, tid, rid, false, 1380);
    expect(duties[1]!.offset).toBeLessThan(duties[0]!.offset);
    expect(previewCoreDiagram(s, tid, 1440, duties).issues).toEqual([]);
    s = applyCoreAction(
      s,
      { type: "diagram", trainsetId: tid, cycle: 1440, duties },
      "night",
      now,
    );
    const out = s.plans.find((p) => !p.reverse)!,
      back = s.plans.find((p) => p.reverse)!;
    expect(out.nextAt).toBe(1380);
    expect(back.nextAt).toBeGreaterThan(1440);
    const draft = coreDraftScheduleRuns(s, tid, 1440, duties);
    expect(draft[0]!.origin).toBe(s.hub);
    expect(draft[1]!.start - draft[0]!.end).toBeGreaterThanOrEqual(60);
    expect(coreDailySchedule(s, 0)).toHaveLength(1);
    expect(coreDailySchedule(s, 1)).toHaveLength(3); // overnight arrival, return, next evening departure
    const saved = restoreCore(serializeCore(s));
    expect(saved.plans[0]!.firstAt).toBe(s.plans[0]!.firstAt);
  });
  it("replaces saved times atomically and retains the old schedule if the replacement is invalid", () => {
    let s = fixture();
    const tid = s.trainsets[0]!.id,
      rid = s.services[0]!.id;
    s = applyCoreAction(
      s,
      {
        type: "diagram",
        trainsetId: tid,
        cycle: 1440,
        duties: coreFixedRoundTrip(s, tid, rid, false, 480),
      },
      "original",
      now,
    );
    const before = serializeCore(s);
    expect(() =>
      applyCoreAction(
        s,
        {
          type: "diagram",
          trainsetId: tid,
          cycle: 1440,
          duties: [
            { serviceId: rid, reverse: false, offset: 500 },
            { serviceId: rid, reverse: true, offset: 501 },
          ],
          replace: true,
        },
        "invalid",
        now,
      ),
    ).toThrow();
    expect(serializeCore(s)).toBe(before);
    s = applyCoreAction(
      s,
      {
        type: "diagram",
        trainsetId: tid,
        cycle: 1440,
        duties: coreFixedRoundTrip(s, tid, rid, false, 540),
        replace: true,
      },
      "edited",
      now,
    );
    expect(s.plans.filter((p) => p.active)).toHaveLength(2);
    expect(s.plans.find((p) => p.id.startsWith("original"))!.active).toBe(
      false,
    );
    expect(s.plans.find((p) => p.active && !p.reverse)!.offset).toBe(540);
  });
  it("reports only commercial stops with dwell, accurate terminal blanks and reversible order", () => {
    const s = fixture(),
      tid = s.trainsets[0]!.id,
      rid = s.services[0]!.id;
    const run = forecastCore(s, tid, rid, false, 480),
      rows = coreRunStationTimes(run);
    expect(rows[0]!.arrival).toBeNull();
    expect(rows[0]!.departure).toBe(480);
    expect(rows.at(-1)!.departure).toBeNull();
    expect(rows.at(-1)!.arrival).toBeCloseTo(run.end);
    for (const row of rows.slice(1, -1))
      expect(row.departure! - row.arrival!).toBe(3);
    expect(
      coreRunStationTimes(forecastCore(s, tid, rid, true, 480)).map(
        (r) => r.stationId,
      ),
    ).toEqual(rows.map((r) => r.stationId).reverse());
    s.services[0]!.stops = [s.hub, "STN_GMR_GAMBIR"];
    const express = forecastCore(s, tid, rid, false, 480);
    expect(coreRunStationTimes(express)).toHaveLength(2);
    expect(coreRunStationTimes(express).at(-1)!.arrival).toBeCloseTo(
      express.end,
    );
  });
  it("includes once-only schedules on their actual day without repeating or modifying state", () => {
    let s = fixture();
    const tid = s.trainsets[0]!.id,
      rid = s.services[0]!.id;
    s = applyCoreAction(
      s,
      {
        type: "schedule",
        trainsetId: tid,
        serviceId: rid,
        cycle: 1440,
        offset: 360,
        roundTrip: false,
      },
      "once",
      now,
    );
    const before = serializeCore(s);
    expect(coreDailySchedule(s, 0)).toHaveLength(0);
    expect(coreDailySchedule(s, 1)).toHaveLength(1);
    expect(coreDailySchedule(s, 2)).toHaveLength(0);
    expect(serializeCore(s)).toBe(before);
  });
  it("retains a dispatched once-only sheet and blocks replacing a held journey", () => {
    let s = fixture();
    const tid = s.trainsets[0]!.id,
      rid = s.services[0]!.id;
    s = applyCoreAction(
      s,
      {
        type: "schedule",
        trainsetId: tid,
        serviceId: rid,
        cycle: 1440,
        offset: 422,
        roundTrip: false,
      },
      "dispatch-once",
      now,
    );
    s = catchUpCore(s, now + 3 * 60_000);
    expect(s.runs[0]!.status).toBe("held");
    expect(s.plans[0]!.active).toBe(false);
    expect(coreDailySchedule(s, 0)).toHaveLength(1);
    const before = serializeCore(s);
    expect(() =>
      applyCoreAction(
        s,
        {
          type: "diagram",
          trainsetId: tid,
          cycle: 1440,
          duties: coreFixedRoundTrip(s, tid, rid, false, 540),
          replace: true,
        },
        "held-edit",
        s.anchorMs,
      ),
    ).toThrow("pulihkan");
    expect(serializeCore(s)).toBe(before);
  });
});
