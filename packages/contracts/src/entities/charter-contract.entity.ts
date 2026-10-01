import {
  ContractId,
  CompanyId,
  RouteId,
  Money,
} from '@railway/shared';
import {
  CharterType,
  CharterStatus,
  CharterContractProps,
} from '../types/contract.types.js';
import { CharterPricingCalculator } from '../calculators/charter-pricing.calculator.js';

export class CharterContractEntity {
  public readonly id: ContractId;
  public readonly companyId: CompanyId;
  public readonly clientName: string;
  public readonly charterType: CharterType;
  public readonly routeId: RouteId;
  public readonly requestedDay: number;
  public readonly departureMinuteOfDay: number;
  public readonly directOpex: Money;
  public readonly projectedRegularRevenue: Money;

  private _agreedPrice?: Money;
  private _status: CharterStatus;

  constructor(props: CharterContractProps) {
    if (!props.id || !props.companyId || !props.clientName || !props.routeId) {
      throw new Error('CharterContract requires id, companyId, clientName, and routeId');
    }
    if (props.requestedDay <= 0) {
      throw new RangeError(`Requested day must be positive, received: ${props.requestedDay}`);
    }
    if (props.departureMinuteOfDay < 0 || props.departureMinuteOfDay >= 1440) {
      throw new RangeError(
        `Departure minute must be in [0, 1439], received: ${props.departureMinuteOfDay}`
      );
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.clientName = props.clientName;
    this.charterType = props.charterType;
    this.routeId = props.routeId;
    this.requestedDay = props.requestedDay;
    this.departureMinuteOfDay = props.departureMinuteOfDay;
    this.directOpex = props.directOpex;
    this.projectedRegularRevenue = props.projectedRegularRevenue;

    this._agreedPrice = props.agreedPrice;
    this._status = props.status ?? 'REQUESTED';
  }

  public get agreedPrice(): Money | undefined {
    return this._agreedPrice;
  }

  public get status(): CharterStatus {
    return this._status;
  }

  public confirm(proposedPrice: Money): void {
    if (this._status !== 'REQUESTED') {
      throw new Error(`Cannot confirm charter contract in status ${this._status}`);
    }

    const acceptable = CharterPricingCalculator.isQuoteAcceptable(
      this.charterType,
      proposedPrice,
      this.directOpex,
      this.projectedRegularRevenue
    );

    if (!acceptable) {
      const minQuote = CharterPricingCalculator.calculateCharterPrice(
        this.charterType,
        this.directOpex,
        this.projectedRegularRevenue
      );
      throw new Error(
        `Proposed price Rp ${proposedPrice} is below minimum acceptable quote of Rp ${minQuote.totalOfferedPrice}`
      );
    }

    this._agreedPrice = proposedPrice;
    this._status = 'CONFIRMED';
  }

  public dispatch(): void {
    if (this._status !== 'CONFIRMED') {
      throw new Error(`Cannot dispatch charter in status ${this._status}`);
    }
    this._status = 'DISPATCHED';
  }

  public settle(): void {
    if (this._status !== 'DISPATCHED') {
      throw new Error(`Cannot settle charter in status ${this._status}`);
    }
    this._status = 'SETTLED';
  }

  public reject(): void {
    if (this._status === 'SETTLED') {
      throw new Error('Cannot reject an already settled charter contract');
    }
    this._status = 'REJECTED';
  }
}
