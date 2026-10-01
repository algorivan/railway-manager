import { Kmh, Tons, Meters } from '@railway/shared';
import { RollingStockSpecCatalogEntry } from '@railway/game-data';
import { RollingStockUnitEntity } from '../entities/rolling-stock-unit.entity.js';
export interface ConsistValidationUnit {
    readonly unit: RollingStockUnitEntity;
    readonly spec: RollingStockSpecCatalogEntry;
}
export interface CompositionValidationInput {
    readonly units: ReadonlyArray<ConsistValidationUnit>;
    readonly maxPlatformLengthMeters?: number;
}
export interface PassengerCapacityBreakdown {
    readonly economy: number;
    readonly executive: number;
    readonly luxury: number;
    readonly total: number;
}
export interface CompositionValidationResult {
    readonly isValid: boolean;
    readonly errors: ReadonlyArray<string>;
    readonly maximumSpeedKmh: Kmh;
    readonly totalTareWeightTons: Tons;
    readonly totalLengthMeters: Meters;
    readonly passengerCapacity: PassengerCapacityBreakdown;
    readonly totalCargoCapacityTons: Tons;
    readonly hasDiningCar: boolean;
    readonly hasGeneratorCar: boolean;
}
export declare class CompositionValidationError extends Error {
    readonly errors: ReadonlyArray<string>;
    constructor(message: string, errors: ReadonlyArray<string>);
}
export declare class CompositionValidator {
    static validate(input: CompositionValidationInput): CompositionValidationResult;
}
//# sourceMappingURL=composition-validator.d.ts.map