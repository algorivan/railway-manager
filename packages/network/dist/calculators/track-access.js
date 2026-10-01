import { toMoney } from '@railway/shared';
export const TAC_BASE_RATE_PER_TRAIN_KM = 25_000;
export const TAC_WEIGHT_SURCHARGE = 5_000;
export class InvalidTrackAccessInputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidTrackAccessInputError';
        Object.setPrototypeOf(this, InvalidTrackAccessInputError.prototype);
    }
}
/**
 * Calculates Track Access Charge (TAC) based on distance and gross train weight.
 * Conforms to docs/ECONOMY_RULES.md §4.1:
 * Cost = D_km * (BaseRatePerTrainKm + WeightSurcharge * (ConsistWeightTons / 100))
 */
export function calculateTrackAccessCharge(input) {
    const { distanceKm, consistWeightTons } = input;
    if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
        throw new InvalidTrackAccessInputError(`Distance in km must be a non-negative finite number, received: ${distanceKm}`);
    }
    if (distanceKm === 0) {
        return toMoney(0);
    }
    if (typeof consistWeightTons !== 'number' || !Number.isFinite(consistWeightTons) || consistWeightTons <= 0) {
        throw new InvalidTrackAccessInputError(`Consist gross weight in tons must be a positive finite number, received: ${consistWeightTons}`);
    }
    const ratePerKm = TAC_BASE_RATE_PER_TRAIN_KM + TAC_WEIGHT_SURCHARGE * (consistWeightTons / 100);
    const totalCost = Math.round(distanceKm * ratePerKm);
    return toMoney(totalCost);
}
//# sourceMappingURL=track-access.js.map