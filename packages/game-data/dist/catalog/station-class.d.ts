/** User-defined gameplay classes. These are not official station classifications. */
export declare const CORE_LARGE_HUB_CODES: Set<string>;
export declare const CORE_SEMI_LARGE_CODES: Set<string>;
export type GameStationClass = "large" | "semi-large" | "small";
export declare function gameStationClass(code: string): GameStationClass;
export declare const gameStationClassLabel: (cls: GameStationClass) => "Besar" | "Menengah besar" | "Kecil";
export interface HubProximity {
    nearestHubId: string | null;
    distanceKm: number | null;
    demandMultiplier: number;
}
/** Multi-source shortest rail distance; disconnected stations get no geographic shortcut. */
export declare function stationHubProximities(stations: readonly {
    id: string;
    code: string;
    kind: string;
}[], tracks: readonly {
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
}[]): Map<string, HubProximity>;
//# sourceMappingURL=station-class.d.ts.map