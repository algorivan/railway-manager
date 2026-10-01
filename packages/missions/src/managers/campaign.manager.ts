import {
  MissionId,
  TransactionId,
  createBrandedId,
} from '@railway/shared';
import { GameState } from '@railway/simulation';
import { MissionEntity } from '../entities/mission.entity.js';
import { MissionEvaluationResult, MissionReward } from '../types/mission.types.js';
import { MissionEvaluator } from '../evaluators/mission.evaluator.js';
import { CAMPAIGN_MISSION_CATALOG } from '../catalog/mission-catalog.js';

export class CampaignManager {
  private _currentStage: number = 0;
  private _missions: Map<string, MissionEntity> = new Map();
  private _unlockedSpecIds: Set<string> = new Set();
  private _unlockedRouteIds: Set<string> = new Set();

  constructor(customMissions?: ReadonlyArray<MissionEntity>) {
    if (customMissions) {
      for (const m of customMissions) {
        this._missions.set(m.id, m);
      }
    } else {
      // Seed from catalog
      for (const props of CAMPAIGN_MISSION_CATALOG) {
        this._missions.set(props.id, new MissionEntity(props));
      }
    }
  }

  public get currentStage(): number {
    return this._currentStage;
  }

  public get unlockedSpecIds(): ReadonlyArray<string> {
    return Object.freeze([...this._unlockedSpecIds]);
  }

  public get unlockedRouteIds(): ReadonlyArray<string> {
    return Object.freeze([...this._unlockedRouteIds]);
  }

  public getMission(id: MissionId): MissionEntity | undefined {
    return this._missions.get(id);
  }

  public getAvailableMissions(): ReadonlyArray<MissionEntity> {
    return [...this._missions.values()].filter((m) => m.status === 'AVAILABLE');
  }

  public getActiveMissions(): ReadonlyArray<MissionEntity> {
    return [...this._missions.values()].filter((m) => m.status === 'ACTIVE');
  }

  public getCompletedMissions(): ReadonlyArray<MissionEntity> {
    return [...this._missions.values()].filter((m) => m.status === 'COMPLETED');
  }

  public startMission(id: MissionId): void {
    const mission = this._missions.get(id);
    if (!mission) {
      throw new Error(`Mission ${id} not found in campaign`);
    }
    mission.start();
  }

  /**
   * Evaluates active missions against game state and completes satisfied ones.
   */
  public evaluateCampaign(gameState: Readonly<GameState>): ReadonlyArray<MissionEvaluationResult> {
    const results: MissionEvaluationResult[] = [];

    for (const mission of this._missions.values()) {
      if (mission.status === 'ACTIVE') {
        const evalResult = MissionEvaluator.evaluateState(mission, gameState);
        mission.updateObjectives(evalResult.updatedObjectives);

        if (evalResult.isCompleted) {
          this.applyRewards(mission, gameState);
          this.checkUnlocks();
        }

        results.push(evalResult);
      }
    }

    return results;
  }

  /**
   * Applies completed mission rewards to game state and campaign unlocks.
   */
  public applyRewards(mission: MissionEntity, gameState: Readonly<GameState>): MissionReward {
    const rewards = mission.rewards;

    // Credit cash bonus to general ledger
    if (rewards.cashBonus > 0) {
      gameState.generalLedger.postTransaction({
        id: createBrandedId<TransactionId>(`TX_REWARD_${mission.id}`),
        companyId: gameState.companyId,
        timestamp: gameState.timestamp,
        category: 'REV_GOVERNMENT_SUBSIDY',
        amount: rewards.cashBonus,
        referenceEntityId: mission.id,
        description: `Mission reward bonus: ${mission.title}`,
      });
    }

    // Unlock rolling stock specifications
    for (const specId of rewards.unlockedSpecIds) {
      this._unlockedSpecIds.add(specId);
    }

    // Unlock route corridors
    for (const routeId of rewards.unlockedRouteIds) {
      this._unlockedRouteIds.add(routeId);
    }

    return rewards;
  }

  /**
   * Checks mission prerequisites graph and unlocks new available missions.
   */
  public checkUnlocks(): void {
    const completedIds = new Set(this.getCompletedMissions().map((m) => m.id));

    for (const mission of this._missions.values()) {
      if (mission.status === 'LOCKED') {
        const allPrereqsMet = mission.prerequisites.every((prereqId) => completedIds.has(prereqId));
        if (allPrereqsMet) {
          mission.unlock();
          if (mission.stage > this._currentStage) {
            this._currentStage = mission.stage;
          }
        }
      }
    }
  }

  public promoteStage(newStage: number): void {
    if (newStage < this._currentStage || newStage > 10) {
      throw new RangeError(`Invalid target stage: ${newStage}`);
    }
    this._currentStage = newStage;
  }
}
