import { Km, Money } from '@railway/shared';
export declare const BASE_REGULATORY_FEE = 50000000;
export declare const PREP_COST_PER_STATION = 15000000;
export declare const CORRIDOR_LICENSING_PER_KM = 250000;
export interface RouteOpeningCostInput {
    readonly stationCount: number;
    readonly distanceKm: Km | number;
}
export declare class InvalidRouteOpeningError extends Error {
    constructor(message: string);
}
/**
 * Calculates the upfront regulatory route opening cost.
 * Conforms to docs/ECONOMY_RULES.md §5.3:
 * Cost = BaseRegulatoryFee + (StationCount * PrepCostPerStation) + (D_km * CorridorLicensingPerKm)
 */
export declare function calculateRouteOpeningCost(input: RouteOpeningCostInput): Money;
export declare const calculateRouteOpeningFee: typeof calculateRouteOpeningCost;
//# sourceMappingURL=route-opening.d.ts.map