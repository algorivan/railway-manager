import type { CoreClass } from "@railway/game-data";
import {
  stationName,
  coreRunMotion,
  type CoreRun,
  type CoreState,
} from "@railway/simulation";
import { compact, when } from "./presentation";

export function RunReport({
  run: r,
  state: s,
}: {
  run: CoreRun;
  state: CoreState;
}) {
  const leg = r.legs[Math.min(r.leg, r.legs.length - 1)]!;
  const movement = coreRunMotion(r, s.minute);
  const progress =
    r.status === "completed"
      ? 1
      : Math.max(0, Math.min(1, (s.minute - r.start) / (r.end - r.start)));
  return (
    <div className="run-report">
      <div className="list-row">
        <b>
          {stationName(r.origin)} → {stationName(r.destination)}
        </b>
        <span className="pill good">
          {r.status === "completed"
            ? "Selesai"
            : r.phase === "dwell"
              ? "Berhenti"
              : `${movement.speedKmh.toFixed(0)} km/h · ${movement.phase}`}
        </span>
      </div>
      <div className="progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <small>
        {when(r.start)} → {when(r.end)} ·{" "}
        {Math.round(r.legs.reduce((v, l) => v + l.km, 0))} km
      </small>
      <div className="stats">
        <div>
          <strong>
            {Math.round((r.passengerKm / Math.max(1, r.seatKm)) * 100)}%
          </strong>
          <small>LF kursi-km</small>
        </div>
        <div>
          <strong>{compact(r.revenue)}</strong>
          <small>
            {r.status === "completed" ? "Pendapatan" : "Tiket dalam layanan"}
          </small>
        </div>
        <div>
          <strong>{compact(r.revenue - r.cost)}</strong>
          <small>
            {r.status === "completed" ? "Kontribusi" : "Estimasi kontribusi"}
          </small>
        </div>
      </div>
      <p className="muted">
        {r.reason || `Berikut: ${stationName(leg.to)}`} ·{" "}
        {Math.round(r.fuelLiters)} L fuel perjalanan
        {leg.motion &&
          ` · batas lintas ${leg.speed} km/h · gradien ${leg.motion.gradientPermille === null ? "belum diketahui" : `${leg.motion.gradientPermille}‰`}`}
      </p>
      {r.status === "running" && (
        <p>
          {(["LX", "EX", "EC"] as CoreClass[])
            .filter((c) => r.seats[c])
            .map(
              (c) =>
                `${c} ${r.bookings.filter((b) => b.cls === c && b.from <= r.leg && b.to > r.leg).reduce((v, b) => v + b.count, 0)}/${r.seats[c]}`,
            )
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
