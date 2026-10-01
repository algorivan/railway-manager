import { GameState, SimulationSpeed } from '@railway/simulation';
import { GlobalStatusBarViewModel } from '../types/ui.types.js';
import { formatSimTime, formatSimulationSpeed } from '../formatters/time.formatter.js';
import { formatRupiah, formatRupiahCompact } from '../formatters/currency.formatter.js';
import { formatReputation } from '../formatters/percentage.formatter.js';
import { getSolvencyBadge } from '../badges/status-variants.js';

export const ALL_SPEEDS: ReadonlyArray<SimulationSpeed> = Object.freeze([
  'PAUSED',
  '1X',
  '2X',
  '4X',
  '8X',
]);

/**
 * Transforms server GameState into top status bar ViewModel.
 * Conforms to docs/UI_SPEC.md §2.1.
 */
export function createGlobalStatusBarViewModel(state: Readonly<GameState>): GlobalStatusBarViewModel {
  const cash = state.generalLedger.currentCashBalance;
  const isOverdrawn = cash < 0;

  const speedOptions = ALL_SPEEDS.map((speed) => ({
    speed,
    label: formatSimulationSpeed(speed),
    active: speed === state.speed,
  }));

  return {
    companyId: state.companyId,
    timestamp: state.timestamp,
    simClockLabel: formatSimTime(state.timestamp),
    currentSpeed: state.speed,
    currentSpeedLabel: formatSimulationSpeed(state.speed),
    speedOptions,
    cashBalanceFormatted: formatRupiah(cash),
    cashBalanceCompact: formatRupiahCompact(cash),
    isOverdrawn,
    reputationGaugeFormatted: formatReputation(state.reputation),
    reputationRatio: state.reputation,
    solvencyBadge: getSolvencyBadge(state.solvencyStatus),
    activeServicesCount: state.activeServices.length,
  };
}
