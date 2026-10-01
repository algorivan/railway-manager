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
  ProcurementLeadTimeEngine,
} from '../src/index.js';

describe('ProcurementLeadTimeEngine', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const depotId = createBrandedId<DepotId>('DEP_CIPINANG');
  const orderId = createBrandedId<OrderId>('ORD_01');

  it('progresses order through milestones based on simulation ticks', () => {
    // 100 days lead time = 144,000 ticks
    const leadDays = 100;
    const startTick = 0;
    const order = new ProcurementOrderEntity({
      id: orderId,
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 1,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: leadDays,
      status: 'ORDERED',
      orderedTimestamp: createGameTimestamp(startTick),
      expectedDeliveryTimestamp: createGameTimestamp(leadDays * 1440),
    });

    // At 5% elapsed (7,200 ticks): still ORDERED
    let event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(7200));
    expect(event).toBeNull();
    expect(order.status).toBe('ORDERED');

    // At 10% elapsed (14,400 ticks): transitions to IN_PRODUCTION
    event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(14400));
    expect(event).not.toBeNull();
    expect(event?.newStatus).toBe('IN_PRODUCTION');
    expect(order.status).toBe('IN_PRODUCTION');

    // At 50% elapsed (72,000 ticks): remains IN_PRODUCTION
    event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(72000));
    expect(event).toBeNull();
    expect(order.status).toBe('IN_PRODUCTION');

    // At 75% elapsed (108,000 ticks): transitions to TESTING
    event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(108000));
    expect(event?.newStatus).toBe('TESTING');
    expect(order.status).toBe('TESTING');

    // At 85% elapsed (122,400 ticks): transitions to IN_TRANSIT
    event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(122400));
    expect(event?.newStatus).toBe('IN_TRANSIT');
    expect(order.status).toBe('IN_TRANSIT');

    // At 95% elapsed (136,800 ticks): transitions to DELIVERED
    event = ProcurementLeadTimeEngine.evaluateOrder(order, createGameTimestamp(136800));
    expect(event?.newStatus).toBe('DELIVERED');
    expect(order.status).toBe('DELIVERED');
  });

  it('processes batch advance of multiple active orders', () => {
    const order1 = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_01'),
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      quantity: 2,
      unitCost: toMoney(5_500_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 10, // 14,400 ticks
      status: 'ORDERED',
      orderedTimestamp: createGameTimestamp(0),
    });

    const order2 = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_02'),
      companyId,
      specId: 'SPEC_LOCO_CC201',
      quantity: 1,
      unitCost: toMoney(18_000_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 10,
      status: 'IN_TRANSIT',
      orderedTimestamp: createGameTimestamp(0),
    });

    // Advance to tick 14,000 (97% of 14,400 ticks):
    // order1 (at tick 0 ORDERED) should reach IN_PRODUCTION at 10%
    // order2 (IN_TRANSIT) should reach DELIVERED at 95%
    const events = ProcurementLeadTimeEngine.advanceOrders(
      [order1, order2],
      createGameTimestamp(14000)
    );

    expect(events.length).toBe(2);
    expect(order1.status).toBe('IN_PRODUCTION');
    expect(order2.status).toBe('DELIVERED');
  });
});
