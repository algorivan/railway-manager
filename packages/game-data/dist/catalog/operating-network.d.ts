import type { StationCatalogEntry } from "../schemas/station.schema.js";
import type { TrackCorridorSegment } from "../schemas/track.schema.js";
export type RailPoint = [number, number];
export interface OsmNetworkSnapshot {
    importedAt: string | null;
    source: string;
    stations: {
        id: string;
        code: string;
        name: string;
        coordinates: {
            lat: number;
            lng: number;
        };
        osmId: string;
        kind: "station" | "junction";
        connected: boolean;
        province?: string;
        stationClass?: string;
        city?: string;
    }[];
    segments: {
        id: string;
        from: string;
        to: string;
        distanceKm: number;
        geometry: RailPoint[];
        osmWayIds: number[];
        accessKeys: string[];
        speedLimitKmh?: number;
        gradientPermille?: number;
    }[];
    legacyRoutes: Record<string, string[]>;
}
export interface OperatingStation extends Omit<StationCatalogEntry, "region"> {
    region: string;
    kind: "station" | "junction";
    connected: boolean;
    osmId?: string;
    province?: string;
    stationClass?: string;
    city?: string;
}
export interface OperatingTrack extends TrackCorridorSegment {
    geometry?: RailPoint[];
    accessKeys: string[];
    schematic: boolean;
    gradientPermille?: number;
}
export declare const CORE_OPERATING_STATIONS: readonly OperatingStation[];
export declare const CORE_SELECTABLE_STATIONS: OperatingStation[];
export declare const CORE_OPERATING_TRACKS: readonly OperatingTrack[];
export declare const CORE_ROUTING_TRACKS: OperatingTrack[];
export declare const CORE_NETWORK_SOURCE: {
    importedAt: string | null;
    importedStationCount: number;
    connectedStationCount: number;
    source: string;
    intermediateStationCount: number;
};
export declare function operatingTrackAccessible(track: OperatingTrack, access: readonly string[]): boolean;
export declare function operatingTrackGeometry(id: string, from?: string): RailPoint[];
export declare function railDistance(a: RailPoint, b: RailPoint): number;
/** Follow a rail polyline by travelled distance, rather than endpoint interpolation. */
export declare function pointAlongRail(points: readonly RailPoint[], fraction: number): RailPoint;
//# sourceMappingURL=operating-network.d.ts.map