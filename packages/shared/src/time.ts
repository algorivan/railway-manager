export interface GameTimestamp {
  readonly day: number;         // 1-based simulated day index (>= 1)
  readonly minuteOfDay: number; // 0..1439 (minute of the 24h cycle)
  readonly totalMinutes: number;// Monotonic simulated minutes (>= 0)
}

export const MINUTES_PER_DAY = 1440;

export function createGameTimestamp(totalMinutes: number): GameTimestamp {
  if (typeof totalMinutes !== 'number' || !Number.isInteger(totalMinutes) || totalMinutes < 0) {
    throw new RangeError(`totalMinutes must be a non-negative integer, received: ${totalMinutes}`);
  }
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY) + 1;
  const minuteOfDay = totalMinutes % MINUTES_PER_DAY;
  return Object.freeze({
    day,
    minuteOfDay,
    totalMinutes,
  });
}

export function createGameTimestampFromDayMinute(day: number, minuteOfDay: number): GameTimestamp {
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 1) {
    throw new RangeError(`Day must be an integer >= 1, received: ${day}`);
  }
  if (typeof minuteOfDay !== 'number' || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= MINUTES_PER_DAY) {
    throw new RangeError(`minuteOfDay must be an integer between 0 and 1439, received: ${minuteOfDay}`);
  }
  const totalMinutes = (day - 1) * MINUTES_PER_DAY + minuteOfDay;
  return Object.freeze({
    day,
    minuteOfDay,
    totalMinutes,
  });
}

export function addMinutes(ts: GameTimestamp, minutes: number): GameTimestamp {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    throw new TypeError(`minutes to add must be an integer, received: ${minutes}`);
  }
  const newTotal = ts.totalMinutes + minutes;
  if (newTotal < 0) {
    throw new RangeError(`Resulting timestamp cannot be negative, received total: ${newTotal}`);
  }
  return createGameTimestamp(newTotal);
}

export function diffMinutes(a: GameTimestamp, b: GameTimestamp): number {
  return a.totalMinutes - b.totalMinutes;
}

export function formatTimeOfDay(ts: GameTimestamp): string {
  const hours = Math.floor(ts.minuteOfDay / 60);
  const mins = ts.minuteOfDay % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatGameTimestamp(ts: GameTimestamp): string {
  return `Day ${ts.day}, ${formatTimeOfDay(ts)}`;
}

export function formatClock(ts: GameTimestamp): string {
  return formatTimeOfDay(ts);
}
