import {
  TransactionId,
  CompanyId,
  GameTimestamp,
  Money,
} from '@railway/shared';

export type TransactionCategory =
  // REVENUE
  | 'REV_PASSENGER_TICKETS'
  | 'REV_CARGO_FREIGHT'
  | 'REV_CHARTER'
  | 'REV_GOVERNMENT_SUBSIDY'
  // OPEX
  | 'OPEX_WORKFORCE_PAYROLL'
  | 'OPEX_FUEL_ENERGY'
  | 'OPEX_MAINTENANCE_PARTS'
  | 'OPEX_DEPOT_FACILITIES'
  | 'OPEX_TRACK_ACCESS_FEE'
  | 'OPEX_ADMIN_OVERHEAD'
  // CAPEX
  | 'CAPEX_ROLLING_STOCK_PURCHASE'
  | 'CAPEX_DEPOT_CONSTRUCTION'
  | 'CAPEX_DEPOT_UPGRADE';

export type AccountingClass = 'REVENUE' | 'OPEX' | 'CAPEX';

export type SolvencyStatus = 'SOLVENT' | 'WARNING' | 'INSOLVENT' | 'SUSPENDED';

export interface FinancialTransaction {
  readonly id: TransactionId;
  readonly companyId: CompanyId;
  readonly timestamp: GameTimestamp;
  readonly category: TransactionCategory;
  readonly amount: Money; // Positive = inflow/credit, Negative = outflow/debit
  readonly referenceEntityId?: string;
  readonly description: string;
}

export interface LedgerSummary {
  readonly initialCapital: Money;
  readonly totalRevenue: Money;
  readonly totalOpex: Money;
  readonly totalCapex: Money;
  readonly netOperatingIncome: Money;
  readonly netCashFlow: Money;
  readonly currentCashBalance: Money;
  readonly transactionCount: number;
}
