import {
  ServiceRunId,
  TimetableSlotId,
  StationId,
  Money,
  toMoney,
  addMoney,
} from '@railway/shared';
import {
  ServiceStatus,
  ActiveServiceRunProps,
} from '../types/timetable.types.js';

export class ActiveServiceRunEntity {
  public readonly id: ServiceRunId;
  public readonly timetableSlotId: TimetableSlotId;

  private _currentStationId: StationId;
  private _nextStationId: StationId;
  private _status: ServiceStatus;
  private _delayMinutes: number;
  private _passengerCount: Record<'ECONOMY' | 'EXECUTIVE' | 'LUXURY', number>;
  private _revenueAccrued: Money;
  private _opexAccrued: Money;

  constructor(props: ActiveServiceRunProps) {
    if (!props.id || !props.timetableSlotId || !props.currentStationId || !props.nextStationId) {
      throw new Error('ActiveServiceRun requires id, timetableSlotId, currentStationId, and nextStationId');
    }

    this.id = props.id;
    this.timetableSlotId = props.timetableSlotId;
    this._currentStationId = props.currentStationId;
    this._nextStationId = props.nextStationId;
    this._status = props.status ?? 'SCHEDULED';
    this._delayMinutes = props.delayMinutes ?? 0;
    this._passengerCount = props.passengerCount
      ? { ...props.passengerCount }
      : { ECONOMY: 0, EXECUTIVE: 0, LUXURY: 0 };
    this._revenueAccrued = props.revenueAccrued ?? toMoney(0);
    this._opexAccrued = props.opexAccrued ?? toMoney(0);
  }

  public get currentStationId(): StationId {
    return this._currentStationId;
  }

  public get nextStationId(): StationId {
    return this._nextStationId;
  }

  public get status(): ServiceStatus {
    return this._status;
  }

  public get delayMinutes(): number {
    return this._delayMinutes;
  }

  public get passengerCount(): Readonly<Record<'ECONOMY' | 'EXECUTIVE' | 'LUXURY', number>> {
    return Object.freeze({ ...this._passengerCount });
  }

  public get totalPassengers(): number {
    return this._passengerCount.ECONOMY + this._passengerCount.EXECUTIVE + this._passengerCount.LUXURY;
  }

  public get revenueAccrued(): Money {
    return this._revenueAccrued;
  }

  public get opexAccrued(): Money {
    return this._opexAccrued;
  }

  public startBoarding(): void {
    if (this._status !== 'SCHEDULED') {
      throw new Error(`Cannot start boarding from status ${this._status}`);
    }
    this._status = 'BOARDING';
  }

  public depart(nextTargetStationId: StationId): void {
    if (this._status !== 'BOARDING' && this._status !== 'DWELL') {
      throw new Error(`Cannot depart from status ${this._status}`);
    }
    this._nextStationId = nextTargetStationId;
    this._status = 'IN_TRANSIT';
  }

  public arriveAtStation(stationId: StationId): void {
    if (this._status !== 'IN_TRANSIT') {
      throw new Error(`Cannot arrive at station from status ${this._status}`);
    }
    this._currentStationId = stationId;
    this._status = 'DWELL';
  }

  public beginTurnaround(): void {
    if (this._status !== 'DWELL') {
      throw new Error(`Cannot begin turnaround from status ${this._status}`);
    }
    this._status = 'TURNAROUND';
  }

  public complete(): void {
    if (this._status !== 'TURNAROUND' && this._status !== 'DWELL') {
      throw new Error(`Cannot complete service run from status ${this._status}`);
    }
    this._status = 'COMPLETED';
  }

  public cancel(_reason?: string): void {
    if (this._status === 'COMPLETED') {
      throw new Error('Cannot cancel an already completed service run');
    }
    this._status = 'CANCELLED';
  }

  public recordDelay(additionalMinutes: number): void {
    if (additionalMinutes < 0) {
      throw new RangeError(`Delay minutes must be non-negative, received: ${additionalMinutes}`);
    }
    this._delayMinutes += additionalMinutes;
  }

  public boardPassengers(passengersByClass: Partial<Record<'ECONOMY' | 'EXECUTIVE' | 'LUXURY', number>>): void {
    if (passengersByClass.ECONOMY) this._passengerCount.ECONOMY += passengersByClass.ECONOMY;
    if (passengersByClass.EXECUTIVE) this._passengerCount.EXECUTIVE += passengersByClass.EXECUTIVE;
    if (passengersByClass.LUXURY) this._passengerCount.LUXURY += passengersByClass.LUXURY;
  }

  public recordRevenue(amount: Money): void {
    this._revenueAccrued = addMoney(this._revenueAccrued, amount);
  }

  public recordOpex(amount: Money): void {
    this._opexAccrued = addMoney(this._opexAccrued, amount);
  }
}
