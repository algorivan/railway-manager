import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { CORE_BALANCE as B } from "@railway/game-data";
import {
  fuelQuote,
  forecastCore,
  pace,
  stationName,
  type CoreState,
} from "@railway/simulation";
import {
  Card,
  remaining,
  compact,
  money,
  when,
  type Act,
} from "./presentation";
import { RunReport } from "./RunReport";

export function Office({
  state: s,
  act,
  exportSave,
  importSave,
}: {
  state: CoreState;
  act: Act;
  exportSave: () => void;
  importSave: (file: File) => void;
}) {
  const [depotId, setDepotId] = useState(s.hub),
    [liters, setLiters] = useState(1500);
  const [quote, setQuote] = useState(() => fuelQuote(Date.now()));
  const depot = s.depots.find((d) => d.station === depotId)!;
  const completed = s.runs.filter((r) => r.status === "completed");
  const daily = s.plans
    .filter(
      (p) =>
        p.active &&
        s.trainsets.find((t) => t.id === p.trainsetId)?.location === depotId,
    )
    .reduce(
      (v, p) =>
        v +
        (forecastCore(s, p.trainsetId, p.serviceId, p.reverse).fuelLiters *
          1440) /
          p.cycle,
      0,
    );
  return (
    <div className="panel-scroll">
      <Card title="Fuel & ketahanan operasi">
        <label>
          Dipo
          <select value={depotId} onChange={(e) => setDepotId(e.target.value)}>
            {s.depots.map((d) => (
              <option key={d.station} value={d.station}>
                {stationName(d.station)}
              </option>
            ))}
          </select>
        </label>
        <div className="stats">
          <div>
            <strong>{Math.round(depot.stock)} L</strong>
            <small>Stok dipo</small>
          </div>
          <div>
            <strong>{depot.capacity} L</strong>
            <small>Kapasitas</small>
          </div>
          <div>
            <strong>
              {daily > 0
                ? `${(((depot.stock / daily) * 24) / pace(s)).toFixed(1)} j`
                : "—"}
            </strong>
            <small>Horizon nyata*</small>
          </div>
        </div>
        <p className="muted">
          *Perkiraan rata-rata jadwal, terpisah dari fuel onboard dan risiko
          departure. Target starter 24 jam nyata; cadangan harus dikalibrasi
          terhadap diagram.
        </p>
        <p className="fuel-price">
          {money(quote.price)}
          <small>/liter · bucket UTC 30 menit</small>
        </p>
        <label>
          Liter pembelian
          <input
            type="number"
            min="1"
            max={depot.capacity - depot.stock}
            value={liters}
            onChange={(e) => setLiters(Number(e.target.value))}
          />
        </label>
        <div className="toolbar">
          <button
            className="primary"
            onClick={() =>
              act(
                {
                  type: "fuel",
                  station: depotId,
                  liters,
                  bucket: quote.bucket,
                },
                "Fuel dibeli ke dipo. Isi tangki dari detail trainset.",
              )
            }
          >
            Beli · {compact(liters * quote.price)}
          </button>
          <button onClick={() => setQuote(fuelQuote(Date.now()))}>
            Refresh quote
          </button>
        </div>
        <button
          onClick={() =>
            setLiters(
              Math.min(
                depot.capacity - depot.stock,
                Math.ceil(
                  Math.max(
                    4028,
                    ((daily * B.starterRealHours) / 24) * pace(s),
                  ) * 1.1,
                ),
              ),
            )
          }
        >
          Cadangan starter + tangki
        </button>
        <p className="muted">
          Tidak ada auto-purchase. Quote kedaluwarsa ditolak. Harga dihitung
          secara publik di browser; belum divalidasi server.
        </p>
        <button
          disabled={!!depot.upgradeEnd}
          onClick={() => act({ type: "upgrade", station: depotId })}
        >
          {depot.upgradeEnd
            ? `Upgrade · ${remaining(depot.upgradeEnd, s)}`
            : "Upgrade gudang 2× · Rp20 jt · 6 jam game"}
        </button>
      </Card>
      <Card title="Hasil & pilihan investasi">
        <div className="stats">
          <div>
            <strong>{completed.length}</strong>
            <small>Dinas selesai</small>
          </div>
          <div>
            <strong>
              {compact(completed.reduce((v, r) => v + r.revenue - r.cost, 0))}
            </strong>
            <small>Kontribusi dinas</small>
          </div>
        </div>
        <p className="muted">
          Kontribusi tidak sama dengan laba perusahaan setelah biaya tetap.
          Pilih sasaran: lokomotif cadangan, kenyamanan, atau koridor terhubung.
        </p>
        {completed.slice(-4).map((r) => (
          <div key={r.id}>
            <b>{r.name}</b>
            <RunReport run={r} state={s} />
          </div>
        ))}
      </Card>
      <Card title="Marketing · awareness sementara">
        {B.marketing.map((tier, i) => (
          <div className="list-row" key={tier.name}>
            <div>
              <b>{tier.name}</b>
              <small>
                {tier.days} hari game · hingga +{tier.lift * 100}% · tidak
                menambah reputasi permanen
              </small>
            </div>
            <button onClick={() => act({ type: "marketing", tier: i })}>
              {compact(tier.cost)}
            </button>
          </div>
        ))}
        <p className="muted">
          Overlap memakai lift terbesar; boost tidak ditumpuk linear. Harga
          paket sementara.
        </p>
      </Card>
      <Card title="Tempo & checkpoint">
        <label>
          Mode
          <select
            value={s.mode}
            onChange={(e) =>
              act({ type: "mode", mode: e.target.value as CoreState["mode"] })
            }
          >
            <option>Realism</option>
            <option>Casual</option>
          </select>
        </label>
        <p className="muted">
          Realism 1×; Casual 1,5×. Berlaku online dan saat tab ditutup. Save
          browser bukan akun lintas perangkat; ekspor/import untuk memindahkan
          checkpoint.
        </p>
        <div className="toolbar">
          <button onClick={exportSave}>
            <Download size={15} /> Ekspor save
          </button>
          <label className="import-button">
            <Upload size={15} /> Impor save
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importSave(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Card>
      <Card title="Ledger perusahaan">
        {s.ledger
          .slice(-15)
          .reverse()
          .map((entry) => (
            <div className="list-row" key={entry.id}>
              <div>
                <b>{entry.label}</b>
                <small>
                  {when(entry.minute)} · biaya {compact(entry.expense)}
                </small>
              </div>
              <span className={entry.cash >= 0 ? "positive" : ""}>
                {entry.cash >= 0 ? "+" : ""}
                {compact(entry.cash)}
              </span>
            </div>
          ))}
      </Card>
    </div>
  );
}
