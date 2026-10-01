import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { ActiveServiceRunEntity } from '@railway/timetable';
import { formatRupiah } from '@railway/ui';
import { Train, Gauge, Users, ArrowRight, ShieldCheck, X, Navigation, Play } from 'lucide-react';

interface NetworkMapScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({ state, onDispatchSlot }) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // SVG Coordinates optimized for mobile display (Java Island Trunk corridor)
  const stationCoords: Record<string, { x: number; y: number; name: string; code: string; daop: string }> = {
    STN_GMR_GAMBIR: { x: 80, y: 120, name: 'Gambir', code: 'GMR', daop: 'DAOP 1' },
    STN_BD_BANDUNG: { x: 160, y: 220, name: 'Bandung', code: 'BD', daop: 'DAOP 2' },
    STN_CN_CIREBON: { x: 280, y: 130, name: 'Cirebon', code: 'CN', daop: 'DAOP 3' },
    STN_SMT_SEMARANGTAWANG: { x: 420, y: 140, name: 'Semarang', code: 'SMT', daop: 'DAOP 4' },
    STN_SGU_SURABAYAGUBENG: { x: 560, y: 180, name: 'Surabaya', code: 'SGU', daop: 'DAOP 8' },
  };

  const selectedRun = state.activeServices.find((s) => s.id === selectedRunId);
  const selectedSlot = selectedRun
    ? state.timetableSlots.find((slot) => slot.id === selectedRun.timetableSlotId)
    : null;
  const selectedRoute = selectedSlot
    ? (state.routes ?? []).find((r) => r.id === selectedSlot.routeId)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#020617] text-white relative select-none">
      {/* Top Map HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#334155] shadow-lg flex items-center space-x-2 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono font-bold text-white tracking-wide">
            RADAR LINTAS JAWA
          </span>
        </div>

        <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#334155] shadow-lg text-[11px] font-mono text-slate-300 pointer-events-auto">
          <strong className="text-[#0EA5E9]">{state.activeServices.length}</strong> KA Bergerak
        </div>
      </div>

      {/* Main SVG Radar Canvas */}
      <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
        <svg viewBox="0 0 640 320" className="w-full h-full max-h-[460px] drop-shadow-2xl">
          {/* Radar Grid Pattern */}
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="activeTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
          </defs>

          {/* Radar background circle */}
          <rect width="100%" height="100%" fill="#020617" />
          <circle cx="320" cy="160" r="260" fill="url(#radarGlow)" />
          <circle cx="320" cy="160" r="240" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="320" cy="160" r="160" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Active Track: Gambir ➔ Bandung */}
          <path
            d="M 80 120 Q 95 195 160 220"
            fill="none"
            stroke="url(#activeTrackGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Active Track: Gambir ➔ Cirebon */}
          <path
            d="M 80 120 L 280 130"
            fill="none"
            stroke="url(#activeTrackGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Locked Tracks (Dashed) */}
          <path
            d="M 280 130 L 420 140"
            fill="none"
            stroke="#475569"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          <path
            d="M 420 140 L 560 180"
            fill="none"
            stroke="#475569"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Station Pins */}
          {Object.entries(stationCoords).map(([stnId, coord]) => (
            <g key={stnId} className="cursor-pointer">
              {/* Pulse ripple for active station */}
              <circle cx={coord.x} cy={coord.y} r="8" fill="#0EA5E9" opacity="0.25" className="animate-ping" />
              <circle cx={coord.x} cy={coord.y} r="5" fill="#020617" stroke="#0EA5E9" strokeWidth="2.5" />

              {/* Station Label */}
              <text
                x={coord.x}
                y={coord.y - 12}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="10"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {coord.code}
              </text>
              <text
                x={coord.x}
                y={coord.y + 16}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="8"
                fontFamily="monospace"
              >
                {coord.name}
              </text>
            </g>
          ))}

          {/* In-Transit Active Trains (gliding along corridors) */}
          {state.activeServices.map((run, i) => {
            // Calculate animated trajectory between Gambir (80, 120) and Bandung (160, 220)
            const fraction = Math.min(1, Math.max(0, (state.timestamp.minuteOfDay % 120) / 120));
            const trainX = 80 + fraction * (160 - 80);
            const trainY = 120 + fraction * (220 - 120);

            const isSelected = selectedRunId === run.id;

            return (
              <g
                key={run.id}
                onClick={() => setSelectedRunId(run.id)}
                className="cursor-pointer"
              >
                {/* Train Glow Halo */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r={isSelected ? 16 : 12}
                  fill="#F97316"
                  opacity={isSelected ? 0.4 : 0.25}
                  className="animate-pulse"
                />

                {/* Train Core Pip */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r="7"
                  fill="#F97316"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />

                {/* Train Tag Pill */}
                <rect
                  x={trainX - 22}
                  y={trainY - 26}
                  width="44"
                  height="14"
                  rx="7"
                  fill="#0F172A"
                  stroke="#F97316"
                  strokeWidth="1.2"
                />
                <text
                  x={trainX}
                  y={trainY - 16}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  KA {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Bottom Info Sheet (AM4 Inspector Drawer) */}
      {selectedRun && (
        <div className="absolute bottom-20 left-3 right-3 z-30 bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-[#F97316]/50 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#F97316] flex items-center justify-center text-sm shadow">
                🚂
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono">
                  {selectedSlot?.id ?? 'KA-7001'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {selectedRoute?.name ?? 'Gambir - Bandung'}
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
            <div className="bg-[#1E293B] p-2 rounded-lg border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Status KA</span>
              <span className="font-bold text-emerald-400">{selectedRun.status}</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-lg border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Penumpang</span>
              <span className="font-bold text-[#0EA5E9]">{selectedRun.totalPassengers} Pax</span>
            </div>
            <div className="bg-[#1E293B] p-2 rounded-lg border border-[#334155]/40">
              <span className="text-[9px] text-slate-400 block font-sans">Keterlambatan</span>
              <span className="font-bold text-slate-300">{selectedRun.delayMinutes}m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
