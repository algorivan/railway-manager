import {
  Money,
  Km,
  Tons,
  toMoney,
  addMoney,
  multiplyMoney,
  createBrandedId,
  SpecId,
} from '@railway/shared';
import { CargoCategory, CargoTariff } from '../types/contract.types.js';

export class B2BTariffCalculator {
  public static readonly TARIFFS: Record<CargoCategory, CargoTariff> = Object.freeze({
    PARCEL: Object.freeze({
      cargoCategory: 'PARCEL',
      baseHandlingFeePerTon: toMoney(150_000),
      tariffPerTonKm: toMoney(850),
      defaultWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_PPCW_CONTAINER'),
    }),
    CONTAINER: Object.freeze({
      cargoCategory: 'CONTAINER',
      baseHandlingFeePerTon: toMoney(50_000),
      tariffPerTonKm: toMoney(550),
      defaultWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_PPCW_CONTAINER'),
    }),
    INDUSTRIAL: Object.freeze({
      cargoCategory: 'INDUSTRIAL',
      baseHandlingFeePerTon: toMoney(30_000),
      tariffPerTonKm: toMoney(420),
      defaultWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_ZZOW_COAL'),
    }),
    COMMODITY: Object.freeze({
      cargoCategory: 'COMMODITY',
      baseHandlingFeePerTon: toMoney(15_000),
      tariffPerTonKm: toMoney(300),
      defaultWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_ZZOW_COAL'),
    }),
    SPECIALIZED: Object.freeze({
      cargoCategory: 'SPECIALIZED',
      baseHandlingFeePerTon: toMoney(75_000),
      tariffPerTonKm: toMoney(650),
      defaultWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_PPCW_CONTAINER'),
    }),
  });

  /**
   * Computes cargo delivery revenue (ECONOMY_RULES.md §3.3):
   * Rev = VolumeTons * (BaseHandlingFee + TariffPerTonKm * DistanceKm)
   */
  public static calculateCargoRevenue(
    category: CargoCategory,
    volumeTons: Tons | number,
    distanceKm: Km
  ): Money {
    if (volumeTons < 0) {
      throw new RangeError(`Volume tons must be non-negative, received: ${volumeTons}`);
    }
    const tariff = this.TARIFFS[category];
    const distanceComponent = multiplyMoney(tariff.tariffPerTonKm, distanceKm);
    const unitRevenuePerTon = addMoney(tariff.baseHandlingFeePerTon, distanceComponent);
    return multiplyMoney(unitRevenuePerTon, volumeTons);
  }

  /**
   * Calculates rate per ton for a specific route corridor.
   */
  public static calculateRatePerTon(category: CargoCategory, distanceKm: Km): Money {
    const tariff = this.TARIFFS[category];
    const distanceCharge = multiplyMoney(tariff.tariffPerTonKm, distanceKm);
    return addMoney(tariff.baseHandlingFeePerTon, distanceCharge);
  }

  /**
   * Computes penalty for late delivered tons.
   */
  public static calculateLatePenalty(lateVolumeTons: Tons | number, penaltyPerTon: Money): Money {
    if (lateVolumeTons <= 0) {
      return toMoney(0);
    }
    return multiplyMoney(penaltyPerTon, lateVolumeTons);
  }
}
