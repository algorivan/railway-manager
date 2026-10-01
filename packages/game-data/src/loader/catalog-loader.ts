import { CoordinateBounds, JAVA_COORDINATE_BOUNDS, isWithinJavaBounds } from '../schemas/bounds.schema.js';
import { StationCatalogEntry, StationCatalogEntrySchema } from '../schemas/station.schema.js';
import { TrackCorridorSegment, TrackCorridorSegmentSchema } from '../schemas/track.schema.js';
import {
  RollingStockSpecCatalogEntry,
  RollingStockSpecCatalogEntrySchema,
  RollingStockCategory,
} from '../schemas/rolling-stock.schema.js';
import { JAVA_STATION_CATALOG } from '../catalog/stations.js';
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from '../catalog/tracks.js';
import { JAVA_ROLLING_STOCK_CATALOG } from '../catalog/rolling-stock.js';

export class CatalogIntegrityError extends Error {
  public readonly code: string;
  public readonly details: ReadonlyArray<string>;

  constructor(message: string, code: string, details: ReadonlyArray<string> = []) {
    super(message);
    this.name = 'CatalogIntegrityError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CatalogIntegrityError.prototype);
  }
}

export interface WorldCatalog {
  readonly stations: ReadonlyArray<StationCatalogEntry>;
  readonly segments: ReadonlyArray<TrackCorridorSegment>;
  readonly rollingStock: ReadonlyArray<RollingStockSpecCatalogEntry>;
  readonly bounds: CoordinateBounds;
}

export class WorldDataCatalogLoader {
  private static cachedCatalog: WorldCatalog | null = null;
  private static stationsById: Map<string, StationCatalogEntry> = new Map();
  private static stationsByCode: Map<string, StationCatalogEntry> = new Map();
  private static segmentsById: Map<string, TrackCorridorSegment> = new Map();
  private static adjacencyMap: Map<string, TrackCorridorSegment[]> = new Map();
  private static rollingStockById: Map<string, RollingStockSpecCatalogEntry> = new Map();

  /**
   * Clears internal caches (primarily for deterministic unit testing).
   */
  public static reset(): void {
    this.cachedCatalog = null;
    this.stationsById.clear();
    this.stationsByCode.clear();
    this.segmentsById.clear();
    this.adjacencyMap.clear();
    this.rollingStockById.clear();
  }

  /**
   * Loads and validates stations against StationCatalogEntrySchema and geographic/uniqueness rules.
   */
  public static loadStations(
    rawStations: unknown[] = JAVA_STATION_CATALOG as unknown[]
  ): ReadonlyArray<StationCatalogEntry> {
    const validatedStations: StationCatalogEntry[] = [];
    const seenIds = new Set<string>();
    const seenCodes = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < rawStations.length; i++) {
      const parseResult = StationCatalogEntrySchema.safeParse(rawStations[i]);
      if (!parseResult.success) {
        errors.push(`Station at index ${i} failed schema validation: ${parseResult.error.message}`);
        continue;
      }
      const station = parseResult.data;

      if (seenIds.has(station.id)) {
        errors.push(`Duplicate station ID detected: ${station.id}`);
      }
      if (seenCodes.has(station.code)) {
        errors.push(`Duplicate station code detected: ${station.code}`);
      }
      if (!isWithinJavaBounds(station.coordinates)) {
        errors.push(
          `Station ${station.id} coordinates (${station.coordinates.lat}, ${station.coordinates.lng}) fall outside Java bounds`
        );
      }

      seenIds.add(station.id);
      seenCodes.add(station.code);
      validatedStations.push(Object.freeze(station));
    }

    if (errors.length > 0) {
      throw new CatalogIntegrityError('Station catalog integrity failed', 'STATION_CATALOG_INVALID', errors);
    }

    return Object.freeze(validatedStations);
  }

  /**
   * Loads and validates corridor segments against TrackCorridorSegmentSchema and referential foreign key rules.
   */
  public static loadSegments(
    rawSegments: unknown[] = JAVA_TRACK_CORRIDOR_SEGMENTS as unknown[],
    validatedStations: ReadonlyArray<StationCatalogEntry>
  ): ReadonlyArray<TrackCorridorSegment> {
    const stationIdSet = new Set(validatedStations.map((s) => s.id));
    const validatedSegments: TrackCorridorSegment[] = [];
    const seenSegmentIds = new Set<string>();
    const seenPairs = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < rawSegments.length; i++) {
      const parseResult = TrackCorridorSegmentSchema.safeParse(rawSegments[i]);
      if (!parseResult.success) {
        errors.push(`Segment at index ${i} failed schema validation: ${parseResult.error.message}`);
        continue;
      }
      const segment = parseResult.data;

      if (seenSegmentIds.has(segment.id)) {
        errors.push(`Duplicate segment ID detected: ${segment.id}`);
      }
      if (!stationIdSet.has(segment.originStationId)) {
        errors.push(`Segment ${segment.id} references non-existent originStationId: ${segment.originStationId}`);
      }
      if (!stationIdSet.has(segment.destinationStationId)) {
        errors.push(`Segment ${segment.id} references non-existent destinationStationId: ${segment.destinationStationId}`);
      }

      // Check undirected edge uniqueness
      const pairKey = [segment.originStationId, segment.destinationStationId].sort().join('<->');
      if (seenPairs.has(pairKey)) {
        errors.push(`Duplicate track corridor segment between station pair: ${pairKey}`);
      }

      seenSegmentIds.add(segment.id);
      seenPairs.add(pairKey);
      validatedSegments.push(Object.freeze(segment));
    }

    if (errors.length > 0) {
      throw new CatalogIntegrityError('Track corridor segments integrity failed', 'SEGMENT_CATALOG_INVALID', errors);
    }

    return Object.freeze(validatedSegments);
  }

  /**
   * Validates full network graph reachability (all stations belong to a single connected component).
   */
  public static validateGraphReachability(
    stations: ReadonlyArray<StationCatalogEntry>,
    segments: ReadonlyArray<TrackCorridorSegment>
  ): void {
    if (stations.length === 0) {
      throw new CatalogIntegrityError(
        'Station catalog cannot be empty for graph reachability validation',
        'EMPTY_CATALOG'
      );
    }

    const adj = new Map<string, string[]>();
    for (const s of stations) {
      adj.set(s.id, []);
    }
    for (const seg of segments) {
      adj.get(seg.originStationId)?.push(seg.destinationStationId);
      adj.get(seg.destinationStationId)?.push(seg.originStationId);
    }

    const visited = new Set<string>();
    const startNode = stations[0]!.id;
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }

    if (visited.size !== stations.length) {
      const unreachable = stations.filter((s) => !visited.has(s.id)).map((s) => s.id);
      throw new CatalogIntegrityError(
        'Railway network is partitioned; unreachable station nodes exist',
        'GRAPH_PARTITIONED',
        unreachable
      );
    }
  }

  /**
   * Validates full static catalog integrity.
   */
  public static validateCatalogIntegrity(
    stations: ReadonlyArray<StationCatalogEntry>,
    segments: ReadonlyArray<TrackCorridorSegment>
  ): void {
    this.validateGraphReachability(stations, segments);
  }

  /**
   * Loads and validates rolling stock specifications.
   */
  public static loadRollingStock(
    rawRollingStock: unknown[] = JAVA_ROLLING_STOCK_CATALOG as unknown[]
  ): ReadonlyArray<RollingStockSpecCatalogEntry> {
    const validated: RollingStockSpecCatalogEntry[] = [];
    const seenIds = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < rawRollingStock.length; i++) {
      const parseResult = RollingStockSpecCatalogEntrySchema.safeParse(rawRollingStock[i]);
      if (!parseResult.success) {
        errors.push(`Rolling stock spec at index ${i} failed schema validation: ${parseResult.error.message}`);
        continue;
      }
      const spec = parseResult.data;

      if (seenIds.has(spec.id)) {
        errors.push(`Duplicate rolling stock spec ID detected: ${spec.id}`);
      }

      seenIds.add(spec.id);
      validated.push(Object.freeze(spec));
    }

    if (errors.length > 0) {
      throw new CatalogIntegrityError(
        `Rolling stock catalog failed integrity validation with ${errors.length} error(s)`,
        'ROLLING_STOCK_SCHEMA_VIOLATION',
        errors
      );
    }

    return Object.freeze(validated);
  }

  /**
   * Initializes, caches, and indexes the entire world catalog.
   */
  public static initialize(): WorldCatalog {
    if (this.cachedCatalog) {
      return this.cachedCatalog;
    }

    const stations = this.loadStations();
    const segments = this.loadSegments(JAVA_TRACK_CORRIDOR_SEGMENTS as unknown[], stations);
    const rollingStock = this.loadRollingStock();
    this.validateGraphReachability(stations, segments);

    // Build indexing caches
    this.stationsById.clear();
    this.stationsByCode.clear();
    this.segmentsById.clear();
    this.adjacencyMap.clear();
    this.rollingStockById.clear();

    for (const s of stations) {
      this.stationsById.set(s.id, s);
      this.stationsByCode.set(s.code, s);
      this.adjacencyMap.set(s.id, []);
    }

    for (const seg of segments) {
      this.segmentsById.set(seg.id, seg);
      this.adjacencyMap.get(seg.originStationId)?.push(seg);
      this.adjacencyMap.get(seg.destinationStationId)?.push(seg);
    }

    for (const rs of rollingStock) {
      this.rollingStockById.set(rs.id, rs);
    }

    this.cachedCatalog = Object.freeze({
      stations,
      segments,
      rollingStock,
      bounds: JAVA_COORDINATE_BOUNDS,
    });

    return this.cachedCatalog;
  }

  // --- Fast O(1) Query Helpers ---

  public static getStationById(id: string): StationCatalogEntry | undefined {
    if (!this.cachedCatalog) this.initialize();
    return this.stationsById.get(id);
  }

  public static getStationByCode(code: string): StationCatalogEntry | undefined {
    if (!this.cachedCatalog) this.initialize();
    return this.stationsByCode.get(code.toUpperCase());
  }

  public static getSegmentById(id: string): TrackCorridorSegment | undefined {
    if (!this.cachedCatalog) this.initialize();
    return this.segmentsById.get(id);
  }

  public static getConnectedSegments(stationId: string): ReadonlyArray<TrackCorridorSegment> {
    if (!this.cachedCatalog) this.initialize();
    return Object.freeze(this.adjacencyMap.get(stationId) || []);
  }

  public static getAdjacentSegments(stationId: string): ReadonlyArray<TrackCorridorSegment> {
    return this.getConnectedSegments(stationId);
  }

  public static getSegmentBetween(stationIdA: string, stationIdB: string): TrackCorridorSegment | undefined {
    if (!this.cachedCatalog) this.initialize();
    const connected = this.adjacencyMap.get(stationIdA) || [];
    return connected.find(
      (s) =>
        (s.originStationId === stationIdA && s.destinationStationId === stationIdB) ||
        (s.originStationId === stationIdB && s.destinationStationId === stationIdA)
    );
  }

  public static getRollingStockSpecById(id: string): RollingStockSpecCatalogEntry | undefined {
    if (!this.cachedCatalog) this.initialize();
    return this.rollingStockById.get(id);
  }

  public static getRollingStockSpecsByCategory(
    category: RollingStockCategory
  ): ReadonlyArray<RollingStockSpecCatalogEntry> {
    if (!this.cachedCatalog) this.initialize();
    return Object.freeze(
      Array.from(this.rollingStockById.values()).filter((spec) => spec.category === category)
    );
  }

  public static getAllRollingStockSpecs(): ReadonlyArray<RollingStockSpecCatalogEntry> {
    const catalog = this.cachedCatalog ?? this.initialize();
    return catalog.rollingStock;
  }
}
