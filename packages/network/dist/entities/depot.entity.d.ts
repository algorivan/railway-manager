import { CompanyId, DepotId, Money, StationId, UnitId } from '@railway/shared';
export type DepotTier = 1 | 2 | 3;
export type MaintenanceCapability = 'LEVEL_1_DAILY' | 'LEVEL_2_PERIODIC' | 'LEVEL_3_OVERHAUL';
export interface DepotTierConfig {
    readonly tier: DepotTier;
    readonly name: string;
    readonly fleetCapacity: number;
    readonly maintenanceSlots: number;
    readonly capexCost: Money;
    readonly dailyOperatingCost: Money;
    readonly capability: MaintenanceCapability;
}
export declare const DEPOT_TIER_CONFIGS: Readonly<Record<DepotTier, DepotTierConfig>>;
export declare class DepotCapacityExceededError extends Error {
    constructor(message: string);
}
export declare class DepotCapabilityError extends Error {
    constructor(message: string);
}
export interface DepotProps {
    readonly id: DepotId;
    readonly companyId: CompanyId;
    readonly name: string;
    readonly stationId: StationId;
    readonly tier?: DepotTier;
    readonly fleetCapacity?: number;
    readonly maintenanceSlots?: number;
    readonly stablingOccupancy?: number;
    readonly activeMaintenanceCount?: number;
    readonly maintenanceLevelCapability?: MaintenanceCapability;
    readonly dailyOperatingCost?: Money | number;
}
export declare class DepotEntity {
    readonly id: DepotId;
    readonly companyId: CompanyId;
    name: string;
    readonly stationId: StationId;
    tier: DepotTier;
    fleetCapacity: number;
    maintenanceSlots: number;
    stablingOccupancy: number;
    activeMaintenanceCount: number;
    maintenanceLevelCapability: MaintenanceCapability;
    dailyOperatingCost: Money;
    readonly maintenanceQueue: UnitId[];
    constructor(props: DepotProps);
    /**
     * Factory method to create a depot from a standard tier.
     */
    static createFromTier(id: DepotId, companyId: CompanyId, name: string, stationId: StationId, tier: DepotTier): DepotEntity;
    /**
     * Checks whether the depot has available stabling capacity.
     */
    canStable(unitCount: number): boolean;
    /**
     * Parks rolling stock units in the depot stabling sidings.
     */
    assignStabling(unitCount: number): void;
    /**
     * Releases rolling stock units from stabling sidings.
     */
    releaseStabling(unitCount: number): void;
    /**
     * Checks whether the depot supports the required maintenance capability level.
     */
    supportsMaintenanceLevel(level: MaintenanceCapability): boolean;
    /**
     * Submits a rolling stock unit for maintenance.
     * If bay is free -> IN_PROGRESS.
     * If all bays full -> QUEUED in FIFO waiting queue.
     */
    requestMaintenance(unitId: UnitId, requiredLevel?: MaintenanceCapability): {
        status: 'IN_PROGRESS' | 'QUEUED';
    };
    /**
     * Completes maintenance on a serviced unit, freeing a slot.
     * If units are in the FIFO queue, immediately admits the next unit and returns its ID.
     */
    completeMaintenance(): UnitId | null;
    /**
     * Upgrades the depot facility to a higher tier.
     */
    upgradeTier(targetTier: DepotTier): void;
}
//# sourceMappingURL=depot.entity.d.ts.map