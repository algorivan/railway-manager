import { describe, expect, it } from 'vitest';
import { JAVA_STATION_CATALOG } from '@railway/game-data';
import { CompanyId, createBrandedId, RouteId, StationId } from '@railway/shared';
import { StationEntity } from '../src/entities/station.entity.js';
import {
  InvalidRouteDefinitionError,
  RouteEntity,
} from '../src/entities/route.entity.js';

describe('StationEntity and RouteEntity Operations', () => {
  describe('StationEntity', () => {
    it('creates StationEntity from catalog entry', () => {
      const gmrEntry = JAVA_STATION_CATALOG.find((s) => s.code === 'GMR')!;
      const station = StationEntity.fromCatalogEntry(gmrEntry);

      expect(station.id).toBe('STN_GMR_GAMBIR');
      expect(station.code).toBe('GMR');
      expect(station.platformCount).toBe(4);
      expect(station.maxTrainLengthMeters).toBe(400);
    });

    it('enforces platform length accommodation check', () => {
      const bdEntry = JAVA_STATION_CATALOG.find((s) => s.code === 'BD')!; // maxTrainLength = 350
      const station = StationEntity.fromCatalogEntry(bdEntry);

      expect(station.canAccommodateConsistLength(300)).toBe(true);
      expect(station.canAccommodateConsistLength(350)).toBe(true);
      expect(station.canAccommodateConsistLength(351)).toBe(false);

      expect(() => station.canAccommodateConsistLength(0)).toThrow(RangeError);
    });

    it('calculates base dwell time by platform tier', () => {
      // Minor station (1 platform) -> 2 min
      const minorStation = new StationEntity({
        ...JAVA_STATION_CATALOG[0]!,
        id: createBrandedId<StationId>('STN_MINOR'),
        platformCount: 1,
      });
      expect(minorStation.calculateBaseDwellTime()).toBe(2);

      // Intermediate station (4 platforms) -> 4 min
      const gmr = StationEntity.fromCatalogEntry(JAVA_STATION_CATALOG[0]!);
      expect(gmr.calculateBaseDwellTime()).toBe(4);

      // Major station (8 platforms) -> 8 min
      const smt = StationEntity.fromCatalogEntry(JAVA_STATION_CATALOG[3]!);
      expect(smt.calculateBaseDwellTime()).toBe(8);
    });

    it('calculates dynamic dwell time with overcrowding load factor penalty', () => {
      const gmr = StationEntity.fromCatalogEntry(JAVA_STATION_CATALOG[0]!); // base = 4 min

      // Normal load factor (LF <= 1.0)
      expect(gmr.calculateDwellTime(0.8)).toBe(4);
      expect(gmr.calculateDwellTime(1.0)).toBe(4);

      // Overcrowded (LF = 1.2): Phi = 1.5 * (1.2 - 1.0) = 0.3. Dwell = ceil(4 * 1.3) = 6 min
      expect(gmr.calculateDwellTime(1.2)).toBe(6);

      // Severely overcrowded (LF = 1.6): Phi = 0.75 + 3.0 * (1.6 - 1.5) = 1.05. Dwell = ceil(4 * 2.05) = 9 min
      expect(gmr.calculateDwellTime(1.6)).toBe(9);

      expect(() => gmr.calculateDwellTime(-0.1)).toThrow(RangeError);
    });
  });

  describe('RouteEntity', () => {
    const companyId = createBrandedId<CompanyId>('CMP_KAI_01');
    const routeId = createBrandedId<RouteId>('RT_GMR_BD');
    const gmrId = createBrandedId<StationId>('STN_GMR_GAMBIR');
    const bdId = createBrandedId<StationId>('STN_BD_BANDUNG');

    it('creates route and manages concession lifecycle', () => {
      const route = new RouteEntity({
        id: routeId,
        companyId,
        code: 'PARAHYANGAN-01',
        name: 'Argo Parahyangan Corridor',
        originStationId: gmrId,
        destinationStationId: bdId,
        stationSequence: [gmrId, bdId],
        distanceKm: 160.0,
      });

      // Initial state is LOCKED
      expect(route.accessStatus).toBe('LOCKED');
      expect(route.isOperational()).toBe(false);

      // Concession permit granted
      route.grantPermit();
      expect(route.accessStatus).toBe('PERMIT_GRANTED');
      expect(route.isOperational()).toBe(true);

      // Concession suspended (insolvency or regulatory breach)
      route.suspend('Insolvency threshold breached');
      expect(route.accessStatus).toBe('SUSPENDED');
      expect(route.isOperational()).toBe(false);

      // Concession reinstated
      route.reinstate();
      expect(route.accessStatus).toBe('PERMIT_GRANTED');
      expect(route.isOperational()).toBe(true);
    });

    it('rejects invalid route sequence definitions', () => {
      // Sequence less than 2 stations
      expect(
        () =>
          new RouteEntity({
            id: routeId,
            companyId,
            code: 'RT1',
            name: 'Short Route',
            originStationId: gmrId,
            destinationStationId: gmrId,
            stationSequence: [gmrId],
            distanceKm: 10,
          })
      ).toThrow(InvalidRouteDefinitionError);

      // First station does not match origin
      expect(
        () =>
          new RouteEntity({
            id: routeId,
            companyId,
            code: 'RT1',
            name: 'Mismatch Origin',
            originStationId: gmrId,
            destinationStationId: bdId,
            stationSequence: [bdId, gmrId],
            distanceKm: 160,
          })
      ).toThrow(InvalidRouteDefinitionError);

      // Last station does not match destination
      expect(
        () =>
          new RouteEntity({
            id: routeId,
            companyId,
            code: 'RT1',
            name: 'Mismatch Destination',
            originStationId: gmrId,
            destinationStationId: bdId,
            stationSequence: [gmrId, gmrId],
            distanceKm: 160,
          })
      ).toThrow(InvalidRouteDefinitionError);
    });

    it('estimates segment transit runtime with acceleration/deceleration allowances', () => {
      // 160 km at 100 km/h: 1.6 hours = 96 min + 2 min margin = 98 min
      const passengerRuntime = RouteEntity.estimateSegmentRuntime(160, 100, false);
      expect(passengerRuntime).toBe(98);

      // Freight with 4 min margin: 96 min + 4 min = 100 min
      const freightRuntime = RouteEntity.estimateSegmentRuntime(160, 100, true);
      expect(freightRuntime).toBe(100);

      expect(() => RouteEntity.estimateSegmentRuntime(0, 100)).toThrow(RangeError);
      expect(() => RouteEntity.estimateSegmentRuntime(100, 0)).toThrow(RangeError);
    });
  });
});
