import { describe, expect, it } from 'vitest';
import {
  CompanyId,
  createBrandedId,
  DepotId,
  RouteId,
  StationId,
  UnitId,
} from '@railway/shared';
import {
  DepotCapacityExceededError,
  DepotCapabilityError,
  DepotEntity,
} from '../src/entities/depot.entity.js';
import {
  calculateEffectiveSpeed,
  InvalidSpeedConstraintError,
} from '../src/calculators/speed.js';
import {
  InvalidRouteDefinitionError,
  RouteEntity,
} from '../src/entities/route.entity.js';

describe('Adversarial Stress Testing — Domain Entities & Calculators', () => {
  const dummyDepotId = createBrandedId<DepotId>('DEP_GMR_01');
  const dummyCompanyId = createBrandedId<CompanyId>('CMP_KAI_01');
  const dummyStationId = createBrandedId<StationId>('STN_GMR_GAMBIR');

  describe('1. Depot Capacity Constraints & Maintenance Queue Stress', () => {
    it('enforces exact stabling capacity bounds and rejects overflow on Tier 1 (fleet_capacity = 6)', () => {
      const depot = DepotEntity.createFromTier(
        dummyDepotId,
        dummyCompanyId,
        'Gambir Stabling Yard',
        dummyStationId,
        1
      );

      expect(depot.fleetCapacity).toBe(6);
      expect(depot.stablingOccupancy).toBe(0);

      // Stable up to exact capacity
      expect(depot.canStable(6)).toBe(true);
      depot.assignStabling(6);
      expect(depot.stablingOccupancy).toBe(6);
      expect(depot.canStable(0)).toBe(true);
      expect(depot.canStable(1)).toBe(false);

      // Attempt 1-unit overflow -> must throw DepotCapacityExceededError
      expect(() => depot.assignStabling(1)).toThrow(DepotCapacityExceededError);
      expect(depot.stablingOccupancy).toBe(6);

      // Release partial
      depot.releaseStabling(2);
      expect(depot.stablingOccupancy).toBe(4);
      expect(depot.canStable(2)).toBe(true);
      expect(depot.canStable(3)).toBe(false);

      // Attempt over-release -> must throw DepotCapacityExceededError
      expect(() => depot.releaseStabling(5)).toThrow(DepotCapacityExceededError);

      // Negative inputs must throw RangeError
      expect(() => depot.canStable(-1)).toThrow(RangeError);
      expect(() => depot.assignStabling(-1)).toThrow(RangeError);
      expect(() => depot.releaseStabling(-1)).toThrow(RangeError);
    });

    it('enforces exact stabling capacity on Tier 2 (16) and Tier 3 (40)', () => {
      const depot2 = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'D2', dummyStationId, 2);
      expect(depot2.fleetCapacity).toBe(16);
      depot2.assignStabling(16);
      expect(() => depot2.assignStabling(1)).toThrow(DepotCapacityExceededError);

      const depot3 = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'D3', dummyStationId, 3);
      expect(depot3.fleetCapacity).toBe(40);
      depot3.assignStabling(40);
      expect(() => depot3.assignStabling(1)).toThrow(DepotCapacityExceededError);
    });

    it('transitions maintenance overflow into FIFO queue and drains correctly', () => {
      // Tier 1 has 1 maintenance slot
      const depot = DepotEntity.createFromTier(
        dummyDepotId,
        dummyCompanyId,
        'Yk Workshop',
        dummyStationId,
        1
      );
      expect(depot.maintenanceSlots).toBe(1);
      expect(depot.activeMaintenanceCount).toBe(0);

      const unitA = createBrandedId<UnitId>('UNT_CC206_01');
      const unitB = createBrandedId<UnitId>('UNT_CC206_02');
      const unitC = createBrandedId<UnitId>('UNT_CC206_03');

      // 1st unit occupies the active slot
      const resA = depot.requestMaintenance(unitA, 'LEVEL_1_DAILY');
      expect(resA.status).toBe('IN_PROGRESS');
      expect(depot.activeMaintenanceCount).toBe(1);
      expect(depot.maintenanceQueue.length).toBe(0);

      // 2nd unit enters FIFO queue
      const resB = depot.requestMaintenance(unitB, 'LEVEL_1_DAILY');
      expect(resB.status).toBe('QUEUED');
      expect(depot.activeMaintenanceCount).toBe(1);
      expect(depot.maintenanceQueue.length).toBe(1);
      expect(depot.maintenanceQueue[0]).toBe(unitB);

      // 3rd unit enters FIFO queue
      const resC = depot.requestMaintenance(unitC, 'LEVEL_1_DAILY');
      expect(resC.status).toBe('QUEUED');
      expect(depot.activeMaintenanceCount).toBe(1);
      expect(depot.maintenanceQueue.length).toBe(2);
      expect(depot.maintenanceQueue[1]).toBe(unitC);

      // Complete 1st unit: unitB should be dequeued and admitted
      const admitted1 = depot.completeMaintenance();
      expect(admitted1).toBe(unitB);
      expect(depot.activeMaintenanceCount).toBe(1);
      expect(depot.maintenanceQueue.length).toBe(1);
      expect(depot.maintenanceQueue[0]).toBe(unitC);

      // Complete 2nd unit: unitC should be dequeued and admitted
      const admitted2 = depot.completeMaintenance();
      expect(admitted2).toBe(unitC);
      expect(depot.activeMaintenanceCount).toBe(1);
      expect(depot.maintenanceQueue.length).toBe(0);

      // Complete 3rd unit: queue is empty, active count drops to 0
      const admitted3 = depot.completeMaintenance();
      expect(admitted3).toBeNull();
      expect(depot.activeMaintenanceCount).toBe(0);
      expect(depot.maintenanceQueue.length).toBe(0);

      // Extraneous completion call on empty depot is safe
      const admitted4 = depot.completeMaintenance();
      expect(admitted4).toBeNull();
      expect(depot.activeMaintenanceCount).toBe(0);
    });

    it('enforces tier capability gating and rejects unsupported maintenance levels', () => {
      const depotT1 = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'T1', dummyStationId, 1);
      const unit = createBrandedId<UnitId>('UNT_01');

      // T1 can do Level 1
      expect(depotT1.supportsMaintenanceLevel('LEVEL_1_DAILY')).toBe(true);
      expect(depotT1.requestMaintenance(unit, 'LEVEL_1_DAILY').status).toBe('IN_PROGRESS');

      // T1 cannot do Level 2 Periodic or Level 3 Overhaul
      expect(depotT1.supportsMaintenanceLevel('LEVEL_2_PERIODIC')).toBe(false);
      expect(() => depotT1.requestMaintenance(unit, 'LEVEL_2_PERIODIC')).toThrow(DepotCapabilityError);
      expect(depotT1.supportsMaintenanceLevel('LEVEL_3_OVERHAUL')).toBe(false);
      expect(() => depotT1.requestMaintenance(unit, 'LEVEL_3_OVERHAUL')).toThrow(DepotCapabilityError);

      // T2 can do Level 1 and Level 2, but not Level 3
      const depotT2 = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'T2', dummyStationId, 2);
      expect(depotT2.supportsMaintenanceLevel('LEVEL_1_DAILY')).toBe(true);
      expect(depotT2.supportsMaintenanceLevel('LEVEL_2_PERIODIC')).toBe(true);
      expect(depotT2.supportsMaintenanceLevel('LEVEL_3_OVERHAUL')).toBe(false);
      expect(() => depotT2.requestMaintenance(unit, 'LEVEL_3_OVERHAUL')).toThrow(DepotCapabilityError);

      // T3 can do all levels
      const depotT3 = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'T3', dummyStationId, 3);
      expect(depotT3.supportsMaintenanceLevel('LEVEL_1_DAILY')).toBe(true);
      expect(depotT3.supportsMaintenanceLevel('LEVEL_2_PERIODIC')).toBe(true);
      expect(depotT3.supportsMaintenanceLevel('LEVEL_3_OVERHAUL')).toBe(true);
    });

    it('handles depot upgrades and rejects invalid tier transitions', () => {
      const depot = DepotEntity.createFromTier(dummyDepotId, dummyCompanyId, 'T1', dummyStationId, 1);
      expect(depot.tier).toBe(1);
      expect(depot.fleetCapacity).toBe(6);

      // Upgrade T1 -> T2
      depot.upgradeTier(2);
      expect(depot.tier).toBe(2);
      expect(depot.fleetCapacity).toBe(16);
      expect(depot.maintenanceSlots).toBe(3);
      expect(depot.maintenanceLevelCapability).toBe('LEVEL_2_PERIODIC');

      // Upgrade T2 -> T3
      depot.upgradeTier(3);
      expect(depot.tier).toBe(3);
      expect(depot.fleetCapacity).toBe(40);
      expect(depot.maintenanceSlots).toBe(8);
      expect(depot.maintenanceLevelCapability).toBe('LEVEL_3_OVERHAUL');

      // Reject downgrade or same tier
      expect(() => depot.upgradeTier(2)).toThrow(RangeError);
      expect(() => depot.upgradeTier(3)).toThrow(RangeError);
    });
  });

  describe('2. Speed Calculator Stress Testing & Edge Cases', () => {
    it('resolves V_eff = 0 when V_restriction = 0', () => {
      const vEff = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 100,
        trackLimitKmh: 90,
        operationalRestrictionKmh: 0,
      });
      expect(vEff).toBe(0);

      // Via temporarySpeedRestriction alias
      const vEffTsr = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 100,
        trackLimitKmh: 90,
        temporarySpeedRestriction: 0,
      });
      expect(vEffTsr).toBe(0);
    });

    it('governs by track limit when V_restriction > track limit', () => {
      const vEff = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 100,
        trackLimitKmh: 80,
        operationalRestrictionKmh: 110, // Higher than track limit
      });
      expect(vEff).toBe(80);
    });

    it('handles undefined V_restriction by defaulting to track/consist/train minimum', () => {
      const vEff = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 95,
        trackLimitKmh: 110,
        operationalRestrictionKmh: undefined,
      });
      expect(vEff).toBe(95);

      const vEffOmitted = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 100,
        trackLimitKmh: 85,
      });
      expect(vEffOmitted).toBe(85);
    });

    it('correctly handles floating point speeds by integer flooring', () => {
      const vEff = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120.75,
        consistLimitKmh: 100.25,
        trackLimitKmh: 89.9,
        operationalRestrictionKmh: 85.8,
      });
      expect(vEff).toBe(85); // Math.floor(85.8) = 85

      const vEff2 = calculateEffectiveSpeed({
        trainMaxSpeedKmh: 120.9,
        consistLimitKmh: 75.9,
        trackLimitKmh: 80.0,
      });
      expect(vEff2).toBe(75);
    });

    it('rejects negative, non-finite, and NaN speed constraints', () => {
      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: -10,
          consistLimitKmh: 100,
          trackLimitKmh: 90,
        })
      ).toThrow(InvalidSpeedConstraintError);

      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: 120,
          consistLimitKmh: -5,
          trackLimitKmh: 90,
        })
      ).toThrow(InvalidSpeedConstraintError);

      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: 120,
          consistLimitKmh: 100,
          trackLimitKmh: -1,
        })
      ).toThrow(InvalidSpeedConstraintError);

      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: 120,
          consistLimitKmh: 100,
          trackLimitKmh: 90,
          operationalRestrictionKmh: -1,
        })
      ).toThrow(InvalidSpeedConstraintError);

      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: NaN,
          consistLimitKmh: 100,
          trackLimitKmh: 90,
        })
      ).toThrow(InvalidSpeedConstraintError);

      expect(() =>
        calculateEffectiveSpeed({
          trainMaxSpeedKmh: 120,
          consistLimitKmh: Infinity, // Consist limit must be finite number
          trackLimitKmh: 90,
        })
      ).toThrow(InvalidSpeedConstraintError);
    });
  });

  describe('3. Route Concession Lifecycle & Runtime Estimation', () => {
    const originStn = createBrandedId<StationId>('STN_GMR_GAMBIR');
    const intermediateStn = createBrandedId<StationId>('STN_CN_CIREBON');
    const destinationStn = createBrandedId<StationId>('STN_BD_BANDUNG');
    const routeId = createBrandedId<RouteId>('RTE_GMR_BD_01');

    it('enforces concession state machine transitions: LOCKED -> PERMIT_GRANTED -> SUSPENDED -> PERMIT_GRANTED', () => {
      const route = new RouteEntity({
        id: routeId,
        companyId: dummyCompanyId,
        code: 'PARAHYANGAN',
        name: 'Argo Parahyangan Express',
        originStationId: originStn,
        destinationStationId: destinationStn,
        stationSequence: [originStn, destinationStn],
        distanceKm: 160.0,
      });

      // Default state: LOCKED
      expect(route.accessStatus).toBe('LOCKED');
      expect(route.isOperational()).toBe(false);

      // Grant permit
      route.grantPermit();
      expect(route.accessStatus).toBe('PERMIT_GRANTED');
      expect(route.isOperational()).toBe(true);

      // Suspend
      route.suspend('Insolvency default');
      expect(route.accessStatus).toBe('SUSPENDED');
      expect(route.isOperational()).toBe(false);

      // Reinstate
      route.reinstate();
      expect(route.accessStatus).toBe('PERMIT_GRANTED');
      expect(route.isOperational()).toBe(true);
    });

    it('enforces station sequence validation invariants', () => {
      // Sequence < 2 stations
      expect(() => {
        new RouteEntity({
          id: routeId,
          companyId: dummyCompanyId,
          code: 'BAD_SEQ_1',
          name: 'Single Station Route',
          originStationId: originStn,
          destinationStationId: destinationStn,
          stationSequence: [originStn],
          distanceKm: 160.0,
        });
      }).toThrow(InvalidRouteDefinitionError);

      // Sequence[0] does not match originStationId
      expect(() => {
        new RouteEntity({
          id: routeId,
          companyId: dummyCompanyId,
          code: 'BAD_SEQ_2',
          name: 'Origin Mismatch Route',
          originStationId: originStn,
          destinationStationId: destinationStn,
          stationSequence: [intermediateStn, destinationStn],
          distanceKm: 160.0,
        });
      }).toThrow(InvalidRouteDefinitionError);

      // Sequence[last] does not match destinationStationId
      expect(() => {
        new RouteEntity({
          id: routeId,
          companyId: dummyCompanyId,
          code: 'BAD_SEQ_3',
          name: 'Destination Mismatch Route',
          originStationId: originStn,
          destinationStationId: destinationStn,
          stationSequence: [originStn, intermediateStn],
          distanceKm: 160.0,
        });
      }).toThrow(InvalidRouteDefinitionError);
    });

    it('estimates segment runtime with exact acceleration margins for passenger and freight', () => {
      // D = 160 km, V = 100 km/h -> hours = 1.6 -> running = 96 min
      // Passenger margin = 2.0 min -> 98.0 -> ceil = 98 min
      const passengerRuntime = RouteEntity.estimateSegmentRuntime(160.0, 100, false);
      expect(passengerRuntime).toBe(98);

      // Freight margin = 4.0 min -> 100.0 -> ceil = 100 min
      const freightRuntime = RouteEntity.estimateSegmentRuntime(160.0, 100, true);
      expect(freightRuntime).toBe(100);

      // Non-integer division ceiling check: D = 60 km, V = 90 km/h -> hours = 0.6666... -> 40 min + 2 = 42 min
      expect(RouteEntity.estimateSegmentRuntime(60.0, 90, false)).toBe(42);

      // Rejects non-positive speed or distance
      expect(() => RouteEntity.estimateSegmentRuntime(160, 0)).toThrow(RangeError);
      expect(() => RouteEntity.estimateSegmentRuntime(160, -50)).toThrow(RangeError);
      expect(() => RouteEntity.estimateSegmentRuntime(0, 100)).toThrow(RangeError);
      expect(() => RouteEntity.estimateSegmentRuntime(-10, 100)).toThrow(RangeError);
    });
  });
});
