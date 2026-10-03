import { describe, it, expect } from "vitest";
import {
  gameStationClass,
  stationHubProximities,
} from "../src/catalog/station-class.js";
import { CORE_SELECTABLE_STATIONS } from "../src/catalog/operating-network.js";
import { stationDemandFor } from "../src/catalog/station-demand.js";
describe("user-defined station classes and rail proximity", () => {
  it("prioritises large hubs over the duplicate semi-large list and keeps other stations small", () => {
    expect(gameStationClass("SMC")).toBe("large");
    expect(gameStationClass("KAC")).toBe("large");
    expect(gameStationClass("KTG")).toBe("semi-large");
    expect(gameStationClass("MRW")).toBe("small");
  });
  it("uses shortest rail distance to any large hub, with gradual demand decay and no disconnected shortcut", () => {
    const stations = [
      { id: "a", code: "BD", kind: "station" },
      { id: "b", code: "GMR", kind: "station" },
      { id: "near", code: "X1", kind: "station" },
      { id: "far", code: "X2", kind: "station" },
      { id: "isolated", code: "X3", kind: "station" },
    ];
    const p = stationHubProximities(stations, [
      { originStationId: "a", destinationStationId: "near", distanceKm: 5 },
      { originStationId: "near", destinationStationId: "far", distanceKm: 100 },
      { originStationId: "b", destinationStationId: "far", distanceKm: 80 },
    ]);
    expect(p.get("near")!.distanceKm).toBe(5);
    expect(p.get("far")!.nearestHubId).toBe("b");
    expect(p.get("far")!.distanceKm).toBe(80);
    expect(p.get("near")!.demandMultiplier).toBeGreaterThan(
      p.get("far")!.demandMultiplier,
    );
    expect(p.get("isolated")!.distanceKm).toBeNull();
    expect(p.get("isolated")!.nearestHubId).toBeNull();
    expect(p.get("isolated")!.demandMultiplier).toBe(0.6);
  });
  it("exposes gameplay class and proximity for every selectable station and applies the multiplier once", () => {
    for (const s of CORE_SELECTABLE_STATIONS) {
      expect(s.gameClass).toBe(gameStationClass(s.code));
      expect(s.hubProximity!.demandMultiplier).toBeGreaterThanOrEqual(0.6);
      expect(s.hubProximity!.demandMultiplier).toBeLessThanOrEqual(1.4);
      expect(s.demandProfile.baseDailyDemand).toBeGreaterThan(0);
    }
    const station = CORE_SELECTABLE_STATIONS.find((s) => s.code === "MRW")!;
    expect(station.demandProfile.baseDailyDemand).toBe(
      Math.round(
        stationDemandFor(station.code, station.name).profile.baseDailyDemand *
          station.hubProximity!.demandMultiplier,
      ),
    );
  });
});
