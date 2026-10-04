import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  gameStationClassLabel,
  CORE_SELECTABLE_STATIONS as stations,
  CORE_ROUTING_TRACKS as tracks,
  CORE_NETWORK_SOURCE,
  JAVA_STATION_CATALOG,
  operatingTrackAccessible,
  operatingTrackGeometry,
  type RailPoint,
} from "@railway/game-data";
import {
  type CoreState,
  stationName,
  coreRunMotion,
  coreFormation,
  coreProduct,
} from "@railway/simulation";

import { railConsistLayout, travelledRail } from "./rail-consist";

export function CoreMap({
  state,
  picking,
  onPick,
  onTrainDetails,
}: {
  state: CoreState;
  picking?: "origin" | "destination";
  onPick: (station: string) => void;
  onTrainDetails: (trainsetId: string) => void;
}) {
  const pickRef = useRef(onPick),
    pickingRef = useRef(picking),
    stateRef = useRef(state),
    detailsRef = useRef(onTrainDetails);
  pickRef.current = onPick;
  pickingRef.current = picking;
  stateRef.current = state;
  detailsRef.current = onTrainDetails;
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const railLayer = useRef<L.LayerGroup | null>(null);
  const trainLayer = useRef<L.LayerGroup | null>(null);
  const stationMarkers = useRef<{ id: string; marker: L.CircleMarker }[]>([]);
  const [following, setFollowing] = useState<string | null>(null);
  const followingRef = useRef(following);
  followingRef.current = following;
  const trainMarkers = useRef(
    new Map<
      string,
      {
        marker: L.Marker;
        size: string;
        tooltip: HTMLElement;
        popup: HTMLElement;
      }
    >(),
  );
  const [serviceId, setServiceId] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [mapPopupOpen, setMapPopupOpen] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);
  const selected = state.services.find((s) => s.id === serviceId);
  const accessKey = state.access.join("|");
  const routeKey = JSON.stringify(selected ?? null);
  const selectedStopsRef = useRef(new Set<string>());
  selectedStopsRef.current = new Set(
    selected?.stops ?? selected?.stations ?? [],
  );
  const hubRef = useRef(state.hub);
  hubRef.current = state.hub;
  useEffect(() => {
    if (!element.current) return;
    const hub = stations.find((s) => s.id === state.hub)!;
    const m = L.map(element.current, {
      zoomControl: false,
      preferCanvas: false,
    }).setView([hub.coordinates.lat, hub.coordinates.lng], 8);
    map.current = m;
    m.on("popupopen", () => setMapPopupOpen(true));
    m.on("popupclose", () => setMapPopupOpen(false));
    L.control.zoom({ position: "topright" }).addTo(m);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · ODbL',
        maxZoom: 18,
      },
    ).addTo(m);
    tiles.on("loading", () => setTilesLoading(true));
    tiles.on("load", () => setTilesLoading(false));
    tiles.on("tileerror", () => {
      setTilesFailed(true);
      setTilesLoading(false);
    });
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
      trainMarkers.current.clear();
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
      tip.textContent = `${stationName(edge.originStationId)} — ${stationName(edge.destinationStationId)} · ${edge.distanceKm.toFixed(1)} km · ${edge.trackSpeedLimitKmh} km/j · ${edge.schematic ? "Skema" : "Geometri OSM"}`;
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
      const title = document.createElement("b");
      title.textContent = `${stationName(station.id)} (${station.code})`;
      const metrics = document.createElement("div");
      metrics.className = "station-map-metrics";
      const metricsText = () => {
        const current = stateRef.current;
        const contracts = (current.cargoContracts ?? []).filter(
          (c) =>
            c.status === "active" &&
            current.services.find((r) => r.id === c.serviceId)?.stations[0] ===
              station.id,
        );
        const trips = contracts.reduce(
          (n, c) => n + Math.max(0, c.target - c.delivered),
          0,
        );
        const cargo = contracts.reduce((n, c) => {
          const trainIds = current.plans
            .filter((p) => p.active && p.serviceId === c.serviceId)
            .map((p) => p.trainsetId);
          const capacity = Math.max(
            80,
            ...current.trainsets
              .filter((t) => trainIds.includes(t.id))
              .map((t) => coreFormation(current, t).cargoTons),
          );
          return n + Math.max(0, c.target - c.delivered) * capacity;
        }, 0);
        return `Penumpang: ${station.demandProfile.baseDailyDemand.toLocaleString("id-ID")}/hari (potensi game)\nKargo: ${trips} pengiriman · ≈${cargo.toLocaleString("id-ID")} t (kontrak aktif)\nKelas: ${gameStationClassLabel(station.gameClass ?? "small")}`;
      };
      metrics.textContent = metricsText();
      const choose = document.createElement("button");
      choose.className = "map-select-station";
      const updateChoice = () => {
        metrics.textContent = metricsText();
        choose.hidden = !pickingRef.current;
        choose.disabled = !station.connected;
        choose.textContent = !station.connected
          ? "Lintas belum terhubung"
          : pickingRef.current === "origin"
            ? "Pilih sebagai stasiun awal"
            : "Pilih sebagai stasiun akhir";
      };
      details.append(title, metrics, choose);
      updateChoice();
      const marker = L.circleMarker(
        [station.coordinates.lat, station.coordinates.lng],
        {
          radius:
            station.id === state.hub
              ? 9
              : station.gameClass === "large"
                ? 8
                : station.gameClass === "semi-large"
                  ? 6
                  : stop
                    ? 5
                    : 3,
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
        .bindPopup(details, {
          autoPanPaddingTopLeft: L.point(20, 120),
          autoPanPaddingBottomRight: L.point(80, 60),
        })
        .addTo(group);
      choose.addEventListener("click", () => {
        if (!station.connected || !pickingRef.current) return;
        marker.closePopup();
        pickRef.current(station.id);
      });
      marker.on("popupopen", () => {
        updateChoice();
        const popup = marker.getPopup();
        if (popup) {
          popup.options.autoPanPaddingBottomRight = L.point(
            pickingRef.current && window.innerWidth > 700
              ? window.innerWidth / 2 + 25
              : 80,
            pickingRef.current && window.innerWidth <= 700 ? 270 : 60,
          );
          popup.update();
        }
      });
      const zoom = document.createElement("button");
      zoom.textContent = "Perbesar area";
      zoom.className = "map-zoom-station";
      zoom.addEventListener("click", () => {
        marker.closePopup();
        map.current?.setView(
          [station.coordinates.lat, station.coordinates.lng],
          12,
        );
        if (pickingRef.current && window.innerWidth > 700)
          map.current?.panBy([window.innerWidth / 4, 0], { animate: false });
      });
      details.append(zoom);
      marker.on("mouseover", () => {
        const hover = document.createElement("span");
        hover.style.whiteSpace = "pre-line";
        hover.textContent = `${stationName(station.id)} (${station.code})\n${metricsText()}`;
        marker.setTooltipContent(hover).openTooltip();
      });
      marker.on("mouseout", () => marker.setTooltipContent(tip));
      const node = marker.getElement();
      if (node) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
        node.setAttribute(
          "aria-label",
          `Stasiun ${stationName(station.id)} ${station.code}`,
        );
        node.addEventListener("keydown", (event) => {
          if (
            (event as KeyboardEvent).key === "Enter" ||
            (event as KeyboardEvent).key === " "
          ) {
            event.preventDefault();
            marker.openPopup();
          }
        });
      }
      if (
        (map.current?.getZoom() ?? 0) < 10 &&
        station.id !== state.hub &&
        !stop &&
        !JAVA_STATION_CATALOG.some((s) => s.id === station.id)
      )
        marker.closeTooltip();
      stationMarkers.current.push({ id: station.id, marker });
    }
    // Keep the hub reachable when nearby points overlap in the overview.
    stationMarkers.current
      .find((entry) => entry.id === state.hub)
      ?.marker.bringToFront();
  }, [accessKey, state.hub, routeKey]);
  useEffect(() => {
    const group = trainLayer.current,
      m = map.current;
    if (!group || !m) return;
    const render = () => {
      const active = new Set<string>();
      let followed = false;
      for (const run of state.runs.filter((r) => r.status === "running")) {
        const leg = run.legs[run.leg];
        if (!leg) continue;
        const movement = coreRunMotion(run, state.minute),
          points = operatingTrackGeometry(leg.segmentId, leg.from);
        if (!points.length) continue;
        const train = state.trainsets.find((t) => t.id === run.trainsetId);
        // The run's actual unit snapshot also covers cargo and recall journeys.
        const products = run.unitIds.flatMap((id) => {
          const unit = state.units.find((u) => u.id === id);
          return unit ? [coreProduct(unit.productId)] : [];
        });
        // Render the locomotive at the head even for older saves with unordered units.
        const ordered = [
          ...products.filter((p) => p.kind === "loco"),
          ...products.filter((p) => p.kind !== "loco"),
        ];
        const trail: RailPoint[] = run.legs
          .slice(0, run.leg)
          .flatMap((l) => operatingTrackGeometry(l.segmentId, l.from));
        trail.push(...travelledRail(points, movement.fraction));
        const pixels = trail.map((p) => m.latLngToLayerPoint(p));
        const a = m.latLngToLayerPoint(points[0]!),
          b = m.latLngToLayerPoint(points[1] ?? points[0]!);
        const scale = Math.min(
          1.35,
          Math.max(0.65, 0.65 + (m.getZoom() - 8) * 0.12),
        );
        const layout = railConsistLayout(
          pixels,
          ordered.map((p) => p.length),
          scale,
          { x: b.x - a.x, y: b.y - a.y },
        );
        ordered.forEach((product, index) => {
          const position = layout[index]!;
          const key = `${run.id}:${index}`,
            size = `${position.width}:${scale}`;
          active.add(key);
          const label = `${train?.name ?? run.name} · ${ordered.length} unit · ${products.reduce((sum, p) => sum + p.length, 0).toFixed(1)} m · ${run.phase === "dwell" ? "Berhenti" : `${movement.speedKmh.toFixed(0)} km/j`} · ${stationName(run.origin)} → ${stationName(run.destination)}`;
          const location = m.layerPointToLatLng(
            L.point(position.x, position.y),
          );
          let entry = trainMarkers.current.get(key);
          const icon = () => {
            const art = document.createElement("img");
            art.src = `/vehicles/${product.asset}.${product.kind === "cargo" ? "svg" : "webp"}`;
            art.alt = product.name;
            art.className = "map-consist-unit";
            art.draggable = false;
            art.style.width = `${position.width}px`;
            art.style.height = `${Math.max(10, 14 * scale)}px`;
            return L.divIcon({
              className: `core-consist-marker ${product.kind === "loco" ? "locomotive" : ""}`,
              html: art,
              iconSize: [position.width, Math.max(10, 14 * scale)],
              iconAnchor: [position.width / 2, Math.max(10, 14 * scale) / 2],
            });
          };
          if (!entry) {
            const content = () => {
              const root = document.createElement("div"),
                summary = document.createElement("b"),
                details = document.createElement("button");
              root.className = "train-map-summary";
              summary.className = "train-map-label";
              details.textContent = "Detail perjalanan";
              details.className = "map-train-details";
              details.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                detailsRef.current(run.trainsetId);
                m.closePopup();
              });
              root.append(summary, details);
              return root;
            };
            const tooltip = content(),
              popup = content();
            const marker = L.marker(location, {
              icon: icon(),
              keyboard: true,
              title: `${train?.name ?? run.name}: unit ${index + 1} dari ${ordered.length}`,
            })
              .bindTooltip(tooltip, {
                interactive: true,
                direction: "top",
                className: "train-map-tooltip",
              })
              .bindPopup(popup, { autoPan: false });
            marker.on("click", () => {
              if (pickingRef.current) return;
              followingRef.current = run.trainsetId;
              setFollowing(run.trainsetId);
              const current = stateRef.current,
                activeRun = current.runs.find(
                  (r) =>
                    r.trainsetId === run.trainsetId && r.status === "running",
                );
              const activeLeg = activeRun?.legs[activeRun.leg];
              if (activeRun && activeLeg) {
                const line = operatingTrackGeometry(
                    activeLeg.segmentId,
                    activeLeg.from,
                  ),
                  head = travelledRail(
                    line,
                    coreRunMotion(activeRun, current.minute).fraction,
                  ).at(-1);
                if (head)
                  m.setView(head, Math.max(11, m.getZoom()), {
                    animate: false,
                  });
              }
              marker.openPopup();
            });
            marker.addTo(group);
            entry = { marker, size, tooltip, popup };
            trainMarkers.current.set(key, entry);
          } else {
            entry.marker.setLatLng(location);
            if (entry.size !== size) {
              entry.marker.setIcon(icon());
              entry.size = size;
            }
          }
          for (const root of [entry.tooltip, entry.popup])
            root.querySelector<HTMLElement>(".train-map-label")!.textContent =
              label;
          const art = entry.marker
            .getElement()
            ?.querySelector<HTMLImageElement>("img");
          if (art)
            art.style.transform = `rotate(${position.angle}deg) scaleY(${Math.cos((position.angle * Math.PI) / 180) < 0 ? -1 : 1})`;
          if (index === 0 && followingRef.current === run.trainsetId) {
            followed = true;
            m.panTo(location, { animate: false });
          }
        });
      }
      for (const [key, entry] of trainMarkers.current)
        if (!active.has(key)) {
          group.removeLayer(entry.marker);
          trainMarkers.current.delete(key);
        }
      if (followingRef.current && !followed) {
        followingRef.current = null;
        setFollowing(null);
      }
    };
    render();
    m.on("zoomend", render);
    return () => {
      m.off("zoomend", render);
    };
  }, [state.minute, state.runs, state.units, state.trainsets]);
  useEffect(() => {
    if (following) map.current?.dragging.disable();
    else map.current?.dragging.enable();
    return () => {
      map.current?.dragging.enable();
    };
  }, [following]);
  useEffect(() => {
    if (!picking || !map.current) return;
    setFollowing(null);
    followingRef.current = null;
    map.current.closePopup();
    const points = stations
      .filter((s) => s.connected)
      .map((s): [number, number] => [s.coordinates.lat, s.coordinates.lng]);
    const desktop = window.innerWidth > 700;
    map.current.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [30, desktop ? 120 : 90],
      paddingBottomRight: [
        desktop ? window.innerWidth / 2 + 30 : 70,
        desktop ? 70 : 250,
      ],
      maxZoom: 9,
    });
  }, [!!picking]);
  const focusStation = (id: string) => {
    const station = stations.find((s) => s.id === id);
    if (!station || !map.current) return;
    map.current.setView(
      [station.coordinates.lat, station.coordinates.lng],
      12,
      { animate: false },
    );
    map.current.panBy(
      [
        window.innerWidth > 700 ? window.innerWidth / 4 : 0,
        window.innerWidth > 700 ? 0 : 80,
      ],
      { animate: false },
    );
    stationMarkers.current
      .find((entry) => entry.id === id)
      ?.marker.bringToFront();
    setMapQuery("");
  };
  const focus = () => {
    followingRef.current = null;
    setFollowing(null);
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
      {picking && (
        <section
          hidden={mapPopupOpen}
          className="map-selection-tools"
          aria-label="Cari lokasi stasiun"
        >
          <label>
            Cari lokasi di peta
            <input
              type="search"
              aria-label="Cari stasiun di peta"
              placeholder="Nama atau kode stasiun"
              value={mapQuery}
              onChange={(e) => setMapQuery(e.target.value)}
            />
          </label>
          {mapQuery && (
            <div className="map-search-results detail-scroll">
              {stations
                .filter((s) =>
                  `${s.name} ${s.code}`
                    .toLowerCase()
                    .includes(mapQuery.toLowerCase()),
                )
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => focusStation(s.id)}
                    aria-label={`Fokus ${stationName(s.id)} (${s.code})`}
                  >
                    {stationName(s.id)} · {s.code}
                  </button>
                ))}
            </div>
          )}
        </section>
      )}
      {following && !picking && (
        <div className="camera-follow" role="status">
          <b>
            Mengikuti{" "}
            {state.trainsets.find((t) => t.id === following)?.name ?? "kereta"}
          </b>
          <button
            onClick={() => {
              followingRef.current = null;
              setFollowing(null);
              map.current?.closePopup();
            }}
          >
            Lepas kamera
          </button>
        </div>
      )}
      <section
        hidden={!!picking}
        className="map-tools"
        aria-label="Kontrol peta"
      >
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
        {tilesLoading && !tilesFailed && (
          <small role="status">Memuat peta dasar…</small>
        )}
        {tilesFailed && (
          <small className="warning-text">
            Peta dasar gagal dimuat. Jalur dan operasi tetap tersedia.
          </small>
        )}
      </section>
    </div>
  );
}
