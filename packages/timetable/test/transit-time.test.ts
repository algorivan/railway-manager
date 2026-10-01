import { describe, it, expect } from 'vitest';
import { toKm, toKmh, toMinutes } from '@railway/shared';
import { TransitTimeCalculator } from '../src/calculators/transit-time.calculator.js';

describe('TransitTimeCalculator (SIMULATION_RULES.md §3.1, §3.2)', () => {
  it('computes effective speed as the minimum constraint', () => {
    // Train max: 120, consist limit: 100, track limit: 120 -> V_eff = 100
    const eff1 = TransitTimeCalculator.calculateEffectiveSpeed({
      trainMaxSpeedKmh: toKmh(120),
      consistLimitSpeedKmh: toKmh(100),
      trackSpeedLimitKmh: toKmh(120),
    });
    expect(eff1).toBe(toKmh(100));

    // Mountainous segment track limit: 60 km/h
    const eff2 = TransitTimeCalculator.calculateEffectiveSpeed({
      trainMaxSpeedKmh: toKmh(120),
      consistLimitSpeedKmh: toKmh(100),
      trackSpeedLimitKmh: toKmh(60),
    });
    expect(eff2).toBe(toKmh(60));

    // Temporary speed restriction: 40 km/h
    const eff3 = TransitTimeCalculator.calculateEffectiveSpeed({
      trainMaxSpeedKmh: toKmh(120),
      consistLimitSpeedKmh: toKmh(100),
      trackSpeedLimitKmh: toKmh(120),
      temporarySpeedRestrictionKmh: toKmh(40),
    });
    expect(eff3).toBe(toKmh(40));
  });

  it('computes passenger transit time including 2.0 min accel/decel margin', () => {
    // 160 km at 100 km/h
    // Travel time: (160 / 100) * 60 = 96 min
    // Margin: 2.0 min -> ceil(96 + 2) = 98 min
    const transit = TransitTimeCalculator.calculateTransitMinutes(
      toKm(160),
      toKmh(100),
      false // passenger
    );
    expect(transit).toBe(toMinutes(98));
  });

  it('computes freight transit time including 4.0 min accel/decel margin', () => {
    // 100 km at 60 km/h
    // Travel time: (100 / 60) * 60 = 100 min
    // Margin: 4.0 min -> ceil(100 + 4) = 104 min
    const transit = TransitTimeCalculator.calculateTransitMinutes(
      toKm(100),
      toKmh(60),
      true // freight
    );
    expect(transit).toBe(toMinutes(104));
  });

  it('rejects invalid non-positive effective speeds', () => {
    expect(() => TransitTimeCalculator.calculateTransitMinutes(toKm(100), toKmh(0))).toThrow(RangeError);
  });
});
