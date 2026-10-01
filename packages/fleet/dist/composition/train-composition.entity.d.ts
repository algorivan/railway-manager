import { CompositionId, CompanyId, UnitId, RouteId } from '@railway/shared';
export interface TrainCompositionProps {
    readonly id: CompositionId;
    readonly companyId: CompanyId;
    readonly name: string;
    readonly locomotiveUnitIds: ReadonlyArray<UnitId>;
    readonly carriageUnitIds: ReadonlyArray<UnitId>;
    readonly powerCarUnitId?: UnitId;
    readonly diningCarUnitId?: UnitId;
    readonly assignedRouteId?: RouteId;
}
export declare class TrainCompositionEntity {
    readonly id: CompositionId;
    readonly companyId: CompanyId;
    readonly name: string;
    readonly locomotiveUnitIds: ReadonlyArray<UnitId>;
    readonly carriageUnitIds: ReadonlyArray<UnitId>;
    readonly powerCarUnitId?: UnitId;
    readonly diningCarUnitId?: UnitId;
    private _assignedRouteId?;
    constructor(props: TrainCompositionProps);
    get assignedRouteId(): RouteId | undefined;
    assignRoute(routeId: RouteId): void;
    unassignRoute(): void;
    /**
     * Returns all unit IDs included in this consist in coupled order.
     */
    getAllUnitIds(): ReadonlyArray<UnitId>;
    getTotalUnitCount(): number;
}
//# sourceMappingURL=train-composition.entity.d.ts.map