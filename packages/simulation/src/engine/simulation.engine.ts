import {
  EventId,
  ServiceRunId,
  TransactionId,
  StationId,
  GameTimestamp,
  addMinutes,
  toMoney,
  toKm,
  addMoney,
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
import { ActiveServiceRunEntity, TimetableSlotEntity } from '@railway/timetable';
import { SolvencyEngine } from '@railway/economy';
import { DemandCalculator, FareCalculator } from '@railway/demand';
import { JAVA_ROLLING_STOCK_CATALOG } from '@railway/game-data';
import { ProcurementLeadTimeEngine } from '@railway/procurement';

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
          this.dispatchSlot(slot, nextTimestamp, currentState, nextActiveServices, emittedEvents);
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
        this.dispatchSlot(slot, nextTimestamp, currentState, nextActiveServices, emittedEvents);
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

        // Update rolling stock unit wear & odometer for this consist
        const slot = currentState.timetableSlots.find((s) => s.id === run.timetableSlotId);
        if (slot) {
          const comp = currentState.compositions.find((c) => c.id === slot.compositionId);
          if (comp) {
            for (const unitId of comp.getAllUnitIds()) {
              const unit = currentState.fleetUnits.find((u) => u.id === unitId);
              if (unit && unit.status !== 'DECOMMISSIONED' && unit.status !== 'IN_MAINTENANCE') {
                // Base wear: 0.0020% per km (SIMULATION_RULES.md §6.1)
                unit.recordRun(deltaKm, 0.0020 * (deltaKm as number));
              }
            }
          }
        }

        // Stochastic breakdown check via seeded Mulberry32 PRNG (SIMULATION_RULES.md §6.3)
        const roll = prng.next();
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

        // Check if train has completed its run (reached scheduled arrival minute + delay)
        if (slot) {
          const arrivalMinute = (slot.scheduledArrivalMinuteOfDay + run.delayMinutes) % 1440;
          if (nextTimestamp.minuteOfDay === arrivalMinute) {
            run.arriveAtStation(run.nextStationId);
            run.beginTurnaround();
            run.complete();

            // Complete crew duty
            const duration = slot.scheduledDurationMinutes + run.delayMinutes;
            const driver = currentState.employees.find((e) => e.id === slot.primaryDriverId);
            if (driver && driver.status === 'ON_DUTY') {
              driver.completeDuty(duration);
            }
            if (slot.primaryConductorId) {
              const conductor = currentState.employees.find((e) => e.id === slot.primaryConductorId);
              if (conductor && conductor.status === 'ON_DUTY') {
                conductor.completeDuty(duration);
              }
            }

            emittedEvents.push({
              id: createBrandedId<EventId>(`EVT_ARR_${run.id}`),
              type: 'ARRIVAL',
              timestamp: nextTimestamp,
              entityId: run.id,
              payload: {
                timetableSlotId: slot.id,
                arrivalStationId: run.currentStationId,
                totalPassengers: run.totalPassengers,
                revenueAccrued: run.revenueAccrued,
                opexAccrued: run.opexAccrued,
                delayMinutes: run.delayMinutes,
              },
            });
          }
        }
      }
    }

    // 5. Rest recovery for resting employees (SIMULATION_RULES.md §8.2)
    for (const emp of currentState.employees) {
      if (emp.status === 'RESTING') {
        emp.rest(1);
      }
    }

    // 6. Advance procurement manufacturing orders
    const procEvents = ProcurementLeadTimeEngine.advanceOrders(
      currentState.procurementOrders,
      nextTimestamp
    );
    for (const pe of procEvents) {
      if (pe.newStatus === 'DELIVERED') {
        emittedEvents.push({
          id: createBrandedId<EventId>(`EVT_PROC_${pe.orderId}_${nextTimestamp.totalMinutes}`),
          type: 'PROCUREMENT_COMPLETE',
          timestamp: nextTimestamp,
          entityId: pe.orderId,
          payload: { orderId: pe.orderId, newStatus: pe.newStatus, tick: pe.tick },
        });
      }
    }

    // 7. Day Rollover Operations (if new day)
    if (isNewDay) {
      for (const contract of nextB2bContracts) {
        const wasActive = (contract.status as string) === 'ACTIVE';
        contract.advanceDay();
        const postStatus = contract.status as string;
        if (wasActive && (postStatus === 'FULFILLED' || postStatus === 'BREACHED')) {
          emittedEvents.push({
            id: createBrandedId<EventId>(`EVT_CONTR_${contract.id}_DAY_${nextTimestamp.day}`),
            type: 'CONTRACT_DEADLINE',
            timestamp: nextTimestamp,
            entityId: contract.id,
            payload: {
              contractId: contract.id,
              clientName: contract.clientName,
              status: contract.status,
              deliveredVolumeTons: contract.deliveredVolumeTons,
              totalRequiredVolumeTons: contract.totalContractRequiredVolumeTons,
            },
          });
        }
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

    // 8. Solvency Evaluation
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

  /**
   * Dispatches a timetable slot: calculates passenger boarding via DemandCalculator & FareCalculator,
   * credits departure ticket revenue to the company ledger, activates crew duty, and emits DEPARTURE event.
   */
  private dispatchSlot(
    slot: TimetableSlotEntity,
    nextTimestamp: GameTimestamp,
    currentState: Readonly<GameState>,
    nextActiveServices: ActiveServiceRunEntity[],
    emittedEvents: SimulationEvent[]
  ): void {
    const runId = createBrandedId<ServiceRunId>(`RUN_${slot.id}_${nextTimestamp.totalMinutes}`);

    // 1. Resolve Route endpoints & distance
    const route = currentState.routes?.find((r) => r.id === slot.routeId);
    const originStationId = route?.originStationId ?? createBrandedId<StationId>('STN_GMR_GAMBIR');
    const destinationStationId = route?.destinationStationId ?? createBrandedId<StationId>('STN_BD_BANDUNG');
    const distanceKm = route?.distanceKm ?? toKm(160);

    // 2. Resolve Composition & Passenger Capacities
    const comp = currentState.compositions.find((c) => c.id === slot.compositionId);
    let ecoCapacity = 0;
    let execCapacity = 0;
    let luxCapacity = 0;
    let hasDiningCar = comp?.diningCarUnitId !== undefined;

    if (comp) {
      for (const unitId of comp.carriageUnitIds) {
        const unit = currentState.fleetUnits.find((u) => u.id === unitId);
        if (unit) {
          const spec = JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === unit.specId);
          if (spec && spec.category === 'PASSENGER_CARRIAGE') {
            if (spec.passengerClass === 'ECONOMY') ecoCapacity += spec.passengerCapacity;
            else if (spec.passengerClass === 'EXECUTIVE') execCapacity += spec.passengerCapacity;
            else if (spec.passengerClass === 'LUXURY') luxCapacity += spec.passengerCapacity;
          }
        }
      }
      if (!hasDiningCar) {
        for (const unitId of comp.getAllUnitIds()) {
          const unit = currentState.fleetUnits.find((u) => u.id === unitId);
          if (unit?.specId === 'SPEC_COACH_M1_DINING') {
            hasDiningCar = true;
          }
        }
      }
    }

    // Default benchmark capacities if fleet consist units are not explicitly populated
    const effectiveEcoCap = ecoCapacity > 0 ? ecoCapacity : 80;
    const effectiveExecCap = execCapacity > 0 ? execCapacity : 50;
    const effectiveLuxCap = luxCapacity > 0 ? luxCapacity : 0;

    // 3. Demand & Benchmark Fare Calculations (SIMULATION_RULES.md §5)
    const ecoBenchmark = FareCalculator.calculateBenchmarkFare('ECONOMY', distanceKm);
    const execBenchmark = FareCalculator.calculateBenchmarkFare('EXECUTIVE', distanceKm);
    const luxBenchmark = FareCalculator.calculateBenchmarkFare('LUXURY', distanceKm);

    const activeRouteSlots = currentState.timetableSlots.filter(
      (s) => s.routeId === slot.routeId && s.active
    ).length;
    const dailyFrequency = Math.max(1, activeRouteSlots);

    const demandResult = DemandCalculator.calculateDemand({
      originStationId,
      destinationStationId,
      distanceKm,
      departureMinuteOfDay: slot.departureMinuteOfDay,
      baseDemand: 1000,
      chargedFares: {
        ECONOMY: ecoBenchmark,
        EXECUTIVE: execBenchmark,
        LUXURY: luxBenchmark,
      },
      dailyFrequency,
      serviceQuality: 0.85,
      companyReputation: currentState.reputation,
    });

    const boardedEco = Math.min(effectiveEcoCap, demandResult.byClass.ECONOMY.generatedDemand);
    const boardedExec = Math.min(effectiveExecCap, demandResult.byClass.EXECUTIVE.generatedDemand);
    const boardedLux = Math.min(effectiveLuxCap, demandResult.byClass.LUXURY.generatedDemand);

    const ticketRevenue = toMoney(
      Math.round(
        boardedEco * (ecoBenchmark as number) +
        boardedExec * (execBenchmark as number) +
        boardedLux * (luxBenchmark as number)
      )
    );

    let totalRevenue = ticketRevenue;
    if (hasDiningCar) {
      const diningRev = FareCalculator.calculateDiningRevenue({
        ECONOMY: boardedEco,
        EXECUTIVE: boardedExec,
        LUXURY: boardedLux,
      });
      totalRevenue = addMoney(totalRevenue, diningRev);
    }

    // 4. Instantiate Active Service Run
    const newRun = new ActiveServiceRunEntity({
      id: runId,
      timetableSlotId: slot.id,
      currentStationId: originStationId,
      nextStationId: destinationStationId,
      status: 'IN_TRANSIT',
    });

    newRun.boardPassengers({
      ECONOMY: boardedEco,
      EXECUTIVE: boardedExec,
      LUXURY: boardedLux,
    });

    if (totalRevenue > 0) {
      newRun.recordRevenue(totalRevenue);
      currentState.generalLedger.postTransaction({
        id: createBrandedId<TransactionId>(`TX_REV_${runId}`),
        companyId: currentState.companyId,
        timestamp: nextTimestamp,
        category: 'REV_PASSENGER_TICKETS',
        amount: totalRevenue,
        referenceEntityId: runId,
        description: `Passenger ticket & ancillary revenue for service ${runId}`,
      });
    }

    // 5. Assign and start crew duty
    const driver = currentState.employees.find((e) => e.id === slot.primaryDriverId);
    if (driver && driver.status === 'AVAILABLE') {
      driver.startDuty();
    }
    if (slot.primaryConductorId) {
      const conductor = currentState.employees.find((e) => e.id === slot.primaryConductorId);
      if (conductor && conductor.status === 'AVAILABLE') {
        conductor.startDuty();
      }
    }

    nextActiveServices.push(newRun);

    // 6. Emit Departure Event
    emittedEvents.push({
      id: createBrandedId<EventId>(`EVT_DEP_${runId}`),
      type: 'DEPARTURE',
      timestamp: nextTimestamp,
      entityId: runId,
      payload: {
        timetableSlotId: slot.id,
        scheduledMinute: slot.departureMinuteOfDay,
        originStationId,
        destinationStationId,
        boardedPassengers: {
          ECONOMY: boardedEco,
          EXECUTIVE: boardedExec,
          LUXURY: boardedLux,
        },
        totalPassengers: boardedEco + boardedExec + boardedLux,
        revenueAccrued: totalRevenue,
      },
    });
  }
}
