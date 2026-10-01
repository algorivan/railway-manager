import {
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
  Minutes,
  toMinutes,
} from '@railway/shared';
import {
  DayOfWeek,
  TimetableSlotProps,
} from '../types/timetable.types.js';

export class TimetableSlotEntity {
  public readonly id: TimetableSlotId;
  public readonly routeId: RouteId;
  public readonly compositionId: CompositionId;
  public readonly departureMinuteOfDay: number;
  public readonly scheduledArrivalMinuteOfDay: number;
  public readonly operatingDays: ReadonlyArray<DayOfWeek>;

  private _primaryDriverId: EmployeeId;
  private _primaryConductorId?: EmployeeId;
  private _active: boolean;

  constructor(props: TimetableSlotProps) {
    if (!props.id || !props.routeId || !props.compositionId || !props.primaryDriverId) {
      throw new Error('TimetableSlot requires id, routeId, compositionId, and primaryDriverId');
    }
    if (props.departureMinuteOfDay < 0 || props.departureMinuteOfDay >= 1440) {
      throw new RangeError(`Departure minute must be in [0, 1439], received: ${props.departureMinuteOfDay}`);
    }
    if (props.scheduledArrivalMinuteOfDay < 0 || props.scheduledArrivalMinuteOfDay >= 1440) {
      throw new RangeError(`Arrival minute must be in [0, 1439], received: ${props.scheduledArrivalMinuteOfDay}`);
    }
    if (props.operatingDays.length === 0) {
      throw new Error('TimetableSlot must operate on at least one day of the week');
    }

    this.id = props.id;
    this.routeId = props.routeId;
    this.compositionId = props.compositionId;
    this._primaryDriverId = props.primaryDriverId;
    this._primaryConductorId = props.primaryConductorId;
    this.departureMinuteOfDay = props.departureMinuteOfDay;
    this.scheduledArrivalMinuteOfDay = props.scheduledArrivalMinuteOfDay;
    this.operatingDays = Object.freeze([...props.operatingDays]);
    this._active = props.active ?? true;
  }

  public get primaryDriverId(): EmployeeId {
    return this._primaryDriverId;
  }

  public get primaryConductorId(): EmployeeId | undefined {
    return this._primaryConductorId;
  }

  public get active(): boolean {
    return this._active;
  }

  public get scheduledDurationMinutes(): Minutes {
    let duration = this.scheduledArrivalMinuteOfDay - this.departureMinuteOfDay;
    if (duration < 0) {
      duration += 1440; // Past midnight arrival
    }
    return toMinutes(duration);
  }

  public isOperatingOnDay(dayOfWeek: DayOfWeek): boolean {
    return this._active && this.operatingDays.includes(dayOfWeek);
  }

  public activate(): void {
    this._active = true;
  }

  public deactivate(): void {
    this._active = false;
  }

  public reassignCrew(driverId: EmployeeId, conductorId?: EmployeeId): void {
    this._primaryDriverId = driverId;
    this._primaryConductorId = conductorId;
  }
}
