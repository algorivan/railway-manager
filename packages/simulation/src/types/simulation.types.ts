import {
  CompanyId,
  GameTimestamp,
  EventId,
  Money,
  TimetableSlotId,
  ServiceRunId,
  ContractId,
} from '@railway/shared';
import { RollingStockUnitEntity, TrainCompositionEntity } from '@railway/fleet';
import { ProcurementOrderEntity } from '@railway/procurement';
import { DepotEntity } from '@railway/network';
import { EmployeeEntity } from '@railway/workforce';
import {
  B2BContractEntity,
  PublicServiceObligationContractEntity,
  CharterContractEntity,
} from '@railway/contracts';
import {
  TimetableSlotEntity,
  ActiveServiceRunEntity,
} from '@railway/timetable';
import {
  GeneralLedgerEntity,
  SolvencyStatus,
} from '@railway/economy';

export type SimulationSpeed = 'PAUSED' | '1X' | '2X' | '4X' | '8X';

export type SimulationEventType =
  | 'DEPARTURE'
  | 'ARRIVAL'
  | 'DWELL_COMPLETE'
  | 'TURNAROUND_COMPLETE'
  | 'BREAKDOWN'
  | 'MAINTENANCE_COMPLETE'
  | 'PROCUREMENT_COMPLETE'
  | 'CONTRACT_DEADLINE'
  | 'MISSION_PROGRESS'
  | 'FINANCIAL_ACCRUAL';

export interface SimulationEvent {
  readonly id: EventId;
  readonly type: SimulationEventType;
  readonly timestamp: GameTimestamp;
  readonly entityId: string;
  readonly payload: Record<string, unknown>;
}

export type PlayerAction =
  | { readonly type: 'DISPATCH_SERVICE'; readonly slotId: TimetableSlotId }
  | { readonly type: 'CANCEL_SERVICE'; readonly serviceRunId: ServiceRunId; readonly reason?: string }
  | { readonly type: 'SET_SIMULATION_SPEED'; readonly speed: SimulationSpeed }
  | { readonly type: 'ACCEPT_B2B_CONTRACT'; readonly contractId: ContractId };

export interface TickExecutionMetrics {
  readonly tickDurationMs: number;
  readonly processedActionsCount: number;
  readonly emittedEventsCount: number;
  readonly activeServicesCount: number;
}

export interface GameState {
  readonly companyId: CompanyId;
  readonly timestamp: GameTimestamp;
  readonly speed: SimulationSpeed;
  readonly activeServices: ReadonlyArray<ActiveServiceRunEntity>;
  readonly timetableSlots: ReadonlyArray<TimetableSlotEntity>;
  readonly fleetUnits: ReadonlyArray<RollingStockUnitEntity>;
  readonly compositions: ReadonlyArray<TrainCompositionEntity>;
  readonly procurementOrders: ReadonlyArray<ProcurementOrderEntity>;
  readonly depots: ReadonlyArray<DepotEntity>;
  readonly employees: ReadonlyArray<EmployeeEntity>;
  readonly b2bContracts: ReadonlyArray<B2BContractEntity>;
  readonly psoContracts: ReadonlyArray<PublicServiceObligationContractEntity>;
  readonly charterContracts: ReadonlyArray<CharterContractEntity>;
  readonly generalLedger: GeneralLedgerEntity;
  readonly reputation: number; // 0.0 .. 1.0
  readonly consecutiveCriticalInsolventDays: number;
  readonly solvencyStatus: SolvencyStatus;
}

export interface GameConfig {
  readonly fuelPricePerLiter: Money;
  readonly tacBaseRatePerTrainKm: Money;
  readonly tacWeightSurchargePer100Tons: Money;
  readonly simulationSeed: number;
}

export interface SimulationResult {
  readonly nextState: GameState;
  readonly emittedEvents: ReadonlyArray<SimulationEvent>;
  readonly metrics: TickExecutionMetrics;
}

export interface SimulationEngineContract {
  simulateTick(
    currentState: Readonly<GameState>,
    playerActions: ReadonlyArray<PlayerAction>,
    config: Readonly<GameConfig>,
    seed: number
  ): SimulationResult;
}
