import { Km, Money, Tons } from '@railway/shared';
export declare const TAC_BASE_RATE_PER_TRAIN_KM = 25000;
export declare const TAC_WEIGHT_SURCHARGE = 5000;
export interface TrackAccessChargeInput {
    readonly distanceKm: Km | number;
    readonly consistWeightTons: Tons | number;
}
export declare class InvalidTrackAccessInputError extends Error {
    constructor(message: string);
}
/**
 * Calculates Track Access Charge (TAC) based on distance and gross train weight.
 * Conforms to docs/ECONOMY_RULES.md §4.1:
 * Cost = D_km * (BaseRatePerTrainKm + WeightSurcharge * (ConsistWeightTons / 100))
 */
export declare function calculateTrackAccessCharge(input: TrackAccessChargeInput): Money;
//# sourceMappingURL=track-access.d.ts.map