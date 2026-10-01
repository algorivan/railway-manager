import { CatchmentProfile, Coordinates, DaopRegion, StationCatalogEntry, StationFacilities } from '@railway/game-data';
import { DataProvenance, StationId } from '@railway/shared';
export interface StationProps {
    readonly id: StationId;
    readonly code: string;
    readonly name: string;
    readonly region: DaopRegion | string;
    readonly coordinates: Coordinates;
    readonly platformCount: number;
    readonly maxTrainLengthMeters: number;
    readonly facilities: StationFacilities;
    readonly demandProfile: CatchmentProfile;
    readonly provenance: DataProvenance;
}
export declare class StationEntity {
    readonly id: StationId;
    readonly code: string;
    readonly name: string;
    readonly region: DaopRegion | string;
    readonly coordinates: Coordinates;
    readonly platformCount: number;
    readonly maxTrainLengthMeters: number;
    readonly facilities: StationFacilities;
    readonly demandProfile: CatchmentProfile;
    readonly provenance: DataProvenance;
    constructor(props: StationProps);
    static fromCatalogEntry(entry: StationCatalogEntry): StationEntity;
    /**
     * Checks whether the station platform can physically accommodate a consist of the given length.
     * Conforms to docs/DOMAIN_MODEL.md §5.2.2.
     */
    canAccommodateConsistLength(consistLengthMeters: number): boolean;
    /**
     * Platform count determines base scheduled dwell time:
     * - Minor Station / Halte (< 2 platforms): 2 minutes
     * - Intermediate Station (2 - 4 platforms): 4 minutes
     * - Major Terminal Station (> 4 platforms): 8 minutes
     * Conforms to docs/SIMULATION_RULES.md §4.1.1.
     */
    calculateBaseDwellTime(): number;
    /**
     * Calculates dwell time taking into account passenger overcrowding load factor.
     * T_dwell = ceil(T_base_dwell * (1 + Phi_overcrowd))
     * Conforms to docs/SIMULATION_RULES.md §4.1.
     */
    calculateDwellTime(loadFactor?: number): number;
}
//# sourceMappingURL=station.entity.d.ts.map