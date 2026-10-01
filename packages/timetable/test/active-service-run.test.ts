import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  ServiceRunId,
  TimetableSlotId,
  StationId,
} from '@railway/shared';
import { ActiveServiceRunEntity } from '../src/entities/active-service-run.entity.js';

describe('ActiveServiceRunEntity (DOMAIN_MODEL.md §5.5)', () => {
  const createMockRun = () =>
    new ActiveServiceRunEntity({
      id: createBrandedId<ServiceRunId>('RUN_ARGO_001'),
      timetableSlotId: createBrandedId<TimetableSlotId>('SLOT_001'),
      currentStationId: createBrandedId<StationId>('STN_GMR_GAMBIR'),
      nextStationId: createBrandedId<StationId>('STN_BD_BANDUNG'),
    });

  it('progresses through standard operational service lifecycle', () => {
    const run = createMockRun();
    expect(run.status).toBe('SCHEDULED');

    // Boarding
    run.startBoarding();
    expect(run.status).toBe('BOARDING');

    // Board passengers
    run.boardPassengers({
      ECONOMY: 100,
      EXECUTIVE: 50,
      LUXURY: 10,
    });
    expect(run.totalPassengers).toBe(160);
    expect(run.passengerCount.ECONOMY).toBe(100);

    // Accrue ticket revenue
    run.recordRevenue(toMoney(30_000_000));
    expect(run.revenueAccrued).toBe(toMoney(30_000_000));

    // Depart towards destination
    run.depart(createBrandedId<StationId>('STN_BD_BANDUNG'));
    expect(run.status).toBe('IN_TRANSIT');

    // Accrue OPEX during transit (Fuel + TAC)
    run.recordOpex(toMoney(15_000_000));
    expect(run.opexAccrued).toBe(toMoney(15_000_000));

    // Arrive at intermediate or terminus station -> DWELL
    run.arriveAtStation(createBrandedId<StationId>('STN_BD_BANDUNG'));
    expect(run.status).toBe('DWELL');
    expect(run.currentStationId).toBe('STN_BD_BANDUNG');

    // Turnaround
    run.beginTurnaround();
    expect(run.status).toBe('TURNAROUND');

    // Complete
    run.complete();
    expect(run.status).toBe('COMPLETED');
  });

  it('tracks operational delays and service cancellation', () => {
    const run = createMockRun();

    run.recordDelay(15);
    run.recordDelay(10);
    expect(run.delayMinutes).toBe(25);

    run.cancel('Locomotive traction failure');
    expect(run.status).toBe('CANCELLED');
    expect(() => run.complete()).toThrow(/Cannot complete service run/);
  });
});
