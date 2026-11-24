import { describe, expect, it } from "vitest";
import { CORE_STORY_CAMPAIGN, storyText } from "@railway/game-data";
import {
  applyCoreAction as apply, catchUpCore, coreLevel, createCompanyDraft,
  createCoreState, forecastCore, fuelQuote, restoreCore, serializeCore,
  type CoreAction, type CoreRun, type CoreState,
} from "../src/engine/core-v7.js";
import { coreStoryStatus, coreStoryCallbacks, storyMetrics } from "../src/engine/story-campaign.js";

const epoch = Date.UTC(2026, 10, 24);
const found = () => apply(createCompanyDraft(epoch), {
  type: "foundCompany", cityId: "bandung", hubStationId: "STN_BD_BANDUNG",
}, "found", epoch);
const choose = (s: CoreState, choiceId = "reserve") =>
  apply(s, { type: "storyChoice", choiceId }, `choice:${choiceId}`, epoch);
const at = (s: CoreState, minute: number) =>
  catchUpCore(s, epoch + ((minute - 420) / 1.5) * 60000);

function run(id: string, overrides: Partial<CoreRun> = {}): CoreRun {
  return {
    id, planId: "plan", trainsetId: "train", serviceId: "relation", name: "Test",
    unitIds: [], status: "completed", reason: "", origin: "A", destination: "B",
    start: 421, end: 500, nextEvent: Infinity, leg: 1, phase: "move",
    legs: [{ segmentId: "AB", from: "A", to: "B", km: 10, speed: 80, minutes: 79, commercialStop: true }],
    bookings: [{ from: 0, to: 1, cls: "EC", count: 10, fare: 1000 }],
    seats: { EC: 106, EX: 0, LX: 0 }, revenue: 10000, cost: 5000,
    fuelLiters: 10, passengerKm: 100, seatKm: 1060, delay: 0, ...overrides,
  };
}

function operating() {
  let s = choose(found());
  let n = 0;
  const act = (a: CoreAction) => { s = apply(s, a, `setup:${++n}`, epoch); };
  for (const [productId, quantity] of [["cc201", 1], ["ec-standard", 4], ["generator", 1]] as const) {
    act({ type: "order", productId, quantity, station: s.hub, starter: true });
    act({ type: "accept", orderId: s.orders.at(-1)!.id });
  }
  act({ type: "formation", name: "KA Cerita", units: s.units.map((u) => u.id) });
  act({ type: "crew", trainsetId: s.trainsets[0]!.id });
  act({ type: "fuel", station: s.hub, liters: 16000, bucket: fuelQuote(epoch).bucket });
  act({ type: "fill", trainsetId: s.trainsets[0]!.id });
  act({ type: "service", origin: s.hub, destination: "STN_GMR_GAMBIR", category: "Custom" });
  act({ type: "schedule", trainsetId: s.trainsets[0]!.id, serviceId: s.services[0]!.id,
    cycle: 1440, offset: 422, roundTrip: false });
  return s;
}

describe("story campaign commands and legacy compatibility", () => {
  it("starts new companies at a briefing and leaves existing saves opt-in", () => {
    const s = found();
    expect(s.story).toMatchObject({ chapterIndex: 0, history: [] });
    expect(coreStoryStatus(s)?.choice).toBeUndefined();
    expect(s.ledger.some((e) => e.id.startsWith("story:"))).toBe(false);
    const old = restoreCore(serializeCore(createCoreState(epoch)));
    expect(old.story).toBeUndefined();
    const started = apply(old, { type: "startStory" }, "start", epoch);
    expect(started.story?.chapterIndex).toBe(0);
    expect(started.cash).toBe(old.cash);
    expect(old.story).toBeUndefined();
    expect(() => apply(started, { type: "startStory" }, "again", epoch)).toThrow("sudah dimulai");
  });

  it("rejects chapter skipping and unsupported or changed choices transactionally", () => {
    const s = found(), original = structuredClone(s);
    expect(() => choose(s, "expand")).toThrow("tidak tersedia");
    expect(() => apply(s, { type: "continueStory" }, "skip", epoch)).toThrow("Selesaikan tujuan");
    expect(s).toEqual(original);
    const selected = choose(s);
    expect(() => choose(selected, "frequency")).toThrow("sudah dipilih");
    expect(choose(selected)).toEqual(selected); // Same command ID is a retry, not a second choice.
  });

  it("locks in mechanically different targets for the two approaches", () => {
    const reserved = coreStoryStatus(choose(found(), "reserve"))!;
    const frequency = coreStoryStatus(choose(found(), "frequency"))!;
    expect(reserved.goals.map((g) => [g.metric, g.target])).toEqual([["trips", 1], ["depotFuel", 2000]]);
    expect(frequency.goals.map((g) => [g.metric, g.target])).toEqual([["trips", 2]]);
    expect(reserved.choice!.cash).not.toBe(frequency.choice!.cash);
  });

  it("allows recovery by revising an active approach without resetting evidence or granting twice", () => {
    let s = choose(found(), "frequency");
    s.minute = 1000; s.runs.push(run("completed-after-choice"));
    s = catchUpCore(s, epoch);
    expect(s.story!.history).toHaveLength(0);
    const started = s.story!.chapterStartedAt, baseline = [...s.story!.baselineRunIds];
    s = apply(s, { type: "storyReplan", choiceId: "reserve" }, "replan", epoch);
    expect(s.story!.chapterStartedAt).toBe(started);
    expect(s.story!.baselineRunIds).toEqual(baseline);
    expect(storyMetrics(s).trips).toBe(1);
    expect(s.story!.history).toHaveLength(0);
    s.depots[0]!.stock = 2000;
    s = catchUpCore(s, epoch);
    expect(s.story!.history[0]!.choiceId).toBe("reserve");
    expect(() => apply(s, { type: "storyReplan", choiceId: "frequency" }, "late", epoch)).toThrow("bab masih aktif");
    expect(s.ledger.filter((e) => e.id.startsWith("story:"))).toHaveLength(1);
    s = apply(s, { type: "continueStory" }, "next", epoch);
    const memory = coreStoryCallbacks(s);
    expect(memory).toHaveLength(1);
    expect(memory[0]!.when.choiceId).toBe("reserve");
    expect(storyText(memory[0]!.line)).toContain("cadangan");
  });
});

describe("scenario evidence", () => {
  it("excludes historical and already-started runs, cargo, recall, and empty services", () => {
    let s = found();
    s.runs = [run("old"), run("ongoing", { status: "running", nextEvent: 900 })];
    s = choose(s);
    s.minute = 1000;
    s.runs[1] = run("ongoing");
    s.runs.push(run("new"), run("cargo", { cargoContractId: "C" }),
      run("recall", { recalling: true }), run("empty", { passengerKm: 0 }),
      run("cancelled", { status: "cancelled" }), run("too-early", { start: 419 }));
    expect(storyMetrics(s).trips).toBe(1);
  });

  it("requires a physical return by the same trainset and counts each run at most once", () => {
    const s = choose(found()); s.minute = 1000;
    s.runs = [run("go"), run("wrong-train", { trainsetId: "other", origin: "B", destination: "A", start: 560, end: 640 }),
      run("overlap", { origin: "B", destination: "A", start: 490, end: 580 })];
    expect(storyMetrics(s).roundTrips).toBe(0);
    s.runs.push(run("back", { origin: "B", destination: "A", start: 600, end: 700 }));
    expect(storyMetrics(s).roundTrips).toBe(1);
    s.runs = s.runs.filter((r) => r.id !== "overlap");
    s.runs.push(run("go-again", { start: 760, end: 850 }));
    expect(storyMetrics(s).roundTrips).toBe(1);
  });

  it("counts commercial stops, punctuality and contribution from actual run records", () => {
    const s = choose(found()); s.minute = 1000;
    s.runs = [run("one", { delay: 10, legs: [
      { segmentId: "AX", from: "A", to: "X", km: 5, speed: 80, minutes: 20, commercialStop: false },
      { segmentId: "XB", from: "X", to: "B", km: 5, speed: 80, minutes: 20, commercialStop: true },
    ] }), run("two", { delay: 11, serviceId: "other", revenue: 4000, cost: 5000 })];
    expect(storyMetrics(s)).toMatchObject({ stations: 2, punctualTrips: 1, profitableTrips: 1, relations: 2 });
  });

  it("counts only healthy, unassigned, available locomotives as reserves", () => {
    const s = choose(found());
    const unit = { productId: "cc201", location: s.hub, condition: 100, km: 0,
      fuel: 0, fuelCost: 0, commissionedAt: 420, nextService: 10000 };
    s.units = [{ ...unit, id: "spare" }, { ...unit, id: "assigned" },
      { ...unit, id: "worn", condition: 69 }, { ...unit, id: "service", job: { kind: "P1", end: 1000 } },
      { ...unit, id: "coach", productId: "ec-standard" }];
    s.trainsets = [{ id: "T", name: "T", units: ["assigned"], location: s.hub, readyAt: 420, parked: true, crew: false }];
    expect(storyMetrics(s).spareLocos).toBe(1);
  });
});

describe("campaign settlement, offline progress and saves", () => {
  it("settles a real completed trip once with a non-revenue grant and separate XP", () => {
    const initial = operating();
    const end = forecastCore(initial, initial.trainsets[0]!.id, initial.services[0]!.id, false, 422).end;
    const result = at(initial, Math.ceil(end) + 1);
    expect(result.runs[0]!.status).toBe("completed");
    expect(result.story!.history).toHaveLength(1);
    expect(result.story!.history[0]!.completedAt).toBe(result.runs[0]!.end);
    const reward = result.ledger.find((e) => e.id === "story:first-whistle:reward")!;
    expect(reward).toMatchObject({ cash: 30_000_000, expense: 0, revenue: 0 });
    expect(coreLevel(result).xp).toBe(result.progression!.xp + 30);
    expect(initial.story!.history).toHaveLength(0);
    const restored = restoreCore(serializeCore(result));
    expect(catchUpCore(restored, restored.anchorMs)).toEqual(restored);
    expect(restored.ledger.filter((e) => e.id === reward.id)).toHaveLength(1);
  });

  it("keeps event-time rewards consistent between online ticks and offline catch-up", () => {
    const initial = operating();
    const end = Math.ceil(forecastCore(initial, initial.trainsets[0]!.id, initial.services[0]!.id, false, 422).end) + 5;
    const offline = at(initial, end);
    let online = initial;
    for (let minute = 425; minute < end; minute += 5) online = at(online, minute);
    online = at(online, end);
    expect(online.story).toEqual(offline.story);
    expect(online.cash).toBe(offline.cash);
    expect(online.ledger.filter((e) => e.id.startsWith("story:"))).toEqual(offline.ledger.filter((e) => e.id.startsWith("story:")));
  });

  it("waits for simultaneous resource readiness, then advances by explicit acknowledgement", () => {
    let s = choose(found()); s.minute = 1000; s.anchorMs = epoch;
    s.runs = [run("real-completed")]; s.depots[0]!.stock = 1999;
    s = catchUpCore(s, epoch);
    expect(s.story!.history).toHaveLength(0);
    s.depots[0]!.stock = 2000;
    s = catchUpCore(s, epoch);
    expect(s.story!.history).toHaveLength(1);
    expect(s.story!.chapterIndex).toBe(0);
    s.depots[0]!.stock = 0;
    expect(coreStoryStatus(s)!.goals.find((g) => g.metric === "depotFuel")!.current).toBe(2000);
    const advanced = apply(s, { type: "continueStory" }, "next", epoch);
    expect(advanced.story!.chapterIndex).toBe(1);
    expect(coreStoryStatus(advanced)!.choice).toBeUndefined();
    const chosen = apply(advanced, { type: "storyChoice", choiceId: "round-trip" }, "second-choice", epoch);
    expect(storyMetrics(chosen).trips).toBe(0);
    expect(advanced.story!.baselineRunIds).toEqual([]);
  });

  it("rejects tampered chapter order, choices, evidence and reward ledger on import", () => {
    const initial = operating();
    const end = Math.ceil(forecastCore(initial, initial.trainsets[0]!.id, initial.services[0]!.id, false, 422).end) + 1;
    const complete = at(initial, end);
    for (const corrupt of [
      (s: CoreState) => { s.story!.chapterIndex = 3; },
      (s: CoreState) => { s.story!.choiceId = "expand"; },
      (s: CoreState) => { s.story!.history[0]!.values = [0, 0]; },
      (s: CoreState) => { s.story!.history.push(s.story!.history[0]!); },
      (s: CoreState) => { s.ledger.find((e) => e.id.startsWith("story:"))!.cash++; },
      (s: CoreState) => { delete s.story; },
    ]) {
      const bad = structuredClone(complete); corrupt(bad);
      expect(() => restoreCore(serializeCore(bad))).toThrow("campaign cerita");
    }
  });

  it("contains two distinct, fully specified approaches for all five chapters", () => {
    expect(CORE_STORY_CAMPAIGN.chapters).toHaveLength(5);
    for (const chapter of CORE_STORY_CAMPAIGN.chapters) {
      expect(chapter.choices).toHaveLength(2);
      expect(new Set(chapter.choices.map((c) => c.id)).size).toBe(2);
      expect(chapter.choices.every((c) => c.goals.length > 0 && c.goals.every((g) => g.target > 0))).toBe(true);
    }
  });

  it("finishes a complete five-chapter path without skipping or repeating grants", () => {
    let s = choose(found());
    let command = 0;
    const act = (action: CoreAction) => { s = apply(s, action, `story-test:${++command}`, epoch); };
    const settle = (minute: number) => { s.minute = minute; s = catchUpCore(s, epoch); };
    s.depots[0]!.stock = 9000;
    s.runs.push(run("chapter1")); settle(500);
    expect(s.story!.history).toHaveLength(1);
    act({ type: "continueStory" }); act({ type: "storyChoice", choiceId: "round-trip" });
    s.runs.push(run("chapter2-go", { start: 501, end: 560 }),
      run("chapter2-back", { origin: "B", destination: "A", start: 620, end: 700 }));
    settle(700); expect(s.story!.history).toHaveLength(2);
    act({ type: "continueStory" }); act({ type: "storyChoice", choiceId: "fuel-buffer" });
    s.runs.push(run("chapter3", { start: 701, end: 800 }));
    settle(800); expect(s.story!.history).toHaveLength(3);
    act({ type: "continueStory" }); act({ type: "storyChoice", choiceId: "coverage" });
    s.runs.push(run("chapter4", { start: 801, end: 900, legs: [
      { segmentId: "AC", from: "A", to: "C", km: 5, speed: 80, minutes: 40, commercialStop: true },
      { segmentId: "CB", from: "C", to: "B", km: 5, speed: 80, minutes: 40, commercialStop: true },
    ] }));
    settle(900); expect(s.story!.history).toHaveLength(4);
    act({ type: "continueStory" }); act({ type: "storyChoice", choiceId: "sustainable" });
    s.runs.push(...[0, 1, 2].map((i) => run(`chapter5-${i}`, { start: 901 + i * 100, end: 990 + i * 100 })));
    settle(1200); expect(s.story!.history).toHaveLength(5);
    expect(s.story!.chapterIndex).toBe(4);
    act({ type: "continueStory" });
    expect(coreStoryStatus(s)!.finished).toBe(true);
    expect(s.ledger.filter((e) => e.id.startsWith("story:"))).toHaveLength(5);
    const cash = s.cash;
    s = catchUpCore(s, epoch);
    expect(s.cash).toBe(cash);
    expect(() => act({ type: "continueStory" })).toThrow("Selesaikan tujuan");
    expect(() => act({ type: "storyChoice", choiceId: "expand" })).toThrow("sudah selesai");
  });
});
