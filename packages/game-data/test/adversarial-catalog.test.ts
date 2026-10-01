import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  CatalogIntegrityError,
  WorldDataCatalogLoader,
} from '../src/loader/catalog-loader.js';
import { JAVA_STATION_CATALOG } from '../src/catalog/stations.js';
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from '../src/catalog/tracks.js';
import { StationCatalogEntry, StationCatalogEntrySchema } from '../src/schemas/station.schema.js';
import { TrackCorridorSegmentSchema } from '../src/schemas/track.schema.js';
import { isWithinJavaBounds } from '../src/schemas/bounds.schema.js';

describe('Adversarial Stress Testing — World Data Catalog', () => {
  beforeEach(() => {
    WorldDataCatalogLoader.reset();
  });

  describe('1. Graph Connectivity & All-Pairs Pathfinding', () => {
    it('verifies deterministic pathfinding between all 42 ordered pairs of Java stations', () => {
      const catalog = WorldDataCatalogLoader.initialize();
      const stations = catalog.stations;
      expect(stations.length).toBe(7);

      // Construct adjacency graph with weights
      interface Edge {
        to: string;
        segmentId: string;
        distanceKm: number;
      }
      const adj = new Map<string, Edge[]>();
      for (const s of stations) {
        adj.set(s.id, []);
      }
      for (const seg of catalog.segments) {
        adj.get(seg.originStationId)!.push({
          to: seg.destinationStationId,
          segmentId: seg.id,
          distanceKm: seg.distanceKm,
        });
        adj.get(seg.destinationStationId)!.push({
          to: seg.originStationId,
          segmentId: seg.id,
          distanceKm: seg.distanceKm,
        });
      }

      // Dijkstra shortest path solver
      function findShortestPath(startId: string, endId: string) {
        const distances = new Map<string, number>();
        const previous = new Map<string, { node: string; segmentId: string } | null>();
        const unvisited = new Set<string>();

        for (const s of stations) {
          distances.set(s.id, Infinity);
          previous.set(s.id, null);
          unvisited.add(s.id);
        }
        distances.set(startId, 0);

        while (unvisited.size > 0) {
          let current: string | null = null;
          let minDistance = Infinity;
          for (const node of unvisited) {
            const d = distances.get(node)!;
            if (d < minDistance) {
              minDistance = d;
              current = node;
            }
          }

          if (current === null || minDistance === Infinity) break;
          if (current === endId) break;

          unvisited.delete(current);
          const neighbors = adj.get(current) || [];
          for (const edge of neighbors) {
            if (!unvisited.has(edge.to)) continue;
            const newDist = distances.get(current)! + edge.distanceKm;
            if (newDist < distances.get(edge.to)!) {
              distances.set(edge.to, newDist);
              previous.set(edge.to, { node: current, segmentId: edge.segmentId });
            }
          }
        }

        // Reconstruct path
        const path: string[] = [];
        const segmentSequence: string[] = [];
        let curr: string | null = endId;

        while (curr) {
          path.unshift(curr);
          const prev = previous.get(curr);
          if (prev) {
            segmentSequence.unshift(prev.segmentId);
            curr = prev.node;
          } else {
            curr = null;
          }
        }

        return {
          reachable: distances.get(endId)! < Infinity,
          distanceKm: distances.get(endId)!,
          path,
          segmentSequence,
        };
      }

      let testedPairsCount = 0;
      for (const origin of stations) {
        for (const destination of stations) {
          if (origin.id === destination.id) continue;

          const result = findShortestPath(origin.id, destination.id);
          expect(result.reachable).toBe(true);
          expect(result.distanceKm).toBeGreaterThan(0);
          expect(result.path.length).toBeGreaterThanOrEqual(2);
          expect(result.path[0]).toBe(origin.id);
          expect(result.path[result.path.length - 1]).toBe(destination.id);
          expect(result.segmentSequence.length).toBe(result.path.length - 1);

          testedPairsCount++;
        }
      }

      expect(testedPairsCount).toBe(42); // 7 * 6 = 42 ordered pairs
    });
  });

  describe('2. Malformed Catalog Inputs & Negative Invariants', () => {
    it('rejects duplicate station IDs with CatalogIntegrityError', () => {
      const duplicateStations = [
        ...JAVA_STATION_CATALOG,
        {
          ...JAVA_STATION_CATALOG[0]!,
          code: 'GMR2', // different code, duplicate ID
        },
      ];

      expect(() => WorldDataCatalogLoader.loadStations(duplicateStations)).toThrow(CatalogIntegrityError);
      try {
        WorldDataCatalogLoader.loadStations(duplicateStations);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(CatalogIntegrityError);
        const catErr = err as CatalogIntegrityError;
        expect(catErr.code).toBe('STATION_CATALOG_INVALID');
        expect(catErr.details.some((d) => d.includes('Duplicate station ID'))).toBe(true);
      }
    });

    it('rejects duplicate station codes with CatalogIntegrityError', () => {
      const duplicateCodes = [
        ...JAVA_STATION_CATALOG,
        {
          ...JAVA_STATION_CATALOG[1]!,
          id: 'STN_BD_DUP', // different id, duplicate code 'BD'
        },
      ];

      expect(() => WorldDataCatalogLoader.loadStations(duplicateCodes)).toThrow(CatalogIntegrityError);
      try {
        WorldDataCatalogLoader.loadStations(duplicateCodes);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(CatalogIntegrityError);
        const catErr = err as CatalogIntegrityError;
        expect(catErr.details.some((d) => d.includes('Duplicate station code'))).toBe(true);
      }
    });

    it('rejects coordinates outside Java bounds [-9.0..-5.5, 105.0..115.0]', () => {
      // Station located in North Sumatra (lat: 3.5952, lng: 98.6722) - inside Indonesia, but OUTSIDE Java bounds
      const outOfJavaStation: StationCatalogEntry = {
        ...JAVA_STATION_CATALOG[0]!,
        id: 'STN_MDN_MEDAN',
        code: 'MDN',
        name: 'Stasiun Medan',
        coordinates: {
          lat: 3.5952,
          lng: 98.6722,
        },
      };

      expect(isWithinJavaBounds(outOfJavaStation.coordinates)).toBe(false);

      expect(() =>
        WorldDataCatalogLoader.loadStations([...JAVA_STATION_CATALOG, outOfJavaStation])
      ).toThrow(CatalogIntegrityError);

      try {
        WorldDataCatalogLoader.loadStations([...JAVA_STATION_CATALOG, outOfJavaStation]);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(CatalogIntegrityError);
        const catErr = err as CatalogIntegrityError;
        expect(catErr.details.some((d) => d.includes('fall outside Java bounds'))).toBe(true);
      }
    });

    it('rejects station coordinates outside national territory via ZodError', () => {
      const invalidLatStation = {
        ...JAVA_STATION_CATALOG[0]!,
        coordinates: { lat: 45.0, lng: 106.8 }, // Lat 45 is in Europe
      };

      expect(() => StationCatalogEntrySchema.parse(invalidLatStation)).toThrow(ZodError);
    });

    it('rejects negative and zero distances in track corridor segments', () => {
      const negativeDistSegment = {
        id: 'SEG_TEST_NEG',
        name: 'Negative Corridor',
        originStationId: 'STN_GMR_GAMBIR',
        destinationStationId: 'STN_BD_BANDUNG',
        distanceKm: -160.0,
        maxSpeedKmh: 100,
        isElectrified: false,
        isDoubleTrack: false,
        provenance: {
          source: 'Test',
          sourceDate: '2026-01-15',
          verified: true,
        },
      };

      // Direct schema rejection
      expect(() => TrackCorridorSegmentSchema.parse(negativeDistSegment)).toThrow(ZodError);

      // Loader rejection
      expect(() =>
        WorldDataCatalogLoader.loadSegments([negativeDistSegment], JAVA_STATION_CATALOG)
      ).toThrow(CatalogIntegrityError);

      const zeroDistSegment = {
        ...negativeDistSegment,
        distanceKm: 0,
      };
      expect(() => TrackCorridorSegmentSchema.parse(zeroDistSegment)).toThrow(ZodError);
    });

    it('rejects self-loops where originStationId equals destinationStationId', () => {
      const selfLoopSegment = {
        id: 'SEG_GMR_GMR',
        name: 'Gambir Loop',
        originStationId: 'STN_GMR_GAMBIR',
        destinationStationId: 'STN_GMR_GAMBIR',
        distanceKm: 10.0,
        maxSpeedKmh: 60,
        isElectrified: true,
        isDoubleTrack: true,
        provenance: {
          source: 'Test',
          sourceDate: '2026-01-15',
          verified: true,
        },
      };

      // Schema refinement rejection
      expect(() => TrackCorridorSegmentSchema.parse(selfLoopSegment)).toThrow(ZodError);

      // Loader rejection
      expect(() =>
        WorldDataCatalogLoader.loadSegments([selfLoopSegment], JAVA_STATION_CATALOG)
      ).toThrow(CatalogIntegrityError);
    });

    it('rejects disconnected stations causing a partitioned network graph', () => {
      // Add an 8th station with no connected track corridor
      const isolatedStation: StationCatalogEntry = {
        id: 'STN_MLG_MALANG',
        code: 'MLG',
        name: 'Stasiun Malang Kotabaru',
        region: 'DAOP_8_SURABAYA',
        coordinates: {
          lat: -7.9772,
          lng: 112.6378,
        },
        platformCount: 5,
        maxTrainLengthMeters: 350,
        facilities: {
          hasCargoTerminal: false,
          hasDepotConnection: true,
          hasExecutiveLounge: true,
        },
        demandProfile: {
          baseDailyDemand: 12000,
          commuterShare: 0.2,
          businessShare: 0.3,
          touristShare: 0.5,
        },
        provenance: {
          source: 'Test',
          sourceDate: '2026-01-15',
          verified: true,
        },
      };

      const augmentedStations = [...JAVA_STATION_CATALOG, isolatedStation];

      expect(() => {
        WorldDataCatalogLoader.validateGraphReachability(
          augmentedStations,
          JAVA_TRACK_CORRIDOR_SEGMENTS
        );
      }).toThrow(CatalogIntegrityError);

      try {
        WorldDataCatalogLoader.validateGraphReachability(
          augmentedStations,
          JAVA_TRACK_CORRIDOR_SEGMENTS
        );
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(CatalogIntegrityError);
        const catErr = err as CatalogIntegrityError;
        expect(catErr.code).toBe('GRAPH_PARTITIONED');
        expect(catErr.details).toContain('STN_MLG_MALANG');
      }
    });
  });

  describe('3. Query Speed Benchmark (100,000 lookups)', () => {
    it('executes 100,000 O(1) catalog indexing queries under 1,000ms', () => {
      WorldDataCatalogLoader.initialize();

      const lookupKeys = [
        'STN_GMR_GAMBIR',
        'STN_BD_BANDUNG',
        'STN_CN_CIREBON',
        'STN_SMT_SEMARANGTAWANG',
        'STN_YK_YOGYAKARTA',
        'STN_SLO_SOLOBALAPAN',
        'STN_SGU_SURABAYAGUBENG',
      ];
      const codes = ['GMR', 'BD', 'CN', 'SMT', 'YK', 'SLO', 'SGU'];
      const segmentIds = [
        'SEG_GMR_BD',
        'SEG_GMR_CN',
        'SEG_CN_SMT',
        'SEG_SMT_SGU',
        'SEG_CN_YK',
        'SEG_BD_YK',
        'SEG_YK_SLO',
        'SEG_SLO_SGU',
        'SEG_SMT_SLO',
      ];

      const iterations = 100_000;
      let foundCount = 0;
      const t0 = performance.now();

      for (let i = 0; i < iterations; i++) {
        const mod = i % 7;
        const segMod = i % 9;

        // 1. Station by ID (O(1))
        const sById = WorldDataCatalogLoader.getStationById(lookupKeys[mod]!);
        if (sById) foundCount++;

        // 2. Station by Code (O(1))
        const sByCode = WorldDataCatalogLoader.getStationByCode(codes[mod]!);
        if (sByCode) foundCount++;

        // 3. Segment by ID (O(1))
        const seg = WorldDataCatalogLoader.getSegmentById(segmentIds[segMod]!);
        if (seg) foundCount++;
      }

      const elapsedMs = performance.now() - t0;
      const totalOps = iterations * 3; // 300,000 lookups total
      const opsPerSec = (totalOps / (elapsedMs / 1000));
      const avgLatencyMicros = (elapsedMs * 1000) / totalOps;

      console.log(`\n--- BENCHMARK RESULTS ---`);
      console.log(`Total operations: ${totalOps.toLocaleString()}`);
      console.log(`Elapsed time: ${elapsedMs.toFixed(2)} ms`);
      console.log(`Throughput: ${Math.round(opsPerSec).toLocaleString()} ops/sec`);
      console.log(`Average latency: ${avgLatencyMicros.toFixed(4)} µs/op`);
      console.log(`-------------------------\n`);

      expect(foundCount).toBe(totalOps);
      expect(elapsedMs).toBeLessThan(1000); // 300,000 O(1) lookups must complete well under 1 second
    });
  });
});
