import { Money, toMoney } from '@railway/shared';
import { SolvencyStatus } from '../types/economy.types.js';

export interface SolvencyEvaluation {
  readonly status: SolvencyStatus;
  readonly currentCash: Money;
  readonly consecutiveCriticalDays: number;
  readonly isOperatingBlocked: boolean;
  readonly warningNotice?: string;
}

export class SolvencyEngine {
  /**
   * Initial capital endowment for new player company (ECONOMY_RULES.md §6.1)
   */
  public static readonly STARTER_CAPITAL: Money = toMoney(100_000_000_000); // 100 Billion IDR

  /**
   * Maximum working capital overdraft facility (ECONOMY_RULES.md §6.2)
   */
  public static readonly OVERDRAFT_CREDIT_LIMIT: Money = toMoney(10_000_000_000); // 10 Billion IDR

  /**
   * Critical insolvency floor before bankruptcy countdown (ECONOMY_RULES.md §6.3)
   */
  public static readonly CRITICAL_INSOLVENCY_FLOOR: Money = toMoney(-15_000_000_000); // -15 Billion IDR

  /**
   * Consecutive days permitted in critical insolvency before operating license is revoked
   */
  public static readonly MAX_CRITICAL_INSOLVENCY_DAYS = 14;

  /**
   * Evaluates company solvency status and license suspension conditions (ECONOMY_RULES.md §6.3).
   */
  public static evaluateSolvency(
    currentCash: Money,
    consecutiveCriticalDays: number = 0
  ): SolvencyEvaluation {
    const overdraftThreshold = -this.OVERDRAFT_CREDIT_LIMIT;

    // Normal solvent
    if (currentCash >= 0) {
      return {
        status: 'SOLVENT',
        currentCash,
        consecutiveCriticalDays: 0,
        isOperatingBlocked: false,
      };
    }

    // Within overdraft credit facility: WARNING
    if (currentCash > overdraftThreshold) {
      return {
        status: 'WARNING',
        currentCash,
        consecutiveCriticalDays: 0,
        isOperatingBlocked: false,
        warningNotice: `Operating in bank overdraft credit. Balance: Rp ${currentCash}. Overdraft limit: Rp ${this.OVERDRAFT_CREDIT_LIMIT}`,
      };
    }

    // Overdraft exhausted but above critical bankruptcy floor: INSOLVENT
    if (currentCash > this.CRITICAL_INSOLVENCY_FLOOR) {
      return {
        status: 'INSOLVENT',
        currentCash,
        consecutiveCriticalDays: 0,
        isOperatingBlocked: false,
        warningNotice: `Technical insolvency: Overdraft credit exhausted. Balance: Rp ${currentCash}`,
      };
    }

    // At or below critical floor: increment countdown
    const updatedCriticalDays = consecutiveCriticalDays + 1;
    if (updatedCriticalDays >= this.MAX_CRITICAL_INSOLVENCY_DAYS) {
      return {
        status: 'SUSPENDED',
        currentCash,
        consecutiveCriticalDays: updatedCriticalDays,
        isOperatingBlocked: true,
        warningNotice: `CRITICAL INSOLVENCY BREACH: Deficit of Rp ${currentCash} sustained for ${updatedCriticalDays} consecutive days. Operating license SUSPENDED.`,
      };
    }

    return {
      status: 'INSOLVENT',
      currentCash,
      consecutiveCriticalDays: updatedCriticalDays,
      isOperatingBlocked: false,
      warningNotice: `Critical insolvency warning: ${this.MAX_CRITICAL_INSOLVENCY_DAYS - updatedCriticalDays} days remaining before license suspension.`,
    };
  }
}
