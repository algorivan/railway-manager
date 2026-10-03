import { useState } from "react";
import {
  coreRunMotion,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { clock } from "./presentation";
import { Pager } from "./Compact";
export function FleetMonitor({ state: s }: { state: CoreState }) {
  const [page, setPage] = useState(0),
    size = 4,
    pages = Math.max(1, Math.ceil(s.trainsets.length / size)),
    current = Math.min(page, pages - 1);
  return (
    <div className="fleet-monitor">
      <p className="muted">Posisi dan perjalanan langsung</p>
      {s.trainsets.slice(current * size, (current + 1) * size).map((t) => {
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
      <Pager page={current} pages={pages} onChange={setPage} />
    </div>
  );
}
