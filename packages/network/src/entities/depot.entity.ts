import {
  CompanyId,
  DepotId,
  Money,
  StationId,
  toMoney,
  UnitId,
} from '@railway/shared';

export type DepotTier = 1 | 2 | 3;

export type MaintenanceCapability =
  | 'LEVEL_1_DAILY'
  | 'LEVEL_2_PERIODIC'
  | 'LEVEL_3_OVERHAUL';

export interface DepotTierConfig {
  readonly tier: DepotTier;
  readonly name: string;
  readonly fleetCapacity: number;
  readonly maintenanceSlots: number;
  readonly capexCost: Money;
  readonly dailyOperatingCost: Money;
  readonly capability: MaintenanceCapability;
}

export const DEPOT_TIER_CONFIGS: Readonly<Record<DepotTier, DepotTierConfig>> = {
  1: {
    tier: 1,
    name: 'Small Regional Depot',
    fleetCapacity: 6,
    maintenanceSlots: 1,
    capexCost: toMoney(15_000_000_000),
    dailyOperatingCost: toMoney(2_500_000),
    capability: 'LEVEL_1_DAILY',
  },
  2: {
    tier: 2,
    name: 'Medium Operational Depot',
    fleetCapacity: 16,
    maintenanceSlots: 3,
    capexCost: toMoney(45_000_000_000),
    dailyOperatingCost: toMoney(7_500_000),
    capability: 'LEVEL_2_PERIODIC',
  },
  3: {
    tier: 3,
    name: 'Master Workshop Depot',
    fleetCapacity: 40,
    maintenanceSlots: 8,
    capexCost: toMoney(120_000_000_000),
    dailyOperatingCost: toMoney(25_000_000),
    capability: 'LEVEL_3_OVERHAUL',
  },
};

export class DepotCapacityExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DepotCapacityExceededError';
    Object.setPrototypeOf(this, DepotCapacityExceededError.prototype);
  }
}

export class DepotCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DepotCapabilityError';
    Object.setPrototypeOf(this, DepotCapabilityError.prototype);
  }
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

export class DepotEntity {
  public readonly id: DepotId;
  public readonly companyId: CompanyId;
  public name: string;
  public readonly stationId: StationId;
  public tier: DepotTier;
  public fleetCapacity: number;
  public maintenanceSlots: number;
  public stablingOccupancy: number;
  public activeMaintenanceCount: number;
  public maintenanceLevelCapability: MaintenanceCapability;
  public dailyOperatingCost: Money;
  public readonly maintenanceQueue: UnitId[] = [];

  constructor(props: DepotProps) {
    this.id = props.id;
    this.companyId = props.companyId;
    this.name = props.name;
    this.stationId = props.stationId;

    this.tier = props.tier ?? 1;
    const tierConfig = DEPOT_TIER_CONFIGS[this.tier];

    this.fleetCapacity = props.fleetCapacity ?? tierConfig.fleetCapacity;
    this.maintenanceSlots = props.maintenanceSlots ?? tierConfig.maintenanceSlots;
    this.stablingOccupancy = props.stablingOccupancy ?? 0;
    this.activeMaintenanceCount = props.activeMaintenanceCount ?? 0;
    this.maintenanceLevelCapability = props.maintenanceLevelCapability ?? tierConfig.capability;
    this.dailyOperatingCost = toMoney(props.dailyOperatingCost ?? tierConfig.dailyOperatingCost);
  }

  /**
   * Factory method to create a depot from a standard tier.
   */
  public static createFromTier(
    id: DepotId,
    companyId: CompanyId,
    name: string,
    stationId: StationId,
    tier: DepotTier
  ): DepotEntity {
    const config = DEPOT_TIER_CONFIGS[tier];
    return new DepotEntity({
      id,
      companyId,
      name,
      stationId,
      tier,
      fleetCapacity: config.fleetCapacity,
      maintenanceSlots: config.maintenanceSlots,
      maintenanceLevelCapability: config.capability,
      dailyOperatingCost: config.dailyOperatingCost,
    });
  }

  /**
   * Checks whether the depot has available stabling capacity.
   */
  public canStable(unitCount: number): boolean {
    if (unitCount < 0) {
      throw new RangeError(`unitCount must be non-negative, received: ${unitCount}`);
    }
    return this.stablingOccupancy + unitCount <= this.fleetCapacity;
  }

  /**
   * Parks rolling stock units in the depot stabling sidings.
   */
  public assignStabling(unitCount: number): void {
    if (!this.canStable(unitCount)) {
      throw new DepotCapacityExceededError(
        `Cannot assign ${unitCount} units: depot ${this.id} capacity (${this.stablingOccupancy}/${this.fleetCapacity}) exceeded`
      );
    }
    this.stablingOccupancy += unitCount;
  }

  /**
   * Releases rolling stock units from stabling sidings.
   */
  public releaseStabling(unitCount: number): void {
    if (unitCount < 0) {
      throw new RangeError(`unitCount must be non-negative, received: ${unitCount}`);
    }
    if (unitCount > this.stablingOccupancy) {
      throw new DepotCapacityExceededError(
        `Cannot release ${unitCount} units: only ${this.stablingOccupancy} currently parked`
      );
    }
    this.stablingOccupancy -= unitCount;
  }

  /**
   * Checks whether the depot supports the required maintenance capability level.
   */
  public supportsMaintenanceLevel(level: MaintenanceCapability): boolean {
    const levelRank: Record<MaintenanceCapability, number> = {
      LEVEL_1_DAILY: 1,
      LEVEL_2_PERIODIC: 2,
      LEVEL_3_OVERHAUL: 3,
    };
    return levelRank[this.maintenanceLevelCapability] >= levelRank[level];
  }

  /**
   * Submits a rolling stock unit for maintenance.
   * If bay is free -> IN_PROGRESS.
   * If all bays full -> QUEUED in FIFO waiting queue.
   */
  public requestMaintenance(
    unitId: UnitId,
    requiredLevel: MaintenanceCapability = 'LEVEL_1_DAILY'
  ): { status: 'IN_PROGRESS' | 'QUEUED' } {
    if (!this.supportsMaintenanceLevel(requiredLevel)) {
      throw new DepotCapabilityError(
        `Depot ${this.id} capability (${this.maintenanceLevelCapability}) does not support requested level (${requiredLevel})`
      );
    }

    if (this.activeMaintenanceCount < this.maintenanceSlots) {
      this.activeMaintenanceCount++;
      return { status: 'IN_PROGRESS' };
    }

    this.maintenanceQueue.push(unitId);
    return { status: 'QUEUED' };
  }

  /**
   * Completes maintenance on a serviced unit, freeing a slot.
   * If units are in the FIFO queue, immediately admits the next unit and returns its ID.
   */
  public completeMaintenance(): UnitId | null {
    if (this.activeMaintenanceCount > 0) {
      this.activeMaintenanceCount--;
    }

    if (this.maintenanceQueue.length > 0) {
      const nextUnit = this.maintenanceQueue.shift()!;
      this.activeMaintenanceCount++;
      return nextUnit;
    }

    return null;
  }

  /**
   * Upgrades the depot facility to a higher tier.
   */
  public upgradeTier(targetTier: DepotTier): void {
    if (targetTier <= this.tier) {
      throw new RangeError(`Upgrade target tier (${targetTier}) must be higher than current tier (${this.tier})`);
    }

    const newConfig = DEPOT_TIER_CONFIGS[targetTier];
    this.tier = targetTier;
    this.fleetCapacity = newConfig.fleetCapacity;
    this.maintenanceSlots = newConfig.maintenanceSlots;
    this.maintenanceLevelCapability = newConfig.capability;
    this.dailyOperatingCost = newConfig.dailyOperatingCost;
  }
}
