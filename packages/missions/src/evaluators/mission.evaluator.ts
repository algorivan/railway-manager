import { GameState } from '@railway/simulation';
import { MissionEntity } from '../entities/mission.entity.js';
import {
  MissionObjective,
  ObjectiveType,
  MissionEvaluationResult,
} from '../types/mission.types.js';

export class MissionEvaluator {
  /**
   * Evaluates simulation state metrics against a mission's objectives (MISSION_DESIGN.md §5).
   */
  public static evaluateState(
    mission: MissionEntity,
    gameState: Readonly<GameState>
  ): MissionEvaluationResult {
    const updatedObjectives: MissionObjective[] = mission.objectives.map((obj) => {
      const progress = this.calculateObjectiveProgress(obj.type, gameState);
      return {
        ...obj,
        currentProgress: progress,
        isCompleted: progress >= obj.targetValue,
      };
    });

    const isCompleted = updatedObjectives.every((o) => o.isCompleted);

    return {
      missionId: mission.id,
      isCompleted,
      updatedObjectives,
      rewardsAvailable: isCompleted ? mission.rewards : undefined,
    };
  }

  /**
   * Deterministically calculates current metric progress for an objective type.
   */
  public static calculateObjectiveProgress(type: ObjectiveType, gameState: Readonly<GameState>): number {
    switch (type) {
      case 'DEPOT_BUILT':
        return gameState.depots.length;

      case 'PROCUREMENT_COMPLETED': {
        const deliveredFromOrders = gameState.procurementOrders
          .filter((o) => o.status === 'DELIVERED' || o.status === 'COMMISSIONED')
          .reduce((acc, o) => acc + o.quantity, 0);
        return Math.max(deliveredFromOrders, gameState.fleetUnits.length);
      }

      case 'ROUTE_COUNT': {
        const activeRouteIds = new Set(
          gameState.timetableSlots.filter((s) => s.active).map((s) => s.routeId)
        );
        return activeRouteIds.size;
      }

      case 'PASSENGERS_TRANSPORTED': {
        let totalPax = 0;
        for (const run of gameState.activeServices) {
          totalPax += run.totalPassengers;
        }
        return totalPax;
      }

      case 'FLEET_COUNT':
        return gameState.fleetUnits.length;

      case 'CASH_BALANCE':
        return gameState.generalLedger.currentCashBalance;

      case 'REVENUE_REACHED':
        return gameState.generalLedger.getSummary().totalRevenue;

      case 'CONTRACT_COMPLETED': {
        const fulfilledB2B = gameState.b2bContracts.filter((c) => c.status === 'FULFILLED').length;
        const completedPso = gameState.psoContracts.filter((c) => c.status === 'COMPLETED').length;
        return fulfilledB2B + completedPso;
      }

      case 'ON_TIME_PERFORMANCE': {
        if (gameState.activeServices.length === 0) {
          return 100.0;
        }
        const onTimeRuns = gameState.activeServices.filter((s) => s.delayMinutes <= 5).length;
        return Math.round((onTimeRuns / gameState.activeServices.length) * 10000) / 100;
      }

      case 'LOAD_FACTOR': {
        // Evaluate average load factor across active passenger services
        let totalOccupancy = 0;
        let evaluatedServices = 0;
        for (const run of gameState.activeServices) {
          if (run.totalPassengers > 0) {
            // Assume 200 base consist capacity benchmark
            totalOccupancy += (run.totalPassengers / 200) * 100;
            evaluatedServices++;
          }
        }
        return evaluatedServices > 0 ? Math.round(totalOccupancy / evaluatedServices) : 0;
      }

      case 'PROFIT_MARGIN': {
        const summary = gameState.generalLedger.getSummary();
        if (summary.totalRevenue <= 0) {
          return 0;
        }
        const margin = (summary.netOperatingIncome / summary.totalRevenue) * 100;
        return Math.round(margin * 100) / 100;
      }

      default:
        return 0;
    }
  }
}
