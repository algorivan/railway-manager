import {
  coreFormation,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { RunReport } from "./RunReport";
import { Asset } from "./presentation";
import { groupFormationUnits } from "./formation-draft";
export function TrainJourneyDetails({
  state: s,
  trainsetId,
  back,
}: {
  state: CoreState;
  trainsetId: string;
  back: () => void;
}) {
  const t = s.trainsets.find((t) => t.id === trainsetId),
    run =
      s.runs.find(
        (r) =>
          r.trainsetId === trainsetId &&
          ["running", "held", "stopped"].includes(r.status),
      ) ?? s.runs.filter((r) => r.trainsetId === trainsetId).at(-1);
  const f = t ? coreFormation(s, t) : null;
  return (
    <section
      className="train-journey-details"
      aria-label="Rincian perjalanan kereta"
    >
      <button className="journey-back" onClick={back}>
        ← Semua trainset
      </button>
      <div className="journey-detail-scroll detail-scroll">
        <h2>{t?.name ?? "Trainset tidak ditemukan"}</h2>
        {t && f && (
          <>
            <div className="journey-consist">
              {groupFormationUnits(f.units).map((g) => (
                <div key={g.productId}>
                  <Asset id={g.productId} />
                  <b>×{g.unitIds.length}</b>
                </div>
              ))}
            </div>
            <div className="formation-metrics">
              <div>
                <strong>{f.units.length}</strong>
                <small>Unit</small>
              </div>
              <div>
                <strong>{f.capacity}</strong>
                <small>Penumpang</small>
              </div>
              <div>
                <strong>
                  {f.cargoTons}
                  <em>t</em>
                </strong>
                <small>Muatan</small>
              </div>
              <div>
                <strong>
                  {Number(f.length.toFixed(1))}
                  <em>m</em>
                </strong>
                <small>Panjang</small>
              </div>
            </div>
            <p>
              Fuel onboard{" "}
              <b>
                {Math.round(
                  f.units.reduce((n, u) => n + u.fuel, 0),
                ).toLocaleString("id-ID")}{" "}
                L
              </b>
            </p>
          </>
        )}
        {run ? (
          <RunReport run={run} state={s} />
        ) : (
          <p>Menunggu perjalanan di {t ? stationName(t.location) : "depo"}.</p>
        )}
      </div>
    </section>
  );
}
