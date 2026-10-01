import { describe, it, expect } from 'vitest';
import { toMinutes } from '@railway/shared';
import { TurnaroundCalculator } from '../src/calculators/turnaround.calculator.js';

describe('TurnaroundCalculator (SIMULATION_RULES.md §4.2)', () => {
  it('returns exact regulatory turnaround minutes by consist category', () => {
    // 20 min for Multiple Units (KRL/DMU)
    expect(TurnaroundCalculator.getRequiredTurnaroundMinutes('MULTIPLE_UNIT')).toBe(toMinutes(20));

    // 45 min for Locomotive-hauled passenger consists
    expect(TurnaroundCalculator.getRequiredTurnaroundMinutes('LOCOMOTIVE_PASSENGER')).toBe(toMinutes(45));

    // 60 min for Freight / Container consists
    expect(TurnaroundCalculator.getRequiredTurnaroundMinutes('FREIGHT_CONTAINER')).toBe(toMinutes(60));
  });

  it('correctly calculates available buffer minutes within the same day', () => {
    // Arrive 10:00 (600), Depart 11:15 (675) -> 75 minutes
    const buffer = TurnaroundCalculator.calculateBufferMinutes(600, 675);
    expect(buffer).toBe(toMinutes(75));
  });

  it('correctly calculates buffer minutes wrapping around midnight', () => {
    // Arrive 23:45 (1425), Depart 00:30 next day (30)
    // Buffer = (1440 - 1425) + 30 = 45 minutes
    const buffer = TurnaroundCalculator.calculateBufferMinutes(1425, 30);
    expect(buffer).toBe(toMinutes(45));
  });

  it('validates compliant turnaround buffers without warnings', () => {
    // Loco passenger arriving at 12:00 (720) and departing at 13:00 (780) -> 60 min >= 45 min
    const result = TurnaroundCalculator.validateTurnaround('LOCOMOTIVE_PASSENGER', 720, 780);
    expect(result.isValid).toBe(true);
    expect(result.actualBufferMinutes).toBe(toMinutes(60));
    expect(result.requiredMinutes).toBe(toMinutes(45));
    expect(result.conflictWarning).toBeUndefined();
  });

  it('detects turnaround conflicts when buffer is less than required minimum', () => {
    // Freight arriving at 14:00 (840) and departing at 14:40 (880) -> 40 min < 60 min
    const result = TurnaroundCalculator.validateTurnaround('FREIGHT_CONTAINER', 840, 880);
    expect(result.isValid).toBe(false);
    expect(result.actualBufferMinutes).toBe(toMinutes(40));
    expect(result.requiredMinutes).toBe(toMinutes(60));
    expect(result.conflictWarning).toMatch(/Turnaround conflict/);
  });
});
