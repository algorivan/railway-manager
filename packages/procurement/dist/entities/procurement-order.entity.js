import { multiplyMoney, } from '@railway/shared';
export class InvalidProcurementStateTransitionError extends Error {
    code;
    currentStatus;
    targetStatus;
    constructor(message, currentStatus, targetStatus, code = 'INVALID_TRANSITION') {
        super(message);
        this.name = 'InvalidProcurementStateTransitionError';
        this.code = code;
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
        Object.setPrototypeOf(this, InvalidProcurementStateTransitionError.prototype);
    }
}
export class ProcurementOrderEntity {
    id;
    companyId;
    specId;
    quantity;
    unitCost;
    totalCost;
    deliveryDepotId;
    leadTimeDays;
    _status;
    _orderedTimestamp;
    _expectedDeliveryTimestamp;
    constructor(props) {
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
    get status() {
        return this._status;
    }
    get orderedTimestamp() {
        return this._orderedTimestamp;
    }
    get expectedDeliveryTimestamp() {
        return this._expectedDeliveryTimestamp;
    }
    /**
     * Request quotation from supplier (DRAFT -> QUOTED)
     */
    requestQuote() {
        this.assertTransition('QUOTED', ['DRAFT']);
        this._status = 'QUOTED';
    }
    /**
     * Place manufacturing order (QUOTED -> ORDERED)
     */
    placeOrder(orderedTime, expectedDeliveryTime) {
        this.assertTransition('ORDERED', ['QUOTED', 'DRAFT']);
        this._status = 'ORDERED';
        this._orderedTimestamp = orderedTime;
        this._expectedDeliveryTimestamp = expectedDeliveryTime;
    }
    /**
     * Factory begins production (ORDERED -> IN_PRODUCTION)
     */
    startProduction() {
        this.assertTransition('IN_PRODUCTION', ['ORDERED']);
        this._status = 'IN_PRODUCTION';
    }
    /**
     * Factory testing and static commissioning (IN_PRODUCTION -> TESTING)
     */
    startTesting() {
        this.assertTransition('TESTING', ['IN_PRODUCTION']);
        this._status = 'TESTING';
    }
    /**
     * Transit run to destination depot (TESTING -> IN_TRANSIT)
     */
    startTransit() {
        this.assertTransition('IN_TRANSIT', ['TESTING']);
        this._status = 'IN_TRANSIT';
    }
    /**
     * Physical delivery arrival at target depot (IN_TRANSIT -> DELIVERED)
     */
    deliverToDepot() {
        this.assertTransition('DELIVERED', ['IN_TRANSIT']);
        this._status = 'DELIVERED';
    }
    /**
     * Depot acceptance & commissioning into active fleet (DELIVERED -> COMMISSIONED)
     */
    commission() {
        this.assertTransition('COMMISSIONED', ['DELIVERED']);
        this._status = 'COMMISSIONED';
    }
    /**
     * Cancels the order if not already delivered or commissioned.
     */
    cancel() {
        this.assertTransition('CANCELLED', ['DRAFT', 'QUOTED', 'ORDERED', 'IN_PRODUCTION']);
        this._status = 'CANCELLED';
    }
    assertTransition(target, allowedCurrent) {
        if (!allowedCurrent.includes(this._status)) {
            throw new InvalidProcurementStateTransitionError(`Cannot transition procurement order ${this.id} from ${this._status} to ${target}. Allowed source states: [${allowedCurrent.join(', ')}]`, this._status, target);
        }
    }
}
//# sourceMappingURL=procurement-order.entity.js.map