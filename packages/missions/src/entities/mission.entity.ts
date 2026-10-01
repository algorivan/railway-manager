import { MissionId } from '@railway/shared';
import {
  MissionStatus,
  MissionObjective,
  MissionReward,
  MissionProps,
} from '../types/mission.types.js';

export class MissionEntity {
  public readonly id: MissionId;
  public readonly stage: number;
  public readonly title: string;
  public readonly summary: string;
  public readonly narrativeContext: string;
  public readonly prerequisites: ReadonlyArray<MissionId>;
  public readonly rewards: MissionReward;

  private _status: MissionStatus;
  private _objectives: MissionObjective[];

  constructor(props: MissionProps) {
    if (!props.id || !props.title) {
      throw new Error('Mission requires id and title');
    }
    if (props.stage < 0 || props.stage > 10) {
      throw new RangeError(`Mission stage must be in [0, 10], received: ${props.stage}`);
    }

    this.id = props.id;
    this.stage = props.stage;
    this.title = props.title;
    this.summary = props.summary;
    this.narrativeContext = props.narrativeContext;
    this.prerequisites = Object.freeze([...props.prerequisites]);
    this.rewards = Object.freeze({
      ...props.rewards,
      unlockedSpecIds: Object.freeze([...props.rewards.unlockedSpecIds]),
      unlockedRouteIds: Object.freeze([...props.rewards.unlockedRouteIds]),
    });

    this._status = props.status ?? (props.prerequisites.length === 0 ? 'AVAILABLE' : 'LOCKED');
    this._objectives = props.objectives.map((o) => ({ ...o }));
  }

  public get status(): MissionStatus {
    return this._status;
  }

  public get objectives(): ReadonlyArray<MissionObjective> {
    return Object.freeze([...this._objectives]);
  }

  public get isAllObjectivesCompleted(): boolean {
    return this._objectives.every((o) => o.isCompleted);
  }

  public unlock(): void {
    if (this._status === 'LOCKED') {
      this._status = 'AVAILABLE';
    }
  }

  public start(): void {
    if (this._status !== 'AVAILABLE') {
      throw new Error(`Cannot start mission in status ${this._status}`);
    }
    this._status = 'ACTIVE';
  }

  public updateObjectives(updatedObjectives: ReadonlyArray<MissionObjective>): void {
    this._objectives = updatedObjectives.map((o) => ({ ...o }));

    if (this._status === 'ACTIVE' && this.isAllObjectivesCompleted) {
      this._status = 'COMPLETED';
    }
  }

  public complete(): void {
    if (this._status !== 'ACTIVE') {
      throw new Error(`Cannot complete mission in status ${this._status}`);
    }
    if (!this.isAllObjectivesCompleted) {
      throw new Error('Cannot complete mission before all objectives are satisfied');
    }
    this._status = 'COMPLETED';
  }
}
