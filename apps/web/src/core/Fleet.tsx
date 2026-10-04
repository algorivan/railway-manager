import { useState } from "react";
import {
  coreProduct,
  coreFormation,
  coreStationCanRefuel,
  stationName,
  type CoreState,
  type CoreTrainset,
} from "@railway/simulation";
import { Asset, Card, type Act, type Screen } from "./presentation";
import { CompactWorkspace, ResponsiveColumns } from "./Compact";
import { FormationBuilder } from "./FormationBuilder";
import { groupFormationUnits } from "./formation-draft";
import { RunReport } from "./RunReport";
import { Depot } from "./Depot";
export function Fleet({
  state: s,
  act,
  go,
  view,
  setView,
}: {
  state: CoreState;
  act: Act;
  go: (screen: Screen) => void;
  view: "operations" | "depot";
  setView: (view: "operations" | "depot") => void;
}) {
  const [tid, setTid] = useState(s.trainsets[0]?.id ?? ""),
    [editing, setEditing] = useState(false),
    [creating, setCreating] = useState(false);
  const t = s.trainsets.find((t) => t.id === tid) ?? s.trainsets[0],
    f = t ? coreFormation(s, t) : null,
    run = t
      ? s.runs.find(
          (r) =>
            r.trainsetId === t.id &&
            ["running", "held", "stopped"].includes(r.status),
        )
      : null;
  return (
    <>
      <div className="fleet-views">
        <button
          className={view === "operations" ? "active" : ""}
          onClick={() => setView("operations")}
        >
          Trainset & dinas
        </button>
        <button
          className={view === "depot" ? "active" : ""}
          onClick={() => setView("depot")}
        >
          Inventori & depo
        </button>
      </div>
      {view === "depot" ? (
        <Depot state={s} act={act} />
      ) : editing ? (
        <FormationBuilder
          state={s}
          trainset={creating ? undefined : t}
          act={act}
          close={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="toolbar fleet-toolbar">
            <label>
              Trainset
              <select
                value={t?.id ?? ""}
                onChange={(e) => setTid(e.target.value)}
              >
                {s.trainsets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {stationName(t.location)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              onClick={() => {
                setCreating(true);
                setEditing(true);
              }}
            >
              Buat trainset
            </button>
          </div>
          {t && f ? (
            <CompactWorkspace>
              <Card title="Kesiapan & operasi" className="fleet-readiness">
                <ResponsiveColumns>
                  <div>
                    <h2>{t.name}</h2>
                    <p>
                      {stationName(t.location)} ·{" "}
                      {t.parked ? "Parkir depo" : "Siap penugasan"}
                    </p>
                    <div className="consist-art">
                      {groupFormationUnits(f.units).map((group) => (
                        <div className="consist-group" key={group.productId}>
                          <Asset id={group.productId} />
                          <b>×{group.unitIds.length}</b>
                        </div>
                      ))}
                    </div>
                    <div
                      className="formation-metrics"
                      aria-label="Kapasitas trainset"
                    >
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
                    <p className="muted">
                      Berat {f.weight} t · Fuel onboard{" "}
                      {Math.round(f.units.reduce((v, u) => v + u.fuel, 0))} L
                    </p>
                    <div className="action-grid">
                      <button
                        disabled={!!run}
                        onClick={() => {
                          setCreating(false);
                          setEditing(true);
                        }}
                      >
                        Edit formasi
                      </button>
                      <button onClick={() => go("schedule")}>
                        Buka Jadwal
                      </button>
                      <button
                        disabled={!!run}
                        onClick={() => act({ type: "fill", trainsetId: t.id })}
                      >
                        Isi tangki penuh
                      </button>
                      <button
                        disabled={!!run || t.crew}
                        onClick={() => act({ type: "crew", trainsetId: t.id })}
                      >
                        {t.crew ? "Kru aktif" : "Aktifkan kru"}
                      </button>
                      <button
                        disabled={!!run}
                        onClick={() => act({ type: "park", trainsetId: t.id })}
                      >
                        Parkir di depo
                      </button>
                    </div>
                    <p className="muted">
                      {coreStationCanRefuel(t.location)
                        ? "Pemasok stasiun tersedia: kekurangan stok saat mengisi dibayar dengan kas."
                        : "Fuel berasal dari stok depo; beli cadangan di Kantor."}
                    </p>
                  </div>
                  <div>
                    {run ? (
                      <>
                        <RunReport run={run} state={s} />
                        {run.status === "running" ? (
                          <div className="toolbar">
                            <button
                              onClick={() =>
                                act({ type: "stop", runId: run.id })
                              }
                            >
                              Berhenti di stasiun berikut
                            </button>
                            <button
                              disabled={run.recalling}
                              onClick={() =>
                                act({ type: "recall", runId: run.id })
                              }
                            >
                              Recall ke asal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              act({ type: "resume", runId: run.id })
                            }
                          >
                            Periksa & lanjutkan
                          </button>
                        )}
                      </>
                    ) : (
                      <p>
                        Belum ada perjalanan berjalan. Tentukan relasi dan jam
                        keberangkatan di menu Jadwal; posisi dipantau pada
                        sidebar.
                      </p>
                    )}
                  </div>
                </ResponsiveColumns>
              </Card>
              <Card title="Ganti unit">
                <Swap state={s} trainset={t} act={act} />
              </Card>
            </CompactWorkspace>
          ) : (
            <Card title="Rakit trainset pertama">
              <p>
                Terima pesanan di Pasar → Pesanan, kemudian tekan Buat trainset.
                Paket penumpang: 1 CC201, 4 Ekonomi Standar, 1 pembangkit.
              </p>
              <button onClick={() => go("market")}>Buka Pasar</button>
            </Card>
          )}
        </>
      )}
    </>
  );
}
function Swap({
  state: s,
  trainset: t,
  act,
}: {
  state: CoreState;
  trainset: CoreTrainset;
  act: Act;
}) {
  const [old, setOld] = useState(t.units[0] ?? ""),
    [replacement, setReplacement] = useState("");
  return (
    <>
      <p>
        Ganti sarana di lokasi yang sama. Kereta harus berhenti; jenis unit
        pengganti harus sama.
      </p>
      <div className="two-column">
        <label>
          Unit dilepas
          <select value={old} onChange={(e) => setOld(e.target.value)}>
            {t.units.map((id) => (
              <option key={id} value={id}>
                {coreProduct(s.units.find((u) => u.id === id)!.productId).name}{" "}
                #{id.slice(-4)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unit pengganti
          <select
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          >
            <option value="">Pilih inventori</option>
            {s.units
              .filter(
                (u) =>
                  !u.job &&
                  u.location === t.location &&
                  !s.trainsets.some((t) => t.units.includes(u.id)),
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {coreProduct(u.productId).name} #{u.id.slice(-4)}
                </option>
              ))}
          </select>
        </label>
      </div>
      <button
        disabled={!replacement}
        onClick={() =>
          act({
            type: "swap",
            trainsetId: t.id,
            oldUnitId: old,
            newUnitId: replacement,
          })
        }
      >
        Simpan penggantian unit
      </button>
    </>
  );
}
