import { GameTimestamp, Minutes } from '@railway/shared';
import { SimulationSpeed } from '@railway/simulation';

/**
 * Formats GameTimestamp into official simulation status bar clock string.
 * Example: { day: 12, minuteOfDay: 525 } -> "Hari 12 • 08:45 WIB" (UI_SPEC.md §2.1)
 */
export function formatSimTime(timestamp: GameTimestamp): string {
  const clock = formatClock(timestamp.minuteOfDay);
  return `Hari ${timestamp.day} • ${clock}`;
}

/**
 * Formats minute of the day (0..1439) into Indonesian 24h clock with WIB timezone.
 * Example: 525 -> "08:45 WIB"
 * Example: 0 -> "00:00 WIB"
 */
export function formatClock(minuteOfDay: number, includeTimezone = true): string {
  const modMin = ((minuteOfDay % 1440) + 1440) % 1440;
  const hours = Math.floor(modMin / 60);
  const mins = modMin % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const tz = includeTimezone ? ' WIB' : '';
  return `${hh}:${mm}${tz}`;
}

/**
 * Formats duration in minutes into Indonesian compact hour/minute notation.
 * Example: 160 -> "2j 40m"
 * Example: 45 -> "45m"
 * Example: 120 -> "2j 00m"
 */
export function formatDuration(durationMinutes: Minutes | number): string {
  const total = Math.max(0, Math.round(Number(durationMinutes)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  const mm = mins.toString().padStart(2, '0');
  return `${hours}j ${mm}m`;
}

/**
 * Formats SimulationSpeed into UI speed toggle button label.
 * Example: 'PAUSED' -> '⏸ Pause'
 * Example: '1X' -> '1x'
 */
export function formatSimulationSpeed(speed: SimulationSpeed): string {
  switch (speed) {
    case 'PAUSED':
      return '⏸ Pause';
    case '1X':
      return '1x';
    case '2X':
      return '2x';
    case '4X':
      return '4x';
    case '8X':
      return '8x';
    default:
      return speed;
  }
}
