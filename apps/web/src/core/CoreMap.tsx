import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  CORE_SELECTABLE_STATIONS as stations,
  CORE_ROUTING_TRACKS as tracks,
  CORE_NETWORK_SOURCE,
  JAVA_STATION_CATALOG,
  operatingTrackAccessible,
  operatingTrackGeometry,
  pointAlongRail,
} from "@railway/game-data";
import {
  type CoreState,
  stationName,
  coreRunMotion,
} from "@railway/simulation";

export function CoreMap({ state }: { state: CoreState }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const railLayer = useRef<L.LayerGroup | null>(null);
  const trainLayer = useRef<L.LayerGroup | null>(null);
  const stationMarkers = useRef<{ id: string; marker: L.CircleMarker }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [tilesFailed, setTilesFailed] = useState(false);
  const selected = state.services.find((s) => s.id === serviceId);
  const accessKey = state.access.join("|");
  const routeKey = JSON.stringify(selected ?? null);
  const selectedStopsRef = useRef(new Set<string>());
  selectedStopsRef.current = new Set(selected?.stops ?? selected?.stations ?? []);
  const hubRef = useRef(state.hub);
  hubRef.current = state.hub;
  useEffect(() => {
    if (!element.current) return;
    const hub = stations.find((s) => s.id === state.hub)!;
    const m = L.map(element.current, {
      zoomControl: false,
      preferCanvas: true,
    }).setView([hub.coordinates.lat, hub.coordinates.lng], 8);
    map.current = m;
    L.control.zoom({ position: "topright" }).addTo(m);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · ODbL',
        maxZoom: 18,
      },
    ).addTo(m);
    tiles.on("tileerror", () => setTilesFailed(true));
    railLayer.current = L.layerGroup().addTo(m);
    trainLayer.current = L.layerGroup().addTo(m);
    const labels = () => {
      for (const { id, marker } of stationMarkers.current) {
        if (
          m.getZoom() >= 10 ||
          id === hubRef.current ||
          selectedStopsRef.current.has(id) ||
          JAVA_STATION_CATALOG.some((s) => s.id === id)
        )
          marker.openTooltip();
        else marker.closeTooltip();
      }
    };
    m.on("zoomend", labels);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      railLayer.current = null;
      trainLayer.current = null;
      stationMarkers.current = [];
    };
  }, []);
  useEffect(() => {
    const group = railLayer.current;
    if (!group) return;
    group.clearLayers();
    const highlighted = new Set(selected?.segments ?? []);
    for (const edge of tracks) {
      const open = operatingTrackAccessible(edge, state.access);
      const onRoute =
        highlighted.has(edge.id) ||
        edge.accessKeys.some((id) => highlighted.has(id));
      const points = operatingTrackGeometry(edge.id);
      const tip = document.createElement("span");
      tip.textContent = `${stationName(edge.originStationId)} — ${stationName(edge.destinationStationId)} · ${edge.distanceKm.toFixed(1)} km · ${edge.schematic ? "Skema" : "Geometri OSM"}`;
      L.polyline(points, {
        color: onRoute ? "#2563eb" : open ? "#e86b2c" : "#738797",
        weight: onRoute ? 6 : open ? 4 : 2,
        opacity: onRoute || open ? 0.95 : 0.55,
        dashArray: edge.schematic || !open ? "6 6" : undefined,
      })
        .bindTooltip(tip)
        .addTo(group);
    }
    stationMarkers.current = [];
    for (const station of stations) {
      const stop = (selected?.stops ?? selected?.stations ?? []).includes(
        station.id,
      );
      const tip = document.createElement("span");
      tip.textContent = stationName(station.id);
      const details = document.createElement("div");
      details.textContent = `${stationName(station.id)} (${station.code}) · ${station.connected ? "Terhubung" : "Belum terhubung ke jalur kompatibel"} · kelas ${station.stationClass ?? "belum terverifikasi"}`;
      const marker = L.circleMarker(
        [station.coordinates.lat, station.coordinates.lng],
        {
          radius: station.id === state.hub ? 8 : stop ? 6 : 4,
          color: "#fff",
          weight: 2,
          fillColor: stop
            ? "#2563eb"
            : station.id === state.hub
              ? "#f97316"
              : station.connected
                ? "#123b53"
                : "#909ba3",
          fillOpacity: 1,
        },
      )
        .bindTooltip(tip, {
          permanent: true,
          direction: "top",
          className: "core-map-label",
        })
        .bindPopup(details)
        .addTo(group);
      if (
        (map.current?.getZoom() ?? 0) < 10 &&
        station.id !== state.hub &&
        !stop &&
        !JAVA_STATION_CATALOG.some((s) => s.id === station.id)
      )
        marker.closeTooltip();
      stationMarkers.current.push({ id: station.id, marker });
    }
  }, [accessKey, state.hub, routeKey]);
  useEffect(() => {
    const group = trainLayer.current;
    if (!group) return;
    group.clearLayers();
    for (const run of state.runs.filter((r) => r.status === "running")) {
      const leg = run.legs[run.leg];
      if (!leg) continue;
      const movement = coreRunMotion(run, state.minute);
      const fraction = movement.fraction;
      const points = operatingTrackGeometry(leg.segmentId, leg.from);
      if (!points.length) continue;
      const tooltip = document.createElement("span");
      tooltip.textContent = `${run.name} · ${run.phase === "dwell" ? "Berhenti" : `${movement.speedKmh.toFixed(0)} km/h · ${movement.phase}`}`;
      L.marker(pointAlongRail(points, fraction), {
        icon: L.divIcon({
          className: "core-train-marker",
          html: "🚆",
          iconSize: [32, 32],
        }),
      })
        .bindTooltip(tooltip)
        .addTo(group);
    }
  }, [state.minute, state.runs]);
  const focus = () => {
    const points = selected
      ? selected.segments.flatMap((id) => operatingTrackGeometry(id))
      : stations
          .filter((s) => s.connected)
          .map((s): [number, number] => [s.coordinates.lat, s.coordinates.lng]);
    if (points.length)
      map.current?.fitBounds(L.latLngBounds(points), {
        padding: [45, 45],
        maxZoom: 11,
      });
  };
  return (
    <div className="core-map">
      <div
        className="rail-map-canvas"
        ref={element}
        aria-label="Peta interaktif operasi kereta Indonesia"
      />
      <section className="map-tools" aria-label="Kontrol peta">
        <label>
          Relasi di peta
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Seluruh jaringan</option>
            {state.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={focus}>
          {selected ? "Fokus relasi" : "Lihat seluruh jaringan"}
        </button>
        <p>
          <span className="legend-line" /> Lintas terbuka{" "}
          <span className="legend-line selected" /> Relasi dipilih
        </p>
        <small>
          {CORE_NETWORK_SOURCE.importedAt
            ? "Geometri OSM · batas operasi belum terverifikasi"
            : `Posisi stasiun OSM · ${CORE_NETWORK_SOURCE.intermediateStationCount} stasiun antara · jalur skematis`}
        </small>
        {tilesFailed && (
          <small className="warning-text">
            Peta dasar gagal dimuat. Jalur dan operasi tetap tersedia.
          </small>
        )}
      </section>
    </div>
  );
}
