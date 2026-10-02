import { describe, expect, it } from "vitest";
import {
  CORE_DEPOT_CITIES,
  CORE_ONBOARDING_MISSIONS,
} from "@railway/game-data";
import {
  applyCoreAction,
  catchUpCore,
  coreLevel,
  createCompanyDraft,
  createCoreState,
  restoreCore,
  serializeCore,
} from "../src/engine/core-v7.js";
const now = Date.UTC(2026, 9, 2);
const found = () =>
  applyCoreAction(
    createCompanyDraft(now),
    { type: "foundCompany", cityId: "bandung", hubStationId: "STN_BD_BANDUNG" },
    "found",
    now,
  );

describe("company setup and mission rewards", () => {
  it("requires a depot city and compatible first hub before any procurement", () => {
    const s = createCompanyDraft(now);
    expect(s.depots).toHaveLength(0);
    expect(() =>
      applyCoreAction(
        s,
        { type: "order", productId: "cc201", quantity: 1, station: s.hub },
        "order",
        now,
      ),
    ).toThrow("Dirikan depo");
    expect(() =>
      applyCoreAction(
        s,
        {
          type: "foundCompany",
          cityId: "bandung",
          hubStationId: "STN_GMR_GAMBIR",
        },
        "bad",
        now,
      ),
    ).toThrow("kota depo");
    expect(restoreCore(serializeCore(s)).companyStarted).toBe(false);
  });
  it("charges city-specific depot cost and pays a generous one-time setup reward", () => {
    const draft = createCompanyDraft(now),
      s = found();
    const cost = CORE_DEPOT_CITIES.find((c) => c.id === "bandung")!.cost;
    expect(s.cash).toBe(draft.cash - cost + 100_000_000);
    expect(s.depots[0]!.station).toBe(s.hub);
    expect(s.depots[0]!.contractCost).toBe(cost);
    expect(s.progression).toEqual({ xp: 40, claimed: ["company"] });
    expect(s.ledger.find((e) => e.id === "mission:company")?.revenue).toBe(0);
    expect(
      applyCoreAction(
        s,
        { type: "foundCompany", cityId: "bandung", hubStationId: s.hub },
        "found",
        now,
      ),
    ).toEqual(s);
    expect(() =>
      applyCoreAction(
        s,
        { type: "foundCompany", cityId: "bandung", hubStationId: s.hub },
        "again",
        now,
      ),
    ).toThrow("sudah didirikan");
  });
  it("reconciles offline/reload rewards without paying for partial starter purchases", () => {
    let s = found();
    s = applyCoreAction(
      s,
      {
        type: "order",
        productId: "cc201",
        quantity: 1,
        station: s.hub,
        starter: true,
      },
      "loco",
      now,
    );
    expect(s.progression!.claimed).not.toContain("orders");
    s = applyCoreAction(
      s,
      {
        type: "order",
        productId: "ec-standard",
        quantity: 4,
        station: s.hub,
        starter: true,
      },
      "coaches",
      now,
    );
    s = applyCoreAction(
      s,
      {
        type: "order",
        productId: "generator",
        quantity: 1,
        station: s.hub,
        starter: true,
      },
      "power",
      now,
    );
    expect(s.progression!.claimed).toContain("orders");
    const originalCash = s.cash;
    const restored = restoreCore(serializeCore(s));
    expect(catchUpCore(restored, now).cash).toBe(originalCash);
    expect(
      catchUpCore(restored, now).ledger.filter(
        (e) => e.id === "mission:orders",
      ),
    ).toHaveLength(1);
  });
  it("keeps old saves usable and lets existing companies enable missions once", () => {
    const old = restoreCore(serializeCore(createCoreState(now)));
    expect(old.progression).toBeUndefined();
    const upgraded = applyCoreAction(
      old,
      { type: "enableMissions" },
      "enable",
      now,
    );
    expect(upgraded.progression!.claimed).toEqual(["company"]);
    expect(upgraded.cash).toBe(old.cash + 100_000_000);
    expect(() =>
      applyCoreAction(upgraded, { type: "enableMissions" }, "other", now),
    ).toThrow("sudah aktif");
  });
  it("levels up from earned XP and rejects inconsistent imported progression", () => {
    const s = found();
    expect(coreLevel(s)).toMatchObject({
      level: 1,
      xp: 40,
      inLevel: 40,
      nextLevelAt: 100,
    });
    s.progression!.xp = 1000;
    expect(() => restoreCore(serializeCore(s))).toThrow("Progres misi");
    expect(CORE_ONBOARDING_MISSIONS.reduce((sum, m) => sum + m.cash, 0)).toBe(
      590_000_000,
    );
  });
});
