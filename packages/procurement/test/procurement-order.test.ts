import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  OrderId,
  CompanyId,
  DepotId,
  toMoney,
  createGameTimestamp,
} from '@railway/shared';
import {
  ProcurementOrderEntity,
  InvalidProcurementStateTransitionError,
} from '../src/index.js';

describe('ProcurementOrderEntity', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotId = createBrandedId<DepotId>('DEP_CIPINANG');
  const orderId = createBrandedId<OrderId>('ORD_01');

  it('initializes order with correct totalCost and initial DRAFT state', () => {
    const order = new ProcurementOrderEntity({
      id: orderId,
      companyId,
      specId: 'SPEC_COACH_K1_EXEC',
      quantity: 4,
      unitCost: toMoney(7_500_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 120,
    });

    expect(order.status).toBe('DRAFT');
    expect(order.totalCost as number).toBe(30_000_000_000);
    expect(order.leadTimeDays).toBe(120);
  });

  it('progresses through full valid lifecycle', () => {
    const order = new ProcurementOrderEntity({
      id: orderId,
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 1,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 180,
    });

    order.requestQuote();
    expect(order.status).toBe('QUOTED');

    const orderedTime = createGameTimestamp(1440); // Day 2
    const deliveryTime = createGameTimestamp(1440 + 180 * 1440);
    order.placeOrder(orderedTime, deliveryTime);
    expect(order.status).toBe('ORDERED');
    expect(order.orderedTimestamp).toEqual(orderedTime);
    expect(order.expectedDeliveryTimestamp).toEqual(deliveryTime);

    order.startProduction();
    expect(order.status).toBe('IN_PRODUCTION');

    order.startTesting();
    expect(order.status).toBe('TESTING');

    order.startTransit();
    expect(order.status).toBe('IN_TRANSIT');

    order.deliverToDepot();
    expect(order.status).toBe('DELIVERED');

    order.commission();
    expect(order.status).toBe('COMMISSIONED');
  });

  it('rejects illegal state transitions', () => {
    const order = new ProcurementOrderEntity({
      id: orderId,
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 1,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 180,
    });

    // Cannot start production directly from DRAFT
    expect(() => {
      order.startProduction();
    }).toThrow(InvalidProcurementStateTransitionError);

    // Cannot commission directly from DRAFT
    expect(() => {
      order.commission();
    }).toThrow(InvalidProcurementStateTransitionError);
  });

  it('allows cancellation in early stages but rejects cancellation once delivered', () => {
    const order = new ProcurementOrderEntity({
      id: orderId,
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      quantity: 2,
      unitCost: toMoney(5_500_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 90,
      status: 'DELIVERED',
    });

    expect(() => {
      order.cancel();
    }).toThrow(InvalidProcurementStateTransitionError);
  });
});
