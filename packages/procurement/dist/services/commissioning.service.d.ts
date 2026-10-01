import { UnitId } from '@railway/shared';
import { DepotEntity } from '@railway/network';
import { RollingStockUnitEntity } from '@railway/fleet';
import { ProcurementOrderEntity } from '../entities/procurement-order.entity.js';
export declare class InvalidCommissioningTargetError extends Error {
    constructor(message: string);
}
export interface CommissioningOptions {
    readonly idGenerator?: (index: number) => UnitId;
    readonly serialGenerator?: (index: number) => string;
}
export declare class CommissioningService {
    /**
     * Accepts a delivered procurement order into a depot's physical fleet.
     * Enforces depot capacity constraints and returns active RollingStockUnit entities.
     */
    static commissionOrder(order: ProcurementOrderEntity, depot: DepotEntity, options?: CommissioningOptions): ReadonlyArray<RollingStockUnitEntity>;
}
//# sourceMappingURL=commissioning.service.d.ts.map