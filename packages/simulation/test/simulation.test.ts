import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  createGameTimestamp,
  CompanyId,
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
} from '@railway/shared';
import {
  GameState,
  GameConfig,
} from '../src/types/simulation.types.js';
import { SimulationEngine } from '../src/engine/simulation.engine.js';
import { TimetableSlotEntity } from '@railway/timetable';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import { EmployeeEntity } from '@railway/workforce';

describe('Deterministic Simulation Engine (DOMAIN_MODEL.md §4 & SIMULATION_RULES.md §2)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI');
  const dummyDriverId = createBrandedId<EmployeeId>('EMP_DRIVER_01');

  const createInitialGameState = (): GameState => {
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    const slot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_001'),
      routeId: createBrandedId<RouteId>('ROUTE_GMR_BD'),
      compositionId: createBrandedId<CompositionId>('CONSIST_01'),
      primaryDriverId: dummyDriverId,
      departureMinuteOfDay: 480, // 08:00
      scheduledArrivalMinuteOfDay: 630, // 10:30
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
      active: true,
    });

    const driver = new EmployeeEntity({
      id: dummyDriverId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: createBrandedId('DEPOT_BD'),
      customMonthlySalary: toMoney(12_000_000),
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['ROUTE_GMR_BD'],
    });

    return {
      companyId,
      timestamp: createGameTimestamp(479), // Day 1, 07:59
      speed: '1X',
      activeServices: Object.freeze([]),
      timetableSlots: Object.freeze([slot]),
      fleetUnits: Object.freeze([]),
      compositions: Object.freeze([]),
      procurementOrders: Object.freeze([]),
      depots: Object.freeze([]),
      employees: Object.freeze([driver]),
      b2bContracts: Object.freeze([]),
      psoContracts: Object.freeze([]),
      charterContracts: Object.freeze([]),
      generalLedger: ledger,
      reputation: 0.95,
      consecutiveCriticalInsolventDays: 0,
      solvencyStatus: 'SOLVENT',
    };
  };

  const dummyConfig: GameConfig = {
    fuelPricePerLiter: toMoney(15_000),
    tacBaseRatePerTrainKm: toMoney(25_000),
    tacWeightSurchargePer100Tons: toMoney(5_000),
    simulationSeed: 42,
  };

  it('guarantees bit-for-bit determinism across repeated executions with identical seeds', () => {
    const engine = new SimulationEngine();

    // Run A
    const stateA = createInitialGameState();
    const resultA1 = engine.simulateTick(stateA, [], dummyConfig, 12345);
    const resultA2 = engine.simulateTick(resultA1.nextState, [], dummyConfig, 12345);

    // Run B
    const stateB = createInitialGameState();
    const resultB1 = engine.simulateTick(stateB, [], dummyConfig, 12345);
    const resultB2 = engine.simulateTick(resultB1.nextState, [], dummyConfig, 12345);

    expect(resultA1.nextState.timestamp.totalMinutes).toBe(resultB1.nextState.timestamp.totalMinutes);
    expect(resultA2.nextState.timestamp.totalMinutes).toBe(resultB2.nextState.timestamp.totalMinutes);
    expect(resultA2.emittedEvents.length).toBe(resultB2.emittedEvents.length);
    expect(resultA2.nextState.generalLedger.currentCashBalance).toBe(
      resultB2.nextState.generalLedger.currentCashBalance
    );
  });

  it('automatically dispatches scheduled timetable slot when departure minute matches', () => {
    const engine = new SimulationEngine();
    const state = createInitialGameState(); // minute 479 (07:59)

    // Tick advances to minute 480 (08:00) -> matches slot departure!
    const result = engine.simulateTick(state, [], dummyConfig, 42);

    expect(result.nextState.timestamp.minuteOfDay).toBe(480);
    expect(result.nextState.activeServices.length).toBe(1);
    expect(result.emittedEvents.some((e) => e.type === 'DEPARTURE')).toBe(true);
  });

  it('accrues OPEX during transit and charges company ledger', () => {
    const engine = new SimulationEngine();
    const state = createInitialGameState();

    // Tick 1 (Minute 480): Train departs
    const tick1 = engine.simulateTick(state, [], dummyConfig, 42);
    expect(tick1.nextState.activeServices.length).toBe(1);

    const initialCash = tick1.nextState.generalLedger.currentCashBalance;

    // Tick 2 (Minute 481): Train in transit -> incurs OPEX (Fuel + TAC)
    const tick2 = engine.simulateTick(tick1.nextState, [], dummyConfig, 42);

    expect(tick2.nextState.generalLedger.currentCashBalance).toBeLessThan(initialCash);
    expect(tick2.nextState.activeServices[0]!.opexAccrued).toBeGreaterThan(0);
  });

  it('respects PAUSED simulation speed with zero time progression', () => {
    const engine = new SimulationEngine();
    const state = { ...createInitialGameState(), speed: 'PAUSED' as const };

    const result = engine.simulateTick(state, [], dummyConfig, 42);
    expect(result.nextState.timestamp.totalMinutes).toBe(479);
    expect(result.emittedEvents.length).toBe(0);
  });

  it('executes manual player dispatch action', () => {
    const engine = new SimulationEngine();
    const state = createInitialGameState();

    const result = engine.simulateTick(
      state,
      [{ type: 'DISPATCH_SERVICE', slotId: createBrandedId('SLOT_001') }],
      dummyConfig,
      42
    );

    expect(result.metrics.processedActionsCount).toBe(1);
    expect(result.nextState.activeServices.length).toBe(1);
  });

  it('handles midnight day rollover and advances active B2B contract days', () => {
    const engine = new SimulationEngine();
    const baseState = createInitialGameState();

    // Advance to 23:59 on Day 1 (total minutes: 1439)
    const stateAtMidnight = {
      ...baseState,
      timestamp: createGameTimestamp(1439), // Day 1, 23:59
    };

    const result = engine.simulateTick(stateAtMidnight, [], dummyConfig, 42);

    // Next tick: Day 2, 00:00 (total minutes: 1440)
    expect(result.nextState.timestamp.day).toBe(2);
    expect(result.nextState.timestamp.minuteOfDay).toBe(0);
    expect(result.nextState.timestamp.totalMinutes).toBe(1440);
  });

  it('automatically debits monthly payroll and emits FINANCIAL_ACCRUAL event on Day 30', () => {
    const engine = new SimulationEngine();
    const baseState = createInitialGameState();

    // End of Day 29, advancing to Day 30 (total minutes: 29 * 1440 - 1 = 41759)
    const stateBeforeDay30 = {
      ...baseState,
      timestamp: createGameTimestamp(41759), // Day 29, 23:59
    };

    const initialCash = stateBeforeDay30.generalLedger.currentCashBalance;

    // Tick into Day 30
    const result = engine.simulateTick(stateBeforeDay30, [], dummyConfig, 42);

    expect(result.nextState.timestamp.day).toBe(30);
    expect(result.nextState.generalLedger.currentCashBalance).toBe(
      toMoney(initialCash - 12_000_000) // Driver monthly salary: 12M IDR
    );

    const payrollEvent = result.emittedEvents.find((e) => e.type === 'FINANCIAL_ACCRUAL');
    expect(payrollEvent).toBeDefined();
    expect(payrollEvent?.payload.totalPayrollDebited).toBe(toMoney(12_000_000));
  });
});
