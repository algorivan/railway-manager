import {
  coreRunMotion,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { clock } from "./presentation";

export function FleetMonitor({ state: s }: { state: CoreState }) {
  return (
    <div className="fleet-monitor">
      <p className="muted">Posisi dan perjalanan langsung</p>
      {s.trainsets.map((t) => {
        const run = s.runs.find(
          (r) =>
            r.trainsetId === t.id &&
            ["running", "held", "stopped"].includes(r.status),
        );
        const motion =
          run?.status === "running" ? coreRunMotion(run, s.minute) : null;
        return (
          <article key={t.id}>
            <b>{t.name}</b>
            <span>
              {run
                ? `${stationName(run.origin)} → ${stationName(run.destination)}`
                : stationName(t.location)}
            </span>
            <small>
              {run?.status === "running"
                ? `${Math.round(motion?.speedKmh ?? 0)} km/jam · tiba ~${clock(run.end)}`
                : run?.reason || "Menunggu perjalanan"}
            </small>
            {run && (
              <progress
                max={Math.max(1, run.end - run.start)}
                value={Math.max(0, s.minute - run.start)}
                aria-label={`Progres perjalanan ${t.name}`}
              />
            )}
          </article>
        );
      })}
      {!s.trainsets.length && (
        <p>Trainset yang Anda rakit akan muncul di sini.</p>
      )}
    </div>
  );
}
