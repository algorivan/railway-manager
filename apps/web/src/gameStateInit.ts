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
import { GameState, GameConfig } from '@railway/simulation';

export const INITIAL_COMPANY_ID = createBrandedId<CompanyId>('CMP_KAI_PERSERO');
export const STN_GMR = createBrandedId<StationId>('STN_GMR_GAMBIR');
export const STN_BD = createBrandedId<StationId>('STN_BD_BANDUNG');
export const STN_CN = createBrandedId<StationId>('STN_CN_CIREBON');
export const STN_SMT = createBrandedId<StationId>('STN_SMT_SEMARANGTAWANG');
export const STN_SGU = createBrandedId<StationId>('STN_SGU_SURABAYAGUBENG');

export const DEPOT_BD = createBrandedId<DepotId>('DEPOT_BD_PASIRKALIKI');
export const DEPOT_CN = createBrandedId<DepotId>('DEPOT_CN_KEJAKSAN');
export const DEPOT_SGU = createBrandedId<DepotId>('DEPOT_SGU_SIDOTOPO');

export const ROUTE_GMR_BD = createBrandedId<RouteId>('ROUTE_GMR_BD');
export const ROUTE_GMR_CN = createBrandedId<RouteId>('ROUTE_GMR_CN');
export const ROUTE_CN_SMT = createBrandedId<RouteId>('ROUTE_CN_SMT');
export const ROUTE_SMT_SGU = createBrandedId<RouteId>('ROUTE_SMT_SGU');

export const COMP_ARGO_PARAHYANGAN = createBrandedId<CompositionId>('CONSIST_ARGO_PARAHYANGAN');
export const DRIVER_BUDI = createBrandedId<EmployeeId>('EMP_DRIVER_BUDI');
export const COND_SITI = createBrandedId<EmployeeId>('EMP_COND_SITI');

export function createInitialWebGameState(): GameState {
  // 1. General Ledger with starter capital (Rp 50 Miliar)
  const ledger = new GeneralLedgerEntity(INITIAL_COMPANY_ID, SolvencyEngine.STARTER_CAPITAL);

  // 2. Routes (Gambir - Bandung active by default, others ready to concession)
  const routeGmrBd = new RouteEntity({
    id: ROUTE_GMR_BD,
    companyId: INITIAL_COMPANY_ID,
    code: 'KA-PARAHYANGAN',
    name: 'Gambir - Bandung',
    originStationId: STN_GMR,
    destinationStationId: STN_BD,
    stationSequence: [STN_GMR, STN_BD],
    distanceKm: 160.0,
    estimatedRuntimeMinutes: 160,
    trackAccessFeePerKm: toMoney(25_000),
    accessStatus: 'PERMIT_GRANTED',
  });

  const routeGmrCn = new RouteEntity({
    id: ROUTE_GMR_CN,
    companyId: INITIAL_COMPANY_ID,
    code: 'KA-CIREMAI',
    name: 'Gambir - Cirebon',
    originStationId: STN_GMR,
    destinationStationId: STN_CN,
    stationSequence: [STN_GMR, STN_CN],
    distanceKm: 219.0,
    estimatedRuntimeMinutes: 180,
    trackAccessFeePerKm: toMoney(25_000),
    accessStatus: 'PERMIT_GRANTED',
  });

  const routeCnSmt = new RouteEntity({
    id: ROUTE_CN_SMT,
    companyId: INITIAL_COMPANY_ID,
    code: 'KA-MENOREH',
    name: 'Cirebon - Semarang Tawang',
    originStationId: STN_CN,
    destinationStationId: STN_SMT,
    stationSequence: [STN_CN, STN_SMT],
    distanceKm: 225.7,
    estimatedRuntimeMinutes: 190,
    trackAccessFeePerKm: toMoney(25_000),
    accessStatus: 'LOCKED',
  });

  const routeSmtSgu = new RouteEntity({
    id: ROUTE_SMT_SGU,
    companyId: INITIAL_COMPANY_ID,
    code: 'KA-AMBARAWA',
    name: 'Semarang Tawang - Surabaya Gubeng',
    originStationId: STN_SMT,
    destinationStationId: STN_SGU,
    stationSequence: [STN_SMT, STN_SGU],
    distanceKm: 315.0,
    estimatedRuntimeMinutes: 240,
    trackAccessFeePerKm: toMoney(25_000),
    accessStatus: 'LOCKED',
  });

  // 3. Depots
  const depotBd = new DepotEntity({
    id: DEPOT_BD,
    companyId: INITIAL_COMPANY_ID,
    name: 'Depo Pasirkaliki Bandung',
    stationId: STN_BD,
    tier: 2,
  });

  const depotCn = new DepotEntity({
    id: DEPOT_CN,
    companyId: INITIAL_COMPANY_ID,
    name: 'Depo Kejaksan Cirebon',
    stationId: STN_CN,
    tier: 1,
  });

  const depotSgu = new DepotEntity({
    id: DEPOT_SGU,
    companyId: INITIAL_COMPANY_ID,
    name: 'Depo Sidotopo Surabaya',
    stationId: STN_SGU,
    tier: 3,
  });

  // 4. Rolling Stock Fleet
  const loco1 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_CC206_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_LOCO_CC206',
    serialNumber: 'CC 206 13 01',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 99.2,
    odometerKm: toKm(8_450),
  });

  const loco2 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_CC201_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_LOCO_CC201',
    serialNumber: 'CC 201 83 25',
    homeDepotId: DEPOT_CN,
    currentDepotId: DEPOT_CN,
    conditionPercentage: 88.5,
    odometerKm: toKm(45_200),
  });

  const pCar1 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_P_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_VAN_P_GENERATOR',
    serialNumber: 'P 0 18 01',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 96.0,
    odometerKm: toKm(6_200),
  });

  const m1Dining1 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_M1_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_COACH_M1_DINING',
    serialNumber: 'M1 0 18 01',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 94.0,
    odometerKm: toKm(6_200),
  });

  const k1Coach1 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_K1_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_COACH_K1_EXEC',
    serialNumber: 'K1 0 18 01',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 98.0,
    odometerKm: toKm(6_200),
  });

  const k3Coach1 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_K3_01'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_COACH_K3_PREMIUM',
    serialNumber: 'K3 0 18 01',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 99.0,
    odometerKm: toKm(6_200),
  });

  const k3Coach2 = new RollingStockUnitEntity({
    id: createBrandedId<UnitId>('UNIT_K3_02'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_COACH_K3_PREMIUM',
    serialNumber: 'K3 0 18 02',
    homeDepotId: DEPOT_BD,
    currentDepotId: DEPOT_BD,
    conditionPercentage: 99.0,
    odometerKm: toKm(6_200),
  });

  const consist = new TrainCompositionEntity({
    id: COMP_ARGO_PARAHYANGAN,
    companyId: INITIAL_COMPANY_ID,
    name: 'Rangkaian Argo Parahyangan SS',
    locomotiveUnitIds: [loco1.id],
    carriageUnitIds: [k1Coach1.id, k3Coach1.id, k3Coach2.id],
    diningCarUnitId: m1Dining1.id,
    powerCarUnitId: pCar1.id,
    assignedRouteId: ROUTE_GMR_BD,
  });

  // 5. Workforce Employees
  const driverBudi = new EmployeeEntity({
    id: DRIVER_BUDI,
    companyId: INITIAL_COMPANY_ID,
    name: 'Budi Santoso',
    role: 'MASINIS',
    homeDepotId: DEPOT_BD,
    certifiedLocomotiveSpecs: ['SPEC_LOCO_CC206', 'SPEC_LOCO_CC201'],
    certifiedRouteIds: ['ROUTE_GMR_BD', 'ROUTE_GMR_CN'],
    fatigueLevel: 10,
    monthlyHoursWorked: 24,
  });

  const condSiti = new EmployeeEntity({
    id: COND_SITI,
    companyId: INITIAL_COMPANY_ID,
    name: 'Siti Rahma',
    role: 'KONDEKTUR',
    homeDepotId: DEPOT_BD,
    certifiedRouteIds: ['ROUTE_GMR_BD', 'ROUTE_GMR_CN'],
    fatigueLevel: 5,
    monthlyHoursWorked: 18,
  });

  const techAgus = new EmployeeEntity({
    id: createBrandedId<EmployeeId>('EMP_TECH_AGUS'),
    companyId: INITIAL_COMPANY_ID,
    name: 'Agus Riyadi',
    role: 'TECHNICIAN',
    homeDepotId: DEPOT_BD,
    fatigueLevel: 0,
    monthlyHoursWorked: 40,
  });

  // 6. Timetable Slots
  const slot1 = new TimetableSlotEntity({
    id: createBrandedId<TimetableSlotId>('SLOT_PARAHYANGAN_0800'),
    routeId: ROUTE_GMR_BD,
    compositionId: COMP_ARGO_PARAHYANGAN,
    primaryDriverId: DRIVER_BUDI,
    primaryConductorId: COND_SITI,
    departureMinuteOfDay: 480, // 08:00 WIB
    scheduledArrivalMinuteOfDay: 640, // 10:40 WIB
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    active: true,
  });

  const slot2 = new TimetableSlotEntity({
    id: createBrandedId<TimetableSlotId>('SLOT_PARAHYANGAN_1400'),
    routeId: ROUTE_GMR_BD,
    compositionId: COMP_ARGO_PARAHYANGAN,
    primaryDriverId: DRIVER_BUDI,
    primaryConductorId: COND_SITI,
    departureMinuteOfDay: 840, // 14:00 WIB
    scheduledArrivalMinuteOfDay: 1000, // 16:40 WIB
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    active: true,
  });

  // 7. B2B Freight Contract
  const b2bContract = new B2BContractEntity({
    id: createBrandedId<ContractId>('CTR_POS_LOGISTIK'),
    companyId: INITIAL_COMPANY_ID,
    clientName: 'PT Pos Logistik Indonesia',
    cargoCategory: 'CONTAINER',
    originStationId: STN_GMR,
    destinationStationId: STN_BD,
    requiredWeeklyVolumeTons: 400,
    requiredWagonSpecId: createBrandedId('SPEC_WAGON_PPCW_CONTAINER'),
    revenuePerTonDelivered: toMoney(85_000),
    latePenaltyPerTon: toMoney(15_000),
    durationDays: 7,
    status: 'ACTIVE',
  });

  // 8. Active Manufacturing Procurement Order
  const order = new ProcurementOrderEntity({
    id: createBrandedId<OrderId>('ORD_INKA_K3_BATCH2'),
    companyId: INITIAL_COMPANY_ID,
    specId: 'SPEC_COACH_K3_PREMIUM',
    quantity: 2,
    unitCost: toMoney(5_500_000_000),
    deliveryDepotId: DEPOT_BD,
    leadTimeDays: 90,
    orderedTimestamp: createGameTimestamp(0),
    expectedDeliveryTimestamp: createGameTimestamp(90 * 1440),
    status: 'IN_PRODUCTION',
  });

  return {
    companyId: INITIAL_COMPANY_ID,
    timestamp: createGameTimestamp(475), // Day 1, 07:55 WIB (5 mins before 08:00 departure)
    speed: '1X',
    activeServices: Object.freeze([]),
    timetableSlots: Object.freeze([slot1, slot2]),
    fleetUnits: Object.freeze([loco1, loco2, pCar1, m1Dining1, k1Coach1, k3Coach1, k3Coach2]),
    compositions: Object.freeze([consist]),
    procurementOrders: Object.freeze([order]),
    depots: Object.freeze([depotBd, depotCn, depotSgu]),
    employees: Object.freeze([driverBudi, condSiti, techAgus]),
    b2bContracts: Object.freeze([b2bContract]),
    psoContracts: Object.freeze([]),
    charterContracts: Object.freeze([]),
    routes: Object.freeze([routeGmrBd, routeGmrCn, routeCnSmt, routeSmtSgu]),
    generalLedger: ledger,
    reputation: 0.92,
    consecutiveCriticalInsolventDays: 0,
    solvencyStatus: 'SOLVENT',
  };
}

export const DEFAULT_WEB_CONFIG: GameConfig = {
  fuelPricePerLiter: toMoney(15_000),
  tacBaseRatePerTrainKm: toMoney(25_000),
  tacWeightSurchargePer100Tons: toMoney(5_000),
  simulationSeed: 2026,
};
