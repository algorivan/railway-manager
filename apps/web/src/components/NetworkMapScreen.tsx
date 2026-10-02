import React, { useEffect, useRef, useState } from 'react';
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
  X,
  ShieldCheck,
  Train,
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface NetworkMapScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({ state, onDispatchSlot }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainMarkersRef = useRef<Record<string, L.Marker>>({});

  const [selectedStation, setSelectedStation] = useState<RealStation | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Initialize Leaflet Map with Standard OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Java Island: lat -7.3, lng 110.0, zoom 7
    const map = L.map(mapContainerRef.current, {
      center: [-7.3, 110.0],
      zoom: 7,
      minZoom: 6,
      maxZoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Standard OpenStreetMap Tiles (Clean Light Theme)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Render Real Railway Track Corridors (Clean railway track lines, no neon glows)
    JAVA_REAL_TRACK_CORRIDORS.forEach((track) => {
      L.polyline(track.path as [number, number][], {
        color: track.isActiveDefault ? '#1D4ED8' : '#64748B',
        weight: track.isActiveDefault ? 3.5 : 2,
        opacity: track.isActiveDefault ? 0.9 : 0.6,
        dashArray: track.isActiveDefault ? undefined : '4, 4',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    });

    // Render All Major Stations Markers with clean badges
    JAVA_ALL_MAJOR_STATIONS.forEach((station) => {
      const isHub = station.isHub;
      const markerHtml = `
        <div class="cursor-pointer flex flex-col items-center">
          <div class="w-3 h-3 rounded-full ${isHub ? 'bg-blue-600 border-2 border-white ring-1 ring-blue-700' : 'bg-slate-500 border border-white'} shadow-xs"></div>
          <span class="mt-0.5 px-1 py-0.2 rounded bg-white/95 text-[8px] font-mono font-bold ${isHub ? 'text-blue-900 border border-blue-200' : 'text-slate-700 border border-slate-200'} shadow-xs pointer-events-none whitespace-nowrap">
            ${station.code}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'station-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 6],
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        soundEffects.playClickSound();
        setSelectedStation(station);
        setSelectedRunId(null);
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update animated in-transit trains positions (clean standard avatar)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Real waypoints: Gambir -> Cikampek -> Bandung
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
        <div class="cursor-pointer flex flex-col items-center">
          <div class="w-6 h-6 rounded-full bg-orange-600 border-2 border-white shadow-md flex items-center justify-center text-[11px] text-white">
            🚂
          </div>
          <span class="mt-0.5 px-1.5 py-0.2 rounded bg-white text-[8px] font-mono font-bold text-orange-700 border border-orange-300 shadow-xs whitespace-nowrap">
            KA ${idx + 1}
          </span>
        </div>
      `;

      const trainIcon = L.divIcon({
        html: trainHtml,
        className: 'train-div-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (trainMarkersRef.current[run.id]) {
        trainMarkersRef.current[run.id]!.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { icon: trainIcon, zIndexOffset: 1000 }).addTo(map);
        marker.on('click', () => {
          soundEffects.playClickSound();
          setSelectedRunId(run.id);
          setSelectedStation(null);
        });
        trainMarkersRef.current[run.id] = marker;
      }
    });
  }, [state.activeServices, state.timestamp.minuteOfDay]);

  // Zoom helpers
  const zoomIn = () => {
    soundEffects.playClickSound();
    mapInstanceRef.current?.zoomIn();
  };
  const zoomOut = () => {
    soundEffects.playClickSound();
    mapInstanceRef.current?.zoomOut();
  };
  const resetJavaView = () => {
    soundEffects.playClickSound();
    mapInstanceRef.current?.flyTo([-7.3, 110.0], 7, { duration: 0.8 });
    setSelectedStation(null);
    setSelectedRunId(null);
  };

  const focusRegion = (region: 'WEST' | 'CENTRAL' | 'EAST') => {
    soundEffects.playClickSound();
    if (!mapInstanceRef.current) return;
    if (region === 'WEST') {
      mapInstanceRef.current.flyToBounds(
        [
          [-5.9, 106.0],
          [-7.4, 108.6],
        ],
        { duration: 0.8 }
      );
    } else if (region === 'CENTRAL') {
      mapInstanceRef.current.flyToBounds(
        [
          [-6.8, 108.5],
          [-8.0, 111.2],
        ],
        { duration: 0.8 }
      );
    } else {
      mapInstanceRef.current.flyToBounds(
        [
          [-7.0, 111.3],
          [-8.4, 114.5],
        ],
        { duration: 0.8 }
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
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100 z-0" />

      {/* Top Map Floating HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* OpenStreetMap Badge */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-2 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-xs font-mono font-bold text-slate-800 tracking-wide">
            OPENSTREETMAP • LINTAS JAWA
          </span>
        </div>

        {/* Regional Quick Zoom Chips */}
        <div className="bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-0.5 pointer-events-auto text-[11px] font-mono">
          <button
            onClick={resetJavaView}
            className="px-2 py-0.5 rounded font-medium hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            Semua
          </button>
          <button
            onClick={() => focusRegion('WEST')}
            className="px-2 py-0.5 rounded font-medium hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            Barat
          </button>
          <button
            onClick={() => focusRegion('CENTRAL')}
            className="px-2 py-0.5 rounded font-medium hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            Tengah
          </button>
          <button
            onClick={() => focusRegion('EAST')}
            className="px-2 py-0.5 rounded font-medium hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            Timur
          </button>
        </div>
      </div>

      {/* Floating Zoom Controls (Bottom-Left) */}
      <div className="absolute bottom-5 left-4 z-20 flex flex-col space-y-1.5 pointer-events-auto">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center shadow-sm active:scale-95 transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={resetJavaView}
          title="Reset Tampilan Jawa"
          className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-blue-700 hover:bg-slate-50 hover:text-blue-900 flex items-center justify-center shadow-sm active:scale-95 transition-all"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* --- STATION INSPECTOR POP-UP CARD --- */}
      {selectedStation && (
        <div className="absolute bottom-5 left-4 right-18 z-30 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 shadow-xl p-3.5 text-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-sm">
                🏛️
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-slate-900 font-mono">
                    {selectedStation.name}
                  </h3>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                    {selectedStation.code}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {selectedStation.city} • {selectedStation.daop}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEffects.playClickSound();
                setSelectedStation(null);
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 block font-sans">Elevasi</span>
              <span className="font-bold text-slate-800">+{selectedStation.elevationMeters} mdpl</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 block font-sans">Koordinat GPS</span>
              <span className="font-bold text-blue-700 text-[10px]">
                {selectedStation.lat.toFixed(2)}, {selectedStation.lng.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10.5px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-snug">
            <strong className="text-slate-700">Fasilitas:</strong> {selectedStation.facilities}
          </div>
        </div>
      )}

      {/* --- TRAIN RUN TELEMETRY POP-UP CARD --- */}
      {selectedRun && (
        <div className="absolute bottom-5 left-4 right-18 z-30 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md rounded-xl border border-orange-200 shadow-xl p-3.5 text-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-sm">
                🚂
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 font-mono">
                  {selectedSlot?.id ?? 'KA-PARAHYANGAN'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {selectedRoute?.name ?? 'Gambir - Bandung'} • Lintas Priangan
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEffects.playClickSound();
                setSelectedRunId(null);
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2 text-xs font-mono text-center">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 block font-sans">Status</span>
              <span className="font-bold text-emerald-700">{selectedRun.status}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 block font-sans">Penumpang</span>
              <span className="font-bold text-blue-700">{selectedRun.totalPassengers} Pax</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 block font-sans">Ketepatan</span>
              <span className="font-bold text-slate-700">
                {selectedRun.delayMinutes === 0 ? 'On-Time' : `+${selectedRun.delayMinutes}m`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
