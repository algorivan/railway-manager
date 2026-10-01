import { Kmh } from '@railway/shared';
export interface SpeedConstraintInput {
    readonly trainMaxSpeedKmh: Kmh | number;
    readonly consistLimitKmh: Kmh | number;
    readonly trackLimitKmh: Kmh | number;
    readonly operationalRestrictionKmh?: Kmh | number;
    readonly temporarySpeedRestriction?: Kmh | number;
}
export declare class InvalidSpeedConstraintError extends Error {
    constructor(message: string);
}
/**
 * Calculates effective operating speed as the strict minimum across all constraints.
 * Conforms to docs/SIMULATION_RULES.md §3.1:
 * V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)
 */
export declare function calculateEffectiveSpeed(input: SpeedConstraintInput): Kmh;
export declare const calculateEffectiveSpeedKmh: typeof calculateEffectiveSpeed;
//# sourceMappingURL=speed.d.ts.map