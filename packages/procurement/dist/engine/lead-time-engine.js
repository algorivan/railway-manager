export class ProcurementLeadTimeEngine {
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
    static evaluateOrder(order, currentTimestamp) {
        // Only active manufacturing orders are advanced by the lead-time engine
        if (order.status === 'DRAFT' ||
            order.status === 'QUOTED' ||
            order.status === 'DELIVERED' ||
            order.status === 'COMMISSIONED' ||
            order.status === 'CANCELLED') {
            return null;
        }
        if (!order.orderedTimestamp) {
            return null;
        }
        const currentTick = currentTimestamp.totalMinutes;
        const startTick = order.orderedTimestamp.totalMinutes;
        const totalLeadTicks = order.leadTimeDays * 1440; // 1,440 ticks per day
        const elapsedTicks = currentTick - startTick;
        if (elapsedTicks < 0) {
            return null;
        }
        const progressRatio = elapsedTicks / totalLeadTicks;
        const previousStatus = order.status;
        if (progressRatio >= 0.95 && order.status === 'IN_TRANSIT') {
            order.deliverToDepot();
            return {
                orderId: order.id,
                previousStatus,
                newStatus: 'DELIVERED',
                tick: currentTick,
            };
        }
        if (progressRatio >= 0.85 && order.status === 'TESTING') {
            order.startTransit();
            return {
                orderId: order.id,
                previousStatus,
                newStatus: 'IN_TRANSIT',
                tick: currentTick,
            };
        }
        if (progressRatio >= 0.75 && order.status === 'IN_PRODUCTION') {
            order.startTesting();
            return {
                orderId: order.id,
                previousStatus,
                newStatus: 'TESTING',
                tick: currentTick,
            };
        }
        if (progressRatio >= 0.10 && order.status === 'ORDERED') {
            order.startProduction();
            return {
                orderId: order.id,
                previousStatus,
                newStatus: 'IN_PRODUCTION',
                tick: currentTick,
            };
        }
        return null;
    }
    /**
     * Advances a batch of orders and returns all triggered state transitions.
     */
    static advanceOrders(orders, currentTimestamp) {
        const events = [];
        for (const order of orders) {
            const event = this.evaluateOrder(order, currentTimestamp);
            if (event) {
                events.push(event);
            }
        }
        return Object.freeze(events);
    }
}
//# sourceMappingURL=lead-time-engine.js.map