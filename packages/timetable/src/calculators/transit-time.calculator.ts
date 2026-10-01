import {
  Km,
  Kmh,
  Minutes,
  toKmh,
  toMinutes,
} from '@railway/shared';

export interface TransitSpeedParameters {
  readonly trainMaxSpeedKmh: Kmh;
  readonly consistLimitSpeedKmh: Kmh;
  readonly trackSpeedLimitKmh: Kmh;
  readonly temporarySpeedRestrictionKmh?: Kmh;
}

export class TransitTimeCalculator {
  /**
   * Acceleration and deceleration allowances (SIMULATION_RULES.md §3.2)
   */
  public static readonly PASSENGER_ACCEL_DECEL_MARGIN_MINUTES = 2.0;
  public static readonly FREIGHT_ACCEL_DECEL_MARGIN_MINUTES = 4.0;

  /**
   * Computes effective operating speed along a corridor segment (SIMULATION_RULES.md §3.1)
   * V_eff = min( V_train_max, V_consist_limit, V_track_limit, V_restriction )
   */
  public static calculateEffectiveSpeed(params: TransitSpeedParameters): Kmh {
    const speeds: number[] = [
      params.trainMaxSpeedKmh,
      params.consistLimitSpeedKmh,
      params.trackSpeedLimitKmh,
    ];
    if (params.temporarySpeedRestrictionKmh !== undefined) {
      speeds.push(params.temporarySpeedRestrictionKmh);
    }
    const minSpeed = Math.min(...speeds);
    return toKmh(Math.max(1, Math.floor(minSpeed)));
  }

  /**
   * Computes scheduled transit runtime for a segment including acceleration/braking margin.
   * T_transit = ceil( (D_seg / V_eff) * 60 + T_margin )
   * (SIMULATION_RULES.md §3.2)
   */
  public static calculateTransitMinutes(
    segmentDistanceKm: Km,
    effectiveSpeedKmh: Kmh,
    isFreight: boolean = false
  ): Minutes {
    if (effectiveSpeedKmh <= 0) {
      throw new RangeError(`Effective speed must be positive, received: ${effectiveSpeedKmh}`);
    }
    const margin = isFreight
      ? this.FREIGHT_ACCEL_DECEL_MARGIN_MINUTES
      : this.PASSENGER_ACCEL_DECEL_MARGIN_MINUTES;

    const baseTravelTime = (segmentDistanceKm / effectiveSpeedKmh) * 60;
    const totalMinutes = Math.ceil(baseTravelTime + margin);

    return toMinutes(totalMinutes);
  }
}
