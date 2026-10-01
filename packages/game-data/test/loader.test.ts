import { beforeEach, describe, expect, it } from 'vitest';
import {
  CatalogIntegrityError,
  WorldDataCatalogLoader,
} from '../src/loader/catalog-loader.js';
import { JAVA_STATION_CATALOG } from '../src/catalog/stations.js';
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from '../src/catalog/tracks.js';

describe('WorldDataCatalogLoader', () => {
  beforeEach(() => {
    WorldDataCatalogLoader.reset();
  });

  it('initializes and caches the authoritative world catalog without error', () => {
    const catalog = WorldDataCatalogLoader.initialize();
    expect(catalog).toBeDefined();
    expect(catalog.stations.length).toBe(7);
    expect(catalog.segments.length).toBe(9);

    // Repeated call returns cached catalog
    const catalog2 = WorldDataCatalogLoader.initialize();
    expect(catalog2).toBe(catalog);
  });

  it('provides O(1) station lookups by ID and by Code', () => {
    const gambirById = WorldDataCatalogLoader.getStationById('STN_GMR_GAMBIR');
    expect(gambirById).toBeDefined();
    expect(gambirById!.code).toBe('GMR');

    const bandungByCode = WorldDataCatalogLoader.getStationByCode('bd'); // Case-insensitive
    expect(bandungByCode).toBeDefined();
    expect(bandungByCode!.id).toBe('STN_BD_BANDUNG');

    expect(WorldDataCatalogLoader.getStationById('NON_EXISTENT')).toBeUndefined();
    expect(WorldDataCatalogLoader.getStationByCode('XYZ')).toBeUndefined();
  });

  it('provides O(1) segment lookups by ID, adjacent stations, and station pairs', () => {
    const segment = WorldDataCatalogLoader.getSegmentById('SEG_GMR_BD');
    expect(segment).toBeDefined();
    expect(segment!.distanceKm).toBe(160.0);

    // Bidirectional query between Gambir and Bandung
    const segBetween1 = WorldDataCatalogLoader.getSegmentBetween('STN_GMR_GAMBIR', 'STN_BD_BANDUNG');
    const segBetween2 = WorldDataCatalogLoader.getSegmentBetween('STN_BD_BANDUNG', 'STN_GMR_GAMBIR');
    expect(segBetween1).toBeDefined();
    expect(segBetween2).toBeDefined();
    expect(segBetween1!.id).toBe('SEG_GMR_BD');
    expect(segBetween2!.id).toBe('SEG_GMR_BD');

    // Connected segments from Gambir: Gambir-Bandung, Gambir-Cirebon
    const gmrSegments = WorldDataCatalogLoader.getConnectedSegments('STN_GMR_GAMBIR');
    expect(gmrSegments.length).toBe(2);
    const ids = gmrSegments.map((s) => s.id);
    expect(ids).toContain('SEG_GMR_BD');
    expect(ids).toContain('SEG_GMR_CN');

    // Adjacent helper alias
    const adj = WorldDataCatalogLoader.getAdjacentSegments('STN_GMR_GAMBIR');
    expect(adj.length).toBe(2);
  });

  it('confirms the entire 7-station network is fully connected (no partitioned graph)', () => {
    expect(() => {
      WorldDataCatalogLoader.validateGraphReachability(
        JAVA_STATION_CATALOG,
        JAVA_TRACK_CORRIDOR_SEGMENTS
      );
    }).not.toThrow();
  });

  it('detects duplicate station IDs and throws CatalogIntegrityError', () => {
    const duplicate = [
      JAVA_STATION_CATALOG[0]!,
      JAVA_STATION_CATALOG[0]!, // duplicate
    ];

    expect(() => WorldDataCatalogLoader.loadStations(duplicate)).toThrow(CatalogIntegrityError);
  });

  it('detects missing foreign keys in track segments', () => {
    const badSegments = [
      {
        id: 'SEG_GMR_XYZ',
        name: 'Bad Segment',
        originStationId: 'STN_GMR_GAMBIR',
        destinationStationId: 'STN_XYZ_GHOST', // Does not exist
        distanceKm: 100,
        maxSpeedKmh: 100,
        isElectrified: false,
        isDoubleTrack: false,
        trackGaugeMm: 1067,
        provenance: {
          source: 'Test',
          sourceDate: '2026-01-15',
          verified: true,
        },
      },
    ];

    expect(() =>
      WorldDataCatalogLoader.loadSegments(badSegments, JAVA_STATION_CATALOG)
    ).toThrow(CatalogIntegrityError);
  });

  it('detects duplicate undirected corridor segments between the same station pair', () => {
    const duplicatePairs = [
      JAVA_TRACK_CORRIDOR_SEGMENTS[0]!, // GMR -> BD
      {
        ...JAVA_TRACK_CORRIDOR_SEGMENTS[0]!,
        id: 'SEG_BD_GMR_REV',
        originStationId: 'STN_BD_BANDUNG',
        destinationStationId: 'STN_GMR_GAMBIR', // Reversed endpoints
      },
    ];

    expect(() =>
      WorldDataCatalogLoader.loadSegments(duplicatePairs, JAVA_STATION_CATALOG)
    ).toThrow(CatalogIntegrityError);
  });

  it('detects partitioned network graphs and lists unreachable nodes', () => {
    // Only connect GMR and BD; remaining 5 stations disconnected
    const partitionedSegments = [JAVA_TRACK_CORRIDOR_SEGMENTS[0]!];

    expect(() => {
      WorldDataCatalogLoader.validateGraphReachability(
        JAVA_STATION_CATALOG,
        partitionedSegments
      );
    }).toThrow(CatalogIntegrityError);
  });
});
