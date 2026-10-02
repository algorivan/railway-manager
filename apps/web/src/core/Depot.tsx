import { useState } from "react";
import { Wrench } from "lucide-react";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, Card, remaining, compact, type Act } from "./presentation";

export function Depot({ state: s, act }: { state: CoreState; act: Act }) {
  const [station, setStation] = useState(s.hub);
  const depot = s.depots.find((d) => d.station === station);
  const units = s.units.filter((u) => u.location === station);
  const jobs = units.filter((u) => u.job);
  const moving = (uid: string) =>
    s.runs.some((r) => r.status === "running" && r.unitIds.includes(uid));
  return (
    <div className="panel-scroll">
      <Card title="Depo & inventori armada">
        <label>
          Lokasi depo
          <select value={station} onChange={(e) => setStation(e.target.value)}>
            {[
              ...new Set([
                ...s.depots.map((d) => d.station),
                ...s.units.map((u) => u.location),
              ]),
            ].map((id) => (
              <option value={id} key={id}>
                {stationName(id)}
              </option>
            ))}
          </select>
        </label>
        <div className="stats">
          <div>
            <strong>{units.length}</strong>
            <small>Unit di lokasi</small>
          </div>
          <div>
            <strong>{jobs.length}</strong>
            <small>Dalam perawatan</small>
          </div>
          <div>
            <strong>
              {depot ? `${depot.capacity.toLocaleString("id-ID")} L` : "—"}
            </strong>
            <small>Kapasitas fuel depo</small>
          </div>
        </div>
        <p className="muted">
          {depot?.contractCost !== undefined &&
            `Kontrak depo: ${compact(depot.contractCost)}. `}
          {depot
            ? `${Math.round(depot.stock).toLocaleString("id-ID")} L fuel tersimpan. Satu bay maintenance tersedia per depo.`
            : "Lokasi ini belum memiliki kontrak depo; perawatan memerlukan depo."}{" "}
          Kapasitas parkir sarana belum dibatasi dalam model saat ini.
        </p>
      </Card>
      <Card title={`Inventori · ${stationName(station)}`}>
        {!units.length && (
          <p className="muted">
            Belum ada sarana di lokasi ini. Pesan dan terima sarana melalui
            Pasar.
          </p>
        )}
        {units.map((u) => {
          const train = s.trainsets.find((t) => t.units.includes(u.id));
          const running = moving(u.id);
          return (
            <article className="depot-unit" key={u.id}>
              <div className="inventory-row">
                <Asset id={u.productId} />
                <div>
                  <b>{coreProduct(u.productId).name}</b>
                  <small>
                    #{u.id.slice(-8)} · {train?.name ?? "Belum ditugaskan"}
                  </small>
                </div>
                <span className={`pill ${u.job ? "warn" : "good"}`}>
                  {u.job ? "Maintenance" : running ? "Dalam dinas" : "Tersedia"}
                </span>
              </div>
              <div className="stats">
                <div>
                  <strong>{u.condition.toFixed(1)}%</strong>
                  <small>Kondisi</small>
                </div>
                <div>
                  <strong>{Math.round(u.km).toLocaleString("id-ID")}</strong>
                  <small>Jarak tempuh km</small>
                </div>
              </div>
              <p className="muted">
                {u.job
                  ? `${u.job.kind} selesai dalam ${remaining(u.job.end, s)}`
                  : `P1 berikutnya: ${remaining(u.nextService, s)}`}
              </p>
              <button
                disabled={running || !!u.job || !depot}
                onClick={() => act({ type: "maintenance", unitId: u.id })}
              >
                <Wrench size={14} /> Jadwalkan P1
              </button>
              {train &&
                s.plans.some((p) => p.active && p.trainsetId === train.id) && (
                  <p className="muted">
                    Jeda diagram di Jadwal sebelum perawatan.
                  </p>
                )}
            </article>
          );
        })}
      </Card>
      <Card title="Jadwal maintenance">
        {!jobs.length && (
          <p className="muted">
            Tidak ada pekerjaan aktif atau antre di lokasi ini.
          </p>
        )}
        {jobs.map((u) => (
          <div className="list-row" key={u.id}>
            <div>
              <b>
                {coreProduct(u.productId).name} · #{u.id.slice(-8)}
              </b>
              <small>
                {u.job!.kind} · selesai {remaining(u.job!.end, s)}
              </small>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
