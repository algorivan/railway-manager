import { describe, expect, it } from "vitest";
import {
  CORE_SECTION_SPEED_RULES,
  sectionSpeedPath,
  speedPairKey,
} from "../src/catalog/section-speeds.js";
import {
  CORE_SECTION_SPEED_COVERAGE,
  CORE_OPERATING_TRACKS,
  CORE_ROUTING_TRACKS,
  CORE_SELECTABLE_STATIONS,
} from "../src/catalog/operating-network.js";
describe("user-supplied section speed limits", () => {
  it("resolves all 29 station boundaries and caps every constituent edge in both directions", () => {
    expect(CORE_SECTION_SPEED_COVERAGE).toHaveLength(29);
    for (const rule of CORE_SECTION_SPEED_COVERAGE) {
      expect(rule.segmentIds.length).toBeGreaterThan(0);
      expect(rule.distanceKm).toBeGreaterThan(0);
      const from = CORE_SELECTABLE_STATIONS.find(
          (s) => s.code === rule.fromCode,
        )!,
        to = CORE_SELECTABLE_STATIONS.find((s) => s.code === rule.toCode)!;
      const reverse = sectionSpeedPath(to.id, from.id, CORE_ROUTING_TRACKS);
      expect(reverse.reduce((n, t) => n + t.distanceKm, 0)).toBeCloseTo(
        rule.distanceKm,
      );
      for (const id of rule.segmentIds) {
        const edge = CORE_ROUTING_TRACKS.find((t) => t.id === id)!;
        expect(edge.trackSpeedLimitKmh).toBe(rule.speedKmh);
        for (const alias of CORE_ROUTING_TRACKS.filter(
          (t) =>
            speedPairKey(t.originStationId, t.destinationStationId) ===
            speedPairKey(edge.originStationId, edge.destinationStationId),
        ))
          expect(alias.trackSpeedLimitKmh).toBe(rule.speedKmh);
        expect(edge.provenance.verified).toBe(false);
      }
    }
    expect(
      CORE_SECTION_SPEED_RULES.find(
        (r) => r[0] === "PWK" && r[1] === "CMI",
      )![2],
    ).toBe(30);
  });
  it("uses a distance-weighted travel-time equivalent for old whole-corridor saves", () => {
    const parent = CORE_OPERATING_TRACKS.find((t) => t.id === "SEG_GMR_BD")!;
    const children = sectionSpeedPath(
      parent.originStationId,
      parent.destinationStationId,
      CORE_ROUTING_TRACKS,
    );
    const harmonic = Math.round(
      children.reduce((n, t) => n + t.distanceKm, 0) /
        children.reduce((n, t) => n + t.distanceKm / t.trackSpeedLimitKmh, 0),
    );
    expect(parent.trackSpeedLimitKmh).toBe(harmonic);
    expect(parent.trackSpeedLimitKmh).toBeLessThan(90);
    expect(parent.provenance.notes).toContain("distance-weighted");
  });
  it("routes by rail distance and rejects disconnected speed endpoints", () => {
    const tracks = [
      {
        id: "ab",
        originStationId: "a",
        destinationStationId: "b",
        distanceKm: 2,
      },
      {
        id: "bc",
        originStationId: "b",
        destinationStationId: "c",
        distanceKm: 3,
      },
      {
        id: "ac",
        originStationId: "a",
        destinationStationId: "c",
        distanceKm: 10,
      },
    ];
    expect(sectionSpeedPath("a", "c", tracks).map((t) => t.id)).toEqual([
      "ab",
      "bc",
    ]);
    expect(() => sectionSpeedPath("a", "missing", tracks)).toThrow(
      "disconnected",
    );
  });
});
