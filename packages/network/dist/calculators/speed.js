import { toKmh } from '@railway/shared';
export class InvalidSpeedConstraintError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidSpeedConstraintError';
        Object.setPrototypeOf(this, InvalidSpeedConstraintError.prototype);
    }
}
/**
 * Calculates effective operating speed as the strict minimum across all constraints.
 * Conforms to docs/SIMULATION_RULES.md §3.1:
 * V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)
 */
export function calculateEffectiveSpeed(input) {
    const { trainMaxSpeedKmh, consistLimitKmh, trackLimitKmh } = input;
    const rawRestriction = input.operationalRestrictionKmh ?? input.temporarySpeedRestriction;
    if (typeof trainMaxSpeedKmh !== 'number' ||
        !Number.isFinite(trainMaxSpeedKmh) ||
        trainMaxSpeedKmh < 0) {
        throw new InvalidSpeedConstraintError(`trainMaxSpeedKmh must be a non-negative finite number, received: ${trainMaxSpeedKmh}`);
    }
    if (typeof consistLimitKmh !== 'number' ||
        !Number.isFinite(consistLimitKmh) ||
        consistLimitKmh < 0) {
        throw new InvalidSpeedConstraintError(`consistLimitKmh must be a non-negative finite number, received: ${consistLimitKmh}`);
    }
    if (typeof trackLimitKmh !== 'number' ||
        !Number.isFinite(trackLimitKmh) ||
        trackLimitKmh < 0) {
        throw new InvalidSpeedConstraintError(`trackLimitKmh must be a non-negative finite number, received: ${trackLimitKmh}`);
    }
    let restriction = Infinity;
    if (rawRestriction !== undefined) {
        if (typeof rawRestriction !== 'number' ||
            !Number.isFinite(rawRestriction) ||
            rawRestriction < 0) {
            throw new InvalidSpeedConstraintError(`operationalRestrictionKmh must be a non-negative finite number, received: ${rawRestriction}`);
        }
        restriction = rawRestriction;
    }
    const vEff = Math.min(trainMaxSpeedKmh, consistLimitKmh, trackLimitKmh, restriction);
    return toKmh(Math.floor(vEff));
}
export const calculateEffectiveSpeedKmh = calculateEffectiveSpeed;
//# sourceMappingURL=speed.js.map