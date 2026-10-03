import { CORE_BALANCE } from "@railway/game-data";
import {
  forecastCore,
  coreDiagramAnchor,
  type CoreDuty,
  type CoreRun,
  type CoreState,
} from "./core-v7.js";
export function coreFixedRoundTrip(
  s: CoreState,
  trainsetId: string,
  serviceId: string,
  reverse: boolean,
  departure: number,
  repeatMinutes = 1440,
): CoreDuty[] {
  const out = forecastCore(s, trainsetId, serviceId, reverse, departure);
  return [
    { serviceId, reverse, offset: departure },
    {
      serviceId,
      reverse: !reverse,
      offset:
        Math.ceil(out.end + CORE_BALANCE.turnaroundMinutes) % repeatMinutes,
    },
  ];
}
export interface CoreStationTime {
  stationId: string;
  arrival: number | null;
  departure: number | null;
}
/** Scheduled passenger stops only. Passing nodes never gain a dwell or appear as a stop. */
export function coreRunStationTimes(run: CoreRun): CoreStationTime[] {
  const rows: CoreStationTime[] = [
    { stationId: run.origin, arrival: null, departure: run.start },
  ];
  let minute = run.start;
  run.legs.forEach((leg, i) => {
    minute += leg.minutes;
    const terminal = i === run.legs.length - 1;
    if (!terminal && leg.commercialStop === false) return;
    const arrival = minute;
    if (!terminal) minute += CORE_BALANCE.dwellMinutes;
    rows.push({
      stationId: leg.to,
      arrival,
      departure: terminal ? null : minute,
    });
  });
  return rows;
}
export function coreDraftScheduleRuns(
  s: CoreState,
  tid: string,
  repeat: number,
  duties: CoreDuty[],
): CoreRun[] {
  const anchor = coreDiagramAnchor(s, tid, repeat, duties);
  if (anchor.index < 0)
    return duties.map((d) =>
      forecastCore(s, tid, d.serviceId, d.reverse, d.offset),
    );
  return duties
    .map((d) =>
      forecastCore(
        s,
        tid,
        d.serviceId,
        d.reverse,
        anchor.time +
          ((d.offset - duties[anchor.index]!.offset + repeat) % repeat),
      ),
    )
    .sort((a, b) => a.start - b.start);
}
/** Read-only daily operating sheet; includes yesterday's departures which arrive today. */
export function coreDailySchedule(s: CoreState, day: number): CoreRun[] {
  const from = day * 1440,
    to = from + 1440;
  const runs: CoreRun[] = [];
  for (const plan of s.plans.filter(
    (p) => p.active || (p.once && s.runs.some((run) => run.planId === p.id)),
  )) {
    const duration = forecastCore(
      s,
      plan.trainsetId,
      plan.serviceId,
      plan.reverse,
      0,
    ).end;
    let start = plan.once
      ? plan.nextAt
      : Math.floor((from - duration - plan.offset) / plan.cycle) * plan.cycle +
        plan.offset;
    for (; start < to; start += plan.cycle) {
      if (
        start >= (plan.firstAt ?? 0) &&
        start + duration >= from &&
        (!plan.once || start === plan.nextAt)
      ) {
        const run = forecastCore(
          s,
          plan.trainsetId,
          plan.serviceId,
          plan.reverse,
          start,
        );
        run.planId = plan.id;
        runs.push(run);
      }
      if (plan.once) break;
    }
  }
  return runs.sort((a, b) => a.start - b.start);
}

/** Fill one repeat window with complete PP pairs; preserve both terminal preparation intervals. */
export function coreAutomaticRoundTrips(
  s: CoreState,
  tid: string,
  rid: string,
  reverse: boolean,
  first: number,
  period = 1440,
) {
  if (![1440, 2880, 4320].includes(period) || first < 0 || first >= period)
    throw new Error("Jam awal atau pengulangan tidak valid.");
  const duties: CoreDuty[] = [];
  let departure = first;
  while (duties.length < 24) {
    const outbound = forecastCore(s, tid, rid, reverse, departure);
    const backAt = Math.ceil(outbound.end + CORE_BALANCE.turnaroundMinutes);
    const inbound = forecastCore(s, tid, rid, !reverse, backAt);
    const ready = Math.ceil(inbound.end + CORE_BALANCE.turnaroundMinutes);
    if (ready > first + period) break;
    duties.push(
      { serviceId: rid, reverse, offset: departure % period },
      { serviceId: rid, reverse: !reverse, offset: backAt % period },
    );
    departure = ready;
  }
  if (!duties.length)
    throw new Error(
      "Satu PP beserta jeda tidak muat. Pilih pengulangan 2 atau 3 hari.",
    );
  return duties;
}
