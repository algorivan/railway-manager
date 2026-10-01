import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { createConsistBuilderViewModel } from '@railway/ui';
import { Layers, ShieldCheck, CheckCircle2, AlertTriangle, Wrench, Train } from 'lucide-react';

interface FleetScreenProps {
  readonly state: GameState;
}

export const FleetScreen: React.FC<FleetScreenProps> = ({ state }) => {
  const [selectedCompId, setSelectedCompId] = useState<string>(
    state.compositions[0]?.id ?? ''
  );

  const selectedComp = state.compositions.find((c) => c.id === selectedCompId) ?? state.compositions[0];
  const consistVm = selectedComp
    ? createConsistBuilderViewModel(selectedComp, state.fleetUnits)
    : null;

  return (
    <div className="flex-1 flex flex-col p-4 pb-28 overflow-y-auto bg-[#020617] text-slate-100 select-none">
      {/* Header & Consist Selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center space-x-2">
            <span className="text-lg">🚆</span>
            <span>Dipo & Formasi Rangkaian</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            {state.fleetUnits.length} Unit Sarana di Dipo • {state.compositions.length} Rangkaian Siap
          </p>
        </div>

        {/* Consist Selector Dropdown */}
        <select
          value={selectedCompId}
          onChange={(e) => setSelectedCompId(e.target.value)}
          className="bg-[#1E293B] border border-[#334155] text-xs font-bold text-white rounded-xl px-3 py-1.5 outline-none focus:border-[#F97316]"
        >
          {state.compositions.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>

      {consistVm && (
        <div className="space-y-4">
          {/* Visual Horizontal Train Strip (Game Style) */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">
                Susunan Rangkaian Kereta Api ({consistVm.totalSlotsUsed} Unit)
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  consistVm.isValidToAssemble
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {consistVm.isValidToAssemble ? 'LAIK OPERASI [PASS]' : 'TIDAK LAIK [FAIL]'}
              </span>
            </div>

            {/* Horizontal Scrollable Train Carriages */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-3 pt-1 scrollbar-thin">
              {consistVm.slots.map((slot) => {
                let icon = '🚃';
                let tagColor = 'bg-[#1E293B] text-slate-300';
                if (slot.isLocomotive) {
                  icon = '🚂';
                  tagColor = 'bg-[#F97316] text-white';
                } else if (slot.isPowerCar) {
                  icon = '⚡';
                  tagColor = 'bg-amber-600 text-white';
                } else if (slot.isDining) {
                  icon = '🍽️';
                  tagColor = 'bg-blue-600 text-white';
                }

                return (
                  <div
                    key={slot.unitId}
                    className="shrink-0 w-36 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-3 rounded-xl border border-[#334155] flex flex-col justify-between shadow-md relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-5 h-5 rounded-full bg-[#020617] text-[10px] font-mono font-bold flex items-center justify-center text-slate-400">
                        {slot.slotIndex}
                      </span>
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${tagColor}`}>
                        {slot.isLocomotive ? 'LOKO' : slot.isPowerCar ? 'PLTD' : slot.isDining ? 'M1' : 'K1/K3'}
                      </span>
                    </div>

                    <div className="text-center my-1 text-2xl">{icon}</div>

                    <div className="mt-2 text-center">
                      <div className="text-[11px] font-mono font-bold text-white truncate">
                        {slot.serialNumber}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">
                        {slot.modelName}
                      </div>
                      <div className="mt-1.5 text-[10px] font-mono font-bold text-emerald-400">
                        {slot.conditionFormatted}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consist Quick Stats Badges */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-[#334155]/60 text-xs font-mono">
              <div className="bg-[#1E293B] p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block font-sans">Panjang</span>
                <span className="font-bold text-white">{consistVm.totalLengthFormatted}</span>
              </div>
              <div className="bg-[#1E293B] p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block font-sans">Kapasitas</span>
                <span className="font-bold text-[#0EA5E9]">{consistVm.passengerCapacities.total} Kursi</span>
              </div>
              <div className="bg-[#1E293B] p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block font-sans">Maks Speed</span>
                <span className="font-bold text-amber-400">{consistVm.maxSpeedFormatted}</span>
              </div>
            </div>
          </div>

          {/* Safety Checklist Badges */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-xl space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verifikasi Kelaikan Teknis Balai KA</span>
            </h3>

            {consistVm.checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#1E293B]/70 border border-[#334155]/60 text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  {item.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className="text-slate-200 truncate font-medium text-[11px]">
                    {item.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ml-2 ${
                    item.variant === 'success' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {item.badgeText}
                </span>
              </div>
            ))}
          </div>

          {/* Spare Units at Depot */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3">
              Armada di Dipo Cadangan ({state.fleetUnits.length} Unit)
            </h3>
            <div className="space-y-2">
              {state.fleetUnits.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 bg-[#1E293B] rounded-xl border border-[#334155]/60 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">🚆</span>
                    <div>
                      <div className="font-bold text-white">{u.serialNumber}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{u.specId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold">
                      {u.conditionPercentage.toFixed(1)}% Bogie
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {u.odometerKm.toLocaleString('id-ID')} km
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
