import { OrderId, CompanyId, DepotId, Money, GameTimestamp } from '@railway/shared';
export type ProcurementStatus = 'DRAFT' | 'QUOTED' | 'ORDERED' | 'IN_PRODUCTION' | 'TESTING' | 'IN_TRANSIT' | 'DELIVERED' | 'COMMISSIONED' | 'CANCELLED';
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
export declare class InvalidProcurementStateTransitionError extends Error {
    readonly code: string;
    readonly currentStatus: ProcurementStatus;
    readonly targetStatus: ProcurementStatus;
    constructor(message: string, currentStatus: ProcurementStatus, targetStatus: ProcurementStatus, code?: string);
}
export declare class ProcurementOrderEntity {
    readonly id: OrderId;
    readonly companyId: CompanyId;
    readonly specId: string;
    readonly quantity: number;
    readonly unitCost: Money;
    readonly totalCost: Money;
    readonly deliveryDepotId: DepotId;
    readonly leadTimeDays: number;
    private _status;
    private _orderedTimestamp?;
    private _expectedDeliveryTimestamp?;
    constructor(props: ProcurementOrderProps);
    get status(): ProcurementStatus;
    get orderedTimestamp(): GameTimestamp | undefined;
    get expectedDeliveryTimestamp(): GameTimestamp | undefined;
    /**
     * Request quotation from supplier (DRAFT -> QUOTED)
     */
    requestQuote(): void;
    /**
     * Place manufacturing order (QUOTED -> ORDERED)
     */
    placeOrder(orderedTime: GameTimestamp, expectedDeliveryTime: GameTimestamp): void;
    /**
     * Factory begins production (ORDERED -> IN_PRODUCTION)
     */
    startProduction(): void;
    /**
     * Factory testing and static commissioning (IN_PRODUCTION -> TESTING)
     */
    startTesting(): void;
    /**
     * Transit run to destination depot (TESTING -> IN_TRANSIT)
     */
    startTransit(): void;
    /**
     * Physical delivery arrival at target depot (IN_TRANSIT -> DELIVERED)
     */
    deliverToDepot(): void;
    /**
     * Depot acceptance & commissioning into active fleet (DELIVERED -> COMMISSIONED)
     */
    commission(): void;
    /**
     * Cancels the order if not already delivered or commissioned.
     */
    cancel(): void;
    private assertTransition;
}
//# sourceMappingURL=procurement-order.entity.d.ts.map