import { describe, expect, it } from 'vitest';
import {
  calculateTrackAccessCharge,
  InvalidTrackAccessInputError,
  TAC_BASE_RATE_PER_TRAIN_KM,
  TAC_WEIGHT_SURCHARGE,
} from '../src/calculators/track-access.js';

describe('Track Access Charge (TAC) Calculator', () => {
  it('verifies CRITICAL REFERENCE VECTOR: Gambir - Bandung (160 km, 350 tons) = 6,800,000 IDR', () => {
    const charge = calculateTrackAccessCharge({
      distanceKm: 160.0,
      consistWeightTons: 350.0,
    });

    // Breakdown:
    // Surcharge: 5,000 * (350 / 100) = 17,500 IDR/km
    // Total Rate: 25,000 + 17,500 = 42,500 IDR/km
    // Cost: 160 * 42,500 = 6,800,000 IDR
    expect(charge).toBe(6_800_000);
  });

  it('verifies rate constants match docs/ECONOMY_RULES.md §4.1', () => {
    expect(TAC_BASE_RATE_PER_TRAIN_KM).toBe(25_000);
    expect(TAC_WEIGHT_SURCHARGE).toBe(5_000);
  });

  it('returns 0 IDR when distance is 0', () => {
    const charge = calculateTrackAccessCharge({
      distanceKm: 0,
      consistWeightTons: 350.0,
    });
    expect(charge).toBe(0);
  });

  it('handles fractional consist weight and rounds to nearest integer Rupiah', () => {
    // 345.5 tons over 160 km:
    // Rate = 25,000 + 5,000 * 3.455 = 25,000 + 17,275 = 42,275
    // Cost = 160 * 42,275 = 6,764,000 IDR
    const charge = calculateTrackAccessCharge({
      distanceKm: 160.0,
      consistWeightTons: 345.5,
    });
    expect(charge).toBe(6_764_000);
  });

  it('rejects negative distance', () => {
    expect(() =>
      calculateTrackAccessCharge({ distanceKm: -10, consistWeightTons: 350 })
    ).toThrow(InvalidTrackAccessInputError);
  });

  it('rejects non-positive consist weight', () => {
    expect(() =>
      calculateTrackAccessCharge({ distanceKm: 160, consistWeightTons: 0 })
    ).toThrow(InvalidTrackAccessInputError);
    expect(() =>
      calculateTrackAccessCharge({ distanceKm: 160, consistWeightTons: -50 })
    ).toThrow(InvalidTrackAccessInputError);
  });
});
