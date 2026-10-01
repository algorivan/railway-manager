import {
  EventId,
  ServiceRunId,
  TransactionId,
  addMinutes,
  toMoney,
  toKm,
  DeterministicPRNG,
  createBrandedId,
} from '@railway/shared';
import {
  GameState,
  SimulationSpeed,
  PlayerAction,
  GameConfig,
  SimulationResult,
  SimulationEngineContract,
  SimulationEvent,
  TickExecutionMetrics,
} from '../types/simulation.types.js';
import { ActiveServiceRunEntity } from '@railway/timetable';
import { SolvencyEngine } from '@railway/economy';

export class SimulationEngine implements SimulationEngineContract {
  /**
   * Pure deterministic state transition function (DOMAIN_MODEL.md §4.1)
   * S_{t+1} = simulateTick(S_t, A_t, C, sigma)
   */
  public simulateTick(
    currentState: Readonly<GameState>,
    playerActions: ReadonlyArray<PlayerAction>,
    config: Readonly<GameConfig>,
    seed: number
  ): SimulationResult {
    const startTime = performance.now();
    const emittedEvents: SimulationEvent[] = [];

    // 0. Handle PAUSED speed immediately
    if (currentState.speed === 'PAUSED') {
      return {
        nextState: currentState,
        emittedEvents: [],
        metrics: {
          tickDurationMs: Math.round((performance.now() - startTime) * 100) / 100,
          processedActionsCount: 0,
          emittedEventsCount: 0,
          activeServicesCount: currentState.activeServices.length,
        },
      };
    }

    // Seeded PRNG for deterministic random evaluations
    const tickSeed = (seed ^ (currentState.timestamp.totalMinutes + 1)) >>> 0;
    const prng = new DeterministicPRNG(tickSeed);

    // 1. Advance simulation time by 1 tick (1 simulated minute)
    const nextTimestamp = addMinutes(currentState.timestamp, 1);
    const isNewDay = nextTimestamp.day > currentState.timestamp.day;

    let nextSpeed: SimulationSpeed = currentState.speed;
    const nextActiveServices = [...currentState.activeServices];
    const nextB2bContracts = [...currentState.b2bContracts];

    // 2. Process Player Actions
    let processedActions = 0;
    for (const action of playerActions) {
      processedActions++;
      if (action.type === 'SET_SIMULATION_SPEED') {
        nextSpeed = action.speed;
      } else if (action.type === 'CANCEL_SERVICE') {
        const target = nextActiveServices.find((s) => s.id === action.serviceRunId);
        if (target && target.status !== 'COMPLETED' && target.status !== 'CANCELLED') {
          target.cancel(action.reason);
        }
      } else if (action.type === 'ACCEPT_B2B_CONTRACT') {
        const contract = nextB2bContracts.find((c) => c.id === action.contractId);
        if (contract && contract.status === 'OFFERED') {
          contract.acceptContract();
        }
      } else if (action.type === 'DISPATCH_SERVICE') {
        const slot = currentState.timetableSlots.find((s) => s.id === action.slotId);
        if (slot) {
          const runId = createBrandedId<ServiceRunId>(`RUN_${slot.id}_${nextTimestamp.totalMinutes}`);
          const newRun = new ActiveServiceRunEntity({
            id: runId,
            timetableSlotId: slot.id,
            currentStationId: createBrandedId('STN_GMR_GAMBIR'),
            nextStationId: createBrandedId('STN_BD_BANDUNG'),
            status: 'IN_TRANSIT',
          });
          nextActiveServices.push(newRun);

          emittedEvents.push({
            id: createBrandedId<EventId>(`EVT_DEP_${runId}`),
            type: 'DEPARTURE',
            timestamp: nextTimestamp,
            entityId: runId,
            payload: { timetableSlotId: slot.id, scheduledMinute: slot.departureMinuteOfDay },
          });
        }
      }
    }

    // 3. Process Automatic Scheduled Departures from Timetable
    const currentDayOfWeek = ((nextTimestamp.day - 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    for (const slot of currentState.timetableSlots) {
      const alreadyDispatchedThisTick = nextActiveServices.some(
        (s) => s.timetableSlotId === slot.id && s.id.endsWith(`_${nextTimestamp.totalMinutes}`)
      );

      if (
        slot.active &&
        slot.isOperatingOnDay(currentDayOfWeek) &&
        slot.departureMinuteOfDay === nextTimestamp.minuteOfDay &&
        !alreadyDispatchedThisTick
      ) {
        // Dispatch slot
        const runId = createBrandedId<ServiceRunId>(`RUN_${slot.id}_${nextTimestamp.totalMinutes}`);
        const serviceRun = new ActiveServiceRunEntity({
          id: runId,
          timetableSlotId: slot.id,
          currentStationId: createBrandedId('STN_GMR_GAMBIR'),
          nextStationId: createBrandedId('STN_BD_BANDUNG'),
          status: 'IN_TRANSIT',
        });
        nextActiveServices.push(serviceRun);

        emittedEvents.push({
          id: createBrandedId<EventId>(`EVT_DEP_${runId}`),
          type: 'DEPARTURE',
          timestamp: nextTimestamp,
          entityId: runId,
          payload: { timetableSlotId: slot.id },
        });
      }
    }

    // 4. Update In-Transit Trains & Accrue Operating Expenses
    for (const run of nextActiveServices) {
      if (run.status === 'IN_TRANSIT') {
        // Delta distance progressed in 1 minute: (100 km/h / 60) km
        const deltaKm = toKm(100 / 60);

        // Calculate TAC and Fuel costs for 1 minute
        // TAC = config.tacBaseRatePerTrainKm * deltaKm
        const tacCost = toMoney(Math.round(config.tacBaseRatePerTrainKm * deltaKm));
        // Fuel = 3.8 L/km * config.fuelPricePerLiter * deltaKm
        const fuelCost = toMoney(Math.round(3.8 * config.fuelPricePerLiter * deltaKm));
        const totalOpexThisMinute = toMoney(tacCost + fuelCost);

        run.recordOpex(totalOpexThisMinute);

        // Deduct from company ledger
        currentState.generalLedger.postTransaction({
          id: createBrandedId<TransactionId>(`TX_OPEX_${run.id}_${nextTimestamp.totalMinutes}`),
          companyId: currentState.companyId,
          timestamp: nextTimestamp,
          category: 'OPEX_FUEL_ENERGY',
          amount: toMoney(-totalOpexThisMinute),
          referenceEntityId: run.id,
          description: `Operating expenses during transit run ${run.id}`,
        });

        // Stochastic breakdown check via seeded Mulberry32 PRNG (SIMULATION_RULES.md §6.3)
        const roll = prng.next();
        // Standard condition hourly failure threshold ~ 0.001
        if (roll < 0.0005) {
          const delayMinutes = prng.nextInt(30, 90);
          run.recordDelay(delayMinutes);

          emittedEvents.push({
            id: createBrandedId<EventId>(`EVT_BRK_${run.id}_${nextTimestamp.totalMinutes}`),
            type: 'BREAKDOWN',
            timestamp: nextTimestamp,
            entityId: run.id,
            payload: { delayAddedMinutes: delayMinutes },
          });
        }
      }
    }

    // 5. Day Rollover Operations (if new day)
    if (isNewDay) {
      for (const contract of nextB2bContracts) {
        contract.advanceDay();
      }

      // Check monthly workforce payroll accrual (every 30th day)
      if (nextTimestamp.day % 30 === 0) {
        // Debit payroll transaction
        let totalMonthlyPayroll = toMoney(0);
        for (const emp of currentState.employees) {
          totalMonthlyPayroll = toMoney(totalMonthlyPayroll + emp.monthlyBaseSalary);
        }

        if (totalMonthlyPayroll > 0) {
          currentState.generalLedger.postTransaction({
            id: createBrandedId<TransactionId>(`TX_PAYROLL_DAY_${nextTimestamp.day}`),
            companyId: currentState.companyId,
            timestamp: nextTimestamp,
            category: 'OPEX_WORKFORCE_PAYROLL',
            amount: toMoney(-totalMonthlyPayroll),
            description: `Monthly company workforce payroll for Day ${nextTimestamp.day}`,
          });

          emittedEvents.push({
            id: createBrandedId<EventId>(`EVT_PAYROLL_DAY_${nextTimestamp.day}`),
            type: 'FINANCIAL_ACCRUAL',
            timestamp: nextTimestamp,
            entityId: currentState.companyId,
            payload: { totalPayrollDebited: totalMonthlyPayroll },
          });
        }
      }
    }

    // 6. Solvency Evaluation
    const solvencyEval = SolvencyEngine.evaluateSolvency(
      currentState.generalLedger.currentCashBalance,
      currentState.consecutiveCriticalInsolventDays
    );

    const nextState: GameState = {
      ...currentState,
      timestamp: nextTimestamp,
      speed: nextSpeed,
      activeServices: Object.freeze(nextActiveServices),
      b2bContracts: Object.freeze(nextB2bContracts),
      consecutiveCriticalInsolventDays: solvencyEval.consecutiveCriticalDays,
      solvencyStatus: solvencyEval.status,
    };

    const tickDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const metrics: TickExecutionMetrics = {
      tickDurationMs,
      processedActionsCount: processedActions,
      emittedEventsCount: emittedEvents.length,
      activeServicesCount: nextActiveServices.length,
    };

    return {
      nextState,
      emittedEvents,
      metrics,
    };
  }
}
