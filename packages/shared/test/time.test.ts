import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  createGameTimestamp,
  createGameTimestampFromDayMinute,
  diffMinutes,
  formatClock,
  formatGameTimestamp,
  formatTimeOfDay,
} from '../src/time.js';

describe('GameTimestamp Time Model', () => {
  it('creates timestamp at simulation start (totalMinutes = 0)', () => {
    const ts = createGameTimestamp(0);
    expect(ts.day).toBe(1);
    expect(ts.minuteOfDay).toBe(0);
    expect(ts.totalMinutes).toBe(0);
    expect(formatTimeOfDay(ts)).toBe('00:00');
    expect(formatGameTimestamp(ts)).toBe('Day 1, 00:00');
    expect(formatClock(ts)).toBe('00:00');
  });

  it('correctly calculates day boundaries and minute of day', () => {
    // 1439 is last minute of Day 1 (23:59)
    const endDay1 = createGameTimestamp(1439);
    expect(endDay1.day).toBe(1);
    expect(endDay1.minuteOfDay).toBe(1439);
    expect(formatTimeOfDay(endDay1)).toBe('23:59');

    // 1440 rolls over to Day 2 (00:00)
    const startDay2 = createGameTimestamp(1440);
    expect(startDay2.day).toBe(2);
    expect(startDay2.minuteOfDay).toBe(0);
    expect(formatTimeOfDay(startDay2)).toBe('00:00');

    // 8 hours and 30 minutes into Day 1 = 510 minutes
    const midDay1 = createGameTimestamp(510);
    expect(midDay1.day).toBe(1);
    expect(midDay1.minuteOfDay).toBe(510);
    expect(formatGameTimestamp(midDay1)).toBe('Day 1, 08:30');
  });

  it('creates timestamp from day and minuteOfDay', () => {
    const ts = createGameTimestampFromDayMinute(3, 495); // Day 3, 08:15
    expect(ts.day).toBe(3);
    expect(ts.minuteOfDay).toBe(495);
    expect(ts.totalMinutes).toBe(2 * 1440 + 495);
    expect(formatGameTimestamp(ts)).toBe('Day 3, 08:15');
  });

  it('performs bidirectional time arithmetic with addMinutes and diffMinutes', () => {
    const t0 = createGameTimestamp(1400); // Day 1, 23:20
    const t1 = addMinutes(t0, 60); // Day 2, 00:20
    expect(t1.day).toBe(2);
    expect(t1.minuteOfDay).toBe(20);
    expect(diffMinutes(t1, t0)).toBe(60);

    const t2 = addMinutes(t1, -40); // Day 1, 23:40
    expect(t2.day).toBe(1);
    expect(t2.minuteOfDay).toBe(1420);

    // Midnight rollover wrap: Day 2 00:00 - 1 minute -> Day 1 23:59
    const midnightWrap = addMinutes(createGameTimestamp(1440), -1);
    expect(midnightWrap.day).toBe(1);
    expect(midnightWrap.minuteOfDay).toBe(1439);
    expect(formatGameTimestamp(midnightWrap)).toBe('Day 1, 23:59');

    // 100 simulated years (52,560,000 mins) = Day 36501, 00:00
    const hundredYears = createGameTimestamp(52_560_000);
    expect(hundredYears.day).toBe(36501);
    expect(hundredYears.minuteOfDay).toBe(0);
    expect(formatGameTimestamp(hundredYears)).toBe('Day 36501, 00:00');
    expect(addMinutes(hundredYears, 60).totalMinutes).toBe(52_560_060);
  });

  it('rejects invalid timestamps and negative values', () => {
    expect(() => createGameTimestamp(-1)).toThrow(RangeError);
    expect(() => createGameTimestampFromDayMinute(0, 500)).toThrow(RangeError);
    expect(() => createGameTimestampFromDayMinute(1, 1440)).toThrow(RangeError);
    expect(() => createGameTimestampFromDayMinute(1, -1)).toThrow(RangeError);
    expect(() => addMinutes(createGameTimestamp(10), -20)).toThrow(RangeError);
  });
});
