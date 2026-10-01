import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  UnitId,
  CompanyId,
  DepotId,
} from '@railway/shared';
import {
  JAVA_ROLLING_STOCK_CATALOG,
} from '@railway/game-data';
import {
  RollingStockUnitEntity,
  CompositionValidator,
  ConsistValidationUnit,
} from '../src/index.js';

describe('CompositionValidator', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotA = createBrandedId<DepotId>('DEP_CIPINANG');
  const depotB = createBrandedId<DepotId>('DEP_SIDOTOPO');

  const cc206Spec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_LOCO_CC206')!;
  const cc201Spec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_LOCO_CC201')!;
  const k1ExecSpec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_COACH_K1_EXEC')!;
  const k3EcoSpec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_COACH_K3_PREMIUM')!;
  const powerSpec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_VAN_P_GENERATOR')!;
  const diningSpec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_COACH_M1_DINING')!;
  const containerSpec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === 'SPEC_WAGON_PPCW_CONTAINER')!;

  function makeUnit(specId: string, idStr: string, depot: DepotId = depotA): RollingStockUnitEntity {
    return new RollingStockUnitEntity({
      id: createBrandedId<UnitId>(idStr),
      companyId,
      specId,
      serialNumber: idStr,
      homeDepotId: depot,
      currentDepotId: depot,
    });
  }

  it('validates a complete intercity train consist with dining & generator van', () => {
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_LOCO_CC206', 'U_LOCO_1'), spec: cc206Spec },
      { unit: makeUnit('SPEC_VAN_P_GENERATOR', 'U_P_1'), spec: powerSpec },
      { unit: makeUnit('SPEC_COACH_M1_DINING', 'U_M1_1'), spec: diningSpec },
      { unit: makeUnit('SPEC_COACH_K1_EXEC', 'U_K1_1'), spec: k1ExecSpec },
      { unit: makeUnit('SPEC_COACH_K1_EXEC', 'U_K1_2'), spec: k1ExecSpec },
      { unit: makeUnit('SPEC_COACH_K3_PREMIUM', 'U_K3_1'), spec: k3EcoSpec },
    ];

    const result = CompositionValidator.validate({ units: consist });
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.maximumSpeedKmh as number).toBe(100); // K3 bogie limited to 100 km/h
    expect(result.hasDiningCar).toBe(true);
    expect(result.hasGeneratorCar).toBe(true);
    expect(result.passengerCapacity.executive).toBe(100); // 2 * 50
    expect(result.passengerCapacity.economy).toBe(80); // 1 * 80
    expect(result.passengerCapacity.total).toBe(180);
    expect(result.totalLengthMeters as number).toBeGreaterThan(120);
  });

  it('rejects composition lacking locomotive (Traction Invariant)', () => {
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_COACH_K3_PREMIUM', 'U_K3_1'), spec: k3EcoSpec },
    ];

    const result = CompositionValidator.validate({ units: consist });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Traction Invariant'))).toBe(true);
  });

  it('rejects air-conditioned executive coach without generator van (Hotel Power Invariant)', () => {
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_LOCO_CC206', 'U_LOCO_1'), spec: cc206Spec },
      { unit: makeUnit('SPEC_COACH_K1_EXEC', 'U_K1_1'), spec: k1ExecSpec },
    ];

    const result = CompositionValidator.validate({ units: consist });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Hotel Power Invariant'))).toBe(true);
  });

  it('allows economy coaches without power van if non-AC or basic', () => {
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_LOCO_CC201', 'U_LOCO_1'), spec: cc201Spec },
      { unit: makeUnit('SPEC_COACH_K3_PREMIUM', 'U_K3_1'), spec: k3EcoSpec },
    ];

    const result = CompositionValidator.validate({ units: consist });
    expect(result.isValid).toBe(true);
    expect(result.hasGeneratorCar).toBe(false);
  });

  it('rejects consist containing units from different depots', () => {
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_LOCO_CC206', 'U_LOCO_1', depotA), spec: cc206Spec },
      { unit: makeUnit('SPEC_VAN_P_GENERATOR', 'U_P_1', depotB), spec: powerSpec },
    ];

    const result = CompositionValidator.validate({ units: consist });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('differs from consist origin depot'))).toBe(true);
  });

  it('rejects consist exceeding maximum platform length', () => {
    // 25 container flatcars * 14.5m = 362.5m + loco = 383m. If maxPlatformLength = 200m -> reject!
    const wagons: ConsistValidationUnit[] = Array.from({ length: 20 }, (_, i) => ({
      unit: makeUnit('SPEC_WAGON_PPCW_CONTAINER', `U_W_${i}`),
      spec: containerSpec,
    }));
    const consist: ConsistValidationUnit[] = [
      { unit: makeUnit('SPEC_LOCO_CC206', 'U_LOCO_1'), spec: cc206Spec },
      ...wagons,
    ];

    const result = CompositionValidator.validate({ units: consist, maxPlatformLengthMeters: 200 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Platform Length Invariant'))).toBe(true);
  });
});
