import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { ActiveServiceRunEntity } from '@railway/timetable';
import { formatRupiah } from '@railway/ui';
import { Train, MapPin, Gauge, Users, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface NetworkMapScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({ state, onDispatchSlot }) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Corridor station layout coordinates in SVG viewbox (800x420)
  const stationCoords: Record<string, { x: number; y: number; name: string; daop: string }> = {
    STN_GMR_GAMBIR: { x: 120, y: 150, name: 'Gambir (GMR)', daop: 'DAOP 1 Jakarta' },
    STN_BD_BANDUNG: { x: 220, y: 300, name: 'Bandung (BD)', daop: 'DAOP 2 Bandung' },
    STN_CN_CIREBON: { x: 380, y: 170, name: 'Cirebon (CN)', daop: 'DAOP 3 Cirebon' },
    STN_SMT_SEMARANGTAWANG: { x: 560, y: 180, name: 'Semarang Tawang (SMT)', daop: 'DAOP 4 Semarang' },
    STN_SGU_SURABAYAGUBENG: { x: 740, y: 220, name: 'Surabaya Gubeng (SGU)', daop: 'DAOP 8 Surabaya' },
  };

  const selectedRun = state.activeServices.find((s) => s.id === selectedRunId);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020617] relative">
      {/* Center Canvas: Java Trunk Corridor SVG */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Peta Koridor Lintas Jawa</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1E293B] text-[#F97316] font-mono border border-[#334155]">
                Pulau Jawa Trunk Line
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Visualisasi real-time pergerakan sarana kereta api, okupansi penumpang, dan izin konsesi lintas.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span>Izin Konsesi Aktif</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
              <span>Lintas Terkunci</span>
            </span>
          </div>
        </div>

        {/* SVG Interactive Map */}
        <div className="flex-1 bg-[#0F172A] rounded-xl border border-[#334155] p-4 relative flex items-center justify-center shadow-inner overflow-hidden">
          <svg viewBox="0 0 850 420" className="w-full h-full max-h-[540px]">
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Track Line 1: Gambir -> Bandung (Active) */}
            <path
              d="M 120 150 Q 140 260 220 300"
              fill="none"
              stroke="#10B981"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Track Line 2: Gambir -> Cirebon (Active) */}
            <path
              d="M 120 150 L 380 170"
              fill="none"
              stroke="#10B981"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Track Line 3: Cirebon -> Semarang (Locked/Dashed) */}
            <path
              d="M 380 170 L 560 180"
              fill="none"
              stroke="#475569"
              strokeWidth="3"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
            {/* Track Line 4: Semarang -> Surabaya (Locked/Dashed) */}
            <path
              d="M 560 180 L 740 220"
              fill="none"
              stroke="#475569"
              strokeWidth="3"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {/* Render Station Markers */}
            {Object.entries(stationCoords).map(([stnId, coord]) => (
              <g key={stnId} className="cursor-pointer group">
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="10"
                  fill="#0F172A"
                  stroke="#F97316"
                  strokeWidth="3"
                />
                <circle cx={coord.x} cy={coord.y} r="4" fill="#F97316" />
                <text
                  x={coord.x}
                  y={coord.y - 16}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {coord.name}
                </text>
                <text
                  x={coord.x}
                  y={coord.y + 24}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {coord.daop}
                </text>
              </g>
            ))}

            {/* Render In-Transit Active Trains */}
            {state.activeServices.map((run, idx) => {
              // Interpolate train position along Gambir -> Bandung path
              const progress = Math.min(1.0, 0.2 + (idx * 0.4));
              const trainX = 120 + progress * (220 - 120);
              const trainY = 150 + progress * (300 - 150);

              const isSelected = selectedRunId === run.id;

              return (
                <g
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className="cursor-pointer transition-all active:scale-95"
                >
                  <circle
                    cx={trainX}
                    cy={trainY}
                    r={isSelected ? 18 : 14}
                    fill={run.delayMinutes > 0 ? '#EF4444' : '#10B981'}
                    fillOpacity="0.3"
                    className="animate-ping"
                  />
                  <rect
                    x={trainX - 12}
                    y={trainY - 12}
                    width="24"
                    height="24"
                    rx="6"
                    fill={isSelected ? '#F97316' : '#10B981'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x={trainX}
                    y={trainY + 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    🚂
                  </text>
                  <text
                    x={trainX}
                    y={trainY - 16}
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {run.id.slice(0, 16)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Map Overlay Status Tag */}
          <div className="absolute bottom-4 left-4 bg-[#0F172A]/90 border border-[#334155] rounded-lg p-3 backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Status Koridor</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              Gambir – Bandung (160 km) Operasional • 100 km/h
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer: Context Inspector for Selected Train or Station */}
      <div className="w-80 bg-[#0F172A] border-l border-[#334155] p-5 flex flex-col justify-between overflow-y-auto select-none">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-4 flex items-center space-x-1.5">
            <Train className="w-4 h-4 text-[#F97316]" />
            <span>Inspektur Sarana & Lintas</span>
          </h3>

          {selectedRun ? (
            <div className="space-y-4">
              <div className="bg-[#1E293B] p-3.5 rounded-lg border border-[#334155]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Nomor Perjalanan</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                  {selectedRun.id}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                    DALAM PERJALANAN
                  </span>
                  {selectedRun.delayMinutes > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                      +{selectedRun.delayMinutes} mnt
                    </span>
                  )}
                </div>
              </div>

              {/* Passenger Metrics */}
              <div className="bg-[#1E293B] p-3.5 rounded-lg border border-[#334155] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Total Penumpang:</span>
                  </span>
                  <span className="font-bold text-white font-mono">
                    {selectedRun.totalPassengers} Jiwa
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#334155]/60">
                  <div>
                    <span className="text-slate-400">Ekonomi:</span>{' '}
                    <span className="font-mono text-slate-200">
                      {selectedRun.passengerCount.ECONOMY}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Eksekutif:</span>{' '}
                    <span className="font-mono text-slate-200">
                      {selectedRun.passengerCount.EXECUTIVE}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="bg-[#1E293B] p-3.5 rounded-lg border border-[#334155] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tiket & Makanan:</span>
                  <span className="font-mono font-bold text-[#10B981]">
                    {formatRupiah(selectedRun.revenueAccrued)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">BBM & TAC Terpakai:</span>
                  <span className="font-mono text-[#EF4444]">
                    {formatRupiah(selectedRun.opexAccrued)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E293B]/40 border border-dashed border-[#334155] p-6 rounded-lg text-center text-slate-400 text-xs">
              <Train className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>Pilih salah satu kereta aktif di peta untuk melihat detail operasi dan manifes penumpang.</p>
            </div>
          )}

          {/* Available Timetable Departures Ready to Dispatch */}
          <div className="mt-6">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase mb-2">
              Jadwal Siap Berangkat
            </div>
            <div className="space-y-2">
              {state.timetableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-[#1E293B] p-3 rounded-lg border border-[#334155] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {Math.floor(slot.departureMinuteOfDay / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {(slot.departureMinuteOfDay % 60).toString().padStart(2, '0')}{' '}
                      WIB
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Gambir ➔ Bandung
                    </div>
                  </div>
                  <button
                    onClick={() => onDispatchSlot(slot.id)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm transition-all"
                  >
                    Kirim KA
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regulatory Permit info */}
        <div className="p-3 bg-[#020617] rounded-lg border border-[#334155] text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Kemenhub DJKA Disetujui</span>
          </div>
          Concession Route Permit #GMR-BD-2026 granted for scheduled passenger services.
        </div>
      </div>
    </div>
  );
};
