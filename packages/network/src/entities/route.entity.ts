import {
  CompanyId,
  Km,
  Minutes,
  Money,
  RouteId,
  StationId,
  toKm,
  toMinutes,
  toMoney,
} from '@railway/shared';

export type ServiceType = 'LOCAL' | 'SEMI_EXPRESS' | 'EXPRESS' | 'INTERCITY';
export type RouteAccessStatus = 'LOCKED' | 'PERMIT_GRANTED' | 'SUSPENDED';

export interface RouteProps {
  readonly id: RouteId;
  readonly companyId: CompanyId;
  readonly code: string;
  readonly name: string;
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly stationSequence: ReadonlyArray<StationId>;
  readonly distanceKm: Km | number;
  readonly estimatedRuntimeMinutes?: Minutes | number;
  readonly serviceType?: ServiceType;
  readonly accessStatus?: RouteAccessStatus;
  readonly trackAccessFeePerKm?: Money | number;
}

export class InvalidRouteDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRouteDefinitionError';
    Object.setPrototypeOf(this, InvalidRouteDefinitionError.prototype);
  }
}

export class RouteEntity {
  public readonly id: RouteId;
  public readonly companyId: CompanyId;
  public readonly code: string;
  public readonly name: string;
  public readonly originStationId: StationId;
  public readonly destinationStationId: StationId;
  public readonly stationSequence: ReadonlyArray<StationId>;
  public readonly distanceKm: Km;
  public estimatedRuntimeMinutes: Minutes;
  public readonly serviceType: ServiceType;
  public accessStatus: RouteAccessStatus;
  public trackAccessFeePerKm: Money;

  constructor(props: RouteProps) {
    if (!props.stationSequence || props.stationSequence.length < 2) {
      throw new InvalidRouteDefinitionError('A route station sequence must contain at least 2 stations');
    }

    if (props.stationSequence[0] !== props.originStationId) {
      throw new InvalidRouteDefinitionError('First station in sequence must match originStationId');
    }

    if (props.stationSequence[props.stationSequence.length - 1] !== props.destinationStationId) {
      throw new InvalidRouteDefinitionError('Last station in sequence must match destinationStationId');
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.code = props.code;
    this.name = props.name;
    this.originStationId = props.originStationId;
    this.destinationStationId = props.destinationStationId;
    this.stationSequence = Object.freeze([...props.stationSequence]);
    this.distanceKm = toKm(props.distanceKm);
    this.estimatedRuntimeMinutes = toMinutes(props.estimatedRuntimeMinutes ?? 0);
    this.serviceType = props.serviceType ?? 'INTERCITY';
    this.accessStatus = props.accessStatus ?? 'LOCKED';
    this.trackAccessFeePerKm = toMoney(props.trackAccessFeePerKm ?? 25_000);
  }

  /**
   * Concession Lifecycle: Grants regulatory permit upon route opening payment.
   */
  public grantPermit(): void {
    this.accessStatus = 'PERMIT_GRANTED';
  }

  /**
   * Concession Lifecycle: Suspends access license (e.g., insolvency trigger).
   */
  public suspend(_reason?: string): void {
    this.accessStatus = 'SUSPENDED';
  }

  /**
   * Concession Lifecycle: Reinstates suspended access license.
   */
  public reinstate(): void {
    this.accessStatus = 'PERMIT_GRANTED';
  }

  /**
   * Returns true if route is active and permitted for train dispatch.
   */
  public isOperational(): boolean {
    return this.accessStatus === 'PERMIT_GRANTED';
  }

  /**
   * Estimates transit time for a track segment in minutes:
   * T_transit = ceil((D / V) * 60 + T_margin)
   * where T_margin = 2.0 min (passenger) or 4.0 min (freight).
   * Conforms to docs/SIMULATION_RULES.md §3.2.
   */
  public static estimateSegmentRuntime(distanceKm: number, speedKmh: number, isFreight = false): number {
    if (speedKmh <= 0) {
      throw new RangeError(`Speed must be strictly positive, received: ${speedKmh}`);
    }
    if (distanceKm <= 0) {
      throw new RangeError(`Distance must be strictly positive, received: ${distanceKm}`);
    }

    const marginMinutes = isFreight ? 4.0 : 2.0;
    const hours = distanceKm / speedKmh;
    const transitMinutes = hours * 60 + marginMinutes;
    return Math.ceil(transitMinutes);
  }
}
