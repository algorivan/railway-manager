import { describe, expect, it } from 'vitest';
import {
  CompanyId,
  createBrandedId,
  DepotId,
  StationId,
  UnitId,
} from '@railway/shared';
import {
  DepotCapacityExceededError,
  DepotCapabilityError,
  DepotEntity,
  DEPOT_TIER_CONFIGS,
} from '../src/entities/depot.entity.js';

describe('DepotEntity & Capacity / Maintenance Constraints', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI_01');
  const stationId = createBrandedId<StationId>('STN_BD_BANDUNG');
  const depotId = createBrandedId<DepotId>('DPT_BD_01');

  it('initializes standard depot tiers with correct physical specifications', () => {
    // Tier 1
    const d1 = DepotEntity.createFromTier(depotId, companyId, 'Bandung Light Depot', stationId, 1);
    expect(d1.fleetCapacity).toBe(6);
    expect(d1.maintenanceSlots).toBe(1);
    expect(d1.dailyOperatingCost).toBe(2_500_000);
    expect(d1.maintenanceLevelCapability).toBe('LEVEL_1_DAILY');

    // Tier 2
    const d2 = DepotEntity.createFromTier(depotId, companyId, 'Bandung Main Depot', stationId, 2);
    expect(d2.fleetCapacity).toBe(16);
    expect(d2.maintenanceSlots).toBe(3);
    expect(d2.dailyOperatingCost).toBe(7_500_000);
    expect(d2.maintenanceLevelCapability).toBe('LEVEL_2_PERIODIC');

    // Tier 3
    const d3 = DepotEntity.createFromTier(depotId, companyId, 'Manggarai Master Works', stationId, 3);
    expect(d3.fleetCapacity).toBe(40);
    expect(d3.maintenanceSlots).toBe(8);
    expect(d3.dailyOperatingCost).toBe(25_000_000);
    expect(d3.maintenanceLevelCapability).toBe('LEVEL_3_OVERHAUL');
  });

  it('manages stabling occupancy and enforces fleetCapacity limits', () => {
    const depot = DepotEntity.createFromTier(depotId, companyId, 'Test Depot', stationId, 1); // capacity = 6
    expect(depot.canStable(4)).toBe(true);
    depot.assignStabling(4);
    expect(depot.stablingOccupancy).toBe(4);

    expect(depot.canStable(2)).toBe(true);
    expect(depot.canStable(3)).toBe(false); // 4 + 3 = 7 > 6

    // Exceeding capacity throws error
    expect(() => depot.assignStabling(3)).toThrow(DepotCapacityExceededError);

    // Release stabling
    depot.releaseStabling(2);
    expect(depot.stablingOccupancy).toBe(2);
  });

  it('enforces maintenance capability hierarchy', () => {
    const tier1Depot = DepotEntity.createFromTier(depotId, companyId, 'T1 Depot', stationId, 1);
    const u1 = createBrandedId<UnitId>('UNIT_CC206_01');

    // Level 1 supported
    expect(tier1Depot.supportsMaintenanceLevel('LEVEL_1_DAILY')).toBe(true);
    // Level 2 not supported
    expect(tier1Depot.supportsMaintenanceLevel('LEVEL_2_PERIODIC')).toBe(false);
    expect(() => tier1Depot.requestMaintenance(u1, 'LEVEL_2_PERIODIC')).toThrow(DepotCapabilityError);

    const tier2Depot = DepotEntity.createFromTier(depotId, companyId, 'T2 Depot', stationId, 2);
    expect(tier2Depot.supportsMaintenanceLevel('LEVEL_1_DAILY')).toBe(true);
    expect(tier2Depot.supportsMaintenanceLevel('LEVEL_2_PERIODIC')).toBe(true);
    expect(tier2Depot.supportsMaintenanceLevel('LEVEL_3_OVERHAUL')).toBe(false);

    const tier3Depot = DepotEntity.createFromTier(depotId, companyId, 'T3 Depot', stationId, 3);
    expect(tier3Depot.supportsMaintenanceLevel('LEVEL_3_OVERHAUL')).toBe(true);
  });

  it('handles concurrent maintenance slots and FIFO queueing', () => {
    // Tier 1 has 1 maintenance slot
    const depot = DepotEntity.createFromTier(depotId, companyId, 'T1 Depot', stationId, 1);
    const u1 = createBrandedId<UnitId>('UNIT_1');
    const u2 = createBrandedId<UnitId>('UNIT_2');
    const u3 = createBrandedId<UnitId>('UNIT_3');

    // First unit enters active maintenance
    const res1 = depot.requestMaintenance(u1, 'LEVEL_1_DAILY');
    expect(res1.status).toBe('IN_PROGRESS');
    expect(depot.activeMaintenanceCount).toBe(1);

    // Next units are queued in FIFO order
    const res2 = depot.requestMaintenance(u2, 'LEVEL_1_DAILY');
    expect(res2.status).toBe('QUEUED');
    expect(depot.maintenanceQueue).toEqual([u2]);

    const res3 = depot.requestMaintenance(u3, 'LEVEL_1_DAILY');
    expect(res3.status).toBe('QUEUED');
    expect(depot.maintenanceQueue).toEqual([u2, u3]);

    // Complete unit 1 -> unit 2 is admitted next
    const promoted1 = depot.completeMaintenance();
    expect(promoted1).toBe(u2);
    expect(depot.activeMaintenanceCount).toBe(1);
    expect(depot.maintenanceQueue).toEqual([u3]);

    // Complete unit 2 -> unit 3 is admitted next
    const promoted2 = depot.completeMaintenance();
    expect(promoted2).toBe(u3);
    expect(depot.maintenanceQueue).toEqual([]);

    // Complete unit 3 -> no more units
    const promoted3 = depot.completeMaintenance();
    expect(promoted3).toBeNull();
    expect(depot.activeMaintenanceCount).toBe(0);
  });

  it('supports facility tier upgrades', () => {
    const depot = DepotEntity.createFromTier(depotId, companyId, 'Upgradable Depot', stationId, 1);
    expect(depot.tier).toBe(1);

    depot.upgradeTier(2);
    expect(depot.tier).toBe(2);
    expect(depot.fleetCapacity).toBe(DEPOT_TIER_CONFIGS[2].fleetCapacity);
    expect(depot.maintenanceSlots).toBe(DEPOT_TIER_CONFIGS[2].maintenanceSlots);
    expect(depot.dailyOperatingCost).toBe(DEPOT_TIER_CONFIGS[2].dailyOperatingCost);

    // Downgrade not allowed
    expect(() => depot.upgradeTier(1)).toThrow(RangeError);
  });
});
