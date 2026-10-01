import { StaffRole } from '../entities/employee.entity.js';

export interface ServiceWorkloadInput {
  readonly transitMinutes: number;
  readonly dwellMinutes: number;
  readonly departureMinuteOfDay: number; // 0..1439
  readonly passengerCarriageCount: number;
  readonly hasDiningCar: boolean;
  readonly hasLuxuryCarriage: boolean;
  readonly isFreightOnly: boolean;
  readonly consistWeightTons: number;
}

export interface RequiredCrewRoster {
  readonly masinis: number;
  readonly tractionSupport: number;
  readonly kondektur: number;
  readonly onboardService: number;
  readonly totalCrew: number;
}

export interface WorkloadCalculationResult {
  readonly serviceDurationMinutes: number;
  readonly isNightService: boolean;
  readonly nightMultiplier: number;
  readonly billableCrewHours: number;
  readonly roster: RequiredCrewRoster;
  readonly totalCrewHours: number;
}

export class WorkloadCalculator {
  /**
   * Determines if a service is classified as a night operation (>=50% duration between 22:00 and 05:00).
   */
  public static isNightRun(departureMinute: number, durationMinutes: number): boolean {
    let nightMinutes = 0;
    for (let m = 0; m < durationMinutes; m++) {
      const currentMin = (departureMinute + m) % 1440;
      // 22:00 is 1320 mins; 05:00 is 300 mins
      if (currentMin >= 1320 || currentMin < 300) {
        nightMinutes++;
      }
    }
    return nightMinutes / durationMinutes >= 0.5;
  }

  /**
   * Calculates required crew positions and total billable crew hours for a service run.
   */
  public static calculateServiceWorkload(input: ServiceWorkloadInput): WorkloadCalculationResult {
    const totalDurationMinutes = input.transitMinutes + input.dwellMinutes;
    if (totalDurationMinutes <= 0) {
      throw new RangeError(`Service duration must be positive, received: ${totalDurationMinutes}`);
    }

    const isNight = this.isNightRun(input.departureMinuteOfDay, totalDurationMinutes);
    const nightMultiplier = isNight ? 1.25 : 1.0;
    const baseRunHours = totalDurationMinutes / 60;
    const billableHours = Math.round(baseRunHours * nightMultiplier * 100) / 100;

    // --- Crew Roster Staffing Rules ---
    // 1. Lead Masinis: always 1
    const masinisCount = 1;

    // 2. Traction Support (Asisten Masinis):
    // Required if run > 3 hours (180 mins) OR night service OR heavy freight (>400 tons)
    const requiresAssistant = totalDurationMinutes > 180 || isNight || input.consistWeightTons > 400;
    const tractionSupportCount = requiresAssistant ? 1 : 0;

    // 3. Kondektur (Conductor):
    let kondekturCount = 0;
    if (input.isFreightOnly) {
      kondekturCount = 1; // Freight guard/conductor
    } else if (input.passengerCarriageCount > 0) {
      // 1 conductor per 4 passenger carriages (min 1)
      kondekturCount = Math.max(1, Math.ceil(input.passengerCarriageCount / 4));
    }

    // 4. Onboard Service Attendants:
    let onboardCount = 0;
    if (!input.isFreightOnly) {
      if (input.hasDiningCar) {
        onboardCount += 2; // Kitchen + dining crew
      }
      if (input.hasLuxuryCarriage) {
        onboardCount += 1; // Dedicated suite attendant
      }
    }

    const totalCrew = masinisCount + tractionSupportCount + kondekturCount + onboardCount;
    const totalCrewHours = Math.round(billableHours * totalCrew * 100) / 100;

    return {
      serviceDurationMinutes: totalDurationMinutes,
      isNightService: isNight,
      nightMultiplier,
      billableCrewHours: billableHours,
      roster: {
        masinis: masinisCount,
        tractionSupport: tractionSupportCount,
        kondektur: kondekturCount,
        onboardService: onboardCount,
        totalCrew,
      },
      totalCrewHours,
    };
  }

  /**
   * Helper verifying whether an assigned team satisfies the minimum roster requirements.
   */
  public static validateAssignedCrew(
    roster: RequiredCrewRoster,
    assignedRoles: ReadonlyArray<StaffRole>
  ): { isValid: boolean; missingRoles: string[] } {
    const counts: Record<StaffRole, number> = {
      MASINIS: 0,
      TRACTION_SUPPORT: 0,
      KONDEKTUR: 0,
      ONBOARD_SERVICE: 0,
      TECHNICIAN: 0,
      DEPOT_STAFF: 0,
      DISPATCHER: 0,
      ADMIN: 0,
    };

    for (const role of assignedRoles) {
      counts[role]++;
    }

    const missing: string[] = [];
    if (counts.MASINIS < roster.masinis) {
      missing.push(`Missing Masinis: required ${roster.masinis}, assigned ${counts.MASINIS}`);
    }
    if (counts.TRACTION_SUPPORT < roster.tractionSupport) {
      missing.push(
        `Missing Traction Support: required ${roster.tractionSupport}, assigned ${counts.TRACTION_SUPPORT}`
      );
    }
    if (counts.KONDEKTUR < roster.kondektur) {
      missing.push(`Missing Kondektur: required ${roster.kondektur}, assigned ${counts.KONDEKTUR}`);
    }
    if (counts.ONBOARD_SERVICE < roster.onboardService) {
      missing.push(
        `Missing Onboard Service: required ${roster.onboardService}, assigned ${counts.ONBOARD_SERVICE}`
      );
    }

    return {
      isValid: missing.length === 0,
      missingRoles: missing,
    };
  }
}
