import { describe, expect, it } from "vitest";
import type { CoreState, CoreRun } from "@railway/simulation";
import { journeyEvents } from "../src/core/journey-events";
const run = (status: CoreRun["status"]) =>
  ({ id: "journey", status, start: 421, end: 500 }) as CoreRun;
const state = (minute: number, runs: CoreRun[], ledger: string[] = []) =>
  ({ minute, runs, ledger: ledger.map((id) => ({ id })) }) as CoreState;
describe("live journey announcements", () => {
  it("announces actual dispatch, including held runs that become ready", () => {
    const before = state(420, [run("held")]);
    const after = state(421, [run("running")], ["journey:dispatch"]);
    expect(journeyEvents(before, after).map((e) => e.kind)).toEqual([
      "departure",
    ]);
    expect(
      journeyEvents(after, state(422, [run("running")], ["journey:dispatch"])),
    ).toEqual([]);
  });
  it("does not announce blocked or cancelled departures", () => {
    expect(journeyEvents(state(420, []), state(421, [run("held")]))).toEqual(
      [],
    );
    expect(
      journeyEvents(state(420, []), state(421, [run("cancelled")])),
    ).toEqual([]);
  });
  it("announces arrival exactly once and preserves timestamp", () => {
    const before = state(499, [run("running")], ["journey:dispatch"]),
      after = state(500, [run("completed")], ["journey:dispatch"]);
    expect(journeyEvents(before, after).map((e) => [e.kind, e.minute])).toEqual(
      [["arrival", 500]],
    );
    expect(
      journeyEvents(
        after,
        state(501, [run("completed")], ["journey:dispatch"]),
      ),
    ).toEqual([]);
  });
  it("reports a departure and arrival crossed during a catch-up tick in order", () => {
    expect(
      journeyEvents(
        state(420, []),
        state(501, [run("completed")], ["journey:dispatch"]),
      ).map((e) => e.kind),
    ).toEqual(["departure", "arrival"]);
  });
  it("does not replay historical arrivals or a backwards checkpoint", () => {
    expect(
      journeyEvents(
        state(600, []),
        state(601, [run("completed")], ["journey:dispatch"]),
      ).map((e) => e.kind),
    ).not.toContain("arrival");
    expect(
      journeyEvents(
        state(600, []),
        state(500, [run("completed")], ["journey:dispatch"]),
      ),
    ).toEqual([]);
  });
});
