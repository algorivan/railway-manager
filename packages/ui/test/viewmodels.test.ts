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
  UnitId,
  DepotId,
  StationId,
  OrderId,
} from '@railway/shared';
import { RouteEntity } from '@railway/network';
import { RollingStockUnitEntity, TrainCompositionEntity } from '@railway/fleet';
import { TimetableSlotEntity } from '@railway/timetable';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import { ProcurementOrderEntity } from '@railway/procurement';
import { GameState } from '@railway/simulation';
import {
  createGlobalStatusBarViewModel,
  createConsistBuilderViewModel,
  createGapekaChartViewModel,
  createCatalogSpecCardViewModels,
  createProcurementPipelineOrderViewModels,
  createFinanceDashboardViewModel,
} from '../src/viewmodels/index.js';

describe('UI ViewModels (UI_SPEC.md §2 & §3)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI');
  const gambirId = createBrandedId<StationId>('STN_GMR_GAMBIR');
  const bandungId = createBrandedId<StationId>('STN_BD_BANDUNG');
  const depotId = createBrandedId<DepotId>('DEPOT_BD');
  const routeId = createBrandedId<RouteId>('ROUTE_GMR_BD');
  const compId = createBrandedId<CompositionId>('CONSIST_PARAHYANGAN');

  const createMockGameState = (): GameState => {
    const ledger = new GeneralLedgerEntity(companyId, toMoney(94_250_000_000));

    return {
      companyId,
      timestamp: createGameTimestamp((12 - 1) * 1440 + 525), // Day 12, 08:45 WIB
      speed: '1X',
      activeServices: Object.freeze([]),
      timetableSlots: Object.freeze([]),
      fleetUnits: Object.freeze([]),
      compositions: Object.freeze([]),
      procurementOrders: Object.freeze([]),
      depots: Object.freeze([]),
      employees: Object.freeze([]),
      b2bContracts: Object.freeze([]),
      psoContracts: Object.freeze([]),
      charterContracts: Object.freeze([]),
      generalLedger: ledger,
      reputation: 0.84, // 84%
      consecutiveCriticalInsolventDays: 0,
      solvencyStatus: 'SOLVENT',
    };
  };

  it('transforms GameState into GlobalStatusBarViewModel matching UI_SPEC.md §2.1 specifications', () => {
    const state = createMockGameState();
    const vm = createGlobalStatusBarViewModel(state);

    expect(vm.simClockLabel).toBe('Hari 12 • 08:45 WIB');
    expect(vm.cashBalanceFormatted).toBe('Rp 94.250.000.000');
    expect(vm.cashBalanceCompact).toBe('Rp 94,3 Miliar');
    expect(vm.isOverdrawn).toBe(false);
    expect(vm.reputationGaugeFormatted).toBe('★ 84%');
    expect(vm.currentSpeed).toBe('1X');
    expect(vm.currentSpeedLabel).toBe('1x');
    expect(vm.speedOptions.length).toBe(5);
    expect(vm.solvencyBadge.label).toBe('Solven');
    expect(vm.solvencyBadge.variant).toBe('success');
  });

  it('builds Fleet Consist Formation View Model with validation checklist (UI_SPEC.md §3.2)', () => {
    const loco = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_CC206_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      serialNumber: 'CC 206 13 01',
      homeDepotId: depotId,
      currentDepotId: depotId,
      conditionPercentage: 98.5,
    });

    const powerCar = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_P_01'),
      companyId,
      specId: 'SPEC_VAN_P_GENERATOR',
      serialNumber: 'P 0 18 01',
      homeDepotId: depotId,
      currentDepotId: depotId,
      conditionPercentage: 95.0,
    });

    const dining = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_M1_01'),
      companyId,
      specId: 'SPEC_COACH_M1_DINING',
      serialNumber: 'M1 0 18 01',
      homeDepotId: depotId,
      currentDepotId: depotId,
      conditionPercentage: 92.0,
    });

    const k1 = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K1_01'),
      companyId,
      specId: 'SPEC_COACH_K1_EXEC',
      serialNumber: 'K1 0 18 01',
      homeDepotId: depotId,
      currentDepotId: depotId,
      conditionPercentage: 100.0,
    });

    const k3 = new RollingStockUnitEntity({
      id: createBrandedId<UnitId>('UNIT_K3_01'),
      companyId,
      specId: 'SPEC_COACH_K3_PREMIUM',
      serialNumber: 'K3 0 18 01',
      homeDepotId: depotId,
      currentDepotId: depotId,
      conditionPercentage: 100.0,
    });

    const consist = new TrainCompositionEntity({
      id: compId,
      companyId,
      name: 'Parahyangan Express Consist A',
      locomotiveUnitIds: [loco.id],
      carriageUnitIds: [k1.id, k3.id],
      diningCarUnitId: dining.id,
      powerCarUnitId: powerCar.id,
    });

    const vm = createConsistBuilderViewModel(consist, [loco, powerCar, dining, k1, k3]);

    expect(vm.compositionName).toBe('Parahyangan Express Consist A');
    expect(vm.totalSlotsUsed).toBe(5);
    expect(vm.slots[0]!.isLocomotive).toBe(true);
    expect(vm.slots[0]!.modelName).toContain('CC206');
    expect(vm.slots[1]!.isPowerCar).toBe(true);
    expect(vm.slots[2]!.isDining).toBe(true);

    // Capacities: 1x K1 (50) + 1x K3 (80) = 130
    expect(vm.passengerCapacities.executive).toBe(50);
    expect(vm.passengerCapacities.economy).toBe(80);
    expect(vm.passengerCapacities.total).toBe(130);

    // Validation checklist verification
    expect(vm.isValidToAssemble).toBe(true);
    expect(vm.checklist.every((c) => c.passed)).toBe(true);
    expect(vm.checklist.some((c) => c.label.includes('Max Allowed: 400m'))).toBe(true);
    expect(vm.checklist.some((c) => c.label.includes('Generator Car Present'))).toBe(true);
  });

  it('builds Gapeka 24h Time-Distance Chart ViewModel (UI_SPEC.md §3.3)', () => {
    const route = new RouteEntity({
      id: routeId,
      companyId,
      code: 'KA-PARAHYANGAN',
      name: 'Gambir - Bandung',
      originStationId: gambirId,
      destinationStationId: bandungId,
      stationSequence: [gambirId, bandungId],
      distanceKm: 160.0,
    });

    const slot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_01'),
      routeId,
      compositionId: compId,
      primaryDriverId: createBrandedId<EmployeeId>('EMP_01'),
      departureMinuteOfDay: 480, // 08:00
      scheduledArrivalMinuteOfDay: 640, // 10:40
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
    });

    const vm = createGapekaChartViewModel(route, [slot], [], 485);

    expect(vm.routeId).toBe(routeId);
    expect(vm.totalDistanceKm as number).toBe(160);
    expect(vm.stations.length).toBe(2);
    expect(vm.stations[0]!.verticalPercent).toBe(0);
    expect(vm.stations[1]!.verticalPercent).toBe(100);

    expect(vm.serviceLines.length).toBe(1);
    expect(vm.serviceLines[0]!.departureMinute).toBe(480);
    expect(vm.serviceLines[0]!.arrivalMinute).toBe(640);
    expect(vm.serviceLines[0]!.startPoint.minuteOfDay).toBe(480);
    expect(vm.serviceLines[0]!.endPoint.minuteOfDay).toBe(640);
  });

  it('builds Procurement catalog cards and pipeline orders (UI_SPEC.md §3.4)', () => {
    const catalogCards = createCatalogSpecCardViewModels();
    expect(catalogCards.length).toBeGreaterThan(5);

    const cc206Card = catalogCards.find((c) => c.specId === 'SPEC_LOCO_CC206');
    expect(cc206Card).toBeDefined();
    expect(cc206Card?.categoryLabel).toBe('Lokomotif Diesel-Elektrik');
    expect(cc206Card?.maxSpeedFormatted).toBe('120 km/h');
    expect(cc206Card?.basePurchaseCostFormatted).toBe('Rp 32.000.000.000');
    expect(cc206Card?.basePurchaseCostCompact).toBe('Rp 32 Miliar');

    const order = new ProcurementOrderEntity({
      id: createBrandedId<OrderId>('ORD_01'),
      companyId,
      specId: 'SPEC_LOCO_CC206',
      quantity: 1,
      unitCost: toMoney(32_000_000_000),
      deliveryDepotId: depotId,
      leadTimeDays: 180,
      status: 'IN_PRODUCTION',
    });

    const pipelineOrders = createProcurementPipelineOrderViewModels([order]);
    expect(pipelineOrders.length).toBe(1);
    expect(pipelineOrders[0]!.progressPercent).toBe(50);
    expect(pipelineOrders[0]!.statusBadge.label).toBe('Proses Fabrikasi');
    expect(pipelineOrders[0]!.totalCostFormatted).toBe('Rp 32.000.000.000');
  });

  it('builds Financial Dashboard ViewModel with cost center breakdown (UI_SPEC.md §3.5)', () => {
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    // Revenue: +Rp 500.000.000
    ledger.postTransaction({
      id: createBrandedId('TX_01'),
      companyId,
      timestamp: createGameTimestamp(0),
      category: 'REV_PASSENGER_TICKETS',
      amount: toMoney(500_000_000),
      description: 'Ticket sales',
    });

    // Fuel OPEX: -Rp 150.000.000
    ledger.postTransaction({
      id: createBrandedId('TX_02'),
      companyId,
      timestamp: createGameTimestamp(0),
      category: 'OPEX_FUEL_ENERGY',
      amount: toMoney(-150_000_000),
      description: 'Fuel burned',
    });

    // TAC OPEX: -Rp 50.000.000
    ledger.postTransaction({
      id: createBrandedId('TX_03'),
      companyId,
      timestamp: createGameTimestamp(0),
      category: 'OPEX_TRACK_ACCESS_FEE',
      amount: toMoney(-50_000_000),
      description: 'TAC charge',
    });

    const vm = createFinanceDashboardViewModel(ledger);

    expect(vm.totalRevenueFormatted).toBe('Rp 500.000.000');
    expect(vm.totalOpexFormatted).toBe('Rp 200.000.000');
    expect(vm.netOperatingIncomeFormatted).toBe('+Rp 300.000.000');
    expect(vm.isProfitable).toBe(true);
    expect(vm.profitMarginFormatted).toBe('60,0%');
    expect(vm.solvencyBadge.label).toBe('Solven');

    // Cost Centers: Fuel (75%), TAC (25%)
    expect(vm.costCenters[0]!.label).toContain('Bahan Bakar');
    expect(vm.costCenters[0]!.amountFormatted).toBe('Rp 150.000.000');
    expect(vm.costCenters[0]!.percentageOfTotalOpex).toBe(75);

    expect(vm.costCenters[1]!.label).toContain('Track Access Charge');
    expect(vm.costCenters[1]!.amountFormatted).toBe('Rp 50.000.000');
    expect(vm.costCenters[1]!.percentageOfTotalOpex).toBe(25);
  });
});
