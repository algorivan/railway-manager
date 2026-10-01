import {
  ContractId,
  CompanyId,
  StationId,
  SpecId,
  Money,
  toMoney,
  subtractMoney,
} from '@railway/shared';
import {
  CargoCategory,
  B2BContractStatus,
  B2BContractProps,
} from '../types/contract.types.js';
import { B2BTariffCalculator } from '../calculators/b2b-tariff.calculator.js';

export class B2BContractEntity {
  public readonly id: ContractId;
  public readonly companyId: CompanyId;
  public readonly clientName: string;
  public readonly cargoCategory: CargoCategory;
  public readonly originStationId: StationId;
  public readonly destinationStationId: StationId;
  public readonly requiredWeeklyVolumeTons: number;
  public readonly requiredWagonSpecId: SpecId;
  public readonly revenuePerTonDelivered: Money;
  public readonly latePenaltyPerTon: Money;
  public readonly durationDays: number;

  private _remainingDays: number;
  private _status: B2BContractStatus;
  private _deliveredVolumeTons: number;

  constructor(props: B2BContractProps) {
    if (!props.id || !props.companyId || !props.clientName) {
      throw new Error('B2BContract requires id, companyId, and clientName');
    }
    if (props.requiredWeeklyVolumeTons <= 0) {
      throw new RangeError(`Required weekly volume must be positive, received: ${props.requiredWeeklyVolumeTons}`);
    }
    if (props.durationDays <= 0) {
      throw new RangeError(`Duration days must be positive, received: ${props.durationDays}`);
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.clientName = props.clientName;
    this.cargoCategory = props.cargoCategory;
    this.originStationId = props.originStationId;
    this.destinationStationId = props.destinationStationId;
    this.requiredWeeklyVolumeTons = props.requiredWeeklyVolumeTons;
    this.requiredWagonSpecId = props.requiredWagonSpecId;
    this.revenuePerTonDelivered = props.revenuePerTonDelivered;
    this.latePenaltyPerTon = props.latePenaltyPerTon;
    this.durationDays = props.durationDays;

    this._remainingDays = props.remainingDays ?? props.durationDays;
    this._status = props.status ?? 'OFFERED';
    this._deliveredVolumeTons = props.deliveredVolumeTons ?? 0;
  }

  public get remainingDays(): number {
    return this._remainingDays;
  }

  public get status(): B2BContractStatus {
    return this._status;
  }

  public get deliveredVolumeTons(): number {
    return this._deliveredVolumeTons;
  }

  public get totalContractRequiredVolumeTons(): number {
    const weeks = this.durationDays / 7;
    return Math.round(this.requiredWeeklyVolumeTons * weeks);
  }

  public acceptContract(): void {
    if (this._status !== 'OFFERED') {
      throw new Error(`Cannot accept B2B contract in status ${this._status}`);
    }
    this._status = 'ACTIVE';
  }

  public recordDelivery(
    volumeTons: number,
    isLate: boolean = false
  ): {
    volumeDelivered: number;
    revenueEarned: Money;
    penaltyIncurred: Money;
    netRevenue: Money;
  } {
    if (this._status !== 'ACTIVE') {
      throw new Error(`Cannot record cargo delivery for contract in status ${this._status}`);
    }
    if (volumeTons <= 0) {
      throw new RangeError(`Delivered volume must be positive, received: ${volumeTons}`);
    }

    this._deliveredVolumeTons += volumeTons;
    const grossRevenue = toMoney(Math.round(this.revenuePerTonDelivered * volumeTons));
    const penalty = isLate
      ? B2BTariffCalculator.calculateLatePenalty(volumeTons, this.latePenaltyPerTon)
      : toMoney(0);
    const netRevenue = subtractMoney(grossRevenue, penalty);

    return {
      volumeDelivered: volumeTons,
      revenueEarned: grossRevenue,
      penaltyIncurred: penalty,
      netRevenue,
    };
  }

  public advanceDay(): void {
    if (this._status !== 'ACTIVE') {
      return;
    }
    this._remainingDays = Math.max(0, this._remainingDays - 1);

    if (this._remainingDays === 0) {
      // Evaluate fulfillment
      if (this._deliveredVolumeTons >= this.totalContractRequiredVolumeTons) {
        this._status = 'FULFILLED';
      } else {
        this._status = 'BREACHED';
      }
    }
  }

  public breach(_reason?: string): void {
    if (this._status === 'FULFILLED') {
      throw new Error('Cannot breach an already fulfilled contract');
    }
    this._status = 'BREACHED';
  }
}
