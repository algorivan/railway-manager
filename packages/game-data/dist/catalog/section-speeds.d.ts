/** User-supplied game operating caps, 2026-10-03; not verified official track limits. */
export declare const CORE_SECTION_SPEED_RULES: readonly [readonly ["GMR", "CKP", 90], readonly ["CKP", "PWK", 60], readonly ["PWK", "CMI", 30], readonly ["CMI", "CCL", 110], readonly ["CCL", "CAW", 45], readonly ["CAW", "MA", 90], readonly ["MA", "KYA", 110], readonly ["KYA", "WT", 90], readonly ["WT", "YK", 60], readonly ["YK", "SLO", 110], readonly ["SLO", "MN", 110], readonly ["MN", "KTS", 90], readonly ["KTS", "BL", 90], readonly ["BL", "KPN", 60], readonly ["KPN", "SB", 90], readonly ["WO", "KTS", 110], readonly ["BG", "PB", 110], readonly ["PB", "LEC", 90], readonly ["LEC", "MLS", 45], readonly ["MLS", "KK", 60], readonly ["KK", "KTK", 90], readonly ["KTK", "LDO", 45], readonly ["LDO", "KBR", 60], readonly ["KBR", "RGP", 110], readonly ["RGP", "KTG", 90], readonly ["SB", "SMT", 110], readonly ["SMT", "CKP", 110], readonly ["SMT", "GD", 110], readonly ["GD", "SLO", 90]];
type Edge = {
    id: string;
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
};
export declare const speedPairKey: (a: string, b: string) => string;
/** Distance chooses the connected corridor path; never apply a geographical straight-line shortcut. */
export declare function sectionSpeedPath<T extends Edge>(from: string, to: string, tracks: readonly T[]): T[];
export declare function deriveSectionSpeedLimits(stations: readonly {
    id: string;
    code: string;
}[], tracks: readonly Edge[]): {
    byPair: Map<string, number>;
    coverage: {
        fromCode: "GMR" | "SMT" | "YK" | "SLO" | "CKP" | "PWK" | "CMI" | "SB" | "KYA" | "WT" | "CCL" | "CAW" | "MA" | "MN" | "KTS" | "WO" | "GD" | "BL" | "KPN" | "BG" | "PB" | "LEC" | "MLS" | "KK" | "KTK" | "LDO" | "KBR" | "RGP";
        toCode: "SMT" | "YK" | "SLO" | "CKP" | "PWK" | "CMI" | "SB" | "KYA" | "WT" | "CCL" | "CAW" | "MA" | "MN" | "KTS" | "GD" | "BL" | "KPN" | "PB" | "LEC" | "MLS" | "KK" | "KTK" | "LDO" | "KBR" | "RGP" | "KTG";
        speedKmh: 30 | 110 | 90 | 60 | 45;
        distanceKm: number;
        segmentIds: string[];
    }[];
};
export {};
//# sourceMappingURL=section-speeds.d.ts.map