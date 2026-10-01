import { Money } from '@railway/shared';
import {
  PassengerClass,
  TimeWindow,
  DemandCalculationInput,
  DemandCalculationResult,
  ClassDemandBreakdown,
} from '../types/demand.types.js';
import { FareCalculator } from './fare.calculator.js';

export class DemandCalculator {
  /**
   * Class demand distribution shares (SIMULATION_RULES.md §5.2.1)
   */
  public static readonly CLASS_SHARES: Record<PassengerClass, number> = Object.freeze({
    ECONOMY: 0.70,
    EXECUTIVE: 0.25,
    LUXURY: 0.05,
  });

  /**
   * Elasticity exponents (SIMULATION_RULES.md §5.2.3)
   */
  public static readonly ELASTICITY_EXPONENTS: Record<PassengerClass, number> = Object.freeze({
    ECONOMY: 1.60,
    EXECUTIVE: 0.75,
    LUXURY: 0.35,
  });

  /**
   * Maximum allowed price multiplier before demand drops to zero (SIMULATION_RULES.md §5.2.3)
   */
  public static readonly MAX_PRICE_RATIO_CLIFF = 2.5;

  /**
   * Determines the Time Window and Multiplier T(W) from the minute of the day.
   * (SIMULATION_RULES.md §5.2.2)
   */
  public static getTimeOfDayFactor(minuteOfDay: number): { window: TimeWindow; multiplier: number } {
    const modMinute = ((minuteOfDay % 1440) + 1440) % 1440;
    const hour = Math.floor(modMinute / 60);

    // 04:00 - 05:59: Early Morning (0.80)
    if (hour >= 4 && hour < 6) {
      return { window: 'EARLY_MORNING', multiplier: 0.80 };
    }
    // 06:00 - 08:59: Morning Peak (1.40)
    if (hour >= 6 && hour < 9) {
      return { window: 'MORNING_PEAK', multiplier: 1.40 };
    }
    // 09:00 - 14:59: Midday Off-Peak (0.90)
    if (hour >= 9 && hour < 15) {
      return { window: 'MIDDAY_OFF_PEAK', multiplier: 0.90 };
    }
    // 15:00 - 18:59: Evening Peak (1.35)
    if (hour >= 15 && hour < 19) {
      return { window: 'EVENING_PEAK', multiplier: 1.35 };
    }
    // 19:00 - 22:59: Night Travel (1.10)
    if (hour >= 19 && hour < 23) {
      return { window: 'NIGHT_TRAVEL', multiplier: 1.10 };
    }
    // 23:00 - 03:59: Late Night (0.30)
    return { window: 'LATE_NIGHT', multiplier: 0.30 };
  }

  /**
   * Evaluates the fare price elasticity factor E_C(P_C, P_bar_C).
   * E_C = (P_C / P_bar_C)^(-epsilon_C)
   * If P_C > 2.5 * P_bar_C, E_C = 0.
   */
  public static calculateFareElasticity(
    passengerClass: PassengerClass,
    chargedFare: Money,
    benchmarkFare: Money
  ): number {
    if (benchmarkFare <= 0) {
      return 1.0;
    }
    const ratio = chargedFare / benchmarkFare;

    if (ratio > this.MAX_PRICE_RATIO_CLIFF) {
      return 0.0;
    }
    if (ratio <= 0) {
      // Free ticket gives high demand ceiling capped at benchmark ratio of 0.25 (4x multiplier max)
      const epsilon = this.ELASTICITY_EXPONENTS[passengerClass];
      return Math.pow(0.25, -epsilon);
    }

    const epsilon = this.ELASTICITY_EXPONENTS[passengerClass];
    return Math.pow(ratio, -epsilon);
  }

  /**
   * Evaluates the service frequency multiplier F(f).
   * F(f) = 1.0 - 0.7 * e^(-0.45 * f)
   * (SIMULATION_RULES.md §5.2.4)
   */
  public static calculateFrequencyMultiplier(dailyFrequency: number): number {
    const f = Math.max(0, dailyFrequency);
    return 1.0 - 0.7 * Math.exp(-0.45 * f);
  }

  /**
   * Evaluates the service quality index Q(q).
   * Q(q) = 0.70 + 0.30 * q, where q in [0.0, 1.0]
   * (SIMULATION_RULES.md §5.2.5)
   */
  public static calculateServiceQualityIndex(serviceQuality: number): number {
    const q = Math.max(0.0, Math.min(1.0, serviceQuality));
    return 0.70 + 0.30 * q;
  }

  /**
   * Evaluates the company reputation factor R(rep).
   * R(rep) = 0.50 + 0.50 * rep, where rep in [0.0, 1.0]
   * (SIMULATION_RULES.md §5.2.6)
   */
  public static calculateReputationFactor(reputation: number): number {
    const rep = Math.max(0.0, Math.min(1.0, reputation));
    return 0.50 + 0.50 * rep;
  }

  /**
   * Computes comprehensive deterministic passenger demand for a scheduled slot.
   * Demand_ABC(W) = floor( BaseDemand * omega_C * T(W) * E_C * F(f) * Q(q) * R(rep) )
   */
  public static calculateDemand(input: DemandCalculationInput): DemandCalculationResult {
    const { window, multiplier: timeFactor } = this.getTimeOfDayFactor(input.departureMinuteOfDay);
    const freqFactor = this.calculateFrequencyMultiplier(input.dailyFrequency);
    const qualityFactor = this.calculateServiceQualityIndex(input.serviceQuality);
    const repFactor = this.calculateReputationFactor(input.companyReputation);

    const classes: PassengerClass[] = ['ECONOMY', 'EXECUTIVE', 'LUXURY'];
    const breakdowns: Partial<Record<PassengerClass, ClassDemandBreakdown>> = {};
    let totalDemand = 0;

    for (const pClass of classes) {
      const share = this.CLASS_SHARES[pClass];
      const baseAllocation = input.baseDemand * share;
      const benchmarkFare = FareCalculator.calculateBenchmarkFare(pClass, input.distanceKm);
      const chargedFare = input.chargedFares[pClass];
      const elasticity = this.calculateFareElasticity(pClass, chargedFare, benchmarkFare);

      // Raw unrounded demand
      const rawDemand = baseAllocation * timeFactor * elasticity * freqFactor * qualityFactor * repFactor;
      const generatedDemand = Math.floor(Math.max(0, rawDemand));

      breakdowns[pClass] = {
        classShare: share,
        baseAllocation,
        fareCharged: chargedFare,
        benchmarkFare,
        elasticityFactor: elasticity,
        generatedDemand,
      };

      totalDemand += generatedDemand;
    }

    return {
      originStationId: input.originStationId,
      destinationStationId: input.destinationStationId,
      distanceKm: input.distanceKm,
      departureMinuteOfDay: input.departureMinuteOfDay,
      timeWindow: window,
      timeOfDayMultiplier: timeFactor,
      frequencyMultiplier: freqFactor,
      serviceQualityIndex: qualityFactor,
      reputationFactor: repFactor,
      byClass: breakdowns as Record<PassengerClass, ClassDemandBreakdown>,
      totalGeneratedDemand: totalDemand,
    };
  }
}
