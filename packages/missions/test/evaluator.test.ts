import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  createGameTimestamp,
  CompanyId,
  ServiceRunId,
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
} from '@railway/shared';
import { GameState } from '@railway/simulation';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import { TimetableSlotEntity, ActiveServiceRunEntity } from '@railway/timetable';
import { DepotEntity } from '@railway/network';
import { MissionEvaluator } from '../src/evaluators/mission.evaluator.js';

describe('MissionEvaluator (MISSION_DESIGN.md §5)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI');

  const createMockGameState = (): GameState => {
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    const slot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_01'),
      routeId: createBrandedId<RouteId>('ROUTE_GMR_BD'),
      compositionId: createBrandedId<CompositionId>('CONSIST_01'),
      primaryDriverId: createBrandedId<EmployeeId>('EMP_01'),
      departureMinuteOfDay: 480,
      scheduledArrivalMinuteOfDay: 600,
      operatingDays: [1, 2, 3, 4, 5],
      active: true,
    });

    const run = new ActiveServiceRunEntity({
      id: createBrandedId<ServiceRunId>('RUN_01'),
      timetableSlotId: slot.id,
      currentStationId: createBrandedId('STN_GMR'),
      nextStationId: createBrandedId('STN_BD'),
    });
    run.boardPassengers({ ECONOMY: 150, EXECUTIVE: 50, LUXURY: 10 }); // Total 210 pax

    const depot = new DepotEntity({
      id: createBrandedId('DEPOT_BD'),
      companyId,
      name: 'Depo Bandung',
      stationId: createBrandedId('STN_BD'),
      tier: 1,
    });

    return {
      companyId,
      timestamp: createGameTimestamp(480),
      speed: '1X',
      activeServices: Object.freeze([run]),
      timetableSlots: Object.freeze([slot]),
      fleetUnits: Object.freeze([]),
      compositions: Object.freeze([]),
      procurementOrders: Object.freeze([]),
      depots: Object.freeze([depot]),
      employees: Object.freeze([]),
      b2bContracts: Object.freeze([]),
      psoContracts: Object.freeze([]),
      charterContracts: Object.freeze([]),
      generalLedger: ledger,
      reputation: 0.90,
      consecutiveCriticalInsolventDays: 0,
      solvencyStatus: 'SOLVENT',
    };
  };

  it('evaluates DEPOT_BUILT objective progress from gameState.depots', () => {
    const state = createMockGameState();
    const progress = MissionEvaluator.calculateObjectiveProgress('DEPOT_BUILT', state);
    expect(progress).toBe(1);
  });

  it('evaluates PASSENGERS_TRANSPORTED objective progress from active services', () => {
    const state = createMockGameState();
    const progress = MissionEvaluator.calculateObjectiveProgress('PASSENGERS_TRANSPORTED', state);
    expect(progress).toBe(210);
  });

  it('evaluates ROUTE_COUNT objective progress from active timetable slots', () => {
    const state = createMockGameState();
    const progress = MissionEvaluator.calculateObjectiveProgress('ROUTE_COUNT', state);
    expect(progress).toBe(1);
  });

  it('evaluates CASH_BALANCE objective progress from general ledger', () => {
    const state = createMockGameState();
    const progress = MissionEvaluator.calculateObjectiveProgress('CASH_BALANCE', state);
    expect(progress).toBe(toMoney(100_000_000_000));
  });
});
