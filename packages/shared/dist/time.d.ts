export interface GameTimestamp {
    readonly day: number;
    readonly minuteOfDay: number;
    readonly totalMinutes: number;
}
export declare const MINUTES_PER_DAY = 1440;
export declare function createGameTimestamp(totalMinutes: number): GameTimestamp;
export declare function createGameTimestampFromDayMinute(day: number, minuteOfDay: number): GameTimestamp;
export declare function addMinutes(ts: GameTimestamp, minutes: number): GameTimestamp;
export declare function diffMinutes(a: GameTimestamp, b: GameTimestamp): number;
export declare function formatTimeOfDay(ts: GameTimestamp): string;
export declare function formatGameTimestamp(ts: GameTimestamp): string;
export declare function formatClock(ts: GameTimestamp): string;
//# sourceMappingURL=time.d.ts.map