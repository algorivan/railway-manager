import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMoney,
  createGameTimestamp,
  CompanyId,
  ServiceRunId,
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
} from '@railway/shared';
import { GameState } from '@railway/simulation';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import { TimetableSlotEntity, ActiveServiceRunEntity } from '@railway/timetable';
import { DepotEntity } from '@railway/network';
import { CampaignManager } from '../src/managers/campaign.manager.js';

describe('CampaignManager & Mission Progression (MISSION_DESIGN.md §2, §4)', () => {
  const companyId = createBrandedId<CompanyId>('CMP_KAI');

  const createSatisfiedStage0State = (): GameState => {
    const ledger = new GeneralLedgerEntity(companyId, SolvencyEngine.STARTER_CAPITAL);

    const slot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_01'),
      routeId: createBrandedId<RouteId>('ROUTE_GMR_BD'),
      compositionId: createBrandedId<CompositionId>('CONSIST_01'),
      primaryDriverId: createBrandedId<EmployeeId>('EMP_01'),
      departureMinuteOfDay: 480,
      scheduledArrivalMinuteOfDay: 600,
      operatingDays: [1, 2, 3, 4, 5],
      active: true,
    });

    const run = new ActiveServiceRunEntity({
      id: createBrandedId<ServiceRunId>('RUN_01'),
      timetableSlotId: slot.id,
      currentStationId: createBrandedId('STN_GMR'),
      nextStationId: createBrandedId('STN_BD'),
    });
    run.boardPassengers({ ECONOMY: 250 }); // 250 pax (> 200 target for MSN_02)

    const depot = new DepotEntity({
      id: createBrandedId('DEPOT_BD'),
      companyId,
      name: 'Depo Bandung',
      stationId: createBrandedId('STN_BD'),
      tier: 1,
    });

    return {
      companyId,
      timestamp: createGameTimestamp(480),
      speed: '1X',
      activeServices: Object.freeze([run]),
      timetableSlots: Object.freeze([slot]),
      fleetUnits: Object.freeze([]),
      compositions: Object.freeze([]),
      procurementOrders: Object.freeze([
        {
          id: createBrandedId('ORD_01'),
          companyId,
          supplierId: 'SUP_INKA',
          specId: createBrandedId('SPEC_LOCO_CC201'),
          quantity: 4,
          unitCost: toMoney(4_000_000_000),
          totalCost: toMoney(16_000_000_000),
          orderedAtTimestamp: createGameTimestamp(0),
          expectedDeliveryTimestamp: createGameTimestamp(1440),
          deliveryDepotId: depot.id,
          status: 'DELIVERED',
        } as any,
      ]),
      depots: Object.freeze([depot]),
      employees: Object.freeze([]),
      b2bContracts: Object.freeze([]),
      psoContracts: Object.freeze([]),
      charterContracts: Object.freeze([]),
      generalLedger: ledger,
      reputation: 0.90,
      consecutiveCriticalInsolventDays: 0,
      solvencyStatus: 'SOLVENT',
    };
  };

  it('manages prerequisite unlocks and stage progression through missions', () => {
    const campaign = new CampaignManager();

    // Mission 0.1 starts AVAILABLE, others LOCKED
    const m1 = campaign.getMission(createBrandedId('MSN_01_FIRST_FOUNDATION'))!;
    const m2 = campaign.getMission(createBrandedId('MSN_02_FIRST_WHISTLE'))!;
    expect(m1.status).toBe('AVAILABLE');
    expect(m2.status).toBe('LOCKED');

    // Start Mission 0.1
    campaign.startMission(m1.id);
    expect(m1.status).toBe('ACTIVE');

    const state = createSatisfiedStage0State();
    const initialCash = state.generalLedger.currentCashBalance;

    // Evaluate campaign against state with 1 depot and 4 delivered units
    const results = campaign.evaluateCampaign(state);
    expect(results.length).toBe(1);
    expect(results[0]!.isCompleted).toBe(true);
    expect(m1.status).toBe('COMPLETED');

    // Rewards applied: Rp 5 Miliar cash bonus credited to ledger!
    expect(state.generalLedger.currentCashBalance).toBe(toMoney(initialCash + 5_000_000_000));
    // Unlocks Route Gambir - Bandung
    expect(campaign.unlockedRouteIds).toContain('ROUTE_GMR_BD');

    // Mission 0.2 prerequisite met -> unlocked to AVAILABLE!
    expect(m2.status).toBe('AVAILABLE');

    // Now start and complete Mission 0.2
    campaign.startMission(m2.id);
    const results2 = campaign.evaluateCampaign(state);
    expect(results2.length).toBe(1);
    expect(results2[0]!.isCompleted).toBe(true);
    expect(m2.status).toBe('COMPLETED');

    // Cash bonus Rp 10 Miliar credited
    expect(state.generalLedger.currentCashBalance).toBe(
      toMoney(initialCash + 5_000_000_000 + 10_000_000_000)
    );
  });
});
