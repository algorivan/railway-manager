import { describe, expect, it } from "vitest";
import { deriveStationDemand, stationDemandFor, stationHumanDevelopmentMultiplier, stationPurposeTimeFactor } from "../src/catalog/station-demand.js";
import { CatchmentProfileSchema } from "../src/schemas/catchment.schema.js";
import { CORE_SELECTABLE_STATIONS } from "../src/catalog/operating-network.js";

describe("station catchment demand", () => {
  it("keeps every station's purpose shares valid and exposes estimates without invented IPM", () => {
    for (const station of CORE_SELECTABLE_STATIONS) {
      expect(CatchmentProfileSchema.safeParse(station.demandProfile).success).toBe(true);
      expect(station.demandContext?.factors.humanDevelopment).toBeUndefined();
      expect(station.demandContext?.hdiMultiplier).toBe(1);
    }
    const local = stationDemandFor("MRW", "Mrawan");
    const city = stationDemandFor("JR", "Jember");
    expect(city.profile.baseDailyDemand).toBeGreaterThan(local.profile.baseDailyDemand);
    expect(stationDemandFor("KTG", "Ketapang").context.factors.interchange).toBe(1);
    expect(stationDemandFor("ML", "Malang").context.factors.education).toBeGreaterThan(local.context.factors.education);
  });
  it("reacts to catchment, economic activity, tourism, transit and rail preference", () => {
    const base = stationDemandFor("MRW", "Mrawan").context.factors;
    const initial = deriveStationDemand(base);
    for (const key of ["dailyCatchmentPotential", "urbanDevelopment", "employment", "education", "tourism", "interchange", "railPreference", "stationCapture"] as const) {
      const value = key === "dailyCatchmentPotential" ? base[key] * 2 : base[key] + 0.1;
      expect(deriveStationDemand({ ...base, [key]: value }).baseDailyDemand).toBeGreaterThan(initial.baseDailyDemand);
    }
    expect(deriveStationDemand({ ...base, stationCapture: 0 }).baseDailyDemand).toBe(0);
    expect(() => deriveStationDemand({ ...base, tourism: NaN })).toThrow();
  });
  it("uses absent IPM neutrally, bounds sourced IPM and rejects incomplete provenance", () => {
    const source = { value: 70, year: 2025, area: "Test area", sourceUrl: "https://www.bps.go.id/" };
    expect(stationHumanDevelopmentMultiplier()).toBe(1);
    expect(stationHumanDevelopmentMultiplier(source)).toBe(1);
    expect(stationHumanDevelopmentMultiplier({ ...source, value: 100 })).toBeCloseTo(1.1);
    expect(stationHumanDevelopmentMultiplier({ ...source, value: 0 })).toBeCloseTo(0.9);
    expect(() => stationHumanDevelopmentMultiplier({ ...source, sourceUrl: "" })).toThrow();
    expect(() => stationHumanDevelopmentMultiplier({ ...source, value: 101 })).toThrow();
    const f = stationDemandFor("JR", "Jember").context.factors;
    expect(deriveStationDemand({ ...f, humanDevelopment: { ...source, value: 85 } }).baseDailyDemand).toBeGreaterThan(deriveStationDemand(f).baseDailyDemand);
  });
  it("distinguishes commute peaks from tourism daytime demand and wraps clocks", () => {
    const commute = { baseDailyDemand: 1000, commuterShare: 1, businessShare: 0, touristShare: 0 };
    const tourist = { ...commute, commuterShare: 0, touristShare: 1 };
    expect(stationPurposeTimeFactor(commute, 7 * 60)).toBeGreaterThan(stationPurposeTimeFactor(commute, 12 * 60));
    expect(stationPurposeTimeFactor(tourist, 12 * 60)).toBeGreaterThan(stationPurposeTimeFactor(tourist, 7 * 60));
    expect(stationPurposeTimeFactor(tourist, 12 * 60 + 1440)).toBe(stationPurposeTimeFactor(tourist, 12 * 60));
  });
});
