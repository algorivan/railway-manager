import { Km, Money, toMoney } from '@railway/shared';

export const BASE_REGULATORY_FEE = 50_000_000;
export const PREP_COST_PER_STATION = 15_000_000;
export const CORRIDOR_LICENSING_PER_KM = 250_000;

export interface RouteOpeningCostInput {
  readonly stationCount: number;
  readonly distanceKm: Km | number;
}

export class InvalidRouteOpeningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRouteOpeningError';
    Object.setPrototypeOf(this, InvalidRouteOpeningError.prototype);
  }
}

/**
 * Calculates the upfront regulatory route opening cost.
 * Conforms to docs/ECONOMY_RULES.md §5.3:
 * Cost = BaseRegulatoryFee + (StationCount * PrepCostPerStation) + (D_km * CorridorLicensingPerKm)
 */
export function calculateRouteOpeningCost(input: RouteOpeningCostInput): Money {
  const { stationCount, distanceKm } = input;

  if (typeof stationCount !== 'number' || !Number.isInteger(stationCount) || stationCount < 2) {
    throw new InvalidRouteOpeningError(
      `Route station count must be an integer >= 2, received: ${stationCount}`
    );
  }

  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new InvalidRouteOpeningError(
      `Route corridor distance must be a positive finite number, received: ${distanceKm}`
    );
  }

  const baseCost = BASE_REGULATORY_FEE;
  const stationCost = stationCount * PREP_COST_PER_STATION;
  const licensingCost = Math.round(distanceKm * CORRIDOR_LICENSING_PER_KM);

  const totalCost = baseCost + stationCost + licensingCost;
  return toMoney(totalCost);
}

export const calculateRouteOpeningFee = calculateRouteOpeningCost;
