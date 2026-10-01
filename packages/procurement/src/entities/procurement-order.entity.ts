import {
  OrderId,
  CompanyId,
  DepotId,
  Money,
  multiplyMoney,
  GameTimestamp,
} from '@railway/shared';

export type ProcurementStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'ORDERED'
  | 'IN_PRODUCTION'
  | 'TESTING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMMISSIONED'
  | 'CANCELLED';

export interface ProcurementOrderProps {
  readonly id: OrderId;
  readonly companyId: CompanyId;
  readonly specId: string;
  readonly quantity: number;
  readonly unitCost: Money;
  readonly deliveryDepotId: DepotId;
  readonly leadTimeDays: number;
  readonly orderedTimestamp?: GameTimestamp;
  readonly expectedDeliveryTimestamp?: GameTimestamp;
  readonly status?: ProcurementStatus;
}

export class InvalidProcurementStateTransitionError extends Error {
  public readonly code: string;
  public readonly currentStatus: ProcurementStatus;
  public readonly targetStatus: ProcurementStatus;

  constructor(
    message: string,
    currentStatus: ProcurementStatus,
    targetStatus: ProcurementStatus,
    code = 'INVALID_TRANSITION'
  ) {
    super(message);
    this.name = 'InvalidProcurementStateTransitionError';
    this.code = code;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
    Object.setPrototypeOf(this, InvalidProcurementStateTransitionError.prototype);
  }
}

export class ProcurementOrderEntity {
  public readonly id: OrderId;
  public readonly companyId: CompanyId;
  public readonly specId: string;
  public readonly quantity: number;
  public readonly unitCost: Money;
  public readonly totalCost: Money;
  public readonly deliveryDepotId: DepotId;
  public readonly leadTimeDays: number;

  private _status: ProcurementStatus;
  private _orderedTimestamp?: GameTimestamp;
  private _expectedDeliveryTimestamp?: GameTimestamp;

  constructor(props: ProcurementOrderProps) {
    if (!props.id || !props.companyId || !props.specId || !props.deliveryDepotId) {
      throw new Error('Procurement order requires id, companyId, specId, and deliveryDepotId');
    }
    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new RangeError(`Procurement quantity must be an integer >= 1, received: ${props.quantity}`);
    }
    if (props.leadTimeDays < 1) {
      throw new RangeError(`Lead time days must be >= 1, received: ${props.leadTimeDays}`);
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.specId = props.specId;
    this.quantity = props.quantity;
    this.unitCost = props.unitCost;
    this.totalCost = multiplyMoney(props.unitCost, props.quantity);
    this.deliveryDepotId = props.deliveryDepotId;
    this.leadTimeDays = props.leadTimeDays;
    this._status = props.status ?? 'DRAFT';
    this._orderedTimestamp = props.orderedTimestamp;
    this._expectedDeliveryTimestamp = props.expectedDeliveryTimestamp;
  }

  public get status(): ProcurementStatus {
    return this._status;
  }

  public get orderedTimestamp(): GameTimestamp | undefined {
    return this._orderedTimestamp;
  }

  public get expectedDeliveryTimestamp(): GameTimestamp | undefined {
    return this._expectedDeliveryTimestamp;
  }

  /**
   * Request quotation from supplier (DRAFT -> QUOTED)
   */
  public requestQuote(): void {
    this.assertTransition('QUOTED', ['DRAFT']);
    this._status = 'QUOTED';
  }

  /**
   * Place manufacturing order (QUOTED -> ORDERED)
   */
  public placeOrder(
    orderedTime: GameTimestamp,
    expectedDeliveryTime: GameTimestamp
  ): void {
    this.assertTransition('ORDERED', ['QUOTED', 'DRAFT']);
    this._status = 'ORDERED';
    this._orderedTimestamp = orderedTime;
    this._expectedDeliveryTimestamp = expectedDeliveryTime;
  }

  /**
   * Factory begins production (ORDERED -> IN_PRODUCTION)
   */
  public startProduction(): void {
    this.assertTransition('IN_PRODUCTION', ['ORDERED']);
    this._status = 'IN_PRODUCTION';
  }

  /**
   * Factory testing and static commissioning (IN_PRODUCTION -> TESTING)
   */
  public startTesting(): void {
    this.assertTransition('TESTING', ['IN_PRODUCTION']);
    this._status = 'TESTING';
  }

  /**
   * Transit run to destination depot (TESTING -> IN_TRANSIT)
   */
  public startTransit(): void {
    this.assertTransition('IN_TRANSIT', ['TESTING']);
    this._status = 'IN_TRANSIT';
  }

  /**
   * Physical delivery arrival at target depot (IN_TRANSIT -> DELIVERED)
   */
  public deliverToDepot(): void {
    this.assertTransition('DELIVERED', ['IN_TRANSIT']);
    this._status = 'DELIVERED';
  }

  /**
   * Depot acceptance & commissioning into active fleet (DELIVERED -> COMMISSIONED)
   */
  public commission(): void {
    this.assertTransition('COMMISSIONED', ['DELIVERED']);
    this._status = 'COMMISSIONED';
  }

  /**
   * Cancels the order if not already delivered or commissioned.
   */
  public cancel(): void {
    this.assertTransition('CANCELLED', ['DRAFT', 'QUOTED', 'ORDERED', 'IN_PRODUCTION']);
    this._status = 'CANCELLED';
  }

  private assertTransition(target: ProcurementStatus, allowedCurrent: ProcurementStatus[]): void {
    if (!allowedCurrent.includes(this._status)) {
      throw new InvalidProcurementStateTransitionError(
        `Cannot transition procurement order ${this.id} from ${this._status} to ${target}. Allowed source states: [${allowedCurrent.join(', ')}]`,
        this._status,
        target
      );
    }
  }
}
