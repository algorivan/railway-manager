import { describe, it, expect } from 'vitest';
import { toMinutes } from '@railway/shared';
import { LoadFactorCalculator } from '../src/calculators/load-factor.calculator.js';

describe('LoadFactorCalculator (SIMULATION_RULES.md §4.1)', () => {
  it('computes standard load factor within capacity (LF <= 1.00)', () => {
    const metrics = LoadFactorCalculator.calculateLoadFactor(170, 200);
    expect(metrics.loadFactorRatio).toBe(0.85);
    expect(metrics.isOvercrowded).toBe(false);
    expect(metrics.overcrowdingPenaltyFactor).toBe(0.0);
  });

  it('computes mild overcrowding (1.00 < LF <= 1.50)', () => {
    // 240 passengers in 200 capacity consist -> LF = 1.20
    // Phi = 1.5 * (1.20 - 1.00) = 0.30
    const metrics = LoadFactorCalculator.calculateLoadFactor(240, 200);
    expect(metrics.loadFactorRatio).toBe(1.20);
    expect(metrics.isOvercrowded).toBe(true);
    expect(metrics.overcrowdingPenaltyFactor).toBeCloseTo(0.30, 3);
  });

  it('computes severe overcrowding (LF > 1.50)', () => {
    // 360 passengers in 200 capacity consist -> LF = 1.80
    // Phi = 0.75 + 3.0 * (1.80 - 1.50) = 0.75 + 0.90 = 1.65
    const metrics = LoadFactorCalculator.calculateLoadFactor(360, 200);
    expect(metrics.loadFactorRatio).toBe(1.80);
    expect(metrics.isOvercrowded).toBe(true);
    expect(metrics.overcrowdingPenaltyFactor).toBeCloseTo(1.65, 3);
  });

  it('calculates station category base dwell times correctly', () => {
    // Minor station (<2 platforms) -> 2 min
    expect(LoadFactorCalculator.getBaseDwellMinutes(1)).toBe(toMinutes(2));
    // Intermediate station (2-4 platforms) -> 4 min
    expect(LoadFactorCalculator.getBaseDwellMinutes(3)).toBe(toMinutes(4));
    expect(LoadFactorCalculator.getBaseDwellMinutes(4)).toBe(toMinutes(4));
    // Major terminal (>4 platforms) -> 8 min
    expect(LoadFactorCalculator.getBaseDwellMinutes(6)).toBe(toMinutes(8));
  });

  it('penalizes dwell time during overcrowding (SIMULATION_RULES.md §4.1)', () => {
    const baseDwell = toMinutes(4); // Intermediate station

    // Normal LF = 0.90 -> dwell is base (4 min)
    expect(LoadFactorCalculator.calculateEffectiveDwellTime(baseDwell, 0.90)).toBe(toMinutes(4));

    // Mild overcrowding LF = 1.20 -> Phi = 0.30 -> ceil(4 * 1.30) = ceil(5.2) = 6 min
    expect(LoadFactorCalculator.calculateEffectiveDwellTime(baseDwell, 1.20)).toBe(toMinutes(6));

    // Severe overcrowding LF = 1.80 -> Phi = 1.65 -> ceil(4 * 2.65) = ceil(10.6) = 11 min
    expect(LoadFactorCalculator.calculateEffectiveDwellTime(baseDwell, 1.80)).toBe(toMinutes(11));
  });

  it('rejects invalid non-positive capacities or negative passengers', () => {
    expect(() => LoadFactorCalculator.calculateLoadFactor(100, 0)).toThrow(RangeError);
    expect(() => LoadFactorCalculator.calculateLoadFactor(-5, 100)).toThrow(RangeError);
  });
});
