import {
  UnitId,
  createBrandedId,
} from '@railway/shared';
import { DepotEntity, DepotCapacityExceededError } from '@railway/network';
import { RollingStockUnitEntity } from '@railway/fleet';
import {
  ProcurementOrderEntity,
  InvalidProcurementStateTransitionError,
} from '../entities/procurement-order.entity.js';

export class InvalidCommissioningTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCommissioningTargetError';
    Object.setPrototypeOf(this, InvalidCommissioningTargetError.prototype);
  }
}

export interface CommissioningOptions {
  readonly idGenerator?: (index: number) => UnitId;
  readonly serialGenerator?: (index: number) => string;
}

export class CommissioningService {
  /**
   * Accepts a delivered procurement order into a depot's physical fleet.
   * Enforces depot capacity constraints and returns active RollingStockUnit entities.
   */
  public static commissionOrder(
    order: ProcurementOrderEntity,
    depot: DepotEntity,
    options?: CommissioningOptions
  ): ReadonlyArray<RollingStockUnitEntity> {
    if (order.status !== 'DELIVERED') {
      throw new InvalidProcurementStateTransitionError(
        `Order ${order.id} must be in DELIVERED status to commission, current status is ${order.status}`,
        order.status,
        'COMMISSIONED'
      );
    }

    if (order.deliveryDepotId !== depot.id) {
      throw new InvalidCommissioningTargetError(
        `Order ${order.id} destination depot is ${order.deliveryDepotId}, cannot commission to depot ${depot.id}`
      );
    }

    if (!depot.canStable(order.quantity)) {
      throw new DepotCapacityExceededError(
        `Depot ${depot.id} capacity (${depot.stablingOccupancy}/${depot.fleetCapacity}) cannot accept ${order.quantity} units from order ${order.id}`
      );
    }

    // Allocate depot stabling capacity
    depot.assignStabling(order.quantity);

    // Transition order state to COMMISSIONED
    order.commission();

    // Instantiate active rolling stock fleet units
    const units: RollingStockUnitEntity[] = [];
    const timestampHex = Date.now().toString(16).slice(-4).toUpperCase();

    for (let i = 0; i < order.quantity; i++) {
      const unitId = options?.idGenerator
        ? options.idGenerator(i)
        : createBrandedId<UnitId>(`UNIT_${order.specId}_${timestampHex}_${i + 1}`);

      const serialNumber = options?.serialGenerator
        ? options.serialGenerator(i)
        : `${order.specId}-${timestampHex}-${(i + 1).toString().padStart(2, '0')}`;

      const unit = new RollingStockUnitEntity({
        id: unitId,
        companyId: order.companyId,
        specId: order.specId,
        serialNumber,
        homeDepotId: depot.id,
        currentDepotId: depot.id,
      });

      units.push(unit);
    }

    return Object.freeze(units);
  }
}
