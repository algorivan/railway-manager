import { CompanyId, Km, Minutes, Money, RouteId, StationId } from '@railway/shared';
export type ServiceType = 'LOCAL' | 'SEMI_EXPRESS' | 'EXPRESS' | 'INTERCITY';
export type RouteAccessStatus = 'LOCKED' | 'PERMIT_GRANTED' | 'SUSPENDED';
export interface RouteProps {
    readonly id: RouteId;
    readonly companyId: CompanyId;
    readonly code: string;
    readonly name: string;
    readonly originStationId: StationId;
    readonly destinationStationId: StationId;
    readonly stationSequence: ReadonlyArray<StationId>;
    readonly distanceKm: Km | number;
    readonly estimatedRuntimeMinutes?: Minutes | number;
    readonly serviceType?: ServiceType;
    readonly accessStatus?: RouteAccessStatus;
    readonly trackAccessFeePerKm?: Money | number;
}
export declare class InvalidRouteDefinitionError extends Error {
    constructor(message: string);
}
export declare class RouteEntity {
    readonly id: RouteId;
    readonly companyId: CompanyId;
    readonly code: string;
    readonly name: string;
    readonly originStationId: StationId;
    readonly destinationStationId: StationId;
    readonly stationSequence: ReadonlyArray<StationId>;
    readonly distanceKm: Km;
    estimatedRuntimeMinutes: Minutes;
    readonly serviceType: ServiceType;
    accessStatus: RouteAccessStatus;
    trackAccessFeePerKm: Money;
    constructor(props: RouteProps);
    /**
     * Concession Lifecycle: Grants regulatory permit upon route opening payment.
     */
    grantPermit(): void;
    /**
     * Concession Lifecycle: Suspends access license (e.g., insolvency trigger).
     */
    suspend(_reason?: string): void;
    /**
     * Concession Lifecycle: Reinstates suspended access license.
     */
    reinstate(): void;
    /**
     * Returns true if route is active and permitted for train dispatch.
     */
    isOperational(): boolean;
    /**
     * Estimates transit time for a track segment in minutes:
     * T_transit = ceil((D / V) * 60 + T_margin)
     * where T_margin = 2.0 min (passenger) or 4.0 min (freight).
     * Conforms to docs/SIMULATION_RULES.md §3.2.
     */
    static estimateSegmentRuntime(distanceKm: number, speedKmh: number, isFreight?: boolean): number;
}
//# sourceMappingURL=route.entity.d.ts.map