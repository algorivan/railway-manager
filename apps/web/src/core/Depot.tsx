import { useState } from "react";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, Card, remaining, compact, type Act } from "./presentation";
import { CompactWorkspace, PagedList, ResponsiveColumns } from "./Compact";
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
          <ResponsiveColumns>
            <div>
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
                    {depot?.capacity.toLocaleString("id-ID") ?? "—"}
                  </strong>
                  <small>Kapasitas fuel (L)</small>
                </div>
              </div>
              <p>
                {depot
                  ? `${Math.round(depot.stock).toLocaleString("id-ID")} L tersimpan · kontrak ${compact(depot.contractCost ?? 0)}`
                  : "Lokasi belum memiliki depo."}
              </p>
              <label>
                Sarana
                <select
                  aria-label="Unit inventori"
                  value={u?.id ?? ""}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {coreProduct(u.productId).name} #{u.id.slice(-4)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Satu bay per depo; pekerjaan antre berurutan. Kapasitas parkir
                sarana belum dibatasi.
              </p>
            </div>
            <div>
              {u && p ? (
                <>
                  <Asset id={p.id} />
                  <h2>{p.name}</h2>
                  <p>
                    {train?.name ?? "Belum ditugaskan"} ·{" "}
                    {moving
                      ? "Dalam dinas"
                      : u.job
                        ? "Dalam perawatan"
                        : "Tersedia"}
                  </p>
                  <div className="stats">
                    <div>
                      <strong>{u.condition.toFixed(1)}%</strong>
                      <small>Kondisi</small>
                    </div>
                    <div>
                      <strong>{Math.round(u.km)}</strong>
                      <small>Jarak (km)</small>
                    </div>
                    <div>
                      <strong>{Math.round(u.fuel)}</strong>
                      <small>Fuel onboard (L)</small>
                    </div>
                  </div>
                  <p>
                    {u.job
                      ? `${u.job.kind} · ${remaining(u.job.end, s)}`
                      : `P1 berikut: ${remaining(u.nextService, s)}`}
                  </p>
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
                          act({
                            type: "maintenance",
                            unitId: u.id,
                            retrofit: true,
                          })
                        }
                      >
                        Retrofit · 90 menit
                      </button>
                    )}
                  </div>
                  <p className="muted">
                    Jeda jadwal trainset sebelum perawatan lewat Jadwal → Rekap
                    harian.
                  </p>
                </>
              ) : (
                <p>Belum ada sarana. Pesan dan terima melalui Pasar.</p>
              )}
            </div>
          </ResponsiveColumns>
        </Card>
        <Card title="Antrean maintenance">
          <PagedList
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
