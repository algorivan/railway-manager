import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  EmployeeId,
  CompanyId,
  DepotId,
} from '@railway/shared';
import {
  EmployeeEntity,
  CrewAssignmentValidator,
} from '../src/index.js';

describe('CrewAssignmentValidator', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotA = createBrandedId<DepotId>('DEP_CIPINANG');
  const depotB = createBrandedId<DepotId>('DEP_BANDUNG');

  const context = {
    routeId: 'RT_GMR_BDG',
    leadLocomotiveSpecId: 'SPEC_LOCO_CC206',
    departureDepotId: depotA,
  };

  it('approves qualified, rested masinis stationed at the correct departure depot', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_01'),
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
      currentDepotId: depotA,
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['RT_GMR_BDG'],
      fatigueLevel: 15.0,
    });

    const result = CrewAssignmentValidator.validateMasinis(masinis, context);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects masinis lacking locomotive certification (Type Qualification Invariant)', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_02'),
      companyId,
      name: 'Joko Widodo',
      role: 'MASINIS',
      homeDepotId: depotA,
      currentDepotId: depotA,
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC201'], // only CC201, not CC206!
      certifiedRouteIds: ['RT_GMR_BDG'],
    });

    const result = CrewAssignmentValidator.validateMasinis(masinis, context);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Type Qualification Invariant'))).toBe(true);
  });

  it('rejects masinis lacking route certification (Route Familiarization Invariant)', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_03'),
      companyId,
      name: 'Siti Rahma',
      role: 'MASINIS',
      homeDepotId: depotA,
      currentDepotId: depotA,
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['RT_SGU_SLO'], // wrong corridor!
    });

    const result = CrewAssignmentValidator.validateMasinis(masinis, context);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Route Familiarization Invariant'))).toBe(true);
  });

  it('rejects masinis exceeding 80% fatigue threshold (Fatigue Safety Violation)', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_04'),
      companyId,
      name: 'Hendro',
      role: 'MASINIS',
      homeDepotId: depotA,
      currentDepotId: depotA,
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['RT_GMR_BDG'],
      fatigueLevel: 82.5,
    });

    const result = CrewAssignmentValidator.validateMasinis(masinis, context);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Fatigue Safety Violation'))).toBe(true);
  });

  it('rejects masinis stationed at a different depot (Location Mismatch)', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_05'),
      companyId,
      name: 'Yanto',
      role: 'MASINIS',
      homeDepotId: depotA,
      currentDepotId: depotB, // stationed at Bandung, while service departs Gambir/Cipinang!
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['RT_GMR_BDG'],
    });

    const result = CrewAssignmentValidator.validateMasinis(masinis, context);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Location Mismatch'))).toBe(true);
  });
});
