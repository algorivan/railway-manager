import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { formatClock, formatDuration, createGapekaChartViewModel } from '@railway/ui';
import { Clock, Play, Calendar, CheckCircle2, AlertCircle, Compass, Users } from 'lucide-react';

interface TimetableScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const TimetableScreen: React.FC<TimetableScreenProps> = ({ state, onDispatchSlot }) => {
  const routes = state.routes ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    routes[0]?.id ?? 'ROUTE_GMR_BD'
  );
  const [viewMode, setViewMode] = useState<'table' | 'gapeka'>('table');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
  const routeSlots = state.timetableSlots.filter((s) => s.routeId === selectedRoute?.id);

  // Gapeka viewmodel
  const currentSimMinute = state.timestamp.minuteOfDay;
  const gapekaVm = selectedRoute
    ? createGapekaChartViewModel(selectedRoute, state.timetableSlots, state.activeServices, currentSimMinute)
    : null;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#F97316]" />
            <span>Jadwal Perjalanan & Gapeka 2026</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pengelolaan slot waktu keberangkatan, alokasi kru, dan Grafik Perjalanan Kereta Api (Gapeka).
          </p>
        </div>

        {/* View Switcher & Route Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="bg-[#1E293B] border border-[#334155] text-xs font-medium text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#F97316]"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>

          <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-[#334155]">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#F97316] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tabel Slot
            </button>
            <button
              onClick={() => setViewMode('gapeka')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                viewMode === 'gapeka'
                  ? 'bg-[#F97316] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grafik Gapeka
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-6 flex-1">
        {viewMode === 'table' ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Total Slot Terdaftar</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {state.timetableSlots.length} Slot
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {routeSlots.length} slot pada rute terpilih
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4">
                <div className="text-[10px] text-slate-400 font-mono uppercase">KA Sedang Beroperasi</div>
                <div className="text-xl font-bold font-mono text-[#0EA5E9] mt-1">
                  {state.activeServices.length} Kereta
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Bergerak sesuai sinyal blok
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Jarak Lintas</div>
                <div className="text-xl font-bold font-mono text-[#10B981] mt-1">
                  {selectedRoute?.distanceKm.toFixed(1)} km
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Estimasi waktu tempuh {formatDuration(selectedRoute?.estimatedRuntimeMinutes ?? 0)}
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Tarif TAC Lintas</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  Rp {(selectedRoute?.trackAccessFeePerKm ?? 0).toLocaleString('id-ID')} /km
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Status: {selectedRoute?.accessStatus === 'PERMIT_GRANTED' ? 'Izin Resmi DJKA' : 'Terkunci'}
                </div>
              </div>
            </div>

            {/* Slots Table */}
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl overflow-hidden shadow-lg">
              <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between">
                <div className="font-bold text-sm text-white">
                  Daftar Slot Rute: {selectedRoute?.name}
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {routeSlots.length} Jadwal Terjadwal
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1E293B]/60 text-slate-400 font-mono uppercase text-[11px] border-b border-[#334155]">
                      <th className="py-3 px-4">Kode Slot</th>
                      <th className="py-3 px-4">Jadwal Berangkat</th>
                      <th className="py-3 px-4">Jadwal Tiba</th>
                      <th className="py-3 px-4">Rangkaian (Consist)</th>
                      <th className="py-3 px-4">Awak KA (Masinis & Kondektur)</th>
                      <th className="py-3 px-4">Status Layanan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60 font-sans">
                    {routeSlots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                          Tidak ada slot jadwal untuk rute ini.
                        </td>
                      </tr>
                    ) : (
                      routeSlots.map((slot) => {
                        const activeRun = state.activeServices.find(
                          (s) => s.timetableSlotId === slot.id
                        );
                        const consist = state.compositions.find((c) => c.id === slot.compositionId);
                        const driver = state.employees.find((e) => e.id === slot.primaryDriverId);
                        const cond = state.employees.find((e) => e.id === slot.primaryConductorId);

                        return (
                          <tr key={slot.id} className="hover:bg-[#1E293B]/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              {slot.id}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-200">
                              <span className="bg-[#1E293B] px-2 py-1 rounded text-[#F97316] font-bold">
                                {formatClock(slot.departureMinuteOfDay)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {formatClock(slot.scheduledArrivalMinuteOfDay)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              <div className="font-semibold text-white">
                                {consist?.name ?? slot.compositionId}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {consist ? `${consist.carriageUnitIds.length} Kereta Penumpang` : '-'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              <div className="flex items-center space-x-1.5">
                                <Users className="w-3.5 h-3.5 text-[#0EA5E9]" />
                                <span>{driver?.name ?? 'Belum Ditugaskan'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 ml-5">
                                Kond: {cond?.name ?? '-'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {activeRun ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0EA5E9]/20 text-[#0EA5E9] border border-[#0EA5E9]/40 font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse"></span>
                                  <span>SEDANG BERJALAN ({activeRun.totalPassengers} Penumpang)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-mono">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>TERJADWAL</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => onDispatchSlot(slot.id)}
                                disabled={Boolean(activeRun)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-all ${
                                  activeRun
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-[#10B981] hover:bg-[#059669] text-white shadow active:scale-95'
                                }`}
                              >
                                <Play className="w-3 h-3" />
                                <span>{activeRun ? 'Dalam Rute' : 'Berangkatkan'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Gapeka View */
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Grafik Perjalanan Kereta Api (Gapeka) — {selectedRoute?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Sumbu Horizontal: Waktu 24 Jam (00:00 - 24:00 WIB) • Sumbu Vertikal: Jarak Rel (0 - {selectedRoute?.distanceKm} km)
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-3 h-0.5 bg-[#10B981]"></span>
                  <span>Tepat Waktu (On-Time)</span>
                </span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-3 h-0.5 bg-amber-400"></span>
                  <span>Terlambat (&gt;5m)</span>
                </span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-0.5 h-3 bg-[#F97316]"></span>
                  <span>Waktu Sekarang</span>
                </span>
              </div>
            </div>

            {/* SVG Gapeka Diagram */}
            <div className="w-full bg-[#020617] rounded-lg border border-[#334155] p-4 relative overflow-x-auto">
              <svg viewBox="0 0 900 360" className="w-full min-w-[700px] h-[340px]">
                {/* Background Grid Lines for Hours (Every 2 Hours = 12 columns) */}
                {Array.from({ length: 13 }).map((_, i) => {
                  const hour = i * 2;
                  const x = 80 + (i / 12) * 780;
                  return (
                    <g key={i}>
                      <line
                        x1={x}
                        y1={30}
                        x2={x}
                        y2={310}
                        stroke="#1E293B"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={x}
                        y={328}
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {hour.toString().padStart(2, '0')}:00
                      </text>
                    </g>
                  );
                })}

                {/* Station Horizontal Grid Lines */}
                <line x1={80} y1={50} x2={860} y2={50} stroke="#334155" strokeWidth="1.5" />
                <text x={70} y={54} textAnchor="end" fill="#F8FAFC" fontSize="11" fontWeight="bold">
                  {selectedRoute?.originStationId.split('_')[1] ?? 'Origin'} (0 km)
                </text>

                <line x1={80} y1={300} x2={860} y2={300} stroke="#334155" strokeWidth="1.5" />
                <text x={70} y={304} textAnchor="end" fill="#F8FAFC" fontSize="11" fontWeight="bold">
                  {selectedRoute?.destinationStationId.split('_')[1] ?? 'Destination'} ({selectedRoute?.distanceKm} km)
                </text>

                {/* Train Service Slanted Trajectories */}
                {gapekaVm?.serviceLines.map((line) => {
                  // X start: departureMinute (0..1440) -> 80 + (min / 1440) * 780
                  const x1 = 80 + (line.departureMinute / 1440) * 780;
                  const y1 = 50;
                  const x2 = 80 + (line.arrivalMinute / 1440) * 780;
                  const y2 = 300;

                  return (
                    <g key={line.timetableSlotId}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={line.colorHex}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Train label */}
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 6}
                        fill={line.colorHex}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {line.trainCode}
                      </text>
                    </g>
                  );
                })}

                {/* Current Simulation Time Vertical Indicator */}
                {(() => {
                  const nowX = 80 + (currentSimMinute / 1440) * 780;
                  return (
                    <g>
                      <line
                        x1={nowX}
                        y1={30}
                        x2={nowX}
                        y2={310}
                        stroke="#F97316"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <circle cx={nowX} cy={40} r="4" fill="#F97316" />
                      <text
                        x={nowX}
                        y={24}
                        textAnchor="middle"
                        fill="#F97316"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {formatClock(currentSimMinute)}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
