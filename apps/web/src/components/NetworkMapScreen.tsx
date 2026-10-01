import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { formatRupiah } from '@railway/ui';
import { Train, Gauge, Users, MapPin, X, Navigation, Play, Eye, Compass, ShieldCheck } from 'lucide-react';

interface NetworkMapScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

interface StationInfo {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly daop: string;
  readonly lat: number;
  readonly lng: number;
  readonly x: number;
  readonly y: number;
  readonly isHub: boolean;
  readonly facilities: string;
  readonly dailyDemand: number;
}

type CorridorFocus = 'ALL' | 'WEST' | 'CENTRAL' | 'EAST';

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({ state, onDispatchSlot }) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [focusRegion, setFocusRegion] = useState<CorridorFocus>('ALL');

  // Real GPS Projection for Java Island
  // Longitude bounds: 105.5°E to 114.8°E (span 9.3°)
  // Latitude bounds: -5.8°S to -8.9°S (span 3.1°)
  // SVG ViewBox: 880 x 360
  const project = (lng: number, lat: number) => {
    const x = Math.round(((lng - 105.5) / 9.3) * 820 + 30);
    const y = Math.round(((-5.8 - lat) / 3.1) * 280 + 35);
    return { x, y };
  };

  // Real Major Stations across Java plotted with accurate GPS
  const stations: StationInfo[] = [
    {
      id: 'STN_GMR_GAMBIR',
      code: 'GMR',
      name: 'Gambir Jakarta',
      daop: 'DAOP 1 Jakarta',
      lat: -6.1767,
      lng: 106.8306,
      ...project(106.8306, -6.1767),
      isHub: true,
      facilities: 'Terminal Eksekutif, 4 Jalur Layang, Resto VIP',
      dailyDemand: 28000,
    },
    {
      id: 'STN_CKP_CIKAMPEK',
      code: 'CKP',
      name: 'Cikampek Junction',
      daop: 'DAOP 1 Jakarta',
      lat: -6.4172,
      lng: 107.4589,
      ...project(107.4589, -6.4172),
      isHub: false,
      facilities: 'Percabangan Utama Pantura & Priangan',
      dailyDemand: 9500,
    },
    {
      id: 'STN_BD_BANDUNG',
      code: 'BD',
      name: 'Bandung',
      daop: 'DAOP 2 Bandung',
      lat: -6.9142,
      lng: 107.6025,
      ...project(107.6025, -6.9142),
      isHub: true,
      facilities: 'Dipo Lokomotif & Kereta Bandung, 6 Jalur',
      dailyDemand: 22000,
    },
    {
      id: 'STN_CN_CIREBON',
      code: 'CN',
      name: 'Cirebon Kejaksan',
      daop: 'DAOP 3 Cirebon',
      lat: -6.7053,
      lng: 108.5554,
      ...project(108.5554, -6.7053),
      isHub: true,
      facilities: 'Dipo Traksi Kejaksan, Terminal Peti Kemas',
      dailyDemand: 14000,
    },
    {
      id: 'STN_TG_TEGAL',
      code: 'TG',
      name: 'Tegal',
      daop: 'DAOP 4 Semarang',
      lat: -6.8687,
      lng: 109.1418,
      ...project(109.1418, -6.8687),
      isHub: false,
      facilities: 'Hub Lintas Pantura Barat Jawa Tengah',
      dailyDemand: 11000,
    },
    {
      id: 'STN_PWT_PURWOKERTO',
      code: 'PWT',
      name: 'Purwokerto',
      daop: 'DAOP 5 Purwokerto',
      lat: -7.4191,
      lng: 109.2223,
      ...project(109.2223, -7.4191),
      isHub: true,
      facilities: 'Dipo Induk PWT, Jalur Ganda Lintas Tengah',
      dailyDemand: 16500,
    },
    {
      id: 'STN_KYA_KROYA',
      code: 'KYA',
      name: 'Kroya Junction',
      daop: 'DAOP 5 Purwokerto',
      lat: -7.6297,
      lng: 109.2541,
      ...project(109.2541, -7.6297),
      isHub: false,
      facilities: 'Segitiga Emas Kroya (Hub Bandung & Pantura)',
      dailyDemand: 8200,
    },
    {
      id: 'STN_SMT_SEMARANGTAWANG',
      code: 'SMT',
      name: 'Semarang Tawang',
      daop: 'DAOP 4 Semarang',
      lat: -6.9644,
      lng: 110.4278,
      ...project(110.4278, -6.9644),
      isHub: true,
      facilities: 'Pelabuhan Peti Kemas Tanjung Emas, Dipo SMT',
      dailyDemand: 18000,
    },
    {
      id: 'STN_YK_YOGYAKARTA',
      code: 'YK',
      name: 'Yogyakarta Tugu',
      daop: 'DAOP 6 Yogyakarta',
      lat: -7.7892,
      lng: 110.3635,
      ...project(110.3635, -7.7892),
      isHub: true,
      facilities: 'Terminal Wisatawan, Dipo Traksi Pengok, KRL Hub',
      dailyDemand: 24000,
    },
    {
      id: 'STN_SLO_SOLOBALAPAN',
      code: 'SLO',
      name: 'Solo Balapan',
      daop: 'DAOP 6 Yogyakarta',
      lat: -7.5568,
      lng: 110.8214,
      ...project(110.8214, -7.5568),
      isHub: true,
      facilities: 'Junction Gundih-Semarang & Madiun, 8 Jalur',
      dailyDemand: 16000,
    },
    {
      id: 'STN_MN_MADIUN',
      code: 'MN',
      name: 'Madiun (INKA)',
      daop: 'DAOP 7 Madiun',
      lat: -7.6186,
      lng: 111.5244,
      ...project(111.5244, -7.6186),
      isHub: true,
      facilities: 'Pabrik Manufaktur Kereta PT INKA, Balai Yasa',
      dailyDemand: 12500,
    },
    {
      id: 'STN_SGU_SURABAYAGUBENG',
      code: 'SGU',
      name: 'Surabaya Gubeng',
      daop: 'DAOP 8 Surabaya',
      lat: -7.2653,
      lng: 112.7522,
      ...project(112.7522, -7.2653),
      isHub: true,
      facilities: 'Dipo Terbesar Sidotopo, Lintas Utara & Selatan',
      dailyDemand: 26000,
    },
    {
      id: 'STN_JR_JEMBER',
      code: 'JR',
      name: 'Jember',
      daop: 'DAOP 9 Jember',
      lat: -8.1652,
      lng: 113.7032,
      ...project(113.7032, -8.1652),
      isHub: false,
      facilities: 'Kantor DAOP 9, Dipo Lokomotif Jember',
      dailyDemand: 10500,
    },
    {
      id: 'STN_BW_KETAPANG',
      code: 'KTG',
      name: 'Ketapang Banyuwangi',
      daop: 'DAOP 9 Jember',
      lat: -8.1469,
      lng: 114.3972,
      ...project(114.3972, -8.1469),
      isHub: true,
      facilities: 'Pelabuhan Penyeberangan Ferry Ketapang-Gilimanuk',
      dailyDemand: 13000,
    },
  ];

  // Active services selection
  const selectedRun = state.activeServices.find((s) => s.id === selectedRunId);
  const selectedSlot = selectedRun
    ? state.timetableSlots.find((slot) => slot.id === selectedRun.timetableSlotId)
    : null;
  const selectedRoute = selectedSlot
    ? (state.routes ?? []).find((r) => r.id === selectedSlot.routeId)
    : null;

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  // Dynamic ViewBox for Regional Zoom
  const getViewBox = () => {
    switch (focusRegion) {
      case 'WEST': // West Java & Jakarta
        return '80 20 280 220';
      case 'CENTRAL': // Central Java & DIY
        return '260 60 320 220';
      case 'EAST': // East Java
        return '520 80 340 240';
      default: // Entire Java
        return '0 0 880 340';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#020617] text-white relative select-none">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Status Pill */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#334155] shadow-xl flex items-center space-x-2 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono font-bold text-white tracking-wide">
            RADAR REAL MAP PULAU JAWA
          </span>
        </div>

        {/* Region Filter Chips */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md p-1 rounded-full border border-[#334155] shadow-xl flex items-center space-x-1 pointer-events-auto text-[10px] font-mono">
          {[
            { id: 'ALL' as CorridorFocus, label: 'Semua' },
            { id: 'WEST' as CorridorFocus, label: 'Barat' },
            { id: 'CENTRAL' as CorridorFocus, label: 'Tengah' },
            { id: 'EAST' as CorridorFocus, label: 'Timur' },
          ].map((rf) => (
            <button
              key={rf.id}
              onClick={() => setFocusRegion(rf.id)}
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                focusRegion === rf.id
                  ? 'bg-[#F97316] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Map Canvas with Real Java Coastline & Railway Polylines */}
      <div className="flex-1 flex items-center justify-center p-1 sm:p-3 relative overflow-hidden">
        <svg
          viewBox={getViewBox()}
          className="w-full h-full max-h-[500px] transition-all duration-500 ease-out drop-shadow-2xl"
        >
          <defs>
            {/* Ocean & Land Gradients */}
            <radialGradient id="radarScanGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="activeTrackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Deep Sea Background */}
          <rect width="880" height="340" fill="#020617" />
          <circle cx="440" cy="170" r="380" fill="url(#radarScanGlow)" />

          {/* Real Java Island Geographical Coastline Silhouette */}
          <path
            d="
              M 64 33
              C 80 40, 110 46, 122 49
              L 140 50
              L 155 48
              C 170 54, 185 58, 205 60
              C 230 63, 255 68, 275 75
              C 285 85, 292 98, 297 108
              C 310 115, 330 120, 349 124
              C 375 125, 395 125, 415 127
              C 440 130, 460 132, 470 130
              C 480 118, 485 95, 486 83
              C 490 85, 515 95, 548 107
              C 580 115, 605 120, 618 124
              C 645 130, 665 140, 675 158
              L 689 197
              L 716 208
              L 745 204
              L 788 203
              L 825 247
              C 830 270, 835 295, 829 305
              C 820 300, 815 292, 811 290
              C 775 280, 750 270, 734 266
              C 715 263, 690 262, 662 266
              C 640 264, 610 260, 585 259
              C 555 258, 540 255, 526 254
              C 490 248, 470 240, 454 234
              C 435 230, 400 215, 372 205
              C 350 205, 340 208, 336 208
              C 320 206, 310 204, 305 203
              C 260 200, 230 198, 214 199
              C 170 195, 140 180, 114 135
              C 80 130, 55 128, 45 125
              C 25 120, 12 115, 10 112
              C 20 90, 45 60, 64 33
              Z
            "
            fill="#0F172A"
            stroke="#1E293B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Real Madura Island Outline */}
          <path
            d="
              M 675 139
              C 680 125, 700 118, 725 116
              C 750 115, 770 115, 775 116
              C 782 125, 785 132, 779 135
              C 760 142, 735 145, 716 145
              C 695 145, 680 142, 675 139
              Z
            "
            fill="#0F172A"
            stroke="#1E293B"
            strokeWidth="1.5"
          />

          {/* --- REAL RAILWAY TRACKS (Track Sleeper Ballast + Rails) --- */}

          {/* 1. LINTAS PANTURA (Utara): Jakarta ➔ Cikampek ➔ Cirebon ➔ Tegal ➔ Semarang ➔ Surabaya */}
          <path
            d="
              M 140 57
              L 165 65
              L 182 72
              L 197 80
              L 235 87
              L 268 97
              L 297 108
              L 330 120
              L 349 124
              L 373 125
              L 397 125
              L 430 130
              L 466 132
              L 488 140
              L 550 155
              L 580 158
              L 610 160
              L 640 161
              L 675 162
            "
            fill="none"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. LINTAS PRIANGAN (Pegunungan): Cikampek ➔ Purwakarta ➔ Padalarang ➔ Bandung */}
          <path
            d="
              M 197 80
              C 198 95, 202 108, 205 120
              L 208 124
              L 210 127
            "
            fill="none"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. LINTAS TENGAH: Cirebon ➔ Prupuk ➔ Purwokerto ➔ Kroya ➔ Jogja ➔ Solo ➔ Madiun ➔ Surabaya */}
          <path
            d="
              M 297 108
              C 320 130, 340 155, 356 177
              L 359 197
              C 385 203, 415 210, 459 213
              L 480 202
              L 501 190
              L 535 190
              L 564 196
              L 600 185
              L 635 178
              L 675 162
            "
            fill="none"
            stroke="#334155"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4. LINTAS SELATAN PRIANGAN: Bandung ➔ Tasikmalaya ➔ Banjar ➔ Kroya */}
          <path
            d="
              M 210 127
              C 230 140, 260 155, 305 170
              L 325 185
              L 359 197
            "
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 5. LINTAS TIMUR: Surabaya ➔ Pasuruan ➔ Probolinggo ➔ Jember ➔ Banyuwangi Ketapang */}
          <path
            d="
              M 675 162
              L 689 197
              L 716 208
              C 730 225, 740 235, 750 240
              L 775 245
              L 815 246
              L 825 247
            "
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* --- ACTIVE CONCESSION OVERLAYS (Glowing Neon Green/Cyan) --- */}

          {/* Route 1: Gambir ➔ Cikampek ➔ Bandung (ACTIVE) */}
          <path
            d="
              M 140 57
              L 165 65
              L 182 72
              L 197 80
              C 198 95, 202 108, 205 120
              L 208 124
              L 210 127
            "
            fill="none"
            stroke="url(#activeTrackGlow)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* Route 2: Gambir ➔ Cirebon (ACTIVE) */}
          <path
            d="
              M 140 57
              L 165 65
              L 182 72
              L 197 80
              L 235 87
              L 268 97
              L 297 108
            "
            fill="none"
            stroke="url(#activeTrackGlow)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* --- REAL STATIONS PINS & BEACONS --- */}
          {stations.map((stn) => {
            const isSelected = selectedStationId === stn.id;
            const hasDepot = stn.facilities.includes('Dipo');

            return (
              <g
                key={stn.id}
                onClick={() => {
                  setSelectedStationId(stn.id);
                  setSelectedRunId(null);
                }}
                className="cursor-pointer group"
              >
                {/* Station Pulse Ring */}
                {stn.isHub && (
                  <circle
                    cx={stn.x}
                    cy={stn.y}
                    r={isSelected ? 14 : 9}
                    fill="#0EA5E9"
                    opacity={isSelected ? 0.4 : 0.2}
                    className="animate-ping"
                  />
                )}

                {/* Outer Rim */}
                <circle
                  cx={stn.x}
                  cy={stn.y}
                  r={isSelected ? 7 : stn.isHub ? 5.5 : 4}
                  fill="#0F172A"
                  stroke={isSelected ? '#F97316' : stn.isHub ? '#0EA5E9' : '#94A3B8'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all"
                />

                {/* Inner Core */}
                <circle
                  cx={stn.x}
                  cy={stn.y}
                  r={stn.isHub ? 2.5 : 1.8}
                  fill={isSelected ? '#F97316' : stn.isHub ? '#FFFFFF' : '#94A3B8'}
                />

                {/* Station Label */}
                <text
                  x={stn.x}
                  y={stn.y - 10}
                  textAnchor="middle"
                  fill={isSelected ? '#F97316' : '#FFFFFF'}
                  fontSize={stn.isHub ? '9' : '7.5'}
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none drop-shadow-md select-none"
                >
                  {stn.code}
                </text>
              </g>
            );
          })}

          {/* --- LIVE MOVING TRAINS (Animated along real corridors) --- */}
          {state.activeServices.map((run, idx) => {
            // Calculate real waypoint progression on Gambir (140, 57) ➔ Cikampek (197, 80) ➔ Bandung (210, 127)
            const progress = (state.timestamp.minuteOfDay % 160) / 160;

            let trainX: number;
            let trainY: number;

            if (progress < 0.45) {
              // Section 1: Gambir ➔ Cikampek (Pantura mainline)
              const segP = progress / 0.45;
              trainX = 140 + segP * (197 - 140);
              trainY = 57 + segP * (80 - 57);
            } else {
              // Section 2: Cikampek ➔ Bandung (Priangan mountains)
              const segP = (progress - 0.45) / 0.55;
              trainX = 197 + segP * (210 - 197);
              trainY = 80 + segP * (127 - 80);
            }

            const isSelected = selectedRunId === run.id;

            return (
              <g
                key={run.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRunId(run.id);
                  setSelectedStationId(null);
                }}
                className="cursor-pointer"
              >
                {/* Train Glow Halo */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r={isSelected ? 16 : 12}
                  fill="#F97316"
                  opacity={isSelected ? 0.5 : 0.3}
                  className="animate-pulse"
                />

                {/* Train Core Pip */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r="6.5"
                  fill="#F97316"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                />

                {/* Train Code Tag */}
                <rect
                  x={trainX - 22}
                  y={trainY - 24}
                  width="44"
                  height="13"
                  rx="6.5"
                  fill="#0F172A"
                  stroke="#F97316"
                  strokeWidth="1.2"
                />
                <text
                  x={trainX}
                  y={trainY - 15}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  KA {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* --- BOTTOM SLIDE-UP DRAWER: Station Inspector --- */}
      {selectedStation && (
        <div className="absolute bottom-20 left-3 right-3 z-30 bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-[#0EA5E9]/50 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300 select-none">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center text-base shadow">
                🏛️
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-white font-mono">
                    {selectedStation.name} ({selectedStation.code})
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1E293B] text-slate-300 border border-[#334155]">
                    {selectedStation.daop}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  GPS: {selectedStation.lat.toFixed(4)}°S, {selectedStation.lng.toFixed(4)}°E
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedStationId(null)}
              className="w-7 h-7 rounded-full bg-[#1E293B] hover:bg-[#334155] flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Permintaan Penumpang</span>
              <span className="font-bold text-[#0EA5E9]">
                {selectedStation.dailyDemand.toLocaleString('id-ID')} Pax/Hari
              </span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Status Izin Rel</span>
              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>KORIDOR AKTIF</span>
              </span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-300 font-sans bg-[#1E293B]/60 p-2 rounded-lg border border-[#334155]/40">
            <strong>Fasilitas:</strong> {selectedStation.facilities}
          </div>
        </div>
      )}

      {/* --- BOTTOM SLIDE-UP DRAWER: Train Telemetry Inspector --- */}
      {selectedRun && (
        <div className="absolute bottom-20 left-3 right-3 z-30 bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-[#F97316]/60 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300 select-none">
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
                  {selectedRoute?.name ?? 'Gambir - Bandung'} • Lintas Real Priangan
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

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40 text-center">
              <span className="text-[9px] text-slate-400 block font-sans">Status KA</span>
              <span className="font-bold text-emerald-400">{selectedRun.status}</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40 text-center">
              <span className="text-[9px] text-slate-400 block font-sans">Penumpang</span>
              <span className="font-bold text-[#0EA5E9]">{selectedRun.totalPassengers} Pax</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-xl border border-[#334155]/40 text-center">
              <span className="text-[9px] text-slate-400 block font-sans">Ketepatan (OTP)</span>
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
