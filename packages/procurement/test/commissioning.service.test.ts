import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  OrderId,
  CompanyId,
  DepotId,
  StationId,
  toMoney,
  createGameTimestamp,
} from '@railway/shared';
import {
  DepotEntity,
  DepotCapacityExceededError,
} from '@railway/network';
import {
  ProcurementOrderEntity,
  CommissioningService,
  InvalidCommissioningTargetError,
  InvalidProcurementStateTransitionError,
} from '../src/index.js';

describe('CommissioningService', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const stationId = createBrandedId<StationId>('STN_BD_BANDUNG');
  const depotA = createBrandedId<DepotId>('DEP_BD_01');
  const depotB = createBrandedId<DepotId>('DEP_GMR_01');

  it('commissions delivered units into depot inventory and updates order status', () => {
    // Tier 1 Depot has 6 fleet capacity
    const depot = DepotEntity.createFromTier(depotA, companyId, 'Depo Bandung', stationId, 1);
    expect(depot.stablingOccupancy).toBe(0);
    expect(depot.fleetCapacity).toBe(6);

    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 2,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: depotA,
      leadTimeDays: 180,
      status: 'DELIVERED',
      orderedTimestamp: createGameTimestamp(0),
    });

    const units = CommissioningService.commissionOrder(order, depot);

    expect(order.status).toBe('COMMISSIONED');
    expect(depot.stablingOccupancy).toBe(2);
    expect(units.length).toBe(2);
    expect(units[0]?.homeDepotId).toBe(depotA);
    expect(units[0]?.currentDepotId).toBe(depotA);
    expect(units[0]?.isAvailable()).toBe(true);
    expect(units[0]?.specId).toBe('SPEC_LOCO_CC206');
  });

  it('rejects commissioning if depot capacity would be exceeded', () => {
    const depot = DepotEntity.createFromTier(depotA, companyId, 'Small Depo', stationId, 1);
    depot.assignStabling(5); // 5 of 6 occupied

    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_02'),
      companyId,
      specId: 'SPEC_COACH_K1_EXEC',
      quantity: 2, // Needs 2 slots, only 1 available!
      unitCost: toMoney(7_500_000_000),
      deliveryDepotId: depotA,
      leadTimeDays: 120,
      status: 'DELIVERED',
    });

    expect(() => {
      CommissioningService.commissionOrder(order, depot);
    }).toThrow(DepotCapacityExceededError);

    expect(order.status).toBe('DELIVERED'); // order remains delivered, not commissioned
    expect(depot.stablingOccupancy).toBe(5);
  });

  it('rejects commissioning to wrong destination depot', () => {
    const depotWrong = DepotEntity.createFromTier(depotB, companyId, 'Depo Gambir', stationId, 1);

    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_03'),
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      quantity: 1,
      unitCost: toMoney(5_500_000_000),
      deliveryDepotId: depotA, // Ordered to Depot A
      leadTimeDays: 90,
      status: 'DELIVERED',
    });

    expect(() => {
      CommissioningService.commissionOrder(order, depotWrong);
    }).toThrow(InvalidCommissioningTargetError);
  });

  it('rejects commissioning if order is not in DELIVERED status', () => {
    const depot = DepotEntity.createFromTier(depotA, companyId, 'Depo Bandung', stationId, 1);

    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_04'),
      companyId,
      specId: 'SPEC_LOCO_CC201',
      quantity: 1,
      unitCost: toMoney(18_000_000_000),
      deliveryDepotId: depotA,
      leadTimeDays: 120,
      status: 'IN_TRANSIT',
    });

    expect(() => {
      CommissioningService.commissionOrder(order, depot);
    }).toThrow(InvalidProcurementStateTransitionError);
  });
});
