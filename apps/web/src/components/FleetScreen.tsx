import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { createConsistBuilderViewModel } from '@railway/ui';
import { Layers, Train, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Wrench, Info } from 'lucide-react';

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
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#F97316]" />
            <span>Formasi Rangkaian & Manajemen Armada</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inspeksi susunan gerbong kereta, validasi keselamatan Bogie, kapasitas penumpang, dan kelaikan operasi.
          </p>
        </div>

        {/* Consist Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-medium">Pilih Rangkaian:</label>
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            className="bg-[#1E293B] border border-[#334155] text-xs font-semibold text-white rounded-lg px-3 py-2 outline-none focus:border-[#F97316]"
          >
            {state.compositions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {consistVm && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Consist Stats & Validation Checklist */}
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">Metrik Rangkaian</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    consistVm.isValidToAssemble
                      ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {consistVm.isValidToAssemble ? 'LAIK OPERASI [PASS]' : 'TIDAK LAIK [FAIL]'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-[#1E293B] p-3 rounded-lg border border-[#334155]">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Panjang Total</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {consistVm.totalLengthFormatted}
                  </div>
                  <div className="text-[10px] text-slate-400">Batas Maks: 400 m</div>
                </div>

                <div className="bg-[#1E293B] p-3 rounded-lg border border-[#334155]">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Berat Rangkaian</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {consistVm.totalWeightFormatted}
                  </div>
                  <div className="text-[10px] text-slate-400">Tare Weight (Kosong)</div>
                </div>

                <div className="bg-[#1E293B] p-3 rounded-lg border border-[#334155]">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Kecepatan Izin</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">
                    {consistVm.maxSpeedFormatted}
                  </div>
                  <div className="text-[10px] text-slate-400">Dibatasi bogie terendah</div>
                </div>

                <div className="bg-[#1E293B] p-3 rounded-lg border border-[#334155]">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Total Kapasitas</div>
                  <div className="text-base font-bold text-[#0EA5E9] mt-0.5">
                    {consistVm.passengerCapacities.total} Kursi
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Eks: {consistVm.passengerCapacities.executive} | Eko: {consistVm.passengerCapacities.economy}
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Checklist (UI_SPEC.md §3.2) */}
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span>Kelaikan Teknis Balai Pengujian KA</span>
              </h3>
              <div className="space-y-2.5">
                {consistVm.checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className="text-slate-200 font-medium">{item.label}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        item.variant === 'success'
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : item.variant === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Visual Formation Slots */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Susunan Fisik Rangkaian ({consistVm.totalSlotsUsed} / {consistVm.maxSlots} Unit)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Urutan unit dari Lokomotif Utama hingga Kereta Pembangkit / Ekor.
                  </p>
                </div>
              </div>

              {/* Slot Cards List */}
              <div className="space-y-3">
                {consistVm.slots.map((slot) => {
                  let badgeBg = 'bg-slate-700 text-slate-300';
                  let icon = '🚃';
                  if (slot.isLocomotive) {
                    badgeBg = 'bg-[#F97316] text-white';
                    icon = '🚂';
                  } else if (slot.isPowerCar) {
                    badgeBg = 'bg-amber-600 text-white';
                    icon = '⚡';
                  } else if (slot.isDining) {
                    badgeBg = 'bg-blue-600 text-white';
                    icon = '🍽️';
                  }

                  return (
                    <div
                      key={slot.unitId}
                      className="flex items-center justify-between p-3.5 bg-[#1E293B] rounded-xl border border-[#334155] hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-7 h-7 rounded-full bg-[#020617] border border-[#334155] flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                          {slot.slotIndex}
                        </div>
                        <div className="text-xl">{icon}</div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white text-xs">
                              {slot.serialNumber}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${badgeBg}`}
                            >
                              {slot.isLocomotive
                                ? 'Lokomotif'
                                : slot.isPowerCar
                                ? 'Pembangkit (P)'
                                : slot.isDining
                                ? 'Restorasi (M)'
                                : 'Kereta Penumpang'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            {slot.modelName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Kondisi Fisik</div>
                          <div className="font-mono text-xs font-bold text-emerald-400">
                            {slot.conditionFormatted}
                          </div>
                        </div>
                        <div
                          className="px-2 py-1 rounded text-[10px] font-mono font-bold"
                          style={{
                            backgroundColor: slot.conditionBadge.bgHex,
                            color: slot.conditionBadge.colorHex,
                          }}
                        >
                          {slot.conditionBadge.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Depot Inventory List */}
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
              <h3 className="font-bold text-white text-sm mb-3">
                Inventaris Seluruh Unit di Dipo ({state.fleetUnits.length} Unit)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#1E293B] text-slate-400 font-mono uppercase text-[10px] border-b border-[#334155]">
                      <th className="py-2.5 px-3">Nomor Seri</th>
                      <th className="py-2.5 px-3">Tipe Spek</th>
                      <th className="py-2.5 px-3">Dipo Induk</th>
                      <th className="py-2.5 px-3">Kondisi Bogie</th>
                      <th className="py-2.5 px-3">Odometer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60 font-mono">
                    {state.fleetUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-[#1E293B]/40">
                        <td className="py-2.5 px-3 font-bold text-white">{unit.serialNumber}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">{unit.specId}</td>
                        <td className="py-2.5 px-3 text-slate-400">{unit.homeDepotId}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{unit.conditionPercentage.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-slate-300">{unit.odometerKm.toLocaleString('id-ID')} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
