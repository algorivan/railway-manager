import { useState } from "react";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, Card, remaining, type Act } from "./presentation";
import { CompactWorkspace, ScrollList } from "./Compact";
export function Depot({ state: s, act }: { state: CoreState; act: Act }) {
  const [station, setStation] = useState(s.hub),
    [uid, setUnit] = useState("");
  const depot = s.depots.find((d) => d.station === station),
    units = s.units.filter((u) => u.location === station),
    jobs = units.filter((u) => u.job),
    u = units.find((u) => u.id === uid) ?? units[0],
    p = u ? coreProduct(u.productId) : null,
    train = u ? s.trainsets.find((t) => t.units.includes(u.id)) : null,
    moving =
      u &&
      s.runs.some(
        (r) =>
          ["running", "held", "stopped"].includes(r.status) &&
          r.unitIds.includes(u.id),
      );
  return (
    <>
      <label>
        Lokasi depo
        <select
          value={station}
          onChange={(e) => {
            setStation(e.target.value);
            setUnit("");
          }}
        >
          {[
            ...new Set([
              ...s.depots.map((d) => d.station),
              ...s.units.map((u) => u.location),
            ]),
          ].map((id) => (
            <option key={id} value={id}>
              {stationName(id)}
            </option>
          ))}
        </select>
      </label>
      <CompactWorkspace>
        <Card title="Inventori & kondisi">
          <div className="inventory-summary">
            <b>
              {units.length} unit · {jobs.length} perawatan
            </b>
            <small>
              {depot
                ? `${Math.round(depot.stock).toLocaleString("id-ID")} / ${depot.capacity.toLocaleString("id-ID")} L fuel`
                : "Belum ada depo"}
            </small>
          </div>
          <div
            className="inventory-grid detail-scroll"
            tabIndex={0}
            aria-label="Inventori sarana"
          >
            {units.map((unit) => {
              const product = coreProduct(unit.productId),
                assigned = s.trainsets.find((t) => t.units.includes(unit.id));
              return (
                <button
                  key={unit.id}
                  className="inventory-card"
                  aria-pressed={u?.id === unit.id}
                  onClick={() => setUnit(unit.id)}
                >
                  <Asset id={unit.productId} />
                  <b>{product.name}</b>
                  <small>
                    #{unit.id.slice(-4)} · {assigned?.name ?? "Tersedia"}
                  </small>
                  <span
                    className={`condition-meter ${unit.condition < 70 ? "warn" : ""}`}
                  >
                    <span style={{ width: `${unit.condition}%` }} />
                  </span>
                  <small>
                    {unit.condition.toFixed(1)}% ·{" "}
                    {unit.job ? "Perawatan" : `${Math.round(unit.km)} km`}
                  </small>
                </button>
              );
            })}
            {!units.length && (
              <p>Belum ada sarana. Pesan dan terima melalui Pasar.</p>
            )}
          </div>
          {u && p && (
            <div className="inventory-detail">
              <b>
                {p.name} #{u.id.slice(-4)}
              </b>
              <small>
                {train?.name ?? "Belum ditugaskan"} ·{" "}
                {moving ? "Dalam dinas" : u.job ? "Perawatan" : "Tersedia"}
              </small>
              <small>
                {Math.round(u.km)} km · {Math.round(u.fuel)} L onboard ·{" "}
                {u.job
                  ? `${u.job.kind}: ${remaining(u.job.end, s)}`
                  : `P1: ${remaining(u.nextService, s)}`}
              </small>
              <div className="toolbar">
                <button
                  disabled={!!moving || !!u.job || !depot}
                  onClick={() => act({ type: "maintenance", unitId: u.id })}
                >
                  P1 · {p.kind === "loco" ? 30 : 15} menit
                </button>
                {["ec-standard", "ec-regular"].includes(p.id) && (
                  <button
                    disabled={!!moving || !!u.job || !depot}
                    onClick={() =>
                      act({ type: "maintenance", unitId: u.id, retrofit: true })
                    }
                  >
                    Retrofit · 90 menit
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
        <Card title="Antrean maintenance">
          <ScrollList
            items={jobs}
            render={(u) => (
              <div className="list-row" key={u.id}>
                <b>
                  {coreProduct(u.productId).name} #{u.id.slice(-4)}
                </b>
                <span>
                  {u.job!.kind} · {remaining(u.job!.end, s)}
                </span>
              </div>
            )}
          />
          {!jobs.length && <p>Tidak ada pekerjaan maintenance aktif.</p>}
        </Card>
      </CompactWorkspace>
    </>
  );
}
