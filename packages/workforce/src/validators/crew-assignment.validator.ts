import { EmployeeEntity } from '../entities/employee.entity.js';

export interface ServiceAssignmentContext {
  readonly routeId: string;
  readonly leadLocomotiveSpecId: string;
  readonly departureDepotId: string;
}

export interface CrewValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
}

export class CrewAssignmentValidator {
  /**
   * Validates if a Masinis (lead driver) is legally and operationally certified to drive a specific service.
   */
  public static validateMasinis(
    masinis: EmployeeEntity,
    context: ServiceAssignmentContext
  ): CrewValidationResult {
    const errors: string[] = [];

    if (masinis.role !== 'MASINIS') {
      errors.push(`Role mismatch: expected MASINIS, but employee ${masinis.name} is ${masinis.role}`);
    }

    if (!masinis.isAvailable()) {
      errors.push(
        `Masinis ${masinis.name} is not available (status: ${masinis.status}, fatigue: ${masinis.fatigueLevel.toFixed(1)}%)`
      );
    }

    if (masinis.fatigueLevel > 80.0) {
      errors.push(
        `Fatigue Safety Violation: Masinis ${masinis.name} fatigue (${masinis.fatigueLevel.toFixed(1)}%) exceeds maximum permitted 80% threshold`
      );
    }

    if (!masinis.hasLocomotiveCertification(context.leadLocomotiveSpecId)) {
      errors.push(
        `Type Qualification Invariant: Masinis ${masinis.name} is not certified for locomotive spec ${context.leadLocomotiveSpecId}`
      );
    }

    if (!masinis.hasRouteCertification(context.routeId)) {
      errors.push(
        `Route Familiarization Invariant: Masinis ${masinis.name} is not certified for route corridor ${context.routeId}`
      );
    }

    if (masinis.currentDepotId !== context.departureDepotId) {
      errors.push(
        `Location Mismatch: Masinis ${masinis.name} is currently stationed at depot ${masinis.currentDepotId}, but service departs from ${context.departureDepotId}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors: Object.freeze(errors),
    };
  }

  /**
   * Validates if an assistant driver (traction support) is qualified.
   */
  public static validateTractionSupport(
    assistant: EmployeeEntity,
    context: ServiceAssignmentContext
  ): CrewValidationResult {
    const errors: string[] = [];

    if (assistant.role !== 'TRACTION_SUPPORT' && assistant.role !== 'MASINIS') {
      errors.push(
        `Role mismatch: expected TRACTION_SUPPORT or MASINIS, but employee ${assistant.name} is ${assistant.role}`
      );
    }

    if (!assistant.isAvailable()) {
      errors.push(
        `Assistant driver ${assistant.name} is not available (status: ${assistant.status}, fatigue: ${assistant.fatigueLevel.toFixed(1)}%)`
      );
    }

    if (!assistant.hasLocomotiveCertification(context.leadLocomotiveSpecId)) {
      errors.push(
        `Traction support ${assistant.name} is not qualified for locomotive spec ${context.leadLocomotiveSpecId}`
      );
    }

    if (assistant.currentDepotId !== context.departureDepotId) {
      errors.push(
        `Location Mismatch: Assistant ${assistant.name} is at depot ${assistant.currentDepotId}, departure depot is ${context.departureDepotId}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors: Object.freeze(errors),
    };
  }

  /**
   * Validates if a conductor (Kondektur) is available and positioned correctly.
   */
  public static validateKondektur(
    conductor: EmployeeEntity,
    context: ServiceAssignmentContext
  ): CrewValidationResult {
    const errors: string[] = [];

    if (conductor.role !== 'KONDEKTUR') {
      errors.push(`Role mismatch: expected KONDEKTUR, but employee ${conductor.name} is ${conductor.role}`);
    }

    if (!conductor.isAvailable()) {
      errors.push(
        `Conductor ${conductor.name} is not available (status: ${conductor.status}, fatigue: ${conductor.fatigueLevel.toFixed(1)}%)`
      );
    }

    if (conductor.currentDepotId !== context.departureDepotId) {
      errors.push(
        `Location Mismatch: Conductor ${conductor.name} is at depot ${conductor.currentDepotId}, departure depot is ${context.departureDepotId}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors: Object.freeze(errors),
    };
  }
}
