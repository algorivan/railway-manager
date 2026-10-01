import { Money, toMoney, addMoney, multiplyMoney } from '@railway/shared';
import { EmployeeEntity } from '../entities/employee.entity.js';

export interface EmployeePayrollLine {
  readonly employeeId: string;
  readonly name: string;
  readonly role: string;
  readonly baseSalary: Money;
  readonly hoursWorked: number;
  readonly runAllowance: Money;
  readonly totalGrossPay: Money;
}

export interface MonthlyPayrollSummary {
  readonly totalEmployees: number;
  readonly totalBaseSalaries: Money;
  readonly totalRunAllowances: Money;
  readonly totalWorkforceOpex: Money;
  readonly lines: ReadonlyArray<EmployeePayrollLine>;
}

export class PayrollCalculator {
  /**
   * Calculates individual gross compensation for an employee over a billing period.
   */
  public static calculateEmployeePayroll(employee: EmployeeEntity): EmployeePayrollLine {
    const baseSalary = employee.monthlyBaseSalary;
    const allowanceRate = employee.hourlyRunAllowance;
    const hours = employee.monthlyHoursWorked;

    const runAllowance = multiplyMoney(allowanceRate, hours);
    const totalGrossPay = addMoney(baseSalary, runAllowance);

    return {
      employeeId: employee.id,
      name: employee.name,
      role: employee.role,
      baseSalary,
      hoursWorked: hours,
      runAllowance,
      totalGrossPay,
    };
  }

  /**
   * Calculates company-wide monthly payroll liability.
   */
  public static calculateMonthlyPayroll(
    employees: ReadonlyArray<EmployeeEntity>
  ): MonthlyPayrollSummary {
    let totalBase = toMoney(0);
    let totalAllowances = toMoney(0);
    let totalOpex = toMoney(0);
    const lines: EmployeePayrollLine[] = [];

    for (const emp of employees) {
      if (emp.status === 'TERMINATED') {
        continue;
      }
      const line = this.calculateEmployeePayroll(emp);
      totalBase = addMoney(totalBase, line.baseSalary);
      totalAllowances = addMoney(totalAllowances, line.runAllowance);
      totalOpex = addMoney(totalOpex, line.totalGrossPay);
      lines.push(line);
    }

    return {
      totalEmployees: lines.length,
      totalBaseSalaries: totalBase,
      totalRunAllowances: totalAllowances,
      totalWorkforceOpex: totalOpex,
      lines: Object.freeze(lines),
    };
  }
}
