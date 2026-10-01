import { describe, it, expect } from 'vitest';
import { toMoney, toKm } from '@railway/shared';
import { FareCalculator } from '../src/calculators/fare.calculator.js';

describe('FareCalculator (ECONOMY_RULES.md §3.1, §3.2, §7)', () => {
  it('computes exact benchmark fares for Gambir - Bandung (160 km)', () => {
    const distance = toKm(160);

    // Economy: 15,000 + (450 * 160) = 87,000 IDR
    const ecoFare = FareCalculator.calculateBenchmarkFare('ECONOMY', distance);
    expect(ecoFare).toBe(toMoney(87_000));

    // Executive: 50,000 + (1,250 * 160) = 250,000 IDR
    const execFare = FareCalculator.calculateBenchmarkFare('EXECUTIVE', distance);
    expect(execFare).toBe(toMoney(250_000));

    // Luxury: 150,000 + (3,500 * 160) = 710,000 IDR
    const luxFare = FareCalculator.calculateBenchmarkFare('LUXURY', distance);
    expect(luxFare).toBe(toMoney(710_000));
  });

  it('allows valid custom fares within regulatory bands', () => {
    const distance = toKm(100);
    // Allowed Executive rate: [800, 2,500] IDR/km
    const customRate = toMoney(1_500);
    const fare = FareCalculator.calculateCustomFare('EXECUTIVE', distance, customRate);
    // 50,000 + (1,500 * 100) = 200,000 IDR
    expect(fare).toBe(toMoney(200_000));
  });

  it('rejects custom rates outside regulatory bounds', () => {
    const distance = toKm(100);
    // Economy allowed: [250, 900] IDR/km
    const predatoryLowRate = toMoney(200);
    const extortionHighRate = toMoney(1_000);

    expect(() => FareCalculator.calculateCustomFare('ECONOMY', distance, predatoryLowRate)).toThrow(RangeError);
    expect(() => FareCalculator.calculateCustomFare('ECONOMY', distance, extortionHighRate)).toThrow(RangeError);
  });

  it('computes ancillary dining revenue matching Test Vector 1 (ECONOMY_RULES.md §7)', () => {
    // 170 Executive passengers * Rp 35,000 = Rp 5,950,000
    const diningRevenue = FareCalculator.calculateDiningRevenue({
      ECONOMY: 0,
      EXECUTIVE: 170,
      LUXURY: 0,
    });
    expect(diningRevenue).toBe(toMoney(5_950_000));
  });

  it('computes mixed multi-class dining revenue correctly', () => {
    // 100 Eco (10k) + 50 Exec (35k) + 10 Lux (85k)
    // = 1,000,000 + 1,750,000 + 850,000 = 3,600,000 IDR
    const diningRevenue = FareCalculator.calculateDiningRevenue({
      ECONOMY: 100,
      EXECUTIVE: 50,
      LUXURY: 10,
    });
    expect(diningRevenue).toBe(toMoney(3_600_000));
  });
});
