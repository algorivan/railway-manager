import { useState } from "react";
import { CORE_BALANCE as B } from "@railway/game-data";
import {
  fuelQuote,
  coreCrewNeeds,
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
  type Screen,
} from "./presentation";
import { CompactWorkspace, ScrollList, ResponsiveColumns } from "./Compact";
import { CargoContracts } from "./CargoContracts";
import { RunReport } from "./RunReport";
export function Office({
  state: s,
  act,
  exportSave,
  importSave,
  notify,
  go,
}: {
  state: CoreState;
  act: Act;
  exportSave: () => void;
  importSave: (file: File) => void;
  notify: (message: string) => void;
  go: (screen: Screen) => void;
}) {
  const [depotId, setDepot] = useState(s.hub),
    [liters, setLiters] = useState(14000),
    [quote, setQuote] = useState(() => fuelQuote(Date.now()));
  const depot = s.depots.find((d) => d.station === depotId) ?? s.depots[0]!,
    staffing = s.trainsets.map((t) => ({
      trainset: t,
      needs: coreCrewNeeds(s, t),
    })),
    total = staffing.reduce((v, r) => v + r.needs.totalCrew, 0),
    missing = staffing
      .filter((r) => !r.trainset.crew)
      .reduce((v, r) => v + r.needs.totalCrew, 0),
    completed = s.runs.filter((r) => r.status === "completed");
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
    <CompactWorkspace>
      <Card title="SDM">
        <ResponsiveColumns>
          <div>
            <h2>Tim kru operasional</h2>
            <div className="stats">
              <div>
                <strong>{total}</strong>
                <small>Kebutuhan posisi</small>
              </div>
              <div>
                <strong>{total - missing}</strong>
                <small>Terpenuhi</small>
              </div>
              <div>
                <strong>{missing}</strong>
                <small>Belum terisi</small>
              </div>
            </div>
            <p>
              Tim menyesuaikan formasi dan dinas otomatis. Satu masinis per
              trainset; kondektur dan layanan mengikuti kapasitas penumpang.
            </p>
            <button
              className="primary"
              disabled={!missing}
              onClick={() =>
                act(
                  { type: "recruitAuto" },
                  `${missing} posisi direkrut otomatis. Kru trainset kini aktif.`,
                )
              }
            >
              Rekrut otomatis sesuai kebutuhan
            </button>
            <p className="muted">
              Biaya tim {money(B.crewPerHour)}/jam dinas termasuk dalam biaya
              perjalanan. Tidak ada biaya rekrut awal.
            </p>
          </div>
          <div>
            <ScrollList
              items={staffing}
              render={({ trainset: t, needs: n }) => (
                <div className="list-row" key={t.id}>
                  <div>
                    <b>{t.name}</b>
                    <small>
                      {n.masinis} masinis · {n.tractionSupport} asisten ·{" "}
                      {n.kondektur} kondektur · {n.onboardService} layanan
                    </small>
                  </div>
                  <span className={`pill ${t.crew ? "good" : "warn"}`}>
                    {t.crew ? "Terpenuhi" : "Perlu rekrut"}
                  </span>
                </div>
              )}
            />
            {!staffing.length && (
              <p>Rakit trainset melalui Armada untuk melihat kebutuhan kru.</p>
            )}
          </div>
        </ResponsiveColumns>
      </Card>
      <Card title="Fuel">
        <ResponsiveColumns>
          <div>
            <label>
              Depo
              <select
                value={depotId}
                onChange={(e) => setDepot(e.target.value)}
              >
                {s.depots.map((d) => (
                  <option key={d.station} value={d.station}>
                    {stationName(d.station)}
                  </option>
                ))}
              </select>
            </label>
            <div className="stats">
              <div>
                <strong>
                  {Math.round(depot.stock).toLocaleString("id-ID")}
                </strong>
                <small>Stok (L)</small>
              </div>
              <div>
                <strong>{depot.capacity.toLocaleString("id-ID")}</strong>
                <small>Kapasitas (L)</small>
              </div>
              <div>
                <strong>
                  {daily
                    ? `${(((depot.stock / daily) * 24) / pace(s)).toFixed(1)}j`
                    : "—"}
                </strong>
                <small>Horizon nyata*</small>
              </div>
            </div>
            <p>
              *Perkiraan stok berdasarkan rata-rata jadwal aktif; tangki onboard
              dihitung terpisah.
            </p>
            <p className="fuel-price">
              {money(quote.price)}
              <small>/L · harga berlaku 30 menit UTC</small>
            </p>
            <button
              disabled={!!depot.upgradeEnd}
              onClick={() => act({ type: "upgrade", station: depotId })}
            >
              {depot.upgradeEnd
                ? `Upgrade · ${remaining(depot.upgradeEnd, s)}`
                : "Upgrade kapasitas 2× · Rp20 jt"}
            </button>
          </div>
          <div>
            <label>
              Liter pembelian
              <input
                type="number"
                min={1}
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
                    "Fuel masuk stok depo. Isi tangki trainset melalui Armada.",
                  )
                }
              >
                Beli · {compact(liters * quote.price)}
              </button>
              <button
                onClick={() => {
                  setQuote(fuelQuote(Date.now()));
                  notify("Harga fuel diperbarui.");
                }}
              >
                Perbarui harga
              </button>
            </div>
            <button
              onClick={() =>
                setLiters(
                  Math.min(
                    depot.capacity - depot.stock,
                    Math.ceil(
                      Math.max(
                        12084,
                        ((daily * B.starterRealHours) / 24) * pace(s),
                      ) * 1.1,
                    ),
                  ),
                )
              }
            >
              Pilih cadangan starter 24 jam
            </button>
            <p>
              Pengisian di stasiun besar tersedia tanpa membangun depo. Armada →
              Isi tangki penuh memakai stok dahulu, lalu membeli kekurangan.
            </p>
            <p className="muted">
              Untuk pembelian saat keberangkatan, aktifkan pilihan fuel otomatis
              pada Jadwal. Save lama tetap memakai stok sampai pilihan ini
              diaktifkan.
            </p>
          </div>
        </ResponsiveColumns>
      </Card>
      <Card title="Kontrak kargo">
        <CargoContracts state={s} act={act} go={go} />
      </Card>
      <Card title="Hasil">
        <ResponsiveColumns>
          <div>
            <h2>{completed.length} dinas selesai</h2>
            <p>
              Kontribusi perjalanan:{" "}
              {compact(completed.reduce((v, r) => v + r.revenue - r.cost, 0))}{" "}
              sebelum biaya tetap perusahaan.
            </p>
            <p>
              Investasi industri dan hadiah misi terpisah dari pendapatan
              operasi pada ledger.
            </p>
          </div>
          <div>
            <ScrollList
              items={[...completed].reverse()}
              render={(r) => <RunReport key={r.id} run={r} state={s} />}
            />
          </div>
        </ResponsiveColumns>
      </Card>
      <Card title="Marketing">
        {B.marketing.map((tier, i) => (
          <div className="list-row" key={tier.name}>
            <div>
              <b>{tier.name}</b>
              <small>
                {tier.days} hari game · hingga +{tier.lift * 100}% awareness
              </small>
            </div>
            <button onClick={() => act({ type: "marketing", tier: i })}>
              {compact(tier.cost)}
            </button>
          </div>
        ))}
        <p className="muted">
          Overlap memakai peningkatan terbesar; reputasi permanen tidak berubah.
        </p>
      </Card>
      <Card title="Tempo & checkpoint">
        <ResponsiveColumns>
          <div>
            <label>
              Mode
              <select
                value={s.mode}
                onChange={(e) =>
                  act({
                    type: "mode",
                    mode: e.target.value as CoreState["mode"],
                  })
                }
              >
                <option>Realism</option>
                <option>Casual</option>
              </select>
            </label>
            <p>
              Realism 1× / Casual 1,5×, termasuk saat aplikasi ditutup. Ekonomi
              dipercepat lewat harga sarana, margin operasi dan kontrak; jam
              tidak dilompati.
            </p>
          </div>
          <div>
            <p>
              Save tersimpan di browser ini. Ekspor untuk cadangan atau
              berpindah perangkat.
            </p>
            <div className="toolbar">
              <button onClick={exportSave}>Ekspor save</button>
              <label className="import-button">
                Impor save
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importSave(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </ResponsiveColumns>
      </Card>
      <Card title="Ledger">
        <ScrollList
          items={[...s.ledger].reverse()}
          render={(e) => (
            <div className="list-row" key={e.id}>
              <div>
                <b>{e.label}</b>
                <small>
                  {when(e.minute)} · biaya {compact(e.expense)}
                </small>
              </div>
              <span className={e.cash >= 0 ? "positive" : ""}>
                {e.cash >= 0 ? "+" : ""}
                {compact(e.cash)}
              </span>
            </div>
          )}
        />
      </Card>
    </CompactWorkspace>
  );
}
