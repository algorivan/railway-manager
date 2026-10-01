import { CoordinateBounds } from '../schemas/bounds.schema.js';
import { StationCatalogEntry } from '../schemas/station.schema.js';
import { TrackCorridorSegment } from '../schemas/track.schema.js';
import { RollingStockSpecCatalogEntry, RollingStockCategory } from '../schemas/rolling-stock.schema.js';
export declare class CatalogIntegrityError extends Error {
    readonly code: string;
    readonly details: ReadonlyArray<string>;
    constructor(message: string, code: string, details?: ReadonlyArray<string>);
}
export interface WorldCatalog {
    readonly stations: ReadonlyArray<StationCatalogEntry>;
    readonly segments: ReadonlyArray<TrackCorridorSegment>;
    readonly rollingStock: ReadonlyArray<RollingStockSpecCatalogEntry>;
    readonly bounds: CoordinateBounds;
}
export declare class WorldDataCatalogLoader {
    private static cachedCatalog;
    private static stationsById;
    private static stationsByCode;
    private static segmentsById;
    private static adjacencyMap;
    private static rollingStockById;
    /**
     * Clears internal caches (primarily for deterministic unit testing).
     */
    static reset(): void;
    /**
     * Loads and validates stations against StationCatalogEntrySchema and geographic/uniqueness rules.
     */
    static loadStations(rawStations?: unknown[]): ReadonlyArray<StationCatalogEntry>;
    /**
     * Loads and validates corridor segments against TrackCorridorSegmentSchema and referential foreign key rules.
     */
    static loadSegments(rawSegments: unknown[] | undefined, validatedStations: ReadonlyArray<StationCatalogEntry>): ReadonlyArray<TrackCorridorSegment>;
    /**
     * Validates full network graph reachability (all stations belong to a single connected component).
     */
    static validateGraphReachability(stations: ReadonlyArray<StationCatalogEntry>, segments: ReadonlyArray<TrackCorridorSegment>): void;
    /**
     * Validates full static catalog integrity.
     */
    static validateCatalogIntegrity(stations: ReadonlyArray<StationCatalogEntry>, segments: ReadonlyArray<TrackCorridorSegment>): void;
    /**
     * Loads and validates rolling stock specifications.
     */
    static loadRollingStock(rawRollingStock?: unknown[]): ReadonlyArray<RollingStockSpecCatalogEntry>;
    /**
     * Initializes, caches, and indexes the entire world catalog.
     */
    static initialize(): WorldCatalog;
    static getStationById(id: string): StationCatalogEntry | undefined;
    static getStationByCode(code: string): StationCatalogEntry | undefined;
    static getSegmentById(id: string): TrackCorridorSegment | undefined;
    static getConnectedSegments(stationId: string): ReadonlyArray<TrackCorridorSegment>;
    static getAdjacentSegments(stationId: string): ReadonlyArray<TrackCorridorSegment>;
    static getSegmentBetween(stationIdA: string, stationIdB: string): TrackCorridorSegment | undefined;
    static getRollingStockSpecById(id: string): RollingStockSpecCatalogEntry | undefined;
    static getRollingStockSpecsByCategory(category: RollingStockCategory): ReadonlyArray<RollingStockSpecCatalogEntry>;
    static getAllRollingStockSpecs(): ReadonlyArray<RollingStockSpecCatalogEntry>;
}
//# sourceMappingURL=catalog-loader.d.ts.map