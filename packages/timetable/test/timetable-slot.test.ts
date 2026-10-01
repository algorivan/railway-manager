import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  toMinutes,
  TimetableSlotId,
  RouteId,
  CompositionId,
  EmployeeId,
} from '@railway/shared';
import { TimetableSlotEntity } from '../src/entities/timetable-slot.entity.js';

describe('TimetableSlotEntity (DOMAIN_MODEL.md §5.5)', () => {
  const createMockSlot = () =>
    new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_ARGO_PARAHYANGAN_01'),
      routeId: createBrandedId<RouteId>('ROUTE_GMR_BD'),
      compositionId: createBrandedId<CompositionId>('CONSIST_EXEC_01'),
      primaryDriverId: createBrandedId<EmployeeId>('EMP_MASINIS_01'),
      primaryConductorId: createBrandedId<EmployeeId>('EMP_KONDEKTUR_01'),
      departureMinuteOfDay: 420, // 07:00
      scheduledArrivalMinuteOfDay: 570, // 09:30
      operatingDays: [1, 2, 3, 4, 5], // Monday - Friday
      active: true,
    });

  it('computes scheduled duration correctly', () => {
    const slot = createMockSlot();
    // 570 - 420 = 150 minutes (2.5 hours)
    expect(slot.scheduledDurationMinutes).toBe(toMinutes(150));
  });

  it('handles scheduled duration with midnight wrap-around', () => {
    const overnightSlot = new TimetableSlotEntity({
      id: createBrandedId<TimetableSlotId>('SLOT_OVERNIGHT_01'),
      routeId: createBrandedId<RouteId>('ROUTE_GMR_SBY'),
      compositionId: createBrandedId<CompositionId>('CONSIST_EXEC_02'),
      primaryDriverId: createBrandedId<EmployeeId>('EMP_MASINIS_02'),
      departureMinuteOfDay: 1380, // 23:00
      scheduledArrivalMinuteOfDay: 360, // 06:00 next day
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
    });

    // (1440 - 1380) + 360 = 60 + 360 = 420 minutes (7 hours)
    expect(overnightSlot.scheduledDurationMinutes).toBe(toMinutes(420));
  });

  it('checks active operating days', () => {
    const slot = createMockSlot();

    expect(slot.isOperatingOnDay(1)).toBe(true);  // Monday
    expect(slot.isOperatingOnDay(5)).toBe(true);  // Friday
    expect(slot.isOperatingOnDay(0)).toBe(false); // Sunday
    expect(slot.isOperatingOnDay(6)).toBe(false); // Saturday

    slot.deactivate();
    expect(slot.isOperatingOnDay(1)).toBe(false);

    slot.activate();
    expect(slot.isOperatingOnDay(1)).toBe(true);
  });

  it('allows crew reassignment', () => {
    const slot = createMockSlot();
    const newDriverId = createBrandedId<EmployeeId>('EMP_MASINIS_99');
    slot.reassignCrew(newDriverId);

    expect(slot.primaryDriverId).toBe(newDriverId);
  });
});
