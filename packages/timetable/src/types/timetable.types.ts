import {
  TimetableSlotId,
  ServiceRunId,
  RouteId,
  CompositionId,
  EmployeeId,
  StationId,
  Money,
  Minutes,
} from '@railway/shared';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type ServiceStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'IN_TRANSIT'
  | 'DWELL'
  | 'TURNAROUND'
  | 'COMPLETED'
  | 'CANCELLED';

export type ConsistTurnaroundType =
  | 'MULTIPLE_UNIT'
  | 'LOCOMOTIVE_PASSENGER'
  | 'FREIGHT_CONTAINER';

export interface TimetableSlotProps {
  readonly id: TimetableSlotId;
  readonly routeId: RouteId;
  readonly compositionId: CompositionId;
  readonly primaryDriverId: EmployeeId;
  readonly primaryConductorId?: EmployeeId;
  readonly departureMinuteOfDay: number; // 0..1439
  readonly scheduledArrivalMinuteOfDay: number; // 0..1439
  readonly operatingDays: ReadonlyArray<DayOfWeek>;
  readonly active?: boolean;
}

export interface ActiveServiceRunProps {
  readonly id: ServiceRunId;
  readonly timetableSlotId: TimetableSlotId;
  readonly currentStationId: StationId;
  readonly nextStationId: StationId;
  readonly status?: ServiceStatus;
  readonly delayMinutes?: number;
  readonly passengerCount?: Record<'ECONOMY' | 'EXECUTIVE' | 'LUXURY', number>;
  readonly revenueAccrued?: Money;
  readonly opexAccrued?: Money;
}

export interface TurnaroundValidationResult {
  readonly isValid: boolean;
  readonly requiredMinutes: Minutes;
  readonly actualBufferMinutes: Minutes;
  readonly conflictWarning?: string;
}
