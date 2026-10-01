import { describe, it, expect } from 'vitest';
import {
  toMoney,
  toKm,
  createBrandedId,
  ContractId,
  CompanyId,
  StationId,
  SpecId,
} from '@railway/shared';
import { B2BTariffCalculator } from '../src/calculators/b2b-tariff.calculator.js';
import { B2BContractEntity } from '../src/entities/b2b-contract.entity.js';

describe('B2B Cargo Contracts (ECONOMY_RULES.md §3.3 & DOMAIN_MODEL.md §5.7)', () => {
  it('computes exact cargo delivery revenue for Container freight', () => {
    // 50 tons, 200 km
    // Base handling: Rp 50,000 * 50 = Rp 2,500,000
    // Tariff: Rp 550 * 200 * 50 = Rp 5,500,000
    // Total: Rp 8,000,000
    const revenue = B2BTariffCalculator.calculateCargoRevenue('CONTAINER', 50, toKm(200));
    expect(revenue).toBe(toMoney(8_000_000));
  });

  it('computes exact cargo delivery revenue for Commodity bulk freight', () => {
    // 1,000 tons, 100 km
    // Base handling: Rp 15,000 * 1,000 = Rp 15,000,000
    // Tariff: Rp 300 * 100 * 1,000 = Rp 30,000,000
    // Total: Rp 45,000,000
    const revenue = B2BTariffCalculator.calculateCargoRevenue('COMMODITY', 1_000, toKm(100));
    expect(revenue).toBe(toMoney(45_000_000));
  });

  it('manages B2BContractEntity lifecycle, delivery tracking, and fulfillment', () => {
    const distance = toKm(200);
    const ratePerTon = B2BTariffCalculator.calculateRatePerTon('CONTAINER', distance); // Rp 160,000 / ton

    const contract = new B2BContractEntity({
      id: createBrandedId<ContractId>('CTR_B2B_KRAKATAU_STEEL'),
      companyId: createBrandedId<CompanyId>('CMP_KAI'),
      clientName: 'PT Krakatau Steel',
      cargoCategory: 'CONTAINER',
      originStationId: createBrandedId<StationId>('STN_CLG_CILEGON'),
      destinationStationId: createBrandedId<StationId>('STN_GMR_GAMBIR'),
      requiredWeeklyVolumeTons: 100,
      requiredWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_PPCW_CONTAINER'),
      revenuePerTonDelivered: ratePerTon,
      latePenaltyPerTon: toMoney(50_000),
      durationDays: 14, // 2 weeks -> total 200 tons required
    });

    expect(contract.status).toBe('OFFERED');
    expect(contract.totalContractRequiredVolumeTons).toBe(200);

    // Accept contract
    contract.acceptContract();
    expect(contract.status).toBe('ACTIVE');

    // Deliver 100 tons on time
    const del1 = contract.recordDelivery(100, false);
    expect(del1.revenueEarned).toBe(toMoney(16_000_000));
    expect(del1.penaltyIncurred).toBe(toMoney(0));
    expect(del1.netRevenue).toBe(toMoney(16_000_000));

    // Deliver 100 tons late (Rp 50,000 penalty / ton = Rp 5,000,000 penalty)
    const del2 = contract.recordDelivery(100, true);
    expect(del2.revenueEarned).toBe(toMoney(16_000_000));
    expect(del2.penaltyIncurred).toBe(toMoney(5_000_000));
    expect(del2.netRevenue).toBe(toMoney(11_000_000));

    // Advance 14 days
    for (let day = 0; day < 14; day++) {
      contract.advanceDay();
    }

    expect(contract.remainingDays).toBe(0);
    expect(contract.status).toBe('FULFILLED');
    expect(contract.deliveredVolumeTons).toBe(200);
  });

  it('marks contract as BREACHED if target volume is not met at expiration', () => {
    const distance = toKm(150);
    const ratePerTon = B2BTariffCalculator.calculateRatePerTon('INDUSTRIAL', distance);

    const contract = new B2BContractEntity({
      id: createBrandedId<ContractId>('CTR_B2B_SEMEN_GRESIK'),
      companyId: createBrandedId<CompanyId>('CMP_KAI'),
      clientName: 'PT Semen Gresik',
      cargoCategory: 'INDUSTRIAL',
      originStationId: createBrandedId<StationId>('STN_GSK_GRESIK'),
      destinationStationId: createBrandedId<StationId>('STN_SBY_SURABAYA'),
      requiredWeeklyVolumeTons: 500,
      requiredWagonSpecId: createBrandedId<SpecId>('SPEC_WAGON_ZZOW_COAL'),
      revenuePerTonDelivered: ratePerTon,
      latePenaltyPerTon: toMoney(20_000),
      durationDays: 7, // 1 week -> 500 tons required
    });

    contract.acceptContract();
    // Only deliver 200 tons out of 500
    contract.recordDelivery(200, false);

    for (let i = 0; i < 7; i++) {
      contract.advanceDay();
    }

    expect(contract.remainingDays).toBe(0);
    expect(contract.status).toBe('BREACHED');
  });
});
