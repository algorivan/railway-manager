import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  EmployeeId,
  CompanyId,
  DepotId,
} from '@railway/shared';
import {
  EmployeeEntity,
  PayrollCalculator,
} from '../src/index.js';

describe('PayrollCalculator', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotId = createBrandedId<DepotId>('DEP_CIPINANG');

  it('calculates employee payroll with monthly base and hourly run allowances', () => {
    // Masinis: 12,000,000 base + 75,000/hr allowance. 40 hours worked = 3,000,000 allowance. Total = 15,000,000 IDR.
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_01'),
      companyId,
      name: 'Agus Sutrisno',
      role: 'MASINIS',
      homeDepotId: depotId,
      monthlyHoursWorked: 40,
    });

    const payroll = PayrollCalculator.calculateEmployeePayroll(masinis);

    expect(payroll.baseSalary as number).toBe(12_000_000);
    expect(payroll.hoursWorked).toBe(40);
    expect(payroll.runAllowance as number).toBe(3_000_000);
    expect(payroll.totalGrossPay as number).toBe(15_000_000);
  });

  it('calculates company-wide payroll summary', () => {
    const masinis = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_01'),
      companyId,
      name: 'Agus Sutrisno',
      role: 'MASINIS',
      homeDepotId: depotId,
      monthlyHoursWorked: 40, // 12M + 3M = 15M
    });

    const kondektur = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_02'),
      companyId,
      name: 'Bambang Irawan',
      role: 'KONDEKTUR',
      homeDepotId: depotId,
      monthlyHoursWorked: 40, // 6.5M + 1.4M (40 * 35k) = 7.9M
    });

    const tech = new EmployeeEntity({
      id: createBrandedId<EmployeeId>('EMP_03'),
      companyId,
      name: 'Dedi Kurniawan',
      role: 'TECHNICIAN',
      homeDepotId: depotId,
      monthlyHoursWorked: 0, // 8M base + 0 allowance = 8M
    });

    const summary = PayrollCalculator.calculateMonthlyPayroll([masinis, kondektur, tech]);

    expect(summary.totalEmployees).toBe(3);
    expect(summary.totalBaseSalaries as number).toBe(12_000_000 + 6_500_000 + 8_000_000); // 26.5M
    expect(summary.totalRunAllowances as number).toBe(3_000_000 + 1_400_000); // 4.4M
    expect(summary.totalWorkforceOpex as number).toBe(26_500_000 + 4_400_000); // 30.9M
  });
});
