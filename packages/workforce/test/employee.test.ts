import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  EmployeeId,
  CompanyId,
  DepotId,
} from '@railway/shared';
import {
  EmployeeEntity,
  InvalidEmployeeOperationError,
} from '../src/index.js';

describe('EmployeeEntity', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotA = createBrandedId<DepotId>('DEP_CIPINANG');
  const depotB = createBrandedId<DepotId>('DEP_BANDUNG');
  const empId = createBrandedId<EmployeeId>('EMP_MASINIS_01');

  it('initializes with default role salary and zero fatigue', () => {
    const emp = new EmployeeEntity({
      id: empId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
    });

    expect(emp.name).toBe('Budi Santoso');
    expect(emp.role).toBe('MASINIS');
    expect(emp.monthlyBaseSalary as number).toBe(12_000_000);
    expect(emp.hourlyRunAllowance as number).toBe(75_000);
    expect(emp.fatigueLevel).toBe(0);
    expect(emp.monthlyHoursWorked).toBe(0);
    expect(emp.isAvailable()).toBe(true);
  });

  it('manages locomotive and route certifications', () => {
    const emp = new EmployeeEntity({
      id: empId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
    });

    expect(emp.hasLocomotiveCertification('SPEC_LOCO_CC206')).toBe(false);
    expect(emp.hasRouteCertification('RT_GMR_BDG')).toBe(false);

    emp.certifyLocomotive('SPEC_LOCO_CC206');
    emp.certifyRoute('RT_GMR_BDG');

    expect(emp.hasLocomotiveCertification('SPEC_LOCO_CC206')).toBe(true);
    expect(emp.hasRouteCertification('RT_GMR_BDG')).toBe(true);
  });

  it('accumulates fatigue during duty and recovers during rest', () => {
    const emp = new EmployeeEntity({
      id: empId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
    });

    emp.startDuty();
    expect(emp.status).toBe('ON_DUTY');

    // 4 hours (240 mins) of duty = 50% fatigue (100% per 480 mins)
    emp.completeDuty(240);
    expect(emp.monthlyHoursWorked).toBe(4);
    expect(emp.fatigueLevel).toBe(50);
    expect(emp.status).toBe('RESTING'); // >40% fatigue triggers resting status

    // Rest for 2 hours (120 mins) = 50% recovery (100% per 240 mins)
    emp.rest(120);
    expect(emp.fatigueLevel).toBe(0);
    expect(emp.status).toBe('AVAILABLE'); // <=20% triggers available
  });

  it('rejects starting duty when fatigue exceeds safety limit (>80%)', () => {
    const emp = new EmployeeEntity({
      id: empId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
      fatigueLevel: 85,
    });

    expect(emp.isAvailable()).toBe(false);
    expect(() => {
      emp.startDuty();
    }).toThrow(InvalidEmployeeOperationError);
  });

  it('transfers depot location when not on duty', () => {
    const emp = new EmployeeEntity({
      id: empId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: depotA,
    });

    emp.transferDepot(depotB);
    expect(emp.currentDepotId).toBe(depotB);
    expect(emp.homeDepotId).toBe(depotA);
  });
});
