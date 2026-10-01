import { toMeters, toTons, toKmh } from '@railway/shared';
import { TrainCompositionEntity, RollingStockUnitEntity } from '@railway/fleet';
import { JAVA_ROLLING_STOCK_CATALOG } from '@railway/game-data';
import {
  ConsistBuilderViewModel,
  FormationSlotViewModel,
  ValidationChecklistItem,
} from '../types/ui.types.js';
import { formatLength, formatMass, formatSpeed } from '../formatters/distance.formatter.js';
import { formatPercentage } from '../formatters/percentage.formatter.js';
import { getConditionBadge } from '../badges/status-variants.js';

export function createConsistBuilderViewModel(
  composition: TrainCompositionEntity,
  fleetUnits: ReadonlyArray<RollingStockUnitEntity>
): ConsistBuilderViewModel {
  const allUnitIds = composition.getAllUnitIds();
  const slots: FormationSlotViewModel[] = [];

  let totalLength = 0;
  let totalWeight = 0;
  let minMaxSpeed = 120;
  let ecoSeats = 0;
  let execSeats = 0;
  let luxSeats = 0;
  let hasPower = composition.powerCarUnitId !== undefined;

  for (let i = 0; i < allUnitIds.length; i++) {
    const unitId = allUnitIds[i]!;
    const unit = fleetUnits.find((u) => u.id === unitId);
    const spec = unit ? JAVA_ROLLING_STOCK_CATALOG.find((s) => s.id === unit.specId) : undefined;

    if (spec) {
      totalLength += spec.lengthMeters;
      totalWeight += spec.tareWeightTons;
      minMaxSpeed = Math.min(minMaxSpeed, spec.maximumSpeedKmh);

      if (spec.headEndPowerEquipped) {
        hasPower = true;
      }
      if (spec.category === 'PASSENGER_CARRIAGE') {
        if (spec.passengerClass === 'ECONOMY') ecoSeats += spec.passengerCapacity;
        else if (spec.passengerClass === 'EXECUTIVE') execSeats += spec.passengerCapacity;
        else if (spec.passengerClass === 'LUXURY') luxSeats += spec.passengerCapacity;
      }
    }

    const cond = unit?.conditionPercentage ?? 100;
    slots.push({
      slotIndex: i + 1,
      unitId,
      serialNumber: unit?.serialNumber ?? unitId,
      modelName: spec?.modelName ?? 'Unknown Model',
      category: spec?.category ?? 'CARRIAGE',
      isLocomotive: composition.locomotiveUnitIds.includes(unitId),
      isDining: unitId === composition.diningCarUnitId,
      isPowerCar: unitId === composition.powerCarUnitId,
      conditionFormatted: formatPercentage(cond, { decimals: 1 }),
      conditionBadge: getConditionBadge(cond),
    });
  }

  // Validation Checklist (UI_SPEC.md §3.2)
  const checklist: ValidationChecklistItem[] = [];

  // 1. Length Check (Max 400m)
  const isLengthOk = totalLength > 0 && totalLength <= 400;
  checklist.push({
    label: `Total Length: ${formatLength(totalLength)} / Max Allowed: 400m`,
    badgeText: isLengthOk ? '[✓ PASS]' : '[⚠ FAIL]',
    passed: isLengthOk,
    variant: isLengthOk ? 'success' : 'danger',
  });

  // 2. Weight & Power Check
  const hasLoco = composition.locomotiveUnitIds.length > 0;
  checklist.push({
    label: `Traction Power: ${hasLoco ? 'Locomotive Coupled' : 'Missing Locomotive'} / Consist Weight: ${formatMass(totalWeight)}`,
    badgeText: hasLoco ? '[✓ PASS]' : '[⚠ FAIL]',
    passed: hasLoco,
    variant: hasLoco ? 'success' : 'danger',
  });

  // 3. Air Conditioning Power
  const requiresAc = ecoSeats + execSeats + luxSeats > 0;
  const isPowerOk = !requiresAc || hasPower;
  checklist.push({
    label: `Air Conditioning Power: ${hasPower ? 'Generator Car Present' : requiresAc ? 'Missing Power Car' : 'Not Required'}`,
    badgeText: isPowerOk ? '[✓ PASS]' : '[⚠ WARN]',
    passed: isPowerOk,
    variant: isPowerOk ? 'success' : 'warning',
  });

  // 4. Maximum Safe Speed
  checklist.push({
    label: `Maximum Safe Speed: ${formatSpeed(minMaxSpeed)} (Bogie Limited)`,
    badgeText: '[✓ PASS]',
    passed: true,
    variant: 'success',
  });

  const isValidToAssemble = checklist.every((item) => item.passed);

  return {
    compositionId: composition.id,
    compositionName: composition.name,
    slots: Object.freeze(slots),
    totalSlotsUsed: slots.length,
    maxSlots: 10,
    totalLengthMeters: toMeters(totalLength),
    totalLengthFormatted: formatLength(totalLength),
    totalTareWeightTons: toTons(totalWeight),
    totalWeightFormatted: formatMass(totalWeight),
    maxSafeSpeedKmh: toKmh(minMaxSpeed),
    maxSpeedFormatted: formatSpeed(minMaxSpeed),
    passengerCapacities: {
      economy: ecoSeats,
      executive: execSeats,
      luxury: luxSeats,
      total: ecoSeats + execSeats + luxSeats,
    },
    checklist: Object.freeze(checklist),
    isValidToAssemble,
  };
}
