import {
  EmployeeId,
  CompanyId,
  DepotId,
  Money,
  toMoney,
} from '@railway/shared';

export type StaffRole =
  | 'MASINIS'           // Lead Locomotive Driver
  | 'TRACTION_SUPPORT'  // Assistant Driver / Asisten Masinis
  | 'KONDEKTUR'         // Conductor
  | 'ONBOARD_SERVICE'   // Catering & Customer Attendant
  | 'TECHNICIAN'        // Depot Maintenance Mechanic
  | 'DEPOT_STAFF'       // Shunting & Yard Operations
  | 'DISPATCHER'        // Station / Corridor Train Dispatcher
  | 'ADMIN';            // HQ Commercial & Administrative Staff

export type EmployeeStatus =
  | 'AVAILABLE'
  | 'ON_DUTY'
  | 'RESTING'
  | 'ON_LEAVE'
  | 'TERMINATED';

export const BASE_MONTHLY_SALARIES: Readonly<Record<StaffRole, Money>> = {
  MASINIS: toMoney(12_000_000),
  TRACTION_SUPPORT: toMoney(7_500_000),
  KONDEKTUR: toMoney(6_500_000),
  ONBOARD_SERVICE: toMoney(5_500_000),
  TECHNICIAN: toMoney(8_000_000),
  DEPOT_STAFF: toMoney(5_000_000),
  DISPATCHER: toMoney(9_000_000),
  ADMIN: toMoney(8_500_000),
};

export const HOURLY_RUN_ALLOWANCES: Readonly<Record<StaffRole, Money>> = {
  MASINIS: toMoney(75_000),
  TRACTION_SUPPORT: toMoney(45_000),
  KONDEKTUR: toMoney(35_000),
  ONBOARD_SERVICE: toMoney(20_000),
  TECHNICIAN: toMoney(0),
  DEPOT_STAFF: toMoney(0),
  DISPATCHER: toMoney(0),
  ADMIN: toMoney(0),
};

export interface EmployeeProps {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: StaffRole;
  readonly homeDepotId: DepotId;
  readonly currentDepotId?: DepotId;
  readonly customMonthlySalary?: Money;
  readonly certifiedLocomotiveSpecs?: ReadonlyArray<string>;
  readonly certifiedRouteIds?: ReadonlyArray<string>;
  readonly fatigueLevel?: number;
  readonly monthlyHoursWorked?: number;
  readonly status?: EmployeeStatus;
}

export class InvalidEmployeeOperationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'InvalidEmployeeOperationError';
    this.code = code;
    Object.setPrototypeOf(this, InvalidEmployeeOperationError.prototype);
  }
}

export class EmployeeEntity {
  public readonly id: EmployeeId;
  public readonly companyId: CompanyId;
  public readonly name: string;
  public readonly role: StaffRole;
  public readonly homeDepotId: DepotId;
  public readonly monthlyBaseSalary: Money;
  public readonly hourlyRunAllowance: Money;

  private _currentDepotId: DepotId;
  private _certifiedLocomotiveSpecs: Set<string>;
  private _certifiedRouteIds: Set<string>;
  private _fatigueLevel: number; // 0.00 to 100.00
  private _monthlyHoursWorked: number;
  private _status: EmployeeStatus;

  constructor(props: EmployeeProps) {
    if (!props.id || !props.companyId || !props.name || !props.homeDepotId) {
      throw new Error('Employee requires id, companyId, name, and homeDepotId');
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.name = props.name;
    this.role = props.role;
    this.homeDepotId = props.homeDepotId;
    this._currentDepotId = props.currentDepotId ?? props.homeDepotId;
    this.monthlyBaseSalary = props.customMonthlySalary ?? BASE_MONTHLY_SALARIES[props.role];
    this.hourlyRunAllowance = HOURLY_RUN_ALLOWANCES[props.role];
    this._certifiedLocomotiveSpecs = new Set(props.certifiedLocomotiveSpecs ?? []);
    this._certifiedRouteIds = new Set(props.certifiedRouteIds ?? []);
    this._fatigueLevel = Math.max(0, Math.min(100, props.fatigueLevel ?? 0));
    this._monthlyHoursWorked = props.monthlyHoursWorked ?? 0;
    this._status = props.status ?? 'AVAILABLE';
  }

  public get currentDepotId(): DepotId {
    return this._currentDepotId;
  }

  public get fatigueLevel(): number {
    return this._fatigueLevel;
  }

  public get monthlyHoursWorked(): number {
    return this._monthlyHoursWorked;
  }

  public get status(): EmployeeStatus {
    return this._status;
  }

  public get certifiedLocomotiveSpecs(): ReadonlyArray<string> {
    return Object.freeze(Array.from(this._certifiedLocomotiveSpecs));
  }

  public get certifiedRouteIds(): ReadonlyArray<string> {
    return Object.freeze(Array.from(this._certifiedRouteIds));
  }

  public isAvailable(): boolean {
    return this._status === 'AVAILABLE' && this._fatigueLevel <= 80.0;
  }

  public hasLocomotiveCertification(specId: string): boolean {
    return this._certifiedLocomotiveSpecs.has(specId);
  }

  public hasRouteCertification(routeId: string): boolean {
    return this._certifiedRouteIds.has(routeId);
  }

  public certifyLocomotive(specId: string): void {
    this._certifiedLocomotiveSpecs.add(specId);
  }

  public certifyRoute(routeId: string): void {
    this._certifiedRouteIds.add(routeId);
  }

  /**
   * Starts an active service run or duty shift.
   */
  public startDuty(): void {
    if (this._status !== 'AVAILABLE') {
      throw new InvalidEmployeeOperationError(
        `Employee ${this.name} (${this.id}) cannot start duty: status is ${this._status}`,
        'NOT_AVAILABLE'
      );
    }
    if (this._fatigueLevel > 80.0) {
      throw new InvalidEmployeeOperationError(
        `Employee ${this.name} (${this.id}) exceeds fatigue safety threshold (${this._fatigueLevel.toFixed(1)}% > 80%)`,
        'FATIGUE_EXCEEDED'
      );
    }
    this._status = 'ON_DUTY';
  }

  /**
   * Completes duty shift.
   * Accumulates fatigue (100% after 8 hours / 480 mins) and logs worked hours.
   */
  public completeDuty(durationMinutes: number): void {
    if (this._status !== 'ON_DUTY') {
      throw new InvalidEmployeeOperationError(
        `Employee ${this.name} (${this.id}) cannot complete duty: not on duty`,
        'NOT_ON_DUTY'
      );
    }
    const hours = durationMinutes / 60;
    this._monthlyHoursWorked = Math.round((this._monthlyHoursWorked + hours) * 100) / 100;

    // Fatigue formula from SIMULATION_RULES.md §8.2: 100% after 480 minutes
    const fatigueDelta = (durationMinutes / 480) * 100;
    this._fatigueLevel = Math.min(100, Math.round((this._fatigueLevel + fatigueDelta) * 100) / 100);

    // If fatigue > 40%, enters resting state
    this._status = this._fatigueLevel > 40.0 ? 'RESTING' : 'AVAILABLE';
  }

  /**
   * Rests at a depot to recover fatigue (fully recovered in 4 hours / 240 mins).
   */
  public rest(durationMinutes: number): void {
    if (this._status === 'ON_DUTY') {
      throw new InvalidEmployeeOperationError(
        `Employee ${this.name} cannot rest while on duty`,
        'CURRENTLY_ON_DUTY'
      );
    }
    // Fatigue recovery from SIMULATION_RULES.md §8.2: 100% recovered in 240 minutes
    const recoveryDelta = (durationMinutes / 240) * 100;
    this._fatigueLevel = Math.max(0, Math.round((this._fatigueLevel - recoveryDelta) * 100) / 100);

    if (this._fatigueLevel <= 20.0 && this._status === 'RESTING') {
      this._status = 'AVAILABLE';
    }
  }

  public resetMonthlyHours(): void {
    this._monthlyHoursWorked = 0;
  }

  public transferDepot(newDepotId: DepotId): void {
    if (this._status === 'ON_DUTY') {
      throw new InvalidEmployeeOperationError(
        `Cannot transfer employee ${this.name} while on duty`,
        'CURRENTLY_ON_DUTY'
      );
    }
    this._currentDepotId = newDepotId;
  }
}
