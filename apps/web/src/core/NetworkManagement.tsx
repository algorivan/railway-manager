import { useState } from "react";
import {
  CORE_GAME_CORRIDORS,
  CORE_ROUTING_TRACKS,
  CORE_SELECTABLE_STATIONS,
  CORE_REFUEL_STATION_CODES,
  operatingTrackAccessible,
  depotContractPrice,
  gameStationClassLabel,
} from "@railway/game-data";
import { stationName, type CoreState } from "@railway/simulation";
import { Card, compact, type Act } from "./presentation";
export function NetworkManagement({
  state: s,
  act,
  initialSegment,
}: {
  state: CoreState;
  act: Act;
  initialSegment?: string;
}) {
  const [tab, setTab] = useState("routes"),
    [track, setTrack] = useState(
      CORE_GAME_CORRIDORS.find(
        (c) =>
          c.id === initialSegment ||
          CORE_ROUTING_TRACKS.find(
            (t) => t.id === initialSegment,
          )?.accessKeys.includes(c.id),
      )?.id ?? CORE_GAME_CORRIDORS[0]!.id,
    ),
    [station, setStation] = useState(s.hub),
    [section, setSection] = useState(
      initialSegment ?? CORE_ROUTING_TRACKS[0]!.id,
    );
  const corridorSections = CORE_ROUTING_TRACKS.filter((t) =>
      t.accessKeys.includes(track),
    ),
    speedMin = Math.min(...corridorSections.map((t) => t.trackSpeedLimitKmh)),
    speedMax = Math.max(...corridorSections.map((t) => t.trackSpeedLimitKmh));
  const selectedStation = CORE_SELECTABLE_STATIONS.find(
    (st) => st.id === station,
  )!;
  const corridor = CORE_GAME_CORRIDORS.find((t) => t.id === track)!,
    depot = s.depots.find((d) => d.station === station);
  return (
    <div className="compact-workspace">
      <div className="workspace-tabs">
        <button
          className={tab === "routes" ? "active" : ""}
          onClick={() => setTab("routes")}
        >
          Koridor
        </button>
        <button
          className={tab === "stations" ? "active" : ""}
          onClick={() => setTab("stations")}
        >
          Stasiun & fasilitas
        </button>
      </div>
      {tab === "routes" ? (
        <Card title="Jaringan operasi">
          <label>
            Koridor
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              {CORE_GAME_CORRIDORS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <h2>
            {stationName(corridor.originStationId)} →{" "}
            {stationName(corridor.destinationStationId)}
          </h2>
          <p>
            ~{corridor.distanceKm} km · batas ruas{" "}
            {Number.isFinite(speedMin) ? speedMin : corridor.maxSpeedKmh}–
            {Number.isFinite(speedMax) ? speedMax : corridor.maxSpeedKmh} km/jam
          </p>
          <p className="muted">
            Posisi stasiun menggunakan OSM. Jalur dan jarak masih skema game.
          </p>
          {operatingTrackAccessible(
            { ...corridor, accessKeys: [corridor.id], schematic: true },
            s.access,
          ) ? (
            <span className="pill good">Hak akses tersedia</span>
          ) : (
            <button
              className="primary"
              onClick={() => act({ type: "access", segmentId: track })}
            >
              Buka koridor · Rp25 jt
            </button>
          )}
          <details>
            <summary>Buka satu bagian lintas</summary>
            <label>
              Bagian lintas
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {CORE_ROUTING_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => act({ type: "access", segmentId: section })}>
              Buka bagian · Rp25 jt
            </button>
          </details>
          <p>
            Ekspansi membutuhkan satu PP selesai dan sambungan dengan jaringan
            Anda.
          </p>
        </Card>
      ) : (
        <Card title="Fasilitas stasiun">
          <label>
            Stasiun
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
            >
              {CORE_SELECTABLE_STATIONS.filter((st) => st.connected).map(
                (st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <p>
            Kelas game:{" "}
            {gameStationClassLabel(selectedStation.gameClass ?? "small")} ·
            demand{" "}
            {selectedStation.demandProfile.baseDailyDemand.toLocaleString(
              "id-ID",
            )}
            /hari.
          </p>
          <p>
            Hub terdekat:{" "}
            {selectedStation.hubProximity?.nearestHubId
              ? stationName(selectedStation.hubProximity.nearestHubId)
              : "Tidak terhubung"}{" "}
            · {selectedStation.hubProximity?.distanceKm?.toFixed(1) ?? "—"} km ·
            faktor {selectedStation.hubProximity?.demandMultiplier.toFixed(2)}×
          </p>
          <p>
            {CORE_REFUEL_STATION_CODES.has(
              CORE_SELECTABLE_STATIONS.find((st) => st.id === station)!.code,
            )
              ? "Stasiun besar: pemasok fuel tersedia. Pengisian saat keberangkatan mengikuti pilihan pada jadwal."
              : "Isi fuel dari stok depo jika kontrak depo tersedia."}
          </p>
          <p className="muted">
            Daftar hub pengisian adalah aturan game, bukan klaim kelas stasiun
            resmi.
          </p>
          {depot ? (
            <span className="pill good">
              Kontrak depo tersedia · {depot.capacity.toLocaleString()} L
            </span>
          ) : (
            <button
              className="primary"
              onClick={() => act({ type: "depot", station })}
            >
              Kontrak depo · {compact(depotContractPrice(station))}
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
