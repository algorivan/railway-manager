import {
  CompanyId,
  Money,
  toMoney,
  addMoney,
} from '@railway/shared';
import {
  FinancialTransaction,
  TransactionCategory,
  AccountingClass,
  LedgerSummary,
} from '../types/economy.types.js';

export class GeneralLedgerEntity {
  public readonly companyId: CompanyId;
  public readonly initialCapital: Money;

  private _transactions: FinancialTransaction[] = [];
  private _currentCashBalance: Money;

  constructor(companyId: CompanyId, initialCapital: Money) {
    if (!companyId) {
      throw new Error('GeneralLedger requires companyId');
    }
    this.companyId = companyId;
    this.initialCapital = initialCapital;
    this._currentCashBalance = initialCapital;
  }

  public get currentCashBalance(): Money {
    return this._currentCashBalance;
  }

  public get transactions(): ReadonlyArray<FinancialTransaction> {
    return Object.freeze([...this._transactions]);
  }

  public static getAccountingClass(category: TransactionCategory): AccountingClass {
    if (category.startsWith('REV_')) {
      return 'REVENUE';
    }
    if (category.startsWith('OPEX_')) {
      return 'OPEX';
    }
    if (category.startsWith('CAPEX_')) {
      return 'CAPEX';
    }
    throw new Error(`Unknown transaction category: ${category}`);
  }

  /**
   * Posts an immutable transaction to the double-entry general ledger (ECONOMY_RULES.md §2.2).
   * Enforces strict accounting sign invariants:
   * - REVENUE must be positive (credit)
   * - OPEX and CAPEX must be negative (debit)
   */
  public postTransaction(tx: FinancialTransaction): void {
    if (tx.companyId !== this.companyId) {
      throw new Error(`Transaction companyId ${tx.companyId} does not match ledger companyId ${this.companyId}`);
    }

    const accountingClass = GeneralLedgerEntity.getAccountingClass(tx.category);

    if (accountingClass === 'REVENUE' && tx.amount < 0) {
      throw new RangeError(`Revenue transaction ${tx.category} must have a non-negative amount, received: ${tx.amount}`);
    }
    if ((accountingClass === 'OPEX' || accountingClass === 'CAPEX') && tx.amount > 0) {
      throw new RangeError(
        `Expense transaction ${tx.category} must have a non-positive amount (debit), received: ${tx.amount}`
      );
    }

    this._transactions.push(Object.freeze({ ...tx }));
    this._currentCashBalance = addMoney(this._currentCashBalance, tx.amount);
  }

  public getSummary(): LedgerSummary {
    let totalRevenue = toMoney(0);
    let totalOpex = toMoney(0);
    let totalCapex = toMoney(0);

    for (const tx of this._transactions) {
      const cls = GeneralLedgerEntity.getAccountingClass(tx.category);
      if (cls === 'REVENUE') {
        totalRevenue = addMoney(totalRevenue, tx.amount);
      } else if (cls === 'OPEX') {
        // totalOpex is stored as positive magnitude
        totalOpex = addMoney(totalOpex, toMoney(Math.abs(tx.amount)));
      } else if (cls === 'CAPEX') {
        // totalCapex is stored as positive magnitude
        totalCapex = addMoney(totalCapex, toMoney(Math.abs(tx.amount)));
      }
    }

    const netOperatingIncome = toMoney(totalRevenue - totalOpex);
    const netCashFlow = toMoney(totalRevenue - (totalOpex + totalCapex));

    return {
      initialCapital: this.initialCapital,
      totalRevenue,
      totalOpex,
      totalCapex,
      netOperatingIncome,
      netCashFlow,
      currentCashBalance: this._currentCashBalance,
      transactionCount: this._transactions.length,
    };
  }

  public getTransactionsByCategory(category: TransactionCategory): ReadonlyArray<FinancialTransaction> {
    return this._transactions.filter((tx) => tx.category === category);
  }

  public getTransactionsByReference(referenceEntityId: string): ReadonlyArray<FinancialTransaction> {
    return this._transactions.filter((tx) => tx.referenceEntityId === referenceEntityId);
  }

  public getTransactionsByDay(day: number): ReadonlyArray<FinancialTransaction> {
    return this._transactions.filter((tx) => tx.timestamp.day === day);
  }
}
