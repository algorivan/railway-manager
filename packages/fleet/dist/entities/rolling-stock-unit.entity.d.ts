import { UnitId, CompanyId, DepotId, CompositionId, Km } from '@railway/shared';
export type RollingStockUnitStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'DECOMMISSIONED';
export interface RollingStockUnitProps {
    readonly id: UnitId;
    readonly companyId: CompanyId;
    readonly specId: string;
    readonly serialNumber: string;
    readonly homeDepotId: DepotId;
    readonly currentDepotId: DepotId;
    readonly conditionPercentage?: number;
    readonly odometerKm?: Km;
    readonly kmSinceLastMaintenance?: Km;
    readonly status?: RollingStockUnitStatus;
    readonly assignedCompositionId?: CompositionId;
}
export declare class InvalidRollingStockStateError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class RollingStockUnitEntity {
    readonly id: UnitId;
    readonly companyId: CompanyId;
    readonly specId: string;
    readonly serialNumber: string;
    private _homeDepotId;
    private _currentDepotId;
    private _conditionPercentage;
    private _odometerKm;
    private _kmSinceLastMaintenance;
    private _status;
    private _assignedCompositionId?;
    constructor(props: RollingStockUnitProps);
    get homeDepotId(): DepotId;
    get currentDepotId(): DepotId;
    get conditionPercentage(): number;
    get odometerKm(): Km;
    get kmSinceLastMaintenance(): Km;
    get status(): RollingStockUnitStatus;
    get assignedCompositionId(): CompositionId | undefined;
    isAvailable(): boolean;
    /**
     * Assigns this unit to an operational consist.
     */
    assignToComposition(compositionId: CompositionId): void;
    /**
     * Releases this unit from its assigned consist.
     */
    unassignFromComposition(): void;
    /**
     * Sends unit into maintenance bay at a depot.
     */
    sendToMaintenance(depotId: DepotId): void;
    /**
     * Completes maintenance, restoring condition up to newCondition cap.
     */
    completeMaintenance(newCondition: number): void;
    /**
     * Records kilometer usage and applies wear.
     */
    recordRun(distanceKm: Km, conditionLossPercentage: number): void;
    /**
     * Transfers current physical depot location.
     */
    transferDepot(newDepotId: DepotId): void;
    /**
     * Decommissions an end-of-life or damaged unit permanently.
     */
    decommission(): void;
}
//# sourceMappingURL=rolling-stock-unit.entity.d.ts.map