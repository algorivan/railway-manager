import { describe, it, expect } from 'vitest';
import {
  toMoney,
  createBrandedId,
  ContractId,
  CompanyId,
  RouteId,
} from '@railway/shared';
import { PublicServiceObligationContractEntity } from '../src/entities/pso-contract.entity.js';

describe('Public Service Obligation (PSO) Contracts (ECONOMY_RULES.md §3.5)', () => {
  const createMockPso = () =>
    new PublicServiceObligationContractEntity({
      id: createBrandedId<ContractId>('CTR_PSO_LOKAL_BANDUNG_RAYA'),
      companyId: createBrandedId<CompanyId>('CMP_KAI'),
      routeId: createBrandedId<RouteId>('ROUTE_BD_RAYA'),
      maximumFareCap: toMoney(5_000), // Economy ticket capped at Rp 5,000
      minimumWeeklyFrequency: 14,     // 2 trips daily
      minimumOtpPercentage: 90.0,     // 90% OTP
      weeklySubsidyCompensation: toMoney(70_000_000), // Rp 70 Million / week
      penaltyForUnderperformance: toMoney(17_500_000), // 25% of subsidy
      contractDurationDays: 14,      // 2 weeks
    });

  it('enforces maximum fare cap compliance', () => {
    const pso = createMockPso();

    // Compliant fare
    expect(() => pso.validateFareCompliance(toMoney(4_000))).not.toThrow();
    expect(() => pso.validateFareCompliance(toMoney(5_000))).not.toThrow();

    // Violation above cap
    expect(() => pso.validateFareCompliance(toMoney(5_500))).toThrow(/violates PSO maximum fare cap/);
  });

  it('disburses 100% subsidy when fully compliant (14 trips, 100% OTP, 0 cancellations)', () => {
    const pso = createMockPso();

    // Run 14 on-time trips
    for (let i = 0; i < 14; i++) {
      pso.recordTrip(true);
    }

    const evalResult = pso.evaluateWeeklyCompliance(1);

    expect(evalResult.isCompliant).toBe(true);
    expect(evalResult.completedTrips).toBe(14);
    expect(evalResult.onTimeTrips).toBe(14);
    expect(evalResult.actualOtpPercentage).toBe(100.0);
    expect(evalResult.otpPenalty).toBe(toMoney(0));
    expect(evalResult.cancellationPenalty).toBe(toMoney(0));
    expect(evalResult.netDisbursement).toBe(toMoney(70_000_000));
    expect(pso.remainingDays).toBe(7);
  });

  it('penalizes underperformance when OTP falls below threshold (ECONOMY_RULES.md §3.5.3)', () => {
    const pso = createMockPso();

    // 14 trips, but only 10 on-time -> OTP = 10/14 = 71.43% (< 90%)
    for (let i = 0; i < 10; i++) {
      pso.recordTrip(true);
    }
    for (let i = 0; i < 4; i++) {
      pso.recordTrip(false);
    }

    const evalResult = pso.evaluateWeeklyCompliance(1);

    expect(evalResult.isCompliant).toBe(false);
    expect(evalResult.actualOtpPercentage).toBeCloseTo(71.43, 1);
    // 25% penalty on 70M = 17,500,000 IDR
    expect(evalResult.otpPenalty).toBe(toMoney(17_500_000));
    expect(evalResult.cancellationPenalty).toBe(toMoney(0));
    // Net: 70M - 17.5M = 52.5M
    expect(evalResult.netDisbursement).toBe(toMoney(52_500_000));
  });

  it('penalizes unexcused cancellations at 2.0x normal trip subsidy', () => {
    const pso = createMockPso();

    // 12 on-time trips completed + 2 cancelled = 14 total
    // Normal trip subsidy = 70M / 14 = 5,000,000 IDR
    // Cancellation penalty = 2 * 5M * 2 = 20,000,000 IDR
    for (let i = 0; i < 12; i++) {
      pso.recordTrip(true);
    }
    pso.recordCancellation();
    pso.recordCancellation();

    const evalResult = pso.evaluateWeeklyCompliance(1);

    expect(evalResult.isCompliant).toBe(false);
    expect(evalResult.cancelledTrips).toBe(2);
    expect(evalResult.cancellationPenalty).toBe(toMoney(20_000_000));
    // Also failed frequency: completedTrips (12) < minFreq (14), so OTP penalty applies (17.5M)
    expect(evalResult.otpPenalty).toBe(toMoney(17_500_000));
    // Net: 70M - (17.5M + 20M) = 32,500,000 IDR
    expect(evalResult.netDisbursement).toBe(toMoney(32_500_000));
  });

  it('completes the contract after all duration weeks are evaluated', () => {
    const pso = createMockPso(); // 14 days = 2 weeks

    // Week 1
    for (let i = 0; i < 14; i++) pso.recordTrip(true);
    pso.evaluateWeeklyCompliance(1);
    expect(pso.status).toBe('ACTIVE');
    expect(pso.remainingDays).toBe(7);

    // Week 2
    for (let i = 0; i < 14; i++) pso.recordTrip(true);
    pso.evaluateWeeklyCompliance(2);
    expect(pso.remainingDays).toBe(0);
    expect(pso.status).toBe('COMPLETED');
  });
});
