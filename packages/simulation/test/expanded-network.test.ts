import { describe, expect, it, vi } from "vitest";

// Synthetic station/topology fixtures are confined to this test module.
vi.mock("@railway/game-data", async (importOriginal) => {
  const data = await importOriginal<typeof import("@railway/game-data")>();
  const base = data.CORE_OPERATING_STATIONS.find(
    (s) => s.id === "STN_BD_BANDUNG",
  )!;
  const small = {
    ...base,
    id: "STN_TEST_SMALL",
    code: "TS",
    name: "Test Small Station",
    province: undefined,
  };
  const junction = {
    ...base,
    id: "STN_TEST_JUNCTION",
    code: "TJ",
    name: "Test Junction",
    kind: "junction" as const,
  };
  const corridor = data.CORE_OPERATING_TRACKS.find(
    (t) => t.id === "SEG_GMR_BD",
  )!;
  const edges = [
    {
      ...corridor,
      id: "SEG_BD_TEST",
      originStationId: base.id,
      destinationStationId: junction.id,
      distanceKm: 30,
      accessKeys: [corridor.id],
    },
    {
      ...corridor,
      id: "SEG_TEST_SMALL",
      originStationId: junction.id,
      destinationStationId: small.id,
      distanceKm: 30,
      accessKeys: [corridor.id],
    },
    {
      ...corridor,
      id: "SEG_SMALL_GMR",
      originStationId: small.id,
      destinationStationId: corridor.originStationId,
      distanceKm: 100,
      accessKeys: [corridor.id],
    },
  ];
  return {
    ...data,
    CORE_OPERATING_STATIONS: [...data.CORE_OPERATING_STATIONS, small, junction],
    CORE_OPERATING_TRACKS: [...data.CORE_OPERATING_TRACKS, ...edges],
    CORE_ROUTING_TRACKS: [
      ...data.CORE_ROUTING_TRACKS.filter((t) => t.id !== corridor.id),
      ...edges,
    ],
  };
});
import {
  applyCoreAction,
  createCoreState,
  findCorePath,
  restoreCore,
  serializeCore,
} from "../src/engine/core-v7.js";
const now = Date.UTC(2026, 9, 2);

describe("expanded station network", () => {
  it("makes an intermediate small station reachable through existing corridor rights", () => {
    const s = createCoreState(now);
    const path = findCorePath(s.hub, "STN_TEST_SMALL", s.access);
    expect(path.stations).toEqual([
      s.hub,
      "STN_TEST_JUNCTION",
      "STN_TEST_SMALL",
    ]);
    expect(() => findCorePath(s.hub, "STN_TEST_SMALL", [])).toThrow(
      "terhubung",
    );
  });
  it("creates a selectable small-station service without selling stops at junctions", () => {
    const s = createCoreState(now);
    const next = applyCoreAction(
      s,
      {
        type: "service",
        name: "Local fixture",
        origin: s.hub,
        destination: "STN_TEST_SMALL",
        category: "Custom",
      },
      "new-service",
      now,
    );
    expect(next.services[0]!.stops).toEqual([s.hub, "STN_TEST_SMALL"]);
    expect(restoreCore(serializeCore(next)).services).toEqual(next.services);
    expect(() =>
      applyCoreAction(
        s,
        {
          type: "service",
          name: "Invalid",
          origin: s.hub,
          destination: "STN_TEST_JUNCTION",
          category: "Custom",
        },
        "bad",
        now,
      ),
    ).toThrow("stasiun penumpang");
  });
  it("preserves a saved legacy corridor route while rejecting unknown Local provinces", () => {
    const s = createCoreState(now);
    s.services.push({
      id: "old",
      name: "Legacy service",
      stations: [s.hub, "STN_GMR_GAMBIR"],
      segments: ["SEG_GMR_BD"],
      category: "Custom",
      autoFare: true,
      fares: { EC: 1, EX: 1, LX: 1 },
    });
    expect(restoreCore(serializeCore(s)).services[0]!.segments).toEqual([
      "SEG_GMR_BD",
    ]);
    expect(() =>
      applyCoreAction(
        s,
        {
          type: "service",
          name: "Unverified",
          origin: s.hub,
          destination: "STN_TEST_SMALL",
          category: "Local",
        },
        "unknown-province",
        now,
      ),
    ).toThrow("belum terverifikasi");
  });
});
