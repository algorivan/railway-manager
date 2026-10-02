import { describe, expect, it } from "vitest";
import {
  CORE_OPERATING_STATIONS,
  CORE_OPERATING_TRACKS,
  CORE_ROUTING_TRACKS,
  operatingTrackAccessible,
  operatingTrackGeometry,
  pointAlongRail,
  railDistance,
} from "../src/catalog/operating-network.js";

describe("operating map geometry", () => {
  it("connects every game corridor through selectable intermediate OSM points", () => {
    for (const parent of CORE_OPERATING_TRACKS.filter((track) => /^SEG_[A-Z]+_[A-Z]+$/.test(track.id))) {
      const children = CORE_ROUTING_TRACKS.filter((track) => track.accessKeys.includes(parent.id));
      expect(children.length).toBeGreaterThan(1);
      expect(children.reduce((sum, track) => sum + track.distanceKm, 0)).toBeCloseTo(parent.distanceKm);
      expect(children[0]!.originStationId).toBe(parent.originStationId);
      expect(children.at(-1)!.destinationStationId).toBe(parent.destinationStationId);
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        expect(child.schematic).toBe(true);
        expect(child.provenance.verified).toBe(false);
        expect(child.distanceKm).toBeGreaterThan(0);
        if (i) expect(child.originStationId).toBe(children[i - 1]!.destinationStationId);
        expect(CORE_OPERATING_STATIONS.find((station) => station.id === child.destinationStationId)?.connected).toBe(true);
        expect(operatingTrackAccessible(child, [parent.id])).toBe(true);
      }
    }
    expect(new Set(CORE_OPERATING_STATIONS.map((station) => station.id)).size).toBe(CORE_OPERATING_STATIONS.length);
    expect(new Set(CORE_OPERATING_STATIONS.map((station) => station.code)).size).toBe(CORE_OPERATING_STATIONS.length);
  });
  it("follows bends by accumulated distance instead of cutting between endpoints", () => {
    const shape: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 1],
    ];
    expect(pointAlongRail(shape, 0.25)[0]).toBeCloseTo(0);
    expect(pointAlongRail(shape, 0.25)[1]).toBeCloseTo(0.5);
    expect(pointAlongRail(shape, 0.75)[0]).toBeCloseTo(0.5);
    expect(pointAlongRail(shape, 0.75)[1]).toBeCloseTo(1);
    expect(pointAlongRail([...shape].reverse(), 0.25)).toEqual(
      pointAlongRail(shape, 0.75),
    );
  });
  it("handles clamping, coincident points, and missing geometry safely", () => {
    const shape: [number, number][] = [
      [-7, 110],
      [-7, 110],
      [-7, 111],
    ];
    expect(pointAlongRail(shape, -1)).toEqual(shape[0]);
    expect(pointAlongRail(shape, 2)).toEqual(shape.at(-1));
    expect(() => pointAlongRail([], 0.5)).toThrow("empty");
    expect(railDistance([-7, 110], [-7, 110])).toBe(0);
  });
  it("preserves every legacy endpoint and supplies reversible fallback geometry", () => {
    const track = CORE_OPERATING_TRACKS.find((t) => t.id === "SEG_GMR_BD")!;
    const shape = operatingTrackGeometry(track.id, track.originStationId);
    const reverse = operatingTrackGeometry(
      track.id,
      track.destinationStationId,
    );
    expect(reverse).toEqual([...shape].reverse());
    expect(
      CORE_OPERATING_STATIONS.some((s) => s.id === track.originStationId),
    ).toBe(true);
    expect(
      CORE_OPERATING_STATIONS.some((s) => s.id === track.destinationStationId),
    ).toBe(true);
  });
  it("inherits access from a mapped parent corridor without granting unrelated lines", () => {
    const track = {
      ...CORE_OPERATING_TRACKS[0]!,
      id: "SEG_TEST_CHILD",
      accessKeys: ["SEG_GMR_BD"],
    };
    expect(operatingTrackAccessible(track, ["SEG_GMR_BD"])).toBe(true);
    expect(operatingTrackAccessible(track, ["SEG_TEST_CHILD"])).toBe(true);
    expect(operatingTrackAccessible(track, ["SEG_CN_YK"])).toBe(false);
  });
});
