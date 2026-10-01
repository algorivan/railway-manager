import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GameState } from '@railway/simulation';
import {
  JAVA_ALL_MAJOR_STATIONS,
  JAVA_REAL_TRACK_CORRIDORS,
  RealStation,
} from '../data/javaRailGeoData';
import {
  Plus,
  Minus,
  Crosshair,
  Sun,
  Moon,
  X,
  ShieldCheck,
  Navigation,
  Train,
} from 'lucide-react';

interface NetworkMapScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({ state, onDispatchSlot }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trainMarkersRef = useRef<Record<string, L.Marker>>({});

  const [selectedStation, setSelectedStation] = useState<RealStation | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'standard'>('dark');

  // Tile layer URLs
  const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const STANDARD_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Java Island: lat -7.3, lng 110.0, zoom 7
    const map = L.map(mapContainerRef.current, {
      center: [-7.3, 110.0],
      zoom: 7,
      minZoom: 6,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = mapTheme === 'dark' ? DARK_TILES : STANDARD_TILES;
    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Render Real Railway Track Corridors
    JAVA_REAL_TRACK_CORRIDORS.forEach((track) => {
      // Background glow line for active routes
      if (track.isActiveDefault) {
        L.polyline(track.path as [number, number][], {
          color: '#10B981',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      // Foreground sharp track line
      L.polyline(track.path as [number, number][], {
        color: track.isActiveDefault ? '#10B981' : '#475569',
        weight: track.isActiveDefault ? 3.5 : 2.5,
        opacity: track.isActiveDefault ? 0.95 : 0.65,
        dashArray: track.isActiveDefault ? undefined : '5, 5',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    });

    // Render All Major Stations Markers
    JAVA_ALL_MAJOR_STATIONS.forEach((station) => {
      const isHub = station.isHub;
      const markerHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center">
          ${isHub ? '<span class="absolute w-5 h-5 rounded-full bg-cyan-400 opacity-30 animate-ping -top-1"></span>' : ''}
          <div class="w-3.5 h-3.5 rounded-full ${isHub ? 'bg-cyan-400 border-2 border-slate-900 shadow-cyan-500/50' : 'bg-slate-300 border border-slate-900'} shadow-md"></div>
          <span class="mt-0.5 px-1 py-0.2 rounded bg-slate-900/90 text-[8px] font-mono font-bold text-slate-200 border border-slate-700 shadow pointer-events-none whitespace-nowrap">
            ${station.code}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'station-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 8],
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedStation(station);
        setSelectedRunId(null);
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map tile theme (Dark Carto vs Standard OSM)
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;
    const newUrl = mapTheme === 'dark' ? DARK_TILES : STANDARD_TILES;
    tileLayerRef.current.setUrl(newUrl);
  }, [mapTheme]);

  // Update animated in-transit trains positions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Track path for Gambir ([-6.1767, 106.8306]) -> Cikampek ([-6.4172, 107.4589]) -> Bandung ([-6.9142, 107.6025])
    const waypoints: [number, number][] = [
      [-6.1767, 106.8306], // Gambir
      [-6.2361, 106.9995], // Bekasi
      [-6.3059, 107.3006], // Karawang
      [-6.4172, 107.4589], // Cikampek
      [-6.5567, 107.4447], // Purwakarta
      [-6.8407, 107.4795], // Padalarang
      [-6.8856, 107.5364], // Cimahi
      [-6.9142, 107.6025], // Bandung
    ];

    state.activeServices.forEach((run, idx) => {
      // Calculate position along waypoints
      const progress = ((state.timestamp.minuteOfDay + idx * 40) % 160) / 160;
      const targetIdx = progress * (waypoints.length - 1);
      const floorIdx = Math.floor(targetIdx);
      const ceilIdx = Math.min(waypoints.length - 1, floorIdx + 1);
      const segmentFraction = targetIdx - floorIdx;

      const p1 = waypoints[floorIdx] ?? waypoints[0]!;
      const p2 = waypoints[ceilIdx] ?? waypoints[waypoints.length - 1]!;

      const lat = p1[0] + (p2[0] - p1[0]) * segmentFraction;
      const lng = p1[1] + (p2[1] - p1[1]) * segmentFraction;

      const trainHtml = `
        <div class="relative cursor-pointer flex flex-col items-center">
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 border-2 border-white shadow-lg shadow-orange-500/50 flex items-center justify-center text-xs animate-pulse">
            🚂
          </div>
          <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-900 text-[8.5px] font-mono font-black text-orange-400 border border-orange-500/40 shadow whitespace-nowrap">
            KA ${idx + 1}
          </span>
        </div>
      `;

      const trainIcon = L.divIcon({
        html: trainHtml,
        className: 'train-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (trainMarkersRef.current[run.id]) {
        trainMarkersRef.current[run.id]!.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { icon: trainIcon, zIndexOffset: 1000 }).addTo(map);
        marker.on('click', () => {
          setSelectedRunId(run.id);
          setSelectedStation(null);
        });
        trainMarkersRef.current[run.id] = marker;
      }
    });
  }, [state.activeServices, state.timestamp.minuteOfDay]);

  // Zoom helpers
  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();
  const resetJavaView = () => {
    mapInstanceRef.current?.flyTo([-7.3, 110.0], 7, { duration: 1 });
    setSelectedStation(null);
    setSelectedRunId(null);
  };

  const focusRegion = (region: 'WEST' | 'CENTRAL' | 'EAST') => {
    if (!mapInstanceRef.current) return;
    if (region === 'WEST') {
      mapInstanceRef.current.flyToBounds(
        [
          [-5.9, 106.0],
          [-7.4, 108.6],
        ],
        { duration: 1 }
      );
    } else if (region === 'CENTRAL') {
      mapInstanceRef.current.flyToBounds(
        [
          [-6.8, 108.5],
          [-8.0, 111.2],
        ],
        { duration: 1 }
      );
    } else {
      mapInstanceRef.current.flyToBounds(
        [
          [-7.0, 111.3],
          [-8.4, 114.5],
        ],
        { duration: 1 }
      );
    }
  };

  // Inspector Details
  const selectedRun = state.activeServices.find((s) => s.id === selectedRunId);
  const selectedSlot = selectedRun
    ? state.timetableSlots.find((slot) => slot.id === selectedRun.timetableSlotId)
    : null;
  const selectedRoute = selectedSlot
    ? (state.routes ?? []).find((r) => r.id === selectedSlot.routeId)
    : null;

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden select-none">
      {/* Fullscreen Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#020617] z-0" />

      {/* Top Map Floating HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* OpenStreetMap Badge */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#334155] shadow-xl flex items-center space-x-2 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono font-bold text-white tracking-wide">
            OPENSTREETMAP • LINTAS JAWA
          </span>
        </div>

        {/* Regional Quick Zoom Chips */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md p-1 rounded-full border border-[#334155] shadow-xl flex items-center space-x-1 pointer-events-auto text-[10px] font-mono">
          <button
            onClick={resetJavaView}
            className="px-2 py-0.5 rounded-full font-bold hover:bg-[#1E293B] text-slate-300 hover:text-white"
          >
            Semua
          </button>
          <button
            onClick={() => focusRegion('WEST')}
            className="px-2 py-0.5 rounded-full font-bold hover:bg-[#1E293B] text-slate-300 hover:text-white"
          >
            Barat
          </button>
          <button
            onClick={() => focusRegion('CENTRAL')}
            className="px-2 py-0.5 rounded-full font-bold hover:bg-[#1E293B] text-slate-300 hover:text-white"
          >
            Tengah
          </button>
          <button
            onClick={() => focusRegion('EAST')}
            className="px-2 py-0.5 rounded-full font-bold hover:bg-[#1E293B] text-slate-300 hover:text-white"
          >
            Timur
          </button>
        </div>
      </div>

      {/* Floating Zoom & Map Style Controls (Bottom-Left) */}
      <div className="absolute bottom-6 left-4 z-30 flex flex-col space-y-2 pointer-events-auto">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-9 h-9 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] text-white hover:bg-[#1E293B] flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-9 h-9 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] text-white hover:bg-[#1E293B] flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={resetJavaView}
          title="Reset Tampilan Jawa"
          className="w-9 h-9 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] text-[#0EA5E9] hover:bg-[#1E293B] flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMapTheme((t) => (t === 'dark' ? 'standard' : 'dark'))}
          title={mapTheme === 'dark' ? 'Ganti Mode Peta Terang' : 'Ganti Mode Peta Gelap'}
          className="w-9 h-9 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] text-amber-400 hover:bg-[#1E293B] flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          {mapTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* --- STATION INSPECTOR BOTTOM SHEET --- */}
      {selectedStation && (
        <div className="absolute bottom-6 left-4 right-20 z-30 max-w-sm bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-cyan-500/50 shadow-2xl p-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-base shadow">
                🏛️
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-white font-mono">
                    {selectedStation.name}
                  </h3>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#1E293B] text-cyan-400 border border-cyan-500/30">
                    {selectedStation.code}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {selectedStation.city} • {selectedStation.daop}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedStation(null)}
              className="w-7 h-7 rounded-full bg-[#1E293B] hover:bg-[#334155] flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs font-mono">
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Elevasi</span>
              <span className="font-bold text-white">+{selectedStation.elevationMeters} mdpl</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Koordinat GPS</span>
              <span className="font-bold text-cyan-400 text-[10px]">
                {selectedStation.lat.toFixed(2)}, {selectedStation.lng.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10.5px] text-slate-300 bg-[#1E293B]/70 p-2 rounded-xl border border-[#334155]/40">
            <strong>Fasilitas:</strong> {selectedStation.facilities}
          </div>
        </div>
      )}

      {/* --- TRAIN RUN TELEMETRY BOTTOM SHEET --- */}
      {selectedRun && (
        <div className="absolute bottom-6 left-4 right-20 z-30 max-w-sm bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-orange-500/50 shadow-2xl p-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F97316] to-[#EA580C] flex items-center justify-center text-base shadow border border-orange-300/30">
                🚂
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono">
                  {selectedSlot?.id ?? 'KA-PARAHYANGAN'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {selectedRoute?.name ?? 'Gambir - Bandung'} • Lintas Real Pantura & Priangan
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedRunId(null)}
              className="w-7 h-7 rounded-full bg-[#1E293B] hover:bg-[#334155] flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2.5 text-xs font-mono text-center">
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Status</span>
              <span className="font-bold text-emerald-400">{selectedRun.status}</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Penumpang</span>
              <span className="font-bold text-[#0EA5E9]">{selectedRun.totalPassengers} Pax</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Keterlambatan</span>
              <span className="font-bold text-slate-300">
                {selectedRun.delayMinutes === 0 ? 'Tepat Waktu' : `+${selectedRun.delayMinutes}m`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
