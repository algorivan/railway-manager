import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { formatClock, formatDuration, createGapekaChartViewModel } from '@railway/ui';
import { Calendar, Play, CheckCircle2, Users } from 'lucide-react';

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
    <div className="flex-1 flex flex-col text-slate-800 select-none">
      {/* View Switcher and Route Filter Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        {/* Route Filter Scrollable Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedRouteId('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedRouteId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Semua ({state.timetableSlots.length})
          </button>
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRouteId(r.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRouteId === r.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'cards'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar
          </button>
          <button
            onClick={() => setViewMode('gapeka')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'gapeka'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gapeka
          </button>
        </div>
      </div>

      {/* Main View: Dispatch Cards (Standard Light Sim Theme) */}
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
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                {/* Route Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-lg text-blue-700 shrink-0">
                      🚂
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] font-bold text-blue-700">
                          {slot.id}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {route?.code ?? 'KA-EXPRESS'}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                        {route?.name ?? 'Gambir - Bandung'}
                      </h3>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {consist?.name ?? 'Rangkaian Standar'}
                      </div>
                    </div>
                  </div>

                  {/* Departure Time Pill */}
                  <div className="bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-right shrink-0">
                    <div className="text-[9px] uppercase font-mono text-amber-700 font-semibold">
                      Jadwal
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-900">
                      {formatClock(slot.departureMinuteOfDay)}
                    </div>
                  </div>
                </div>

                {/* Driver & Info Strip */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-1.5 truncate">
                    <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate text-slate-700 font-sans">
                      {driver?.name ?? 'Kru DAOP'}
                    </span>
                  </div>
                  <div className="text-right text-slate-500 text-[11px]">
                    Est: {formatDuration(route?.estimatedRuntimeMinutes ?? 160)}
                  </div>
                </div>

                {/* Action / Status Button */}
                {activeRun ? (
                  <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="text-xs font-mono font-bold text-emerald-800">
                        SEDANG BEROPERASI DI LINTAS
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {activeRun.totalPassengers} Pax
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => onDispatchSlot(slot.id)}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>BERANGKATKAN SEKARANG</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Gapeka View */
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 font-mono">
              Gapeka — {activeRouteForGapeka?.name}
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Waktu: {formatClock(state.timestamp.minuteOfDay)}
            </span>
          </div>

          <div className="w-full bg-slate-50 rounded-lg border border-slate-200 p-2 overflow-x-auto">
            <svg viewBox="0 0 600 220" className="w-full min-w-[440px] h-[200px]">
              {Array.from({ length: 9 }).map((_, i) => {
                const hour = i * 3;
                const x = 50 + (i / 8) * 510;
                return (
                  <g key={i}>
                    <line x1={x} y1={20} x2={x} y2={180} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={x} y={195} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                      {hour.toString().padStart(2, '0')}:00
                    </text>
                  </g>
                );
              })}

              <line x1={50} y1={35} x2={560} y2={35} stroke="#CBD5E1" strokeWidth="1.5" />
              <text x={42} y={38} textAnchor="end" fill="#334155" fontSize="9" fontWeight="bold">
                GMR
              </text>

              <line x1={50} y1={170} x2={560} y2={170} stroke="#CBD5E1" strokeWidth="1.5" />
              <text x={42} y={173} textAnchor="end" fill="#334155" fontSize="9" fontWeight="bold">
                BD
              </text>

              {gapekaVm?.serviceLines.map((line) => {
                const x1 = 50 + (line.departureMinute / 1440) * 510;
                const x2 = 50 + (line.arrivalMinute / 1440) * 510;
                return (
                  <line
                    key={line.timetableSlotId}
                    x1={x1}
                    y1={35}
                    x2={x2}
                    y2={170}
                    stroke={line.colorHex === '#10B981' ? '#1D4ED8' : line.colorHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })}

              {(() => {
                const nowX = 50 + (state.timestamp.minuteOfDay / 1440) * 510;
                return (
                  <line x1={nowX} y1={20} x2={nowX} y2={180} stroke="#EA580C" strokeWidth="2" strokeDasharray="3 2" />
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
