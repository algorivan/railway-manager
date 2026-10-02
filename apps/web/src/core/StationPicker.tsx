import { useState } from "react";
import { CORE_SELECTABLE_STATIONS } from "@railway/game-data";
import { stationName } from "@railway/simulation";

export function StationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
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
              {stationName(s.id)} · {s.code}
              {!s.connected ? " · lintas belum terhubung" : ""}
            </option>
          ))}
        </select>
      </label>
      <small className="muted">
        {filtered.length} stasiun ditampilkan, termasuk pilihan saat ini. Stasiun tanpa koneksi rel tidak dapat
        dipilih; kelas resmi tidak diasumsikan dari ukuran marker.
      </small>
    </div>
  );
}
