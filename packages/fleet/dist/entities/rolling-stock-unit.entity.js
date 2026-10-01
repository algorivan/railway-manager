import { toKm, } from '@railway/shared';
export class InvalidRollingStockStateError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'InvalidRollingStockStateError';
        this.code = code;
        Object.setPrototypeOf(this, InvalidRollingStockStateError.prototype);
    }
}
export class RollingStockUnitEntity {
    id;
    companyId;
    specId;
    serialNumber;
    _homeDepotId;
    _currentDepotId;
    _conditionPercentage;
    _odometerKm;
    _kmSinceLastMaintenance;
    _status;
    _assignedCompositionId;
    constructor(props) {
        if (!props.id || !props.companyId || !props.specId || !props.serialNumber) {
            throw new InvalidRollingStockStateError('Missing required identity properties for rolling stock unit', 'MISSING_IDENTITY');
        }
        this.id = props.id;
        this.companyId = props.companyId;
        this.specId = props.specId;
        this.serialNumber = props.serialNumber;
        this._homeDepotId = props.homeDepotId;
        this._currentDepotId = props.currentDepotId;
        this._conditionPercentage = Math.max(0, Math.min(100, props.conditionPercentage ?? 100));
        this._odometerKm = props.odometerKm ?? toKm(0);
        this._kmSinceLastMaintenance = props.kmSinceLastMaintenance ?? toKm(0);
        this._status = props.status ?? 'AVAILABLE';
        this._assignedCompositionId = props.assignedCompositionId;
    }
    get homeDepotId() {
        return this._homeDepotId;
    }
    get currentDepotId() {
        return this._currentDepotId;
    }
    get conditionPercentage() {
        return this._conditionPercentage;
    }
    get odometerKm() {
        return this._odometerKm;
    }
    get kmSinceLastMaintenance() {
        return this._kmSinceLastMaintenance;
    }
    get status() {
        return this._status;
    }
    get assignedCompositionId() {
        return this._assignedCompositionId;
    }
    isAvailable() {
        return this._status === 'AVAILABLE';
    }
    /**
     * Assigns this unit to an operational consist.
     */
    assignToComposition(compositionId) {
        if (this._status !== 'AVAILABLE') {
            throw new InvalidRollingStockStateError(`Cannot assign unit ${this.id} to composition: unit status is ${this._status}`, 'UNIT_NOT_AVAILABLE');
        }
        if (this._conditionPercentage <= 20) {
            throw new InvalidRollingStockStateError(`Cannot assign unit ${this.id} to composition: critical condition ${this._conditionPercentage}%`, 'CRITICAL_CONDITION');
        }
        this._status = 'ASSIGNED';
        this._assignedCompositionId = compositionId;
    }
    /**
     * Releases this unit from its assigned consist.
     */
    unassignFromComposition() {
        if (this._status === 'DECOMMISSIONED') {
            throw new InvalidRollingStockStateError(`Cannot unassign decommissioned unit ${this.id}`, 'UNIT_DECOMMISSIONED');
        }
        this._status = 'AVAILABLE';
        this._assignedCompositionId = undefined;
    }
    /**
     * Sends unit into maintenance bay at a depot.
     */
    sendToMaintenance(depotId) {
        if (this._status === 'ASSIGNED') {
            throw new InvalidRollingStockStateError(`Cannot send unit ${this.id} to maintenance while assigned to a composition`, 'UNIT_CURRENTLY_ASSIGNED');
        }
        if (this._status === 'DECOMMISSIONED') {
            throw new InvalidRollingStockStateError(`Cannot send decommissioned unit ${this.id} to maintenance`, 'UNIT_DECOMMISSIONED');
        }
        this._currentDepotId = depotId;
        this._status = 'IN_MAINTENANCE';
    }
    /**
     * Completes maintenance, restoring condition up to newCondition cap.
     */
    completeMaintenance(newCondition) {
        if (this._status !== 'IN_MAINTENANCE') {
            throw new InvalidRollingStockStateError(`Cannot complete maintenance on unit ${this.id}: not in maintenance`, 'NOT_IN_MAINTENANCE');
        }
        this._conditionPercentage = Math.max(0, Math.min(100, Math.round(newCondition * 100) / 100));
        this._kmSinceLastMaintenance = toKm(0);
        this._status = 'AVAILABLE';
    }
    /**
     * Records kilometer usage and applies wear.
     */
    recordRun(distanceKm, conditionLossPercentage) {
        if (this._status === 'DECOMMISSIONED' || this._status === 'IN_MAINTENANCE') {
            throw new InvalidRollingStockStateError(`Unit ${this.id} cannot perform a run in status ${this._status}`, 'INVALID_RUN_STATUS');
        }
        const distanceVal = distanceKm;
        this._odometerKm = toKm(this._odometerKm + distanceVal);
        this._kmSinceLastMaintenance = toKm(this._kmSinceLastMaintenance + distanceVal);
        this._conditionPercentage = Math.max(0, Math.round((this._conditionPercentage - conditionLossPercentage) * 100) / 100);
    }
    /**
     * Transfers current physical depot location.
     */
    transferDepot(newDepotId) {
        if (this._status === 'ASSIGNED') {
            throw new InvalidRollingStockStateError(`Cannot transfer assigned unit ${this.id} to depot`, 'UNIT_CURRENTLY_ASSIGNED');
        }
        this._currentDepotId = newDepotId;
    }
    /**
     * Decommissions an end-of-life or damaged unit permanently.
     */
    decommission() {
        this._status = 'DECOMMISSIONED';
        this._assignedCompositionId = undefined;
    }
}
//# sourceMappingURL=rolling-stock-unit.entity.js.map