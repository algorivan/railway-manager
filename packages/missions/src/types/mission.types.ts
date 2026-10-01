import {
  MissionId,
  Money,
} from '@railway/shared';

export type ObjectiveType =
  | 'PASSENGERS_TRANSPORTED'
  | 'REVENUE_REACHED'
  | 'PROFIT_MARGIN'
  | 'LOAD_FACTOR'
  | 'ON_TIME_PERFORMANCE'
  | 'FLEET_COUNT'
  | 'ROUTE_COUNT'
  | 'CONTRACT_COMPLETED'
  | 'PROCUREMENT_COMPLETED'
  | 'DEPOT_BUILT'
  | 'CASH_BALANCE';

export type MissionStatus = 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';

export interface MissionObjective {
  readonly id: string;
  readonly type: ObjectiveType;
  readonly targetValue: number;
  readonly currentProgress: number;
  readonly isCompleted: boolean;
  readonly description: string;
}

export interface MissionReward {
  readonly cashBonus: Money;
  readonly unlockedSpecIds: ReadonlyArray<string>;
  readonly unlockedRouteIds: ReadonlyArray<string>;
  readonly reputationBonus: number;
}

export interface MissionProps {
  readonly id: MissionId;
  readonly stage: number; // 0..10
  readonly title: string;
  readonly summary: string;
  readonly narrativeContext: string;
  readonly prerequisites: ReadonlyArray<MissionId>;
  readonly objectives: ReadonlyArray<MissionObjective>;
  readonly rewards: MissionReward;
  readonly status?: MissionStatus;
}

export interface MissionEvaluationResult {
  readonly missionId: MissionId;
  readonly isCompleted: boolean;
  readonly updatedObjectives: ReadonlyArray<MissionObjective>;
  readonly rewardsAvailable?: MissionReward;
}
