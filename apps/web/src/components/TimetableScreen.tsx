import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { formatClock, formatDuration, createGapekaChartViewModel } from '@railway/ui';
import { Calendar, Play, CheckCircle2, Users, Clock, Navigation } from 'lucide-react';

interface TimetableScreenProps {
  readonly state: GameState;
  readonly onDispatchSlot: (slotId: string) => void;
}

export const TimetableScreen: React.FC<TimetableScreenProps> = ({ state, onDispatchSlot }) => {
  const routes = state.routes ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'gapeka'>('cards');

  const filteredSlots = state.timetableSlots.filter((s) => {
    if (selectedRouteId === 'ALL') return true;
    return s.routeId === selectedRouteId;
  });

  const activeRouteForGapeka = routes[0];
  const gapekaVm = activeRouteForGapeka
    ? createGapekaChartViewModel(
        activeRouteForGapeka,
        state.timetableSlots,
        state.activeServices,
        state.timestamp.minuteOfDay
      )
    : null;

  return (
    <div className="flex-1 flex flex-col p-4 pb-28 overflow-y-auto bg-[#020617] text-slate-100 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center space-x-2">
            <span className="text-lg">⏱️</span>
            <span>Pusat Dispatch & Jadwal KA</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            {state.activeServices.length} KA di Lintas • {state.timetableSlots.length} Slot Terdaftar
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center bg-[#0F172A] p-0.5 rounded-lg border border-[#334155]">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
              viewMode === 'cards'
                ? 'bg-[#F97316] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dispatch
          </button>
          <button
            onClick={() => setViewMode('gapeka')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
              viewMode === 'gapeka'
                ? 'bg-[#F97316] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gapeka
          </button>
        </div>
      </div>

      {/* Route Filter Scrollable Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        <button
          onClick={() => setSelectedRouteId('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            selectedRouteId === 'ALL'
              ? 'bg-white text-slate-900 shadow'
              : 'bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155]'
          }`}
        >
          Semua Rute ({state.timetableSlots.length})
        </button>
        {routes.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteId(r.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedRouteId === r.id
                ? 'bg-[#F97316] text-white shadow'
                : 'bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155]'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Main View: Mobile Dispatch Cards */}
      {viewMode === 'cards' ? (
        <div className="space-y-3">
          {filteredSlots.map((slot) => {
            const activeRun = state.activeServices.find((s) => s.timetableSlotId === slot.id);
            const route = routes.find((r) => r.id === slot.routeId);
            const consist = state.compositions.find((c) => c.id === slot.compositionId);
            const driver = state.employees.find((e) => e.id === slot.primaryDriverId);

            return (
              <div
                key={slot.id}
                className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Route Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E293B] to-[#334155] flex items-center justify-center text-xl shadow-inner border border-slate-600/40">
                      🚂
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#F97316]">
                          {slot.id}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {route?.code ?? 'KA-EXPRESS'}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm leading-tight mt-0.5">
                        {route?.name ?? 'Gambir - Bandung'}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {consist?.name ?? 'Rangkaian Standar'}
                      </div>
                    </div>
                  </div>

                  {/* Departure Time Pill */}
                  <div className="bg-[#1E293B] px-2.5 py-1 rounded-xl border border-[#334155] text-right">
                    <div className="text-[9px] uppercase font-mono text-slate-400 font-semibold">
                      Jadwal
                    </div>
                    <div className="text-xs font-mono font-black text-amber-400">
                      {formatClock(slot.departureMinuteOfDay)}
                    </div>
                  </div>
                </div>

                {/* Driver & Capacity Info Strip */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#1E293B]/70 p-2.5 rounded-xl border border-[#334155]/60">
                  <div className="flex items-center space-x-1.5 truncate">
                    <Users className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
                    <span className="truncate text-slate-300">
                      {driver?.name ?? 'Kru DAOP'}
                    </span>
                  </div>
                  <div className="text-right text-slate-400 text-[11px]">
                    Est: {formatDuration(route?.estimatedRuntimeMinutes ?? 160)}
                  </div>
                </div>

                {/* Big Action / Status Button */}
                {activeRun ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0369A1]/30 to-[#0284C7]/30 border border-[#0284C7]/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] animate-pulse" />
                      <span className="text-xs font-mono font-bold text-white">
                        SEDANG MELUNCUR DI LINTAS
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0EA5E9]">
                      {activeRun.totalPassengers} Pax
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => onDispatchSlot(slot.id)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all border border-emerald-400/40"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="tracking-wide">BERANGKATKAN SEKARANG</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Gapeka View */
        <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white font-mono">
              Grafik Gapeka — {activeRouteForGapeka?.name}
            </h3>
            <span className="text-[10px] font-mono text-amber-400">
              Waktu: {formatClock(state.timestamp.minuteOfDay)}
            </span>
          </div>

          <div className="w-full bg-[#020617] rounded-xl border border-[#334155] p-2 overflow-x-auto">
            <svg viewBox="0 0 600 240" className="w-full min-w-[480px] h-[220px]">
              {/* Hour Grid Lines */}
              {Array.from({ length: 9 }).map((_, i) => {
                const hour = i * 3;
                const x = 50 + (i / 8) * 510;
                return (
                  <g key={i}>
                    <line x1={x} y1={20} x2={x} y2={200} stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={x} y={214} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                      {hour.toString().padStart(2, '0')}:00
                    </text>
                  </g>
                );
              })}

              {/* Station Lines */}
              <line x1={50} y1={35} x2={560} y2={35} stroke="#334155" strokeWidth="1.5" />
              <text x={42} y={38} textAnchor="end" fill="#F8FAFC" fontSize="9" fontWeight="bold">
                GMR
              </text>

              <line x1={50} y1={190} x2={560} y2={190} stroke="#334155" strokeWidth="1.5" />
              <text x={42} y={193} textAnchor="end" fill="#F8FAFC" fontSize="9" fontWeight="bold">
                BD
              </text>

              {/* Service Trajectories */}
              {gapekaVm?.serviceLines.map((line) => {
                const x1 = 50 + (line.departureMinute / 1440) * 510;
                const x2 = 50 + (line.arrivalMinute / 1440) * 510;
                return (
                  <line
                    key={line.timetableSlotId}
                    x1={x1}
                    y1={35}
                    x2={x2}
                    y2={190}
                    stroke={line.colorHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Current Time Line */}
              {(() => {
                const nowX = 50 + (state.timestamp.minuteOfDay / 1440) * 510;
                return (
                  <line x1={nowX} y1={20} x2={nowX} y2={200} stroke="#F97316" strokeWidth="2" strokeDasharray="3 2" />
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
