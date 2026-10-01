import {
  ContractId,
  CompanyId,
  RouteId,
  Money,
  toMoney,
  subtractMoney,
  multiplyMoney,
} from '@railway/shared';
import {
  PSOContractStatus,
  PSOContractProps,
  WeeklyComplianceResult,
} from '../types/contract.types.js';

export class PublicServiceObligationContractEntity {
  public readonly id: ContractId;
  public readonly companyId: CompanyId;
  public readonly routeId: RouteId;
  public readonly maximumFareCap: Money;
  public readonly minimumWeeklyFrequency: number;
  public readonly minimumOtpPercentage: number;
  public readonly weeklySubsidyCompensation: Money;
  public readonly penaltyForUnderperformance: Money;
  public readonly contractDurationDays: number;

  private _remainingDays: number;
  private _status: PSOContractStatus;

  // Weekly performance counters
  private _weeklyTripsCompleted: number = 0;
  private _weeklyOnTimeTrips: number = 0;
  private _weeklyCancellations: number = 0;

  constructor(props: PSOContractProps) {
    if (!props.id || !props.companyId || !props.routeId) {
      throw new Error('PSOContract requires id, companyId, and routeId');
    }
    if (props.maximumFareCap <= 0) {
      throw new RangeError(`Maximum fare cap must be positive, received: ${props.maximumFareCap}`);
    }
    if (props.minimumWeeklyFrequency <= 0) {
      throw new RangeError(`Minimum weekly frequency must be positive, received: ${props.minimumWeeklyFrequency}`);
    }
    if (props.minimumOtpPercentage <= 0 || props.minimumOtpPercentage > 100) {
      throw new RangeError(`Minimum OTP must be between 1 and 100, received: ${props.minimumOtpPercentage}`);
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.routeId = props.routeId;
    this.maximumFareCap = props.maximumFareCap;
    this.minimumWeeklyFrequency = props.minimumWeeklyFrequency;
    this.minimumOtpPercentage = props.minimumOtpPercentage;
    this.weeklySubsidyCompensation = props.weeklySubsidyCompensation;
    this.penaltyForUnderperformance = props.penaltyForUnderperformance;
    this.contractDurationDays = props.contractDurationDays;

    this._remainingDays = props.remainingDays ?? props.contractDurationDays;
    this._status = props.status ?? 'ACTIVE';
  }

  public get remainingDays(): number {
    return this._remainingDays;
  }

  public get status(): PSOContractStatus {
    return this._status;
  }

  public get weeklyTripsCompleted(): number {
    return this._weeklyTripsCompleted;
  }

  public get weeklyOnTimeTrips(): number {
    return this._weeklyOnTimeTrips;
  }

  public get weeklyCancellations(): number {
    return this._weeklyCancellations;
  }

  /**
   * Enforces fare compliance: player must not charge above mandated fare cap.
   * Throws Error if fare exceeds cap.
   */
  public validateFareCompliance(chargedFare: Money): void {
    if (chargedFare > this.maximumFareCap) {
      throw new Error(
        `Fare Rp ${chargedFare} violates PSO maximum fare cap of Rp ${this.maximumFareCap} for route ${this.routeId}`
      );
    }
  }

  /**
   * Records completion of an individual trip run.
   */
  public recordTrip(isOnTime: boolean): void {
    if (this._status !== 'ACTIVE') {
      throw new Error(`Cannot record trip for PSO contract in status ${this._status}`);
    }
    this._weeklyTripsCompleted += 1;
    if (isOnTime) {
      this._weeklyOnTimeTrips += 1;
    }
  }

  /**
   * Records a trip cancellation.
   */
  public recordCancellation(): void {
    if (this._status !== 'ACTIVE') {
      throw new Error(`Cannot record cancellation for PSO contract in status ${this._status}`);
    }
    this._weeklyCancellations += 1;
  }

  /**
   * Evaluates weekly compliance and calculates subsidy disbursement (ECONOMY_RULES.md §3.5).
   * - Checks frequency compliance
   * - Checks OTP compliance (penalty = 25% of weekly subsidy if below threshold)
   * - Checks cancellation penalty (2.0x normal trip subsidy per cancellation)
   */
  public evaluateWeeklyCompliance(weekNumber: number): WeeklyComplianceResult {
    if (this._status !== 'ACTIVE') {
      throw new Error(`Cannot evaluate compliance for PSO contract in status ${this._status}`);
    }

    const actualOtp = this._weeklyTripsCompleted > 0
      ? (this._weeklyOnTimeTrips / this._weeklyTripsCompleted) * 100
      : 0;

    let otpPenalty = toMoney(0);
    if (actualOtp < this.minimumOtpPercentage || this._weeklyTripsCompleted < this.minimumWeeklyFrequency) {
      // 25% penalty on weekly subsidy (ECONOMY_RULES.md §3.5.3)
      otpPenalty = multiplyMoney(this.weeklySubsidyCompensation, 0.25);
    }

    // Cancellation penalty: 2.0 * NormalTripSubsidy * cancellations
    const perTripSubsidy = this.weeklySubsidyCompensation / this.minimumWeeklyFrequency;
    const cancellationPenalty = toMoney(Math.round(2.0 * perTripSubsidy * this._weeklyCancellations));

    const totalPenalties = toMoney(otpPenalty + cancellationPenalty);
    const netDisbursement = totalPenalties >= this.weeklySubsidyCompensation
      ? toMoney(0)
      : subtractMoney(this.weeklySubsidyCompensation, totalPenalties);

    const isCompliant = otpPenalty === 0 && this._weeklyCancellations === 0;

    const completedTrips = this._weeklyTripsCompleted;
    const onTimeTrips = this._weeklyOnTimeTrips;
    const cancelledTrips = this._weeklyCancellations;

    // Reset weekly counters
    this._weeklyTripsCompleted = 0;
    this._weeklyOnTimeTrips = 0;
    this._weeklyCancellations = 0;

    // Advance 7 days
    this._remainingDays = Math.max(0, this._remainingDays - 7);
    if (this._remainingDays === 0) {
      this._status = 'COMPLETED';
    }

    return {
      weekNumber,
      isCompliant,
      completedTrips,
      requiredTrips: this.minimumWeeklyFrequency,
      onTimeTrips,
      actualOtpPercentage: Math.round(actualOtp * 100) / 100,
      requiredOtpPercentage: this.minimumOtpPercentage,
      cancelledTrips,
      subsidyEarned: this.weeklySubsidyCompensation,
      otpPenalty,
      cancellationPenalty,
      netDisbursement,
    };
  }

  public revoke(): void {
    if (this._status === 'COMPLETED') {
      throw new Error('Cannot revoke a completed PSO contract');
    }
    this._status = 'REVOKED';
  }
}
