import { useState } from "react";
import {
  CORE_SELECTABLE_STATIONS,
  gameStationClassLabel,
} from "@railway/game-data";
import { stationName } from "@railway/simulation";

export function StationPicker({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = CORE_SELECTABLE_STATIONS.find(
    (station) => station.id === value,
  );
  const factors = selected?.demandContext?.factors;
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const filtered = CORE_SELECTABLE_STATIONS.filter(
    (s) =>
      s.id === value ||
      `${s.name} ${s.code} ${s.province ?? ""}`
        .toLocaleLowerCase("id")
        .includes(query.toLocaleLowerCase("id")),
  );
  return (
    <div className="station-picker">
      <label>
        {label}
        <input
          type="search"
          aria-label={`Cari ${label.toLowerCase()}`}
          placeholder="Cari nama, kode atau provinsi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label className="station-select-label">
        Pilih {label.toLowerCase()}
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {filtered.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.connected}>
              {stationName(s.id)} · {s.code} ·{" "}
              {gameStationClassLabel(s.gameClass ?? "small")}
              {!s.connected ? " · lintas belum terhubung" : ""}
            </option>
          ))}
        </select>
      </label>
      {!compact && selected && factors && (
        <details className="station-demand-details">
          <summary>
            Potensi {selected.code}:{" "}
            {selected.demandProfile.baseDailyDemand.toLocaleString("id-ID")}
            /hari · estimasi game
          </summary>
          <p>
            Potensi catchment stasiun sebelum pangsa operator, tarif, jam
            berangkat, reputasi dan batas kursi. Ini bukan jumlah tiket terjual
            atau data penumpang resmi.
          </p>
          <dl className="demand-factor-grid">
            <dt>Kelas game</dt>
            <dd>{gameStationClassLabel(selected.gameClass ?? "small")}</dd>
            <dt>Jarak rel ke hub besar</dt>
            <dd>
              {selected.hubProximity?.distanceKm == null
                ? "Tidak terhubung"
                : `${selected.hubProximity.distanceKm.toFixed(1)} km`}
            </dd>
            <dt>Pengali kedekatan hub</dt>
            <dd>{selected.hubProximity?.demandMultiplier.toFixed(2)}×</dd>
            <dt>Perkembangan kawasan</dt>
            <dd>{percent(factors.urbanDevelopment)}</dd>
            <dt>Aktivitas kerja</dt>
            <dd>{percent(factors.employment)}</dd>
            <dt>Pendidikan</dt>
            <dd>{percent(factors.education)}</dd>
            <dt>Wisata</dt>
            <dd>{percent(factors.tourism)}</dd>
            <dt>Transit / simpul</dt>
            <dd>{percent(factors.interchange)}</dd>
            <dt>Daya tarik kereta</dt>
            <dd>{factors.railPreference.toFixed(2)}×</dd>
            <dt>Porsi catchment stasiun</dt>
            <dd>{percent(factors.stationCapture)}</dd>
            <dt>IPM resmi</dt>
            <dd>
              {factors.humanDevelopment
                ? `${factors.humanDevelopment.value} (${factors.humanDevelopment.year})`
                : "Belum dimuat · faktor netral 1×"}
            </dd>
          </dl>
          <p>
            Faktor kawasan adalah parameter balance sementara. IPM dapat
            ditambahkan dari BPS dengan wilayah, tahun dan sumber; pengaruhnya
            dibatasi ±10%. Kerja/pendidikan menguatkan jam sibuk, wisata
            menguatkan perjalanan siang.
          </p>
        </details>
      )}
      {!compact && (
        <small className="muted">
          {filtered.length} stasiun ditampilkan, termasuk pilihan saat ini.
          Stasiun tanpa koneksi rel tidak dapat dipilih; kelas resmi tidak
          diasumsikan dari ukuran marker.
        </small>
      )}
    </div>
  );
}
