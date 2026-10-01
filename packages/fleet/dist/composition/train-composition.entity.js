export class TrainCompositionEntity {
    id;
    companyId;
    name;
    locomotiveUnitIds;
    carriageUnitIds;
    powerCarUnitId;
    diningCarUnitId;
    _assignedRouteId;
    constructor(props) {
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
    get assignedRouteId() {
        return this._assignedRouteId;
    }
    assignRoute(routeId) {
        this._assignedRouteId = routeId;
    }
    unassignRoute() {
        this._assignedRouteId = undefined;
    }
    /**
     * Returns all unit IDs included in this consist in coupled order.
     */
    getAllUnitIds() {
        const list = [...this.locomotiveUnitIds];
        if (this.powerCarUnitId) {
            list.push(this.powerCarUnitId);
        }
        if (this.diningCarUnitId) {
            list.push(this.diningCarUnitId);
        }
        list.push(...this.carriageUnitIds);
        return Object.freeze(list);
    }
    getTotalUnitCount() {
        let count = this.locomotiveUnitIds.length + this.carriageUnitIds.length;
        if (this.powerCarUnitId)
            count++;
        if (this.diningCarUnitId)
            count++;
        return count;
    }
}
//# sourceMappingURL=train-composition.entity.js.map