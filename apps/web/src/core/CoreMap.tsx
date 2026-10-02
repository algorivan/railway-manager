import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  JAVA_STATION_CATALOG as stations,
  JAVA_TRACK_CORRIDOR_SEGMENTS as tracks,
} from "@railway/game-data";
import { CoreState, stationName } from "@railway/simulation";

export function CoreMap({ state }: { state: CoreState }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!element.current) return;
    const m = L.map(element.current, { zoomControl: false }).setView(
      [-7.0, 109.8],
      7,
    );
    map.current = m;
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    for (const edge of tracks) {
      const a = stations.find((x) => x.id === edge.originStationId)!;
      const b = stations.find((x) => x.id === edge.destinationStationId)!;
      L.polyline(
        [
          [a.coordinates.lat, a.coordinates.lng],
          [b.coordinates.lat, b.coordinates.lng],
        ],
        {
          color: state.access.includes(edge.id) ? "#fb923c" : "#698399",
          weight: state.access.includes(edge.id) ? 4 : 2,
          dashArray: state.access.includes(edge.id) ? undefined : "5 8",
        },
      )
        .bindTooltip(
          `${stationName(a.id)} — ${stationName(b.id)} · ${edge.distanceKm} km`,
        )
        .addTo(group);
    }
    for (const st of stations) {
      L.circleMarker([st.coordinates.lat, st.coordinates.lng], {
        radius: st.id === state.hub ? 9 : 5,
        color: "#fff",
        weight: 2,
        fillColor: st.id === state.hub ? "#f97316" : "#123b53",
        fillOpacity: 1,
      })
        .bindTooltip(stationName(st.id), {
          permanent: true,
          direction: "top",
          className: "core-map-label",
        })
        .addTo(group);
    }
    for (const run of state.runs.filter((r) => r.status === "running")) {
      const leg = run.legs[run.leg]!;
      const a = stations.find((x) => x.id === leg.from)!.coordinates;
      const b = stations.find((x) => x.id === leg.to)!.coordinates;
      const fraction =
        run.phase === "dwell"
          ? 0
          : Math.max(
              0,
              Math.min(1, 1 - (run.nextEvent - state.minute) / leg.minutes),
            );
      const tooltip = document.createElement("span");
      tooltip.textContent = `${run.name} · ${run.phase === "dwell" ? "Berhenti" : `${leg.speed} km/h`}`;
      L.marker(
        [
          a.lat + (b.lat - a.lat) * fraction,
          a.lng + (b.lng - a.lng) * fraction,
        ],
        {
          icon: L.divIcon({
            className: "core-train-marker",
            html: "🚆",
            iconSize: [32, 32],
          }),
        },
      )
        .bindTooltip(tooltip)
        .addTo(group);
    }
  }, [state.minute, state.runs, state.access, state.hub]);
  return (
    <div
      className="core-map"
      ref={element}
      aria-label="Peta koridor operasi Jawa"
    />
  );
}
