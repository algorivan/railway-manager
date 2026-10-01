import { Km, Kmh, Tons, Meters } from '@railway/shared';

/**
 * Formats kilometer distance with Indonesian decimal comma separator.
 * Example: 160 -> "160,0 km"
 * Example: 12.345 -> "12,3 km"
 */
export function formatDistance(distanceKm: Km | number, decimals = 1): string {
  const val = Number(distanceKm);
  const formatted = val.toFixed(decimals).replace('.', ',');
  return `${formatted} km`;
}

/**
 * Formats speed into standard railway speed limit notation.
 * Example: 120 -> "120 km/h"
 */
export function formatSpeed(speedKmh: Kmh | number): string {
  return `${Math.round(Number(speedKmh))} km/h`;
}

/**
 * Formats train consist mass in metric tons.
 * Example: 320 -> "320,0 Ton"
 */
export function formatMass(weightTons: Tons | number, decimals = 1): string {
  const val = Number(weightTons);
  const formatted = val.toFixed(decimals).replace('.', ',');
  return `${formatted} Ton`;
}

/**
 * Formats physical length in meters.
 * Example: 145 -> "145 m"
 */
export function formatLength(lengthMeters: Meters | number): string {
  return `${Math.round(Number(lengthMeters))} m`;
}
