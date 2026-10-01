import { describe, it, expect } from 'vitest';
import { WorkloadCalculator } from '../src/index.js';

describe('WorkloadCalculator', () => {
  it('correctly classifies day vs night services', () => {
    // Departure at 08:00 (480 min), duration 3 hours (180 min) -> finishes at 11:00 (day)
    expect(WorkloadCalculator.isNightRun(480, 180)).toBe(false);

    // Departure at 23:00 (1380 min), duration 4 hours (240 min) -> all between 23:00 and 03:00 (night)
    expect(WorkloadCalculator.isNightRun(1380, 240)).toBe(true);

    // Departure at 04:00 (240 min), duration 3 hours (180 min) -> 04:00-05:00 is night (60 min), 05:00-07:00 is day (120 min) -> 33% night -> day!
    expect(WorkloadCalculator.isNightRun(240, 180)).toBe(false);
  });

  it('calculates workload for standard daytime intercity service', () => {
    // Gambir - Bandung: 160 mins transit + 20 mins dwell = 180 mins (3 hours)
    // 6 passenger coaches, dining car, non-night
    const result = WorkloadCalculator.calculateServiceWorkload({
      transitMinutes: 160,
      dwellMinutes: 20,
      departureMinuteOfDay: 480, // 08:00
      passengerCarriageCount: 6,
      hasDiningCar: true,
      hasLuxuryCarriage: false,
      isFreightOnly: false,
      consistWeightTons: 320,
    });

    expect(result.serviceDurationMinutes).toBe(180);
    expect(result.isNightService).toBe(false);
    expect(result.nightMultiplier).toBe(1.0);
    expect(result.billableCrewHours).toBe(3);

    // Roster checks:
    expect(result.roster.masinis).toBe(1);
    expect(result.roster.tractionSupport).toBe(0); // <= 180 mins, not night, not >400 tons
    expect(result.roster.kondektur).toBe(2); // ceil(6 / 4) = 2 conductors
    expect(result.roster.onboardService).toBe(2); // dining car crew
    expect(result.roster.totalCrew).toBe(5);
    expect(result.totalCrewHours).toBe(15); // 3 hrs * 5 crew
  });

  it('applies night multiplier and mandates assistant driver for overnight long-haul', () => {
    // Jakarta - Surabaya overnight: 540 mins (9 hours), departs 21:00 (1260 mins)
    const result = WorkloadCalculator.calculateServiceWorkload({
      transitMinutes: 500,
      dwellMinutes: 40,
      departureMinuteOfDay: 1260, // 21:00
      passengerCarriageCount: 8,
      hasDiningCar: true,
      hasLuxuryCarriage: true,
      isFreightOnly: false,
      consistWeightTons: 450,
    });

    expect(result.isNightService).toBe(true);
    expect(result.nightMultiplier).toBe(1.25);
    expect(result.billableCrewHours).toBe(11.25); // 9 hours * 1.25

    // Roster:
    expect(result.roster.masinis).toBe(1);
    expect(result.roster.tractionSupport).toBe(1); // long haul (>3h) + night + heavy consist
    expect(result.roster.kondektur).toBe(2); // ceil(8 / 4) = 2
    expect(result.roster.onboardService).toBe(3); // 2 dining + 1 luxury attendant
    expect(result.roster.totalCrew).toBe(7);
  });

  it('validates assigned crew against minimum roster', () => {
    const roster = {
      masinis: 1,
      tractionSupport: 1,
      kondektur: 2,
      onboardService: 2,
      totalCrew: 6,
    };

    const validCrew = [
      'MASINIS',
      'TRACTION_SUPPORT',
      'KONDEKTUR',
      'KONDEKTUR',
      'ONBOARD_SERVICE',
      'ONBOARD_SERVICE',
    ] as const;

    const validation1 = WorkloadCalculator.validateAssignedCrew(roster, validCrew);
    expect(validation1.isValid).toBe(true);
    expect(validation1.missingRoles.length).toBe(0);

    const deficientCrew = [
      'MASINIS',
      'KONDEKTUR',
      'ONBOARD_SERVICE',
    ] as const;

    const validation2 = WorkloadCalculator.validateAssignedCrew(roster, deficientCrew);
    expect(validation2.isValid).toBe(false);
    expect(validation2.missingRoles.some((m) => m.includes('Traction Support'))).toBe(true);
  });
});
