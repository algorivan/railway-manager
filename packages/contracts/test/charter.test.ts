import { describe, it, expect } from 'vitest';
import {
  toMoney,
  createBrandedId,
  ContractId,
  CompanyId,
  RouteId,
} from '@railway/shared';
import { CharterPricingCalculator } from '../src/calculators/charter-pricing.calculator.js';
import { CharterContractEntity } from '../src/entities/charter-contract.entity.js';

describe('Charter Operations & Spot-Market Pricing (ECONOMY_RULES.md §3.4)', () => {
  it('computes corporate executive charter pricing with 80% markup and 120% opportunity cost', () => {
    const directOpex = toMoney(10_000_000); // 10 Million
    const projectedRegularRevenue = toMoney(20_000_000); // 20 Million

    // OPEX component: 10M * (1 + 0.80) = 18,000,000 IDR
    // Opportunity cost: 20M * 1.20 = 24,000,000 IDR
    // Total price: 18M + 24M = 42,000,000 IDR
    const quote = CharterPricingCalculator.calculateCharterPrice(
      'CORPORATE_EXECUTIVE',
      directOpex,
      projectedRegularRevenue
    );

    expect(quote.marginMarkup).toBe(0.80);
    expect(quote.opexComponent).toBe(toMoney(18_000_000));
    expect(quote.opportunityCost).toBe(toMoney(24_000_000));
    expect(quote.totalOfferedPrice).toBe(toMoney(42_000_000));
  });

  it('computes tourism charter pricing with 45% markup and 120% opportunity cost', () => {
    const directOpex = toMoney(8_000_000);
    const projectedRegularRevenue = toMoney(15_000_000);

    // OPEX component: 8M * (1 + 0.45) = 11,600,000 IDR
    // Opportunity cost: 15M * 1.20 = 18,000,000 IDR
    // Total price: 11.6M + 18M = 29,600,000 IDR
    const quote = CharterPricingCalculator.calculateCharterPrice(
      'TOURISM_GROUP',
      directOpex,
      projectedRegularRevenue
    );

    expect(quote.marginMarkup).toBe(0.45);
    expect(quote.opexComponent).toBe(toMoney(11_600_000));
    expect(quote.opportunityCost).toBe(toMoney(18_000_000));
    expect(quote.totalOfferedPrice).toBe(toMoney(29_600_000));
  });

  it('manages CharterContractEntity lifecycle from REQUESTED to SETTLED', () => {
    const directOpex = toMoney(10_000_000);
    const projectedRegularRevenue = toMoney(20_000_000);

    const charter = new CharterContractEntity({
      id: createBrandedId<ContractId>('CTR_CHARTER_VIP_BANK_MANDIRI'),
      companyId: createBrandedId<CompanyId>('CMP_KAI'),
      clientName: 'PT Bank Mandiri (Persero) Tbk',
      charterType: 'CORPORATE_EXECUTIVE',
      routeId: createBrandedId<RouteId>('ROUTE_GMR_BD'),
      requestedDay: 5,
      departureMinuteOfDay: 480, // 08:00
      directOpex,
      projectedRegularRevenue,
    });

    expect(charter.status).toBe('REQUESTED');

    // Rejecting underpriced quote (Min quote is 42M)
    expect(() => charter.confirm(toMoney(35_000_000))).toThrow(/below minimum acceptable quote/);

    // Confirm with acceptable quote
    charter.confirm(toMoney(45_000_000));
    expect(charter.status).toBe('CONFIRMED');
    expect(charter.agreedPrice).toBe(toMoney(45_000_000));

    // Dispatch
    charter.dispatch();
    expect(charter.status).toBe('DISPATCHED');

    // Settle
    charter.settle();
    expect(charter.status).toBe('SETTLED');
  });
});
