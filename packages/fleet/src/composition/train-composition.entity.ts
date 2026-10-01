import {
  CompositionId,
  CompanyId,
  UnitId,
  RouteId,
} from '@railway/shared';

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

export class TrainCompositionEntity {
  public readonly id: CompositionId;
  public readonly companyId: CompanyId;
  public readonly name: string;
  public readonly locomotiveUnitIds: ReadonlyArray<UnitId>;
  public readonly carriageUnitIds: ReadonlyArray<UnitId>;
  public readonly powerCarUnitId?: UnitId;
  public readonly diningCarUnitId?: UnitId;

  private _assignedRouteId?: RouteId;

  constructor(props: TrainCompositionProps) {
    if (!props.id || !props.companyId || !props.name) {
      throw new Error('Composition requires id, companyId, and name');
    }
    if (props.locomotiveUnitIds.length === 0) {
      throw new Error('Train composition must have at least one locomotive');
    }
    if (props.carriageUnitIds.length === 0 && !props.powerCarUnitId && !props.diningCarUnitId) {
      throw new Error('Train composition must have at least one attached carriage or service car');
    }

    this.id = props.id;
    this.companyId = props.companyId;
    this.name = props.name;
    this.locomotiveUnitIds = Object.freeze([...props.locomotiveUnitIds]);
    this.carriageUnitIds = Object.freeze([...props.carriageUnitIds]);
    this.powerCarUnitId = props.powerCarUnitId;
    this.diningCarUnitId = props.diningCarUnitId;
    this._assignedRouteId = props.assignedRouteId;
  }

  public get assignedRouteId(): RouteId | undefined {
    return this._assignedRouteId;
  }

  public assignRoute(routeId: RouteId): void {
    this._assignedRouteId = routeId;
  }

  public unassignRoute(): void {
    this._assignedRouteId = undefined;
  }

  /**
   * Returns all unit IDs included in this consist in coupled order.
   */
  public getAllUnitIds(): ReadonlyArray<UnitId> {
    const list: UnitId[] = [...this.locomotiveUnitIds];
    if (this.powerCarUnitId) {
      list.push(this.powerCarUnitId);
    }
    if (this.diningCarUnitId) {
      list.push(this.diningCarUnitId);
    }
    list.push(...this.carriageUnitIds);
    return Object.freeze(list);
  }

  public getTotalUnitCount(): number {
    let count = this.locomotiveUnitIds.length + this.carriageUnitIds.length;
    if (this.powerCarUnitId) count++;
    if (this.diningCarUnitId) count++;
    return count;
  }
}
