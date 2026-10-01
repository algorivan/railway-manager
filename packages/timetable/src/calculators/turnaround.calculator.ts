import { Minutes, toMinutes } from '@railway/shared';
import { ConsistTurnaroundType, TurnaroundValidationResult } from '../types/timetable.types.js';

export class TurnaroundCalculator {
  /**
   * Required turnaround time at terminus by consist category (SIMULATION_RULES.md §4.2)
   */
  public static readonly REQUIRED_TURNAROUND_MINUTES: Record<ConsistTurnaroundType, Minutes> = Object.freeze({
    MULTIPLE_UNIT: toMinutes(20),
    LOCOMOTIVE_PASSENGER: toMinutes(45),
    FREIGHT_CONTAINER: toMinutes(60),
  });

  /**
   * Gets required turnaround time in minutes for a rolling stock composition type.
   */
  public static getRequiredTurnaroundMinutes(type: ConsistTurnaroundType): Minutes {
    return this.REQUIRED_TURNAROUND_MINUTES[type];
  }

  /**
   * Computes the available buffer time in minutes between an arrival and subsequent departure.
   * Correctly handles 24-hour cycle wrap-around across midnight.
   */
  public static calculateBufferMinutes(arrivalMinuteOfDay: number, departureMinuteOfDay: number): Minutes {
    const arr = ((arrivalMinuteOfDay % 1440) + 1440) % 1440;
    const dep = ((departureMinuteOfDay % 1440) + 1440) % 1440;

    let buffer = dep - arr;
    if (buffer < 0) {
      buffer += 1440; // Wrap around to next day
    }
    return toMinutes(buffer);
  }

  /**
   * Validates turnaround schedule buffer against regulatory minimums (SIMULATION_RULES.md §4.2).
   */
  public static validateTurnaround(
    type: ConsistTurnaroundType,
    arrivalMinuteOfDay: number,
    nextDepartureMinuteOfDay: number
  ): TurnaroundValidationResult {
    const requiredMinutes = this.getRequiredTurnaroundMinutes(type);
    const actualBufferMinutes = this.calculateBufferMinutes(arrivalMinuteOfDay, nextDepartureMinuteOfDay);

    const isValid = actualBufferMinutes >= requiredMinutes;
    const conflictWarning = isValid
      ? undefined
      : `Turnaround conflict: available buffer of ${actualBufferMinutes} minutes is less than required ${requiredMinutes} minutes for ${type}`;

    return {
      isValid,
      requiredMinutes,
      actualBufferMinutes,
      conflictWarning,
    };
  }
}
