import { describe, expect, it } from 'vitest';
import {
  calculateEffectiveSpeed,
  calculateEffectiveSpeedKmh,
  InvalidSpeedConstraintError,
} from '../src/calculators/speed.js';

describe('Effective Speed Calculator', () => {
  it('verifies CRITICAL REFERENCE VECTOR: (120, 100, 110, 80) = 80 km/h', () => {
    // Lead loco = 120 km/h, consist = 100 km/h, track = 110 km/h, TSR = 80 km/h
    const vEff = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 120,
      consistLimitKmh: 100,
      trackLimitKmh: 110,
      operationalRestrictionKmh: 80,
    });
    expect(vEff).toBe(80);

    // With alias temporarySpeedRestriction
    expect(
      calculateEffectiveSpeedKmh({
        trainMaxSpeedKmh: 120,
        consistLimitKmh: 100,
        trackLimitKmh: 110,
        temporarySpeedRestriction: 80,
      })
    ).toBe(80);
  });

  it('defaults to Infinity when TSR is omitted', () => {
    const vEff = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 120,
      consistLimitKmh: 100,
      trackLimitKmh: 110,
    });
    expect(vEff).toBe(100);
  });

  it('correctly resolves to 0 km/h when restriction is 0 (stop signal / track obstruction)', () => {
    const vEff = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 120,
      consistLimitKmh: 100,
      trackLimitKmh: 110,
      operationalRestrictionKmh: 0,
    });
    expect(vEff).toBe(0);
  });

  it('resolves when track geometry limit is the lowest constraint', () => {
    // Mountain section: track speed limit 60 km/h
    const vEff = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 120,
      consistLimitKmh: 120,
      trackLimitKmh: 60,
    });
    expect(vEff).toBe(60);
  });

  it('rejects negative speed constraints', () => {
    expect(() =>
      calculateEffectiveSpeed({
        trainMaxSpeedKmh: -10,
        consistLimitKmh: 100,
        trackLimitKmh: 100,
      })
    ).toThrow(InvalidSpeedConstraintError);

    expect(() =>
      calculateEffectiveSpeed({
        trainMaxSpeedKmh: 100,
        consistLimitKmh: 100,
        trackLimitKmh: 100,
        operationalRestrictionKmh: -5,
      })
    ).toThrow(InvalidSpeedConstraintError);
  });
});
