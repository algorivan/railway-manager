import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  UnitId,
  CompanyId,
  DepotId,
  CompositionId,
  toKm,
} from '@railway/shared';
import {
  RollingStockUnitEntity,
  InvalidRollingStockStateError,
} from '../src/index.js';

describe('RollingStockUnitEntity', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotA = createBrandedId<DepotId>('DEP_CIPINANG');
  const depotB = createBrandedId<DepotId>('DEP_SIDOTOPO');
  const compId = createBrandedId<CompositionId>('COMP_01');

  it('initializes with default condition and available status', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC206-13-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
    });

    expect(unit.conditionPercentage).toBe(100);
    expect(unit.odometerKm as number).toBe(0);
    expect(unit.status).toBe('AVAILABLE');
    expect(unit.isAvailable()).toBe(true);
  });

  it('assigns and unassigns from composition', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC206-13-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
    });

    unit.assignToComposition(compId);
    expect(unit.status).toBe('ASSIGNED');
    expect(unit.assignedCompositionId).toBe(compId);
    expect(unit.isAvailable()).toBe(false);

    unit.unassignFromComposition();
    expect(unit.status).toBe('AVAILABLE');
    expect(unit.assignedCompositionId).toBeUndefined();
  });

  it('rejects assignment when unit has critical condition (<=20%)', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC206-13-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
      conditionPercentage: 18,
    });

    expect(() => {
      unit.assignToComposition(compId);
    }).toThrow(InvalidRollingStockStateError);
  });

  it('handles maintenance lifecycle and restores condition', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K1_01'),
      companyId,
      specId: 'SPEC_COACH_K1_EXEC',
      serialNumber: 'K1-0-18-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
      conditionPercentage: 65,
      odometerKm: toKm(25000),
      kmSinceLastMaintenance: toKm(25000),
    });

    unit.sendToMaintenance(depotA);
    expect(unit.status).toBe('IN_MAINTENANCE');

    unit.completeMaintenance(98.5);
    expect(unit.status).toBe('AVAILABLE');
    expect(unit.conditionPercentage).toBe(98.5);
    expect(unit.kmSinceLastMaintenance as number).toBe(0);
    expect(unit.odometerKm as number).toBe(25000);
  });

  it('records run and correctly updates odometer and wear', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC206-13-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
    });

    unit.recordRun(toKm(160), 0.32);
    expect(unit.odometerKm as number).toBe(160);
    expect(unit.kmSinceLastMaintenance as number).toBe(160);
    expect(unit.conditionPercentage).toBe(99.68);
  });

  it('transfers unit to another depot when available and rejects transfer when assigned', () => {
    const unit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC206-13-01',
      homeDepotId: depotA,
      currentDepotId: depotA,
    });

    unit.transferDepot(depotB);
    expect(unit.currentDepotId).toBe(depotB);

    unit.assignToComposition(compId);
    expect(() => {
      unit.transferDepot(depotA);
    }).toThrow(InvalidRollingStockStateError);
  });
});
