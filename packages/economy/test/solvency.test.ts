import { describe, it, expect } from 'vitest';
import { toMoney } from '@railway/shared';
import { SolvencyEngine } from '../src/calculators/solvency.engine.js';

describe('SolvencyEngine (ECONOMY_RULES.md §6.2, §6.3)', () => {
  it('identifies SOLVENT state when cash balance is positive or zero', () => {
    const eval1 = SolvencyEngine.evaluateSolvency(toMoney(1_000_000_000));
    expect(eval1.status).toBe('SOLVENT');
    expect(eval1.isOperatingBlocked).toBe(false);

    const eval2 = SolvencyEngine.evaluateSolvency(toMoney(0));
    expect(eval2.status).toBe('SOLVENT');
    expect(eval2.isOperatingBlocked).toBe(false);
  });

  it('identifies WARNING state when operating within overdraft credit limit (-10B < cash < 0)', () => {
    // Deficit of -5 Billion (within 10 Billion overdraft limit)
    const evaluation = SolvencyEngine.evaluateSolvency(toMoney(-5_000_000_000));
    expect(evaluation.status).toBe('WARNING');
    expect(evaluation.isOperatingBlocked).toBe(false);
    expect(evaluation.warningNotice).toMatch(/Operating in bank overdraft credit/);
  });

  it('identifies INSOLVENT state when overdraft is exhausted (-15B < cash <= -10B)', () => {
    // Deficit of -12 Billion (exceeds 10B overdraft, but above -15B critical floor)
    const evaluation = SolvencyEngine.evaluateSolvency(toMoney(-12_000_000_000));
    expect(evaluation.status).toBe('INSOLVENT');
    expect(evaluation.isOperatingBlocked).toBe(false);
    expect(evaluation.warningNotice).toMatch(/Technical insolvency/);
  });

  it('tracks countdown and triggers SUSPENDED when deficit <= -15B for 14 consecutive days', () => {
    const criticalDeficit = toMoney(-16_000_000_000); // Beyond critical floor

    let consecutiveDays = 0;

    // Days 1 through 13: still INSOLVENT with active countdown
    for (let day = 1; day <= 13; day++) {
      const evaluation = SolvencyEngine.evaluateSolvency(criticalDeficit, consecutiveDays);
      expect(evaluation.status).toBe('INSOLVENT');
      expect(evaluation.isOperatingBlocked).toBe(false);
      expect(evaluation.consecutiveCriticalDays).toBe(day);
      expect(evaluation.warningNotice).toMatch(/Critical insolvency warning/);
      consecutiveDays = evaluation.consecutiveCriticalDays;
    }

    // Day 14: threshold breached -> SUSPENDED and operations blocked
    const finalEvaluation = SolvencyEngine.evaluateSolvency(criticalDeficit, consecutiveDays);
    expect(finalEvaluation.status).toBe('SUSPENDED');
    expect(finalEvaluation.isOperatingBlocked).toBe(true);
    expect(finalEvaluation.consecutiveCriticalDays).toBe(14);
    expect(finalEvaluation.warningNotice).toMatch(/CRITICAL INSOLVENCY BREACH/);
  });

  it('resets consecutive critical days when capital injection restores solvency', () => {
    // Day 1 at critical deficit
    const eval1 = SolvencyEngine.evaluateSolvency(toMoney(-16_000_000_000), 0);
    expect(eval1.consecutiveCriticalDays).toBe(1);

    // Player injects capital or sells assets, restoring positive cash
    const eval2 = SolvencyEngine.evaluateSolvency(toMoney(500_000_000), eval1.consecutiveCriticalDays);
    expect(eval2.status).toBe('SOLVENT');
    expect(eval2.consecutiveCriticalDays).toBe(0);
    expect(eval2.isOperatingBlocked).toBe(false);
  });
});
