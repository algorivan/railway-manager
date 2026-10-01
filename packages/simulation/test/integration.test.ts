import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  toKm,
  createGameTimestamp,
  CompanyId,
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
  UnitId,
  DepotId,
  StationId,
  ContractId,
  OrderId,
} from '@railway/shared';
import { RouteEntity, DepotEntity } from '@railway/network';
import { RollingStockUnitEntity, TrainCompositionEntity } from '@railway/fleet';
import { EmployeeEntity } from '@railway/workforce';
import { TimetableSlotEntity } from '@railway/timetable';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import { ProcurementOrderEntity } from '@railway/procurement';
import { B2BContractEntity } from '@railway/contracts';
import { GameState, GameConfig } from '../src/types/simulation.types.js';
import { SimulationEngine } from '../src/engine/simulation.engine.js';

describe('End-to-End Multi-Subsystem Simulation Integration (Phases 1-7)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI_EXPRESS');
  const gambirStationId = createBrandedId<StationId>('STN_GMR_GAMBIR');
  const bandungStationId = createBrandedId<StationId>('STN_BD_BANDUNG');
  const bandungDepotId = createBrandedId<DepotId>('DEPOT_BD_PASIRKALIKI');
  const routeId = createBrandedId<RouteId>('ROUTE_GMR_BD');
  const compositionId = createBrandedId<CompositionId>('CONSIST_ARGO_PARAHYANGAN');
  const driverId = createBrandedId<EmployeeId>('EMP_DRIVER_BUDI');
  const conductorId = createBrandedId<EmployeeId>('EMP_COND_SITI');

  const createRealisticCorridorState = (): GameState => {
    // 1. General Ledger
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    // 2. Network: Route Gambir - Bandung (160 km) & Depot
    const route = new RouteEntity({
      id: routeId,
      companyId,
      code: 'KA-PARAHYANGAN',
      name: 'Argo Parahyangan Gambir - Bandung',
      originStationId: gambirStationId,
      destinationStationId: bandungStationId,
      stationSequence: [gambirStationId, bandungStationId],
      distanceKm: 160.0,
      estimatedRuntimeMinutes: 160,
      trackAccessFeePerKm: toMoney(25_000),
      accessStatus: 'PERMIT_GRANTED',
    });

    const depot = new DepotEntity({
      id: bandungDepotId,
      companyId,
      name: 'Depo Lokomotif Bandung',
      stationId: bandungStationId,
      tier: 2,
    });

    // 3. Fleet: CC206 locomotive, 2x K3 Premium coaches, 1x K1 Exec coach, 1x M1 Dining Car, 1x Power Van
    const locoUnit = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC 206 13 01',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(10_000),
    });

    const k3Coach1 = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K3_01'),
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      serialNumber: 'K3 0 18 01',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(5_000),
    });

    const k3Coach2 = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K3_02'),
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      serialNumber: 'K3 0 18 02',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(5_000),
    });

    const k1Coach = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K1_01'),
      companyId,
      specId: 'SPEC_COACH_K1_EXEC',
      serialNumber: 'K1 0 18 01',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(5_000),
    });

    const m1Dining = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_M1_01'),
      companyId,
      specId: 'SPEC_COACH_M1_DINING',
      serialNumber: 'M1 0 18 01',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(5_000),
    });

    const powerCar = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_P_01'),
      companyId,
      specId: 'SPEC_VAN_P_GENERATOR',
      serialNumber: 'P 0 18 01',
      homeDepotId: bandungDepotId,
      currentDepotId: bandungDepotId,
      conditionPercentage: 100,
      odometerKm: toKm(5_000),
    });

    const consist = new TrainCompositionEntity({
      id: compositionId,
      companyId,
      name: 'Rangkaian Argo Parahyangan SS',
      locomotiveUnitIds: [locoUnit.id],
      carriageUnitIds: [k3Coach1.id, k3Coach2.id, k1Coach.id],
      diningCarUnitId: m1Dining.id,
      powerCarUnitId: powerCar.id,
      assignedRouteId: routeId,
    });

    // 4. Workforce: Driver & Conductor
    const driver = new EmployeeEntity({
      id: driverId,
      companyId,
      name: 'Budi Santoso',
      role: 'MASINIS',
      homeDepotId: bandungDepotId,
      certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206'],
      certifiedRouteIds: ['ROUTE_GMR_BD'],
      fatigueLevel: 15,
      monthlyHoursWorked: 0,
    });

    const conductor = new EmployeeEntity({
      id: conductorId,
      companyId,
      name: 'Siti Rahma',
      role: 'KONDEKTUR',
      homeDepotId: bandungDepotId,
      certifiedRouteIds: ['ROUTE_GMR_BD'],
      fatigueLevel: 15,
      monthlyHoursWorked: 0,
    });

    // 5. Timetable Slot: 08:00 (480 min) -> 10:40 (640 min)
    const slot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_GMR_BD_0800'),
      routeId,
      compositionId,
      primaryDriverId: driverId,
      primaryConductorId: conductorId,
      departureMinuteOfDay: 480, // 08:00
      scheduledArrivalMinuteOfDay: 640, // 10:40 (160 minutes duration)
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
      active: true,
    });

    // 6. Active B2B Contract: 7-day contract with 500 tons/week
    const b2bContract = new B2BContractEntity({
      id: createBrandedId<ContractId>('CTR_LOGISTICS_JAVA'),
      companyId,
      clientName: 'PT Pos Logistik Indonesia',
      cargoCategory: 'CONTAINER',
      originStationId: gambirStationId,
      destinationStationId: bandungStationId,
      requiredWeeklyVolumeTons: 500,
      requiredWagonSpecId: createBrandedId('SPEC_WAGON_PPCW_CONTAINER'),
      revenuePerTonDelivered: toMoney(85_000),
      latePenaltyPerTon: toMoney(15_000),
      durationDays: 7,
      status: 'ACTIVE',
    });

    // 7. Active Procurement Order: CC206 lead time 2 days
    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_CC206_NEW'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 1,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: bandungDepotId,
      leadTimeDays: 2,
      orderedTimestamp: createGameTimestamp(0),
      expectedDeliveryTimestamp: createGameTimestamp(2880),
      status: 'ORDERED',
    });

    return {
      companyId,
      timestamp: createGameTimestamp(479), // Day 1, 07:59 (1 min before departure)
      speed: '1X',
      activeServices: Object.freeze([]),
      timetableSlots: Object.freeze([slot]),
      fleetUnits: Object.freeze([locoUnit, k3Coach1, k3Coach2, k1Coach, m1Dining, powerCar]),
      compositions: Object.freeze([consist]),
      procurementOrders: Object.freeze([order]),
      depots: Object.freeze([depot]),
      employees: Object.freeze([driver, conductor]),
      b2bContracts: Object.freeze([b2bContract]),
      psoContracts: Object.freeze([]),
      charterContracts: Object.freeze([]),
      routes: Object.freeze([route]),
      generalLedger: ledger,
      reputation: 0.95,
      consecutiveCriticalInsolventDays: 0,
      solvencyStatus: 'SOLVENT',
    };
  };

  const gameConfig: GameConfig = {
    fuelPricePerLiter: toMoney(15_000),
    tacBaseRatePerTrainKm: toMoney(25_000),
    tacWeightSurchargePer100Tons: toMoney(5_000),
    simulationSeed: 2026,
  };

  it('executes a complete service lifecycle: departure, boarding, transit kinematics, wear, crew duty, arrival and rest', () => {
    const engine = new SimulationEngine();
    let state = createRealisticCorridorState();
    const initialCash = state.generalLedger.currentCashBalance;

    // --- Tick 1: Minute 480 (08:00) - Scheduled Departure ---
    const tick480 = engine.simulateTick(state, [], gameConfig, 2026);
    state = tick480.nextState;

    expect(state.timestamp.minuteOfDay).toBe(480);
    expect(state.activeServices.length).toBe(1);

    const activeRun = state.activeServices[0]!;
    expect(activeRun.status).toBe('IN_TRANSIT');

    // Verify Passenger Boarding & Capacity Constraints
    // 2x K3 (160 cap) + 1x K1 Exec (50 cap) = 210 capacity
    const pax = activeRun.passengerCount;
    expect(pax.ECONOMY).toBeGreaterThan(0);
    expect(pax.ECONOMY).toBeLessThanOrEqual(160); // Capped by 2x K3
    expect(pax.EXECUTIVE).toBeGreaterThan(0);
    expect(pax.EXECUTIVE).toBeLessThanOrEqual(50); // Capped by 1x K1
    expect(activeRun.totalPassengers).toBe(pax.ECONOMY + pax.EXECUTIVE);

    // Verify Ticket Revenue + Dining Car ancillary revenue credited
    expect(activeRun.revenueAccrued).toBeGreaterThan(0);
    const revSummary = state.generalLedger.getSummary();
    expect(revSummary.totalRevenue).toBe(activeRun.revenueAccrued);
    expect(state.generalLedger.currentCashBalance).toBeGreaterThan(initialCash);

    // Verify Crew Status: Driver and Conductor entered ON_DUTY
    const driver = state.employees.find((e) => e.id === driverId)!;
    const conductor = state.employees.find((e) => e.id === conductorId)!;
    expect(driver.status).toBe('ON_DUTY');
    expect(conductor.status).toBe('ON_DUTY');

    // Departure Event Emitted
    const depEvent = tick480.emittedEvents.find((e) => e.type === 'DEPARTURE');
    expect(depEvent).toBeDefined();
    expect(depEvent?.payload.totalPassengers).toBe(activeRun.totalPassengers);

    // Initial unit condition & odometer before transit
    const loco = state.fleetUnits.find((u) => u.id === 'UNIT_CC206_01')!;
    const initialLocoCondition = loco.conditionPercentage;
    const initialLocoOdo = loco.odometerKm;

    // --- Ticks 481 through 639: In-Transit Kinematics (159 minutes) ---
    // Simulate until minute 639 (1 min before arrival)
    for (let m = 481; m < 640; m++) {
      const res = engine.simulateTick(state, [], gameConfig, 2026);
      state = res.nextState;
    }

    expect(state.timestamp.minuteOfDay).toBe(639);
    expect(activeRun.status).toBe('IN_TRANSIT');
    expect(activeRun.opexAccrued).toBeGreaterThan(0);

    // Verify Rolling Stock Wear & Distance Accrual
    // ~160 minutes at 100 km/h / 60 ~ 1.667 km/min
    expect(loco.odometerKm).toBeGreaterThan(initialLocoOdo);
    expect(loco.conditionPercentage).toBeLessThan(initialLocoCondition);

    // --- Tick 640: Arrival at Destination (10:40) ---
    const tick640 = engine.simulateTick(state, [], gameConfig, 2026);
    state = tick640.nextState;

    expect(state.timestamp.minuteOfDay).toBe(640);

    // Verify Service Run is COMPLETED
    const completedRun = state.activeServices[0]!;
    expect(completedRun.status).toBe('COMPLETED');
    expect(completedRun.currentStationId).toBe(bandungStationId);

    // Verify Arrival Event Emitted
    const arrEvent = tick640.emittedEvents.find((e) => e.type === 'ARRIVAL');
    expect(arrEvent).toBeDefined();
    expect(arrEvent?.payload.totalPassengers).toBe(completedRun.totalPassengers);

    // Verify Crew completed duty and entered RESTING status
    expect(driver.status).toBe('RESTING');
    expect(conductor.status).toBe('RESTING');
    expect(driver.monthlyHoursWorked).toBeCloseTo(160 / 60, 1);
    expect(driver.fatigueLevel).toBeGreaterThan(0); // ~ (160 / 480) * 100 = 33.33%

    // --- Post-Arrival Recovery Ticks: Driver and Conductor Rest at Depot ---
    const fatigueAfterDuty = driver.fatigueLevel;
    for (let r = 0; r < 60; r++) {
      const restTick = engine.simulateTick(state, [], gameConfig, 2026);
      state = restTick.nextState;
    }

    // Fatigue recovered over 60 minutes
    expect(driver.fatigueLevel).toBeLessThan(fatigueAfterDuty);
  });

  it('runs a full 24-hour cycle (1,440 ticks) maintaining mathematical balance and solvency', () => {
    const engine = new SimulationEngine();
    let state = createRealisticCorridorState();

    const startTotalMinutes = state.timestamp.totalMinutes;

    // Simulate full 24 hours (1,440 minutes)
    for (let i = 0; i < 1440; i++) {
      const res = engine.simulateTick(state, [], gameConfig, 2026);
      state = res.nextState;
    }

    // Verifications at end of 24h
    expect(state.timestamp.totalMinutes).toBe(startTotalMinutes + 1440);
    expect(state.timestamp.day).toBe(2);
    expect(state.timestamp.minuteOfDay).toBe(479);

    // Company remains solvent
    expect(state.solvencyStatus).toBe('SOLVENT');
    expect(state.consecutiveCriticalInsolventDays).toBe(0);

    // B2B contract advanced by 1 day (7 -> 6)
    const b2b = state.b2bContracts.find((c) => c.id === 'CTR_LOGISTICS_JAVA')!;
    expect(b2b.remainingDays).toBe(6);

    // Ledger has recorded both revenue and opex transactions
    const summary = state.generalLedger.getSummary();
    expect(summary.totalRevenue).toBeGreaterThan(0);
    expect(summary.totalOpex).toBeGreaterThan(0);
    expect(summary.transactionCount).toBeGreaterThan(100);
  });
});
