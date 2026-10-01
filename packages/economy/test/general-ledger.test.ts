import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  CompanyId,
  TransactionId,
  GameTimestamp,
} from '@railway/shared';
import { GeneralLedgerEntity } from '../src/entities/general-ledger.entity.js';
import { SolvencyEngine } from '../src/calculators/solvency.engine.js';

describe('GeneralLedgerEntity (ECONOMY_RULES.md §2.2 & DOMAIN_MODEL.md §5.9)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI');
  const dummyTimestamp: GameTimestamp = { day: 1, minuteOfDay: 480, totalMinutes: 480 };

  it('initializes with starter capital (Rp 100 Miliar) and 0 transactions', () => {
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    expect(ledger.currentCashBalance).toBe(toMoney(100_000_000_000));
    expect(ledger.transactions.length).toBe(0);

    const summary = ledger.getSummary();
    expect(summary.totalRevenue).toBe(toMoney(0));
    expect(summary.totalOpex).toBe(toMoney(0));
    expect(summary.totalCapex).toBe(toMoney(0));
    expect(summary.netCashFlow).toBe(toMoney(0));
  });

  it('posts revenues (credits) and expenses (debits) accurately updating cash balance', () => {
    const ledger = new GeneralLedgerEntity(companyId, toMoney(10_000_000));

    // Revenue: Ticket sales +Rp 50,000,000
    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_001'),
      companyId,
      timestamp: dummyTimestamp,
      category: 'REV_PASSENGER_TICKETS',
      amount: toMoney(50_000_000),
      description: 'Gambir - Bandung ticket sales',
    });

    // OPEX: Fuel -Rp 9,120,000
    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_002'),
      companyId,
      timestamp: dummyTimestamp,
      category: 'OPEX_FUEL_ENERGY',
      amount: toMoney(-9_120_000),
      description: 'Diesel fuel Gambir - Bandung',
    });

    // OPEX: Track Access Fee -Rp 6,800,000
    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_003'),
      companyId,
      timestamp: dummyTimestamp,
      category: 'OPEX_TRACK_ACCESS_FEE',
      amount: toMoney(-6_800_000),
      description: 'TAC Gambir - Bandung',
    });

    // CAPEX: Rolling stock down payment -Rp 20,000,000
    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_004'),
      companyId,
      timestamp: dummyTimestamp,
      category: 'CAPEX_ROLLING_STOCK_PURCHASE',
      amount: toMoney(-20_000_000),
      description: 'Carriage procurement down payment',
    });

    // Initial (10M) + 50M - 9.12M - 6.8M - 20M = 24,080,000 IDR
    expect(ledger.currentCashBalance).toBe(toMoney(24_080_000));

    const summary = ledger.getSummary();
    expect(summary.totalRevenue).toBe(toMoney(50_000_000));
    expect(summary.totalOpex).toBe(toMoney(15_920_000)); // 9.12M + 6.8M
    expect(summary.totalCapex).toBe(toMoney(20_000_000));
    // Net operating income: 50M - 15.92M = 34,080,000 IDR
    expect(summary.netOperatingIncome).toBe(toMoney(34_080_000));
    // Net cash flow: 50M - 35.92M = 14,080,000 IDR
    expect(summary.netCashFlow).toBe(toMoney(14_080_000));
  });

  it('enforces accounting sign conventions on debit/credit categories', () => {
    const ledger = new GeneralLedgerEntity(companyId, toMoney(10_000_000));

    // Negative revenue is prohibited
    expect(() =>
      ledger.postTransaction({
        id: createBrandedId<TransactionId>('TX_ERR_1'),
        companyId,
        timestamp: dummyTimestamp,
        category: 'REV_PASSENGER_TICKETS',
        amount: toMoney(-1_000_000),
        description: 'Illegal negative revenue',
      })
    ).toThrow(RangeError);

    // Positive OPEX is prohibited
    expect(() =>
      ledger.postTransaction({
        id: createBrandedId<TransactionId>('TX_ERR_2'),
        companyId,
        timestamp: dummyTimestamp,
        category: 'OPEX_FUEL_ENERGY',
        amount: toMoney(5_000_000),
        description: 'Illegal positive expense',
      })
    ).toThrow(RangeError);
  });

  it('filters transactions by category, reference entity, and day', () => {
    const ledger = new GeneralLedgerEntity(companyId, toMoney(100_000_000));

    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_10'),
      companyId,
      timestamp: { day: 1, minuteOfDay: 100, totalMinutes: 100 },
      category: 'REV_PASSENGER_TICKETS',
      amount: toMoney(10_000_000),
      referenceEntityId: 'ROUTE_GMR_BD',
      description: 'Trip 1',
    });

    ledger.postTransaction({
      id: createBrandedId<TransactionId>('TX_11'),
      companyId,
      timestamp: { day: 2, minuteOfDay: 200, totalMinutes: 1640 },
      category: 'REV_PASSENGER_TICKETS',
      amount: toMoney(15_000_000),
      referenceEntityId: 'ROUTE_GMR_SBY',
      description: 'Trip 2',
    });

    expect(ledger.getTransactionsByCategory('REV_PASSENGER_TICKETS').length).toBe(2);
    expect(ledger.getTransactionsByReference('ROUTE_GMR_BD').length).toBe(1);
    expect(ledger.getTransactionsByDay(2).length).toBe(1);
  });
});
