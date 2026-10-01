import { GameTimestamp } from '@railway/shared';
import { ProcurementOrderEntity, ProcurementStatus } from '../entities/procurement-order.entity.js';
export interface OrderStateTransitionEvent {
    readonly orderId: string;
    readonly previousStatus: ProcurementStatus;
    readonly newStatus: ProcurementStatus;
    readonly tick: number;
}
export declare class ProcurementLeadTimeEngine {
    /**
     * Evaluates and updates an order's lifecycle state based on simulated time progress.
     *
     * Timeline milestones from SIMULATION_RULES.md §10:
     * 0% -> 10%: Materials & slot allocation (ORDERED)
     * 10% -> 75%: Factory manufacturing (IN_PRODUCTION)
     * 75% -> 85%: Factory static & track testing (TESTING)
     * 85% -> 95%: Delivery transit to depot (IN_TRANSIT)
     * 95%+: Arrived at depot (DELIVERED)
     */
    static evaluateOrder(order: ProcurementOrderEntity, currentTimestamp: GameTimestamp): OrderStateTransitionEvent | null;
    /**
     * Advances a batch of orders and returns all triggered state transitions.
     */
    static advanceOrders(orders: ReadonlyArray<ProcurementOrderEntity>, currentTimestamp: GameTimestamp): ReadonlyArray<OrderStateTransitionEvent>;
}
//# sourceMappingURL=lead-time-engine.d.ts.map