import { describe, it, expect } from 'vitest';
import { toMoney, toKm, createBrandedId, StationId } from '@railway/shared';
import { DemandCalculator } from '../src/calculators/demand.calculator.js';
import { FareCalculator } from '../src/calculators/fare.calculator.js';

describe('DemandCalculator (SIMULATION_RULES.md §5)', () => {
  it('correctly maps time-of-day multipliers and windows', () => {
    // 05:00 (minute 300) -> EARLY_MORNING (0.80)
    expect(DemandCalculator.getTimeOfDayFactor(300)).toEqual({
      window: 'EARLY_MORNING',
      multiplier: 0.80,
    });

    // 07:30 (minute 450) -> MORNING_PEAK (1.40)
    expect(DemandCalculator.getTimeOfDayFactor(450)).toEqual({
      window: 'MORNING_PEAK',
      multiplier: 1.40,
    });

    // 12:00 (minute 720) -> MIDDAY_OFF_PEAK (0.90)
    expect(DemandCalculator.getTimeOfDayFactor(720)).toEqual({
      window: 'MIDDAY_OFF_PEAK',
      multiplier: 0.90,
    });

    // 16:30 (minute 990) -> EVENING_PEAK (1.35)
    expect(DemandCalculator.getTimeOfDayFactor(990)).toEqual({
      window: 'EVENING_PEAK',
      multiplier: 1.35,
    });

    // 20:00 (minute 1200) -> NIGHT_TRAVEL (1.10)
    expect(DemandCalculator.getTimeOfDayFactor(1200)).toEqual({
      window: 'NIGHT_TRAVEL',
      multiplier: 1.10,
    });

    // 02:00 (minute 120) -> LATE_NIGHT (0.30)
    expect(DemandCalculator.getTimeOfDayFactor(120)).toEqual({
      window: 'LATE_NIGHT',
      multiplier: 0.30,
    });
  });

  it('evaluates price elasticity curves and price cliff', () => {
    const benchmark = toMoney(100_000);

    // At benchmark price: E = (1.0)^(-epsilon) = 1.0
    expect(DemandCalculator.calculateFareElasticity('ECONOMY', benchmark, benchmark)).toBeCloseTo(1.0, 4);
    expect(DemandCalculator.calculateFareElasticity('EXECUTIVE', benchmark, benchmark)).toBeCloseTo(1.0, 4);
    expect(DemandCalculator.calculateFareElasticity('LUXURY', benchmark, benchmark)).toBeCloseTo(1.0, 4);

    // Economy with 10% price hike: (1.10)^(-1.60) = 0.85856...
    const eco10Pct = toMoney(110_000);
    const elasticityEco = DemandCalculator.calculateFareElasticity('ECONOMY', eco10Pct, benchmark);
    expect(elasticityEco).toBeCloseTo(0.8586, 3);

    // Luxury with 10% price hike: (1.10)^(-0.35) ~ 0.967
    const lux10Pct = toMoney(110_000);
    const elasticityLux = DemandCalculator.calculateFareElasticity('LUXURY', lux10Pct, benchmark);
    expect(elasticityLux).toBeCloseTo(0.967, 3);

    // Price cliff: P > 2.5 * P_bar -> elasticity is 0
    const cliffPrice = toMoney(251_000);
    expect(DemandCalculator.calculateFareElasticity('ECONOMY', cliffPrice, benchmark)).toBe(0.0);
    expect(DemandCalculator.calculateFareElasticity('EXECUTIVE', cliffPrice, benchmark)).toBe(0.0);
    expect(DemandCalculator.calculateFareElasticity('LUXURY', cliffPrice, benchmark)).toBe(0.0);
  });

  it('evaluates service frequency curve (SIMULATION_RULES.md §5.2.4)', () => {
    // f = 1: 1.0 - 0.7 * e^(-0.45 * 1) ~ 0.5537
    expect(DemandCalculator.calculateFrequencyMultiplier(1)).toBeCloseTo(0.5537, 2);

    // f = 3: 1.0 - 0.7 * e^(-0.45 * 3) ~ 0.8185
    expect(DemandCalculator.calculateFrequencyMultiplier(3)).toBeCloseTo(0.8185, 2);

    // f = 6: 1.0 - 0.7 * e^(-0.45 * 6) ~ 0.9529
    expect(DemandCalculator.calculateFrequencyMultiplier(6)).toBeCloseTo(0.9529, 2);

    // f = 12: tends towards 1.0
    expect(DemandCalculator.calculateFrequencyMultiplier(12)).toBeGreaterThan(0.99);
  });

  it('computes end-to-end corridor demand deterministically', () => {
    const distance = toKm(160);
    const origin = createBrandedId<StationId>('STN_GMR_GAMBIR');
    const destination = createBrandedId<StationId>('STN_BD_BANDUNG');

    const ecoBenchmark = FareCalculator.calculateBenchmarkFare('ECONOMY', distance);
    const execBenchmark = FareCalculator.calculateBenchmarkFare('EXECUTIVE', distance);
    const luxBenchmark = FareCalculator.calculateBenchmarkFare('LUXURY', distance);

    const result = DemandCalculator.calculateDemand({
      originStationId: origin,
      destinationStationId: destination,
      distanceKm: distance,
      departureMinuteOfDay: 450, // 07:30 (Morning Peak: 1.40)
      baseDemand: 1000,
      chargedFares: {
        ECONOMY: ecoBenchmark,
        EXECUTIVE: execBenchmark,
        LUXURY: luxBenchmark,
      },
      dailyFrequency: 6,         // ~0.9529
      serviceQuality: 0.80,      // Q = 0.70 + 0.30 * 0.80 = 0.94
      companyReputation: 0.90,   // R = 0.50 + 0.50 * 0.90 = 0.95
    });

    expect(result.timeWindow).toBe('MORNING_PEAK');
    expect(result.timeOfDayMultiplier).toBe(1.40);
    expect(result.frequencyMultiplier).toBeCloseTo(0.9529, 2);
    expect(result.serviceQualityIndex).toBeCloseTo(0.94, 2);
    expect(result.reputationFactor).toBeCloseTo(0.95, 2);

    // Multiplier product: 1.40 * 0.9529 * 0.94 * 0.95 ~ 1.191
    // Eco: 1000 * 0.70 * 1.191 * 1.0 ~ 833
    // Exec: 1000 * 0.25 * 1.191 * 1.0 ~ 297
    // Lux: 1000 * 0.05 * 1.191 * 1.0 ~ 59
    expect(result.byClass.ECONOMY.generatedDemand).toBeGreaterThan(800);
    expect(result.byClass.EXECUTIVE.generatedDemand).toBeGreaterThan(250);
    expect(result.byClass.LUXURY.generatedDemand).toBeGreaterThan(50);
    expect(result.totalGeneratedDemand).toBe(
      result.byClass.ECONOMY.generatedDemand +
      result.byClass.EXECUTIVE.generatedDemand +
      result.byClass.LUXURY.generatedDemand
    );
  });
});
