import {
  Money,
  Km,
  toMoney,
  addMoney,
  multiplyMoney,
} from '@railway/shared';
import { PassengerClass, FareStructure } from '../types/demand.types.js';

export class FareCalculator {
  public static readonly TARIFFS: Record<PassengerClass, FareStructure> = Object.freeze({
    ECONOMY: Object.freeze({
      boardingFee: toMoney(15_000),
      benchmarkPerKm: toMoney(450),
      minAllowedFarePerKm: toMoney(250),
      maxAllowedFarePerKm: toMoney(900),
    }),
    EXECUTIVE: Object.freeze({
      boardingFee: toMoney(50_000),
      benchmarkPerKm: toMoney(1_250),
      minAllowedFarePerKm: toMoney(800),
      maxAllowedFarePerKm: toMoney(2_500),
    }),
    LUXURY: Object.freeze({
      boardingFee: toMoney(150_000),
      benchmarkPerKm: toMoney(3_500),
      minAllowedFarePerKm: toMoney(2_000),
      maxAllowedFarePerKm: toMoney(7_000),
    }),
  });

  public static readonly ANCILLARY_SPEND_PER_PAX: Record<PassengerClass, Money> = Object.freeze({
    ECONOMY: toMoney(10_000),
    EXECUTIVE: toMoney(35_000),
    LUXURY: toMoney(85_000),
  });

  /**
   * Computes the benchmark neutral ticket fare for a given passenger class and distance.
   * Fare = BoardingFee + (BenchmarkPerKm * DistanceKm)
   */
  public static calculateBenchmarkFare(passengerClass: PassengerClass, distanceKm: Km): Money {
    const tariff = this.TARIFFS[passengerClass];
    const distanceCharge = multiplyMoney(tariff.benchmarkPerKm, distanceKm);
    return addMoney(tariff.boardingFee, distanceCharge);
  }

  /**
   * Computes the ticket fare for custom per-km rate.
   * Fare = BoardingFee + (RatePerKm * DistanceKm)
   */
  public static calculateCustomFare(
    passengerClass: PassengerClass,
    distanceKm: Km,
    ratePerKm: Money
  ): Money {
    const tariff = this.TARIFFS[passengerClass];
    if (ratePerKm < tariff.minAllowedFarePerKm || ratePerKm > tariff.maxAllowedFarePerKm) {
      throw new RangeError(
        `Fare rate Rp ${ratePerKm}/km is out of allowed regulatory bounds [Rp ${tariff.minAllowedFarePerKm} - Rp ${tariff.maxAllowedFarePerKm}] for class ${passengerClass}`
      );
    }
    const distanceCharge = multiplyMoney(ratePerKm, distanceKm);
    return addMoney(tariff.boardingFee, distanceCharge);
  }

  /**
   * Validates if a per-km fare is within regulatory limits.
   */
  public static isWithinRegulatoryBounds(passengerClass: PassengerClass, ratePerKm: Money): boolean {
    const tariff = this.TARIFFS[passengerClass];
    return ratePerKm >= tariff.minAllowedFarePerKm && ratePerKm <= tariff.maxAllowedFarePerKm;
  }

  /**
   * Computes total dining car ancillary revenue when a dining car is in service.
   * Rev = sum(Passengers_c * AvgSpend_c)
   */
  public static calculateDiningRevenue(passengerCounts: Record<PassengerClass, number>): Money {
    let total = toMoney(0);
    for (const pClass of ['ECONOMY', 'EXECUTIVE', 'LUXURY'] as const) {
      const count = passengerCounts[pClass] ?? 0;
      if (count > 0) {
        const spend = multiplyMoney(this.ANCILLARY_SPEND_PER_PAX[pClass], count);
        total = addMoney(total, spend);
      }
    }
    return total;
  }
}
