import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { createConsistBuilderViewModel } from '@railway/ui';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

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
    <div className="flex-1 flex flex-col text-slate-800 select-none">
      {/* Header & Consist Selector */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <div className="text-xs font-bold text-slate-900">
            {state.fleetUnits.length} Unit Sarana • {state.compositions.length} Rangkaian
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Dipo Induk Pasirkaliki BD</div>
        </div>

        <select
          value={selectedCompId}
          onChange={(e) => setSelectedCompId(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600"
        >
          {state.compositions.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>

      {consistVm && (
        <div className="space-y-3">
          {/* Visual Consist Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-600">
                Formasi Rangkaian ({consistVm.totalSlotsUsed} Unit)
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  consistVm.isValidToAssemble
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {consistVm.isValidToAssemble ? 'LAIK OPERASI [PASS]' : 'TIDAK LAIK [FAIL]'}
              </span>
            </div>

            {/* Horizontal Scrollable Train Carriages */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {consistVm.slots.map((slot) => {
                let icon = '🚃';
                let tagColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (slot.isLocomotive) {
                  icon = '🚂';
                  tagColor = 'bg-blue-100 text-blue-800 border-blue-200';
                } else if (slot.isPowerCar) {
                  icon = '⚡';
                  tagColor = 'bg-amber-100 text-amber-800 border-amber-200';
                } else if (slot.isDining) {
                  icon = '🍽️';
                  tagColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                }

                return (
                  <div
                    key={slot.unitId}
                    className="shrink-0 w-32 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="w-4 h-4 rounded-full bg-white text-[9px] font-mono font-bold flex items-center justify-center text-slate-600 border border-slate-200">
                        {slot.slotIndex}
                      </span>
                      <span className={`text-[8px] font-mono font-bold px-1 py-0.1 rounded border uppercase ${tagColor}`}>
                        {slot.isLocomotive ? 'LOKO' : slot.isPowerCar ? 'PLTD' : slot.isDining ? 'M1' : 'K1/K3'}
                      </span>
                    </div>

                    <div className="text-center my-0.5 text-xl">{icon}</div>

                    <div className="text-center mt-1">
                      <div className="text-[10px] font-mono font-bold text-slate-900 truncate">
                        {slot.serialNumber}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        {slot.modelName}
                      </div>
                      <div className="mt-1 text-[10px] font-mono font-bold text-emerald-700">
                        {slot.conditionFormatted}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs font-mono text-center">
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-slate-500 block font-sans">Panjang</span>
                <span className="font-bold text-slate-800">{consistVm.totalLengthFormatted}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-slate-500 block font-sans">Kapasitas</span>
                <span className="font-bold text-blue-700">{consistVm.passengerCapacities.total} Kursi</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-slate-500 block font-sans">Kecepatan Izin</span>
                <span className="font-bold text-amber-700">{consistVm.maxSpeedFormatted}</span>
              </div>
            </div>
          </div>

          {/* Safety Checklist Badges */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-600 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Verifikasi Kelaikan Teknis Balai KA</span>
            </h3>

            {consistVm.checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  {item.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="text-slate-700 truncate font-medium text-[11px]">
                    {item.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold shrink-0 ml-2 ${
                    item.variant === 'success' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {item.badgeText}
                </span>
              </div>
            ))}
          </div>

          {/* Dipo Inventory */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-600 mb-2">
              Daftar Sarana di Dipo ({state.fleetUnits.length} Unit)
            </h3>
            <div className="space-y-1.5">
              {state.fleetUnits.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">🚆</span>
                    <div>
                      <div className="font-bold text-slate-900">{u.serialNumber}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{u.specId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-bold">
                      {u.conditionPercentage.toFixed(1)}% Bogie
                    </span>
                    <div className="text-[10px] text-slate-500">
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
