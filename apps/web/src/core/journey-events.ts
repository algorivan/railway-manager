import type { CoreState, CoreRun } from "@railway/simulation";
export type JourneyEvent = {
  kind: "departure" | "arrival";
  run: CoreRun;
  minute: number;
};
/** Live state transitions only: loading/importing a save establishes a new baseline. */
export function journeyEvents(
  before: CoreState,
  after: CoreState,
): JourneyEvent[] {
  if (after.minute < before.minute) return [];
  const previous = new Map(before.runs.map((run) => [run.id, run]));
  const oldLedger = new Set(before.ledger.map((entry) => entry.id));
  const dispatched = new Set(
    after.ledger
      .filter(
        (entry) => entry.id.endsWith(":dispatch") && !oldLedger.has(entry.id),
      )
      .map((entry) => entry.id.slice(0, -9)),
  );
  const events: JourneyEvent[] = [];
  for (const run of after.runs) {
    if (dispatched.has(run.id))
      events.push({ kind: "departure", run, minute: run.start });
    if (
      run.status === "completed" &&
      previous.get(run.id)?.status !== "completed" &&
      run.end >= before.minute
    )
      events.push({ kind: "arrival", run, minute: run.end });
  }
  return events.sort(
    (a, b) => a.minute - b.minute || (a.kind === "departure" ? -1 : 1),
  );
}
