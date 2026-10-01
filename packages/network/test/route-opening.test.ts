import { describe, expect, it } from 'vitest';
import {
  BASE_REGULATORY_FEE,
  calculateRouteOpeningCost,
  calculateRouteOpeningFee,
  CORRIDOR_LICENSING_PER_KM,
  InvalidRouteOpeningError,
  PREP_COST_PER_STATION,
} from '../src/calculators/route-opening.js';

describe('Regulatory Route Opening Cost Calculator', () => {
  it('verifies CRITICAL REFERENCE VECTOR: Gambir - Bandung (5 stations, 160 km) = 165,000,000 IDR', () => {
    const cost = calculateRouteOpeningCost({
      stationCount: 5,
      distanceKm: 160.0,
    });

    // Breakdown:
    // Base: 50,000,000
    // Prep: 5 * 15,000,000 = 75,000,000
    // Licensing: 160 * 250,000 = 40,000,000
    // Total: 165,000,000 IDR
    expect(cost).toBe(165_000_000);

    // Verify alias
    expect(calculateRouteOpeningFee({ stationCount: 5, distanceKm: 160.0 })).toBe(165_000_000);
  });

  it('verifies rate constants match docs/ECONOMY_RULES.md §5.3', () => {
    expect(BASE_REGULATORY_FEE).toBe(50_000_000);
    expect(PREP_COST_PER_STATION).toBe(15_000_000);
    expect(CORRIDOR_LICENSING_PER_KM).toBe(250_000);
  });

  it('calculates opening fee for alternative routes correctly', () => {
    // 2 stations, 60 km (Yogyakarta - Solo)
    // 50M + 2 * 15M + 60 * 250k = 50M + 30M + 15M = 95M IDR
    const cost = calculateRouteOpeningCost({
      stationCount: 2,
      distanceKm: 60.0,
    });
    expect(cost).toBe(95_000_000);
  });

  it('rejects invalid station count (< 2 or non-integer)', () => {
    expect(() => calculateRouteOpeningCost({ stationCount: 1, distanceKm: 100 })).toThrow(
      InvalidRouteOpeningError
    );
    expect(() => calculateRouteOpeningCost({ stationCount: 0, distanceKm: 100 })).toThrow(
      InvalidRouteOpeningError
    );
    expect(() => calculateRouteOpeningCost({ stationCount: 2.5, distanceKm: 100 })).toThrow(
      InvalidRouteOpeningError
    );
  });

  it('rejects invalid or non-positive distanceKm', () => {
    expect(() => calculateRouteOpeningCost({ stationCount: 3, distanceKm: 0 })).toThrow(
      InvalidRouteOpeningError
    );
    expect(() => calculateRouteOpeningCost({ stationCount: 3, distanceKm: -50 })).toThrow(
      InvalidRouteOpeningError
    );
    expect(() => calculateRouteOpeningCost({ stationCount: 3, distanceKm: NaN })).toThrow(
      InvalidRouteOpeningError
    );
  });
});
