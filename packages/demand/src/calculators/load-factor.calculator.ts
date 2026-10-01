import { Minutes, toMinutes, toPercentage, Percentage } from '@railway/shared';

export interface LoadFactorMetrics {
  readonly totalPassengers: number;
  readonly totalCapacity: number;
  readonly loadFactorRatio: number;
  readonly loadFactorPercentage: Percentage;
  readonly isOvercrowded: boolean;
  readonly overcrowdingPenaltyFactor: number;
}

export class LoadFactorCalculator {
  /**
   * Computes the load factor metrics given total passengers and rated capacity.
   */
  public static calculateLoadFactor(passengers: number, capacity: number): LoadFactorMetrics {
    if (capacity <= 0) {
      throw new RangeError(`Capacity must be greater than zero, received: ${capacity}`);
    }
    if (passengers < 0) {
      throw new RangeError(`Passengers must be non-negative, received: ${passengers}`);
    }

    const ratio = passengers / capacity;
    const boundedPct = Math.min(100.0, Math.max(0.0, ratio * 100));
    const percentage = toPercentage(boundedPct);
    const penaltyFactor = this.calculateOvercrowdingPenalty(ratio);

    return {
      totalPassengers: passengers,
      totalCapacity: capacity,
      loadFactorRatio: Math.round(ratio * 1000) / 1000,
      loadFactorPercentage: percentage,
      isOvercrowded: ratio > 1.00,
      overcrowdingPenaltyFactor: Math.round(penaltyFactor * 1000) / 1000,
    };
  }

  /**
   * Computes the overcrowding penalty factor Phi_overcrowd (SIMULATION_RULES.md §4.1.2)
   * Phi = 0                              if LF <= 1.00
   * Phi = 1.5 * (LF - 1.00)              if 1.00 < LF <= 1.50
   * Phi = 0.75 + 3.0 * (LF - 1.50)       if LF > 1.50
   */
  public static calculateOvercrowdingPenalty(loadFactorRatio: number): number {
    if (loadFactorRatio <= 1.00) {
      return 0.0;
    }
    if (loadFactorRatio <= 1.50) {
      return 1.5 * (loadFactorRatio - 1.00);
    }
    return 0.75 + 3.0 * (loadFactorRatio - 1.50);
  }

  /**
   * Gets base dwell time by platform count (SIMULATION_RULES.md §4.1.1):
   * Minor Station / Halte (< 2 platforms): 2 minutes
   * Intermediate Station (2 - 4 platforms): 4 minutes
   * Major Terminal Station (> 4 platforms): 8 minutes
   */
  public static getBaseDwellMinutes(platformCount: number): Minutes {
    if (platformCount < 2) {
      return toMinutes(2);
    }
    if (platformCount <= 4) {
      return toMinutes(4);
    }
    return toMinutes(8);
  }

  /**
   * Computes effective dwell time considering overcrowding penalty.
   * T_dwell = ceil( T_base_dwell * (1 + Phi_overcrowd) )
   * (SIMULATION_RULES.md §4.1)
   */
  public static calculateEffectiveDwellTime(baseDwell: Minutes, loadFactorRatio: number): Minutes {
    const penalty = this.calculateOvercrowdingPenalty(loadFactorRatio);
    const effective = Math.ceil(baseDwell * (1.0 + penalty));
    return toMinutes(effective);
  }
}
