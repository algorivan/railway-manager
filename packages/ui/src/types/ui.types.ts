import {
  CompanyId,
  GameTimestamp,
  Money,
  Km,
  Kmh,
  Tons,
  Meters,
  CompositionId,
  ServiceRunId,
  TimetableSlotId,
  StationId,
  OrderId,
} from '@railway/shared';
import { SimulationSpeed } from '@railway/simulation';
import { StatusBadgeDescriptor, BadgeVariant } from '../badges/status-variants.js';

/**
 * Top Status Bar ViewModel (UI_SPEC.md §2.1)
 */
export interface GlobalStatusBarViewModel {
  readonly companyId: CompanyId;
  readonly timestamp: GameTimestamp;
  readonly simClockLabel: string;        // "Hari 12 • 08:45 WIB"
  readonly currentSpeed: SimulationSpeed; // "1X"
  readonly currentSpeedLabel: string;    // "1x"
  readonly speedOptions: ReadonlyArray<{
    readonly speed: SimulationSpeed;
    readonly label: string;
    readonly active: boolean;
  }>;
  readonly cashBalanceFormatted: string; // "Rp 94.250.000.000"
  readonly cashBalanceCompact: string;   // "Rp 94,2 Miliar"
  readonly isOverdrawn: boolean;
  readonly reputationGaugeFormatted: string; // "★ 84%"
  readonly reputationRatio: number;      // 0.84
  readonly solvencyBadge: StatusBadgeDescriptor;
  readonly activeServicesCount: number;
}

/**
 * Screen 2: Fleet Consist Formation Slot (UI_SPEC.md §3.2)
 */
export interface FormationSlotViewModel {
  readonly slotIndex: number; // 1-based (Slot 1..10)
  readonly unitId: string;
  readonly serialNumber: string;
  readonly modelName: string;
  readonly category: string;
  readonly isLocomotive: boolean;
  readonly isDining: boolean;
  readonly isPowerCar: boolean;
  readonly conditionFormatted: string;
  readonly conditionBadge: StatusBadgeDescriptor;
}

export interface ValidationChecklistItem {
  readonly label: string;       // "Total Length: 145m / Max: 400m"
  readonly badgeText: string;   // "[✓ PASS]" or "[⚠ WARN]"
  readonly passed: boolean;
  readonly variant: BadgeVariant;
  readonly details?: string;
}

export interface ConsistBuilderViewModel {
  readonly compositionId: CompositionId;
  readonly compositionName: string;
  readonly slots: ReadonlyArray<FormationSlotViewModel>;
  readonly totalSlotsUsed: number;
  readonly maxSlots: number;
  readonly totalLengthMeters: Meters;
  readonly totalLengthFormatted: string;
  readonly totalTareWeightTons: Tons;
  readonly totalWeightFormatted: string;
  readonly maxSafeSpeedKmh: Kmh;
  readonly maxSpeedFormatted: string;
  readonly passengerCapacities: {
    readonly economy: number;
    readonly executive: number;
    readonly luxury: number;
    readonly total: number;
  };
  readonly checklist: ReadonlyArray<ValidationChecklistItem>;
  readonly isValidToAssemble: boolean;
}

/**
 * Screen 3: Gapeka 24h Time-Distance Chart (UI_SPEC.md §3.3)
 */
export interface GapekaStationMarker {
  readonly stationId: StationId;
  readonly name: string;
  readonly code: string;
  readonly distanceKm: Km;
  readonly verticalPercent: number; // 0% at origin to 100% at destination
}

export interface GapekaPoint {
  readonly minuteOfDay: number;    // 0..1439 (horizontal axis)
  readonly distanceKm: Km;         // vertical axis
}

export interface GapekaServiceLine {
  readonly serviceRunId: ServiceRunId;
  readonly timetableSlotId: TimetableSlotId;
  readonly trainCode: string;
  readonly departureMinute: number;
  readonly arrivalMinute: number;
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly isDelayed: boolean;
  readonly delayMinutes: number;
  readonly colorHex: string;
  readonly startPoint: GapekaPoint;
  readonly endPoint: GapekaPoint;
}

export interface GapekaChartViewModel {
  readonly routeId: string;
  readonly corridorName: string;
  readonly totalDistanceKm: Km;
  readonly stations: ReadonlyArray<GapekaStationMarker>;
  readonly serviceLines: ReadonlyArray<GapekaServiceLine>;
  readonly currentSimMinute: number;
}

/**
 * Screen 4: Procurement Cards & Pipeline (UI_SPEC.md §3.4)
 */
export interface CatalogSpecCardViewModel {
  readonly specId: string;
  readonly modelName: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly maxSpeedFormatted: string;
  readonly passengerCapacityFormatted: string;
  readonly tareWeightFormatted: string;
  readonly basePurchaseCostFormatted: string;
  readonly basePurchaseCostCompact: string;
  readonly leadTimeDaysFormatted: string;
}

export interface ProcurementPipelineOrderViewModel {
  readonly orderId: OrderId;
  readonly specId: string;
  readonly modelName: string;
  readonly quantity: number;
  readonly totalCostFormatted: string;
  readonly deliveryDepotName: string;
  readonly status: string;
  readonly statusBadge: StatusBadgeDescriptor;
  readonly progressPercent: number; // 0..100%
  readonly remainingDaysFormatted: string;
}

/**
 * Screen 5: Financial Accounting Dashboard (UI_SPEC.md §3.5)
 */
export interface CostCenterSlice {
  readonly label: string;
  readonly amount: Money;
  readonly amountFormatted: string;
  readonly percentageOfTotalOpex: number; // 0..100
  readonly colorHex: string;
}

export interface FinanceDashboardViewModel {
  readonly totalRevenueFormatted: string;
  readonly totalOpexFormatted: string;
  readonly netOperatingIncomeFormatted: string;
  readonly currentCashBalanceFormatted: string;
  readonly currentCashBalanceCompact: string;
  readonly isProfitable: boolean;
  readonly profitMarginFormatted: string;
  readonly solvencyBadge: StatusBadgeDescriptor;
  readonly costCenters: ReadonlyArray<CostCenterSlice>;
  readonly transactionCount: number;
}
