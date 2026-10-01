import { toKmh, toTons, toMeters, } from '@railway/shared';
export class CompositionValidationError extends Error {
    errors;
    constructor(message, errors) {
        super(message);
        this.name = 'CompositionValidationError';
        this.errors = errors;
        Object.setPrototypeOf(this, CompositionValidationError.prototype);
    }
}
export class CompositionValidator {
    static validate(input) {
        const errors = [];
        const maxPlatformLength = input.maxPlatformLengthMeters ?? 450;
        if (input.units.length === 0) {
            return {
                isValid: false,
                errors: ['Train composition cannot be empty'],
                maximumSpeedKmh: toKmh(0),
                totalTareWeightTons: toTons(0),
                totalLengthMeters: toMeters(0),
                passengerCapacity: { economy: 0, executive: 0, luxury: 0, total: 0 },
                totalCargoCapacityTons: toTons(0),
                hasDiningCar: false,
                hasGeneratorCar: false,
            };
        }
        // Depot co-location check
        const firstDepotId = input.units[0].unit.currentDepotId;
        for (const u of input.units) {
            if (u.unit.currentDepotId !== firstDepotId) {
                errors.push(`Unit ${u.unit.id} is at depot ${u.unit.currentDepotId}, which differs from consist origin depot ${firstDepotId}`);
            }
            if (!u.unit.isAvailable()) {
                errors.push(`Unit ${u.unit.id} is not available (status: ${u.unit.status})`);
            }
            if (u.unit.conditionPercentage <= 20) {
                errors.push(`Unit ${u.unit.id} has critical condition (${u.unit.conditionPercentage}%)`);
            }
        }
        // Category classifications
        const locomotives = input.units.filter((u) => u.spec.category === 'LOCOMOTIVE');
        const generatorCars = input.units.filter((u) => u.spec.category === 'POWER_GENERATOR_CAR');
        const diningCars = input.units.filter((u) => u.spec.category === 'DINING_CAR');
        const passengerCarriages = input.units.filter((u) => u.spec.category === 'PASSENGER_CARRIAGE');
        // Rule 1: Traction Invariant
        if (locomotives.length === 0) {
            errors.push('Traction Invariant: Train composition must have at least one locomotive');
        }
        // Rule 2: Hotel Power Invariant
        // Executive and Luxury coaches are climate-controlled and require a generator van or HEP locomotive
        const hasClimateControlledCoaches = passengerCarriages.some((c) => c.spec.passengerClass === 'EXECUTIVE' || c.spec.passengerClass === 'LUXURY');
        const hasHepLocomotive = locomotives.some((l) => l.spec.headEndPowerEquipped);
        if (hasClimateControlledCoaches && generatorCars.length === 0 && !hasHepLocomotive) {
            errors.push('Hotel Power Invariant: Executive or Luxury passenger carriages require a Generator Car (P) or HEP locomotive');
        }
        // Calculations
        let minSpeed = Infinity;
        let totalWeight = 0;
        let totalLength = 0;
        let totalCargo = 0;
        let ecoPax = 0;
        let execPax = 0;
        let luxPax = 0;
        for (const u of input.units) {
            if (u.spec.maximumSpeedKmh < minSpeed) {
                minSpeed = u.spec.maximumSpeedKmh;
            }
            totalWeight += u.spec.tareWeightTons;
            totalLength += u.spec.lengthMeters;
            totalCargo += u.spec.cargoCapacityTons;
            if (u.spec.passengerClass === 'ECONOMY') {
                ecoPax += u.spec.passengerCapacity;
            }
            else if (u.spec.passengerClass === 'EXECUTIVE') {
                execPax += u.spec.passengerCapacity;
            }
            else if (u.spec.passengerClass === 'LUXURY') {
                luxPax += u.spec.passengerCapacity;
            }
        }
        // Rule 3: Platform / Length Invariant
        if (totalLength > maxPlatformLength) {
            errors.push(`Platform Length Invariant: Consist length ${totalLength.toFixed(1)}m exceeds maximum platform constraint ${maxPlatformLength}m`);
        }
        const effectiveSpeed = minSpeed === Infinity ? 0 : minSpeed;
        return {
            isValid: errors.length === 0,
            errors: Object.freeze(errors),
            maximumSpeedKmh: toKmh(effectiveSpeed),
            totalTareWeightTons: toTons(Math.round(totalWeight * 100) / 100),
            totalLengthMeters: toMeters(Math.round(totalLength * 100) / 100),
            passengerCapacity: {
                economy: ecoPax,
                executive: execPax,
                luxury: luxPax,
                total: ecoPax + execPax + luxPax,
            },
            totalCargoCapacityTons: toTons(Math.round(totalCargo * 100) / 100),
            hasDiningCar: diningCars.length > 0,
            hasGeneratorCar: generatorCars.length > 0,
        };
    }
}
//# sourceMappingURL=composition-validator.js.map