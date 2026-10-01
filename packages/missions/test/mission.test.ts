import { describe, it, expect } from 'vitest';
import { createBrandedId, toMoney, MissionId } from '@railway/shared';
import { MissionEntity } from '../src/entities/mission.entity.js';

describe('MissionEntity (MISSION_DESIGN.md §3)', () => {
  it('initializes with AVAILABLE status when there are no prerequisites', () => {
    const mission = new MissionEntity({
      id: createBrandedId<MissionId>('MSN_TEST_01'),
      stage: 0,
      title: 'Test Mission',
      summary: 'Test Summary',
      narrativeContext: 'Test Narrative',
      prerequisites: [],
      objectives: [
        {
          id: 'OBJ_01',
          type: 'PASSENGERS_TRANSPORTED',
          targetValue: 100,
          currentProgress: 0,
          isCompleted: false,
          description: 'Transport 100 passengers',
        },
      ],
      rewards: {
        cashBonus: toMoney(1_000_000),
        unlockedSpecIds: [],
        unlockedRouteIds: [],
        reputationBonus: 0.01,
      },
    });

    expect(mission.status).toBe('AVAILABLE');

    mission.start();
    expect(mission.status).toBe('ACTIVE');
  });

  it('initializes with LOCKED status when prerequisites exist', () => {
    const mission = new MissionEntity({
      id: createBrandedId<MissionId>('MSN_TEST_02'),
      stage: 0,
      title: 'Locked Mission',
      summary: 'Test',
      narrativeContext: 'Test',
      prerequisites: [createBrandedId<MissionId>('MSN_TEST_01')],
      objectives: [],
      rewards: {
        cashBonus: toMoney(0),
        unlockedSpecIds: [],
        unlockedRouteIds: [],
        reputationBonus: 0,
      },
    });

    expect(mission.status).toBe('LOCKED');
    expect(() => mission.start()).toThrow(/Cannot start mission in status LOCKED/);

    mission.unlock();
    expect(mission.status).toBe('AVAILABLE');
  });

  it('completes automatically when all objectives are updated to completed', () => {
    const mission = new MissionEntity({
      id: createBrandedId<MissionId>('MSN_TEST_03'),
      stage: 0,
      title: 'Active Mission',
      summary: 'Test',
      narrativeContext: 'Test',
      prerequisites: [],
      objectives: [
        {
          id: 'OBJ_A',
          type: 'DEPOT_BUILT',
          targetValue: 1,
          currentProgress: 0,
          isCompleted: false,
          description: 'Build 1 depot',
        },
      ],
      rewards: {
        cashBonus: toMoney(1_000),
        unlockedSpecIds: [],
        unlockedRouteIds: [],
        reputationBonus: 0,
      },
    });

    mission.start();
    expect(mission.status).toBe('ACTIVE');

    // Partial progress
    mission.updateObjectives([
      {
        id: 'OBJ_A',
        type: 'DEPOT_BUILT',
        targetValue: 1,
        currentProgress: 0,
        isCompleted: false,
        description: 'Build 1 depot',
      },
    ]);
    expect(mission.status).toBe('ACTIVE');

    // Full completion
    mission.updateObjectives([
      {
        id: 'OBJ_A',
        type: 'DEPOT_BUILT',
        targetValue: 1,
        currentProgress: 1,
        isCompleted: true,
        description: 'Build 1 depot',
      },
    ]);
    expect(mission.status).toBe('COMPLETED');
  });
});
