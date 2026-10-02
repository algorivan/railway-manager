import type { CatchmentProfile } from "../schemas/catchment.schema.js";
/** All shipped factors are provisional balance values, not BPS population or IPM statistics. */
export interface StationDemandFactors {
    dailyCatchmentPotential: number;
    urbanDevelopment: number;
    employment: number;
    education: number;
    tourism: number;
    interchange: number;
    railPreference: number;
    stationCapture: number;
    humanDevelopment?: {
        value: number;
        year: number;
        area: string;
        sourceUrl: string;
    };
}
export interface StationDemandContext {
    factors: StationDemandFactors;
    catchment: string;
    basis: "provisional-game" | "legacy-calibration";
    hdiMultiplier: number;
    notes: string;
}
export declare function stationHumanDevelopmentMultiplier(hdi?: StationDemandFactors["humanDevelopment"]): number;
export declare function deriveStationDemand(f: StationDemandFactors): CatchmentProfile;
/** Legacy hub volumes stay calibrated to their old balance; all intermediate stations get distinct catchments. */
export declare function stationDemandFor(code: string, name: string, legacy?: CatchmentProfile): {
    profile: CatchmentProfile;
    context: StationDemandContext;
};
/** Purpose mix affects peaks; two endpoint factors are averaged by the booking engine. */
export declare function stationPurposeTimeFactor(profile: CatchmentProfile, minute: number): number;
//# sourceMappingURL=station-demand.d.ts.map