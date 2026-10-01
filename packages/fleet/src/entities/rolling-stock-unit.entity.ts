import {
  UnitId,
  CompanyId,
  DepotId,
  CompositionId,
  Km,
  toKm,
} from '@railway/shared';

export type RollingStockUnitStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_MAINTENANCE'
  | 'DECOMMISSIONED';

export interface RollingStockUnitProps {
  readonly id: UnitId;
  readonly companyId: CompanyId;
  readonly specId: string;
  readonly serialNumber: string;
  readonly homeDepotId: DepotId;
  readonly currentDepotId: DepotId;
  readonly conditionPercentage?: number;
  readonly odometerKm?: Km;
  readonly kmSinceLastMaintenance?: Km;
  readonly status?: RollingStockUnitStatus;
  readonly assignedCompositionId?: CompositionId;
}

export class InvalidRollingStockStateError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'InvalidRollingStockStateError';
    this.code = code;
    Object.setPrototypeOf(this, InvalidRollingStockStateError.prototype);
  }
}

export class RollingStockUnitEntity {
  public readonly id: UnitId;
  public readonly companyId: CompanyId;
  public readonly specId: string;
  public readonly serialNumber: string;

  private _homeDepotId: DepotId;
  private _currentDepotId: DepotId;
  private _conditionPercentage: number;
  private _odometerKm: Km;
  private _kmSinceLastMaintenance: Km;
  private _status: RollingStockUnitStatus;
  private _assignedCompositionId?: CompositionId;

  constructor(props: RollingStockUnitProps) {
    if (!props.id || !props.companyId || !props.specId || !props.serialNumber) {
      throw new InvalidRollingStockStateError(
        'Missing required identity properties for rolling stock unit',
        'MISSING_IDENTITY'
      );
    }
    this.id = props.id;
    this.companyId = props.companyId;
    this.specId = props.specId;
    this.serialNumber = props.serialNumber;
    this._homeDepotId = props.homeDepotId;
    this._currentDepotId = props.currentDepotId;
    this._conditionPercentage = Math.max(0, Math.min(100, props.conditionPercentage ?? 100));
    this._odometerKm = props.odometerKm ?? toKm(0);
    this._kmSinceLastMaintenance = props.kmSinceLastMaintenance ?? toKm(0);
    this._status = props.status ?? 'AVAILABLE';
    this._assignedCompositionId = props.assignedCompositionId;
  }

  public get homeDepotId(): DepotId {
    return this._homeDepotId;
  }

  public get currentDepotId(): DepotId {
    return this._currentDepotId;
  }

  public get conditionPercentage(): number {
    return this._conditionPercentage;
  }

  public get odometerKm(): Km {
    return this._odometerKm;
  }

  public get kmSinceLastMaintenance(): Km {
    return this._kmSinceLastMaintenance;
  }

  public get status(): RollingStockUnitStatus {
    return this._status;
  }

  public get assignedCompositionId(): CompositionId | undefined {
    return this._assignedCompositionId;
  }

  public isAvailable(): boolean {
    return this._status === 'AVAILABLE';
  }

  /**
   * Assigns this unit to an operational consist.
   */
  public assignToComposition(compositionId: CompositionId): void {
    if (this._status !== 'AVAILABLE') {
      throw new InvalidRollingStockStateError(
        `Cannot assign unit ${this.id} to composition: unit status is ${this._status}`,
        'UNIT_NOT_AVAILABLE'
      );
    }
    if (this._conditionPercentage <= 20) {
      throw new InvalidRollingStockStateError(
        `Cannot assign unit ${this.id} to composition: critical condition ${this._conditionPercentage}%`,
        'CRITICAL_CONDITION'
      );
    }
    this._status = 'ASSIGNED';
    this._assignedCompositionId = compositionId;
  }

  /**
   * Releases this unit from its assigned consist.
   */
  public unassignFromComposition(): void {
    if (this._status === 'DECOMMISSIONED') {
      throw new InvalidRollingStockStateError(
        `Cannot unassign decommissioned unit ${this.id}`,
        'UNIT_DECOMMISSIONED'
      );
    }
    this._status = 'AVAILABLE';
    this._assignedCompositionId = undefined;
  }

  /**
   * Sends unit into maintenance bay at a depot.
   */
  public sendToMaintenance(depotId: DepotId): void {
    if (this._status === 'ASSIGNED') {
      throw new InvalidRollingStockStateError(
        `Cannot send unit ${this.id} to maintenance while assigned to a composition`,
        'UNIT_CURRENTLY_ASSIGNED'
      );
    }
    if (this._status === 'DECOMMISSIONED') {
      throw new InvalidRollingStockStateError(
        `Cannot send decommissioned unit ${this.id} to maintenance`,
        'UNIT_DECOMMISSIONED'
      );
    }
    this._currentDepotId = depotId;
    this._status = 'IN_MAINTENANCE';
  }

  /**
   * Completes maintenance, restoring condition up to newCondition cap.
   */
  public completeMaintenance(newCondition: number): void {
    if (this._status !== 'IN_MAINTENANCE') {
      throw new InvalidRollingStockStateError(
        `Cannot complete maintenance on unit ${this.id}: not in maintenance`,
        'NOT_IN_MAINTENANCE'
      );
    }
    this._conditionPercentage = Math.max(0, Math.min(100, Math.round(newCondition * 100) / 100));
    this._kmSinceLastMaintenance = toKm(0);
    this._status = 'AVAILABLE';
  }

  /**
   * Records kilometer usage and applies wear.
   */
  public recordRun(distanceKm: Km, conditionLossPercentage: number): void {
    if (this._status === 'DECOMMISSIONED' || this._status === 'IN_MAINTENANCE') {
      throw new InvalidRollingStockStateError(
        `Unit ${this.id} cannot perform a run in status ${this._status}`,
        'INVALID_RUN_STATUS'
      );
    }
    const distanceVal = distanceKm as number;
    this._odometerKm = toKm((this._odometerKm as number) + distanceVal);
    this._kmSinceLastMaintenance = toKm((this._kmSinceLastMaintenance as number) + distanceVal);
    this._conditionPercentage = Math.max(0, Math.round((this._conditionPercentage - conditionLossPercentage) * 100) / 100);
  }

  /**
   * Transfers current physical depot location.
   */
  public transferDepot(newDepotId: DepotId): void {
    if (this._status === 'ASSIGNED') {
      throw new InvalidRollingStockStateError(
        `Cannot transfer assigned unit ${this.id} to depot`,
        'UNIT_CURRENTLY_ASSIGNED'
      );
    }
    this._currentDepotId = newDepotId;
  }

  /**
   * Decommissions an end-of-life or damaged unit permanently.
   */
  public decommission(): void {
    this._status = 'DECOMMISSIONED';
    this._assignedCompositionId = undefined;
  }
}
