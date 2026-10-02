import { useState } from "react";
import { Warehouse, MapPin, ArrowRight, ArrowLeft } from "lucide-react";
import { CORE_DEPOT_CITIES } from "@railway/game-data";
import { stationName, type CoreState } from "@railway/simulation";
import { compact, money, type Act } from "./presentation";

export function CompanySetup({
  state,
  act,
  onStarted,
  ready,
}: {
  state: CoreState;
  act: Act;
  onStarted: () => void;
  ready: boolean;
}) {
  const [stage, setStage] = useState(1);
  const [cityId, setCityId] = useState("");
  const [hub, setHub] = useState("");
  const [query, setQuery] = useState("");
  const city = CORE_DEPOT_CITIES.find((c) => c.id === cityId);
  return (
    <section className="company-setup" aria-labelledby="company-setup-title">
      <div className="company-setup-card">
        <small>SELAMAT DATANG, OPERATOR BARU</small>
        <h1 id="company-setup-title">Mulai dari depo Anda.</h1>
        <p>
          Depo menyimpan sarana, menyediakan fuel dan fasilitas maintenance.
          Pilih kota terlebih dahulu, lalu tentukan stasiun hub yang melayani
          depo tersebut.
        </p>
        <div className="wizard-steps">
          <span className={stage === 1 ? "active" : ""}>
            1 · Kota & biaya depo
          </span>
          <span className={stage === 2 ? "active" : ""}>2 · Stasiun hub</span>
        </div>
        {stage === 1 ? (
          <>
            <label>
              Cari kota/kawasan
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: Bandung"
              />
            </label>
            <div className="depot-city-options">
              {CORE_DEPOT_CITIES.filter(
                (c) =>
                  c.stationIds.length &&
                  c.name.toLowerCase().includes(query.toLowerCase()),
              ).map((c) => (
                <button
                  key={c.id}
                  aria-pressed={cityId === c.id}
                  className={cityId === c.id ? "selected" : ""}
                  onClick={() => {
                    setCityId(c.id);
                    setHub("");
                  }}
                >
                  <Warehouse size={19} />
                  <span>
                    <b>{c.name}</b>
                    <small>{c.stationIds.length} stasiun hub tersedia</small>
                  </span>
                  <strong>{compact(c.cost)}</strong>
                </button>
              ))}
            </div>
            <p className="muted">
              Harga kontrak adalah balance game sementara. Pilihan kota
              mengikuti stasiun yang tersedia di katalog saat ini.
            </p>
            <button
              className="primary"
              disabled={!city}
              onClick={() => setStage(2)}
            >
              Pilih stasiun hub <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <label>
              <MapPin size={15} /> Hub pertama di {city?.name}
              <select value={hub} onChange={(e) => setHub(e.target.value)}>
                <option value="">Pilih stasiun hub</option>
                {city?.stationIds.map((id) => (
                  <option key={id} value={id}>
                    {stationName(id)}
                  </option>
                ))}
              </select>
            </label>
            <div className="setup-budget">
              <div>
                <span>Modal awal</span>
                <b>{compact(state.cash)}</b>
              </div>
              <div>
                <span>Kontrak depo {city?.name}</span>
                <b>−{money(city?.cost ?? 0)}</b>
              </div>
              <div>
                <span>Hadiah misi perusahaan</span>
                <b>+Rp100 jt · +40 XP</b>
              </div>
              <div>
                <span>Kas setelah pendirian + hadiah</span>
                <b>{compact(state.cash - (city?.cost ?? 0) + 100_000_000)}</b>
              </div>
            </div>
            <p className="muted">
              Kontrak dibuat di stasiun hub pilihan Anda. Harga dibayarkan
              sekali saat konfirmasi. Setelah ini, lanjutkan misi untuk
              memperoleh modal operasional tambahan.
            </p>
            <div className="toolbar">
              <button onClick={() => setStage(1)}>
                <ArrowLeft size={14} /> Kembali
              </button>
              <button
                className="primary"
                disabled={!city || !hub || !ready}
                onClick={() => {
                  if (act({ type: "foundCompany", cityId, hubStationId: hub }))
                    onStarted();
                }}
              >
                Dirikan depo & mulai
              </button>
            </div>
          </>
        )}
        {!ready && (
          <p className="warning-text">
            Menunggu akses save. Jika tab lain sedang beroperasi, tutup tab
            tersebut terlebih dahulu.
          </p>
        )}
      </div>
    </section>
  );
}
