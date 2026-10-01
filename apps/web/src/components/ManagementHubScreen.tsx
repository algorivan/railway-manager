import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import { formatRupiah, createFinanceDashboardViewModel } from '@railway/ui';
import { CAMPAIGN_MISSION_CATALOG } from '@railway/missions';
import { BASE_MONTHLY_SALARIES } from '@railway/workforce';
import {
  Trophy,
  CircleDollarSign,
  Users,
  Briefcase,
  CheckCircle2,
  Lock,
  Sparkles,
  Coffee,
} from 'lucide-react';

interface ManagementHubScreenProps {
  readonly state: GameState;
}

type HubSection = 'missions' | 'finance' | 'workforce' | 'contracts';

export const ManagementHubScreen: React.FC<ManagementHubScreenProps> = ({ state }) => {
  const [activeSection, setActiveSection] = useState<HubSection>('missions');

  const financeVm = createFinanceDashboardViewModel(state.generalLedger);
  const activeRoutesCount = (state.routes ?? []).filter((r) => r.accessStatus === 'PERMIT_GRANTED').length;
  const fleetCount = state.fleetUnits.length;

  return (
    <div className="flex-1 flex flex-col text-slate-800 select-none">
      {/* Segmented Sub-Nav Pills */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-3 text-xs font-semibold">
        {[
          { id: 'missions' as HubSection, label: 'Misi', icon: Trophy, count: 2 },
          { id: 'finance' as HubSection, label: 'Keuangan', icon: CircleDollarSign },
          { id: 'workforce' as HubSection, label: 'Kru', icon: Users, count: state.employees.length },
          { id: 'contracts' as HubSection, label: 'Kargo', icon: Briefcase, count: state.b2bContracts.length },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mb-0.5" />
              <div className="flex items-center space-x-1">
                <span className="text-[11px]">{sec.label}</span>
                {sec.count !== undefined && sec.count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.1 rounded-full font-mono ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sec.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 1. MISI KAMPANYE */}
      {activeSection === 'missions' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-mono text-slate-500 uppercase">
              Target Operasi DJKA
            </span>
            <span className="text-[11px] font-mono text-amber-700 font-bold">
              Reputasi: {Math.round(state.reputation * 100)}%
            </span>
          </div>

          {CAMPAIGN_MISSION_CATALOG.map((mission, idx) => {
            const isFirst = idx === 0;
            const isCompleted = isFirst && fleetCount >= 4;
            const isUnlocked = isFirst || idx === 1;

            return (
              <div
                key={mission.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isUnlocked
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        TAHAP {mission.stage}
                      </span>
                      <h3 className="font-bold text-xs text-slate-900">{mission.title}</h3>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {mission.narrativeContext}
                    </p>
                  </div>

                  {isCompleted ? (
                    <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SELESAI</span>
                    </span>
                  ) : !isUnlocked ? (
                    <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-mono">
                      <Lock className="w-3 h-3" />
                      <span>TERKUNCI</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => alert(`Selesaikan sasaran untuk mengklaim bonus ${mission.title}!`)}
                      className="shrink-0 flex items-center space-x-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-2xs active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Klaim</span>
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                  {mission.objectives.map((obj) => {
                    let val = 0;
                    if (obj.type === 'DEPOT_BUILT') val = state.depots.length;
                    if (obj.type === 'PROCUREMENT_COMPLETED' || obj.type === 'FLEET_COUNT') val = fleetCount;
                    if (obj.type === 'ROUTE_COUNT') val = activeRoutesCount;

                    const pct = Math.min(100, Math.round((val / obj.targetValue) * 100));

                    return (
                      <div key={obj.id} className="text-xs">
                        <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                          <span className="truncate">{obj.description}</span>
                          <span className="font-mono font-bold text-slate-800 ml-2">
                            {val}/{obj.targetValue} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reward preview */}
                <div className="mt-2 bg-slate-50 px-2 py-1 rounded-md flex items-center justify-between text-[10px] font-mono border border-slate-200">
                  <span className="text-slate-500">Bonus Hadiah:</span>
                  <span className="font-bold text-emerald-700">
                    + {formatRupiah(mission.rewards.cashBonus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. KEUANGAN */}
      {activeSection === 'finance' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Saldo Kas Likuid
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                Margin: {financeVm.profitMarginFormatted}
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-700">
              {financeVm.currentCashBalanceFormatted}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-sans">Pendapatan Tiket</div>
                <div className="font-bold text-emerald-700 text-xs mt-0.5">
                  {financeVm.totalRevenueFormatted}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 font-sans">Beban OPEX</div>
                <div className="font-bold text-red-600 text-xs mt-0.5">
                  {financeVm.totalOpexFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Centers Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-600">
              Breakdown Beban Operasional (OPEX)
            </h4>
            {financeVm.costCenters.map((cc) => (
              <div key={cc.label} className="text-xs">
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-700 font-medium text-[11px]">{cc.label}</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">
                    {cc.amountFormatted} ({cc.percentageOfTotalOpex}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cc.percentageOfTotalOpex}%`, backgroundColor: cc.colorHex }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AWAK KRU */}
      {activeSection === 'workforce' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">
              Awak KA Aktif ({state.employees.length})
            </span>
            <span className="text-[11px] font-mono text-blue-700 font-medium">
              Beban: {formatRupiah(state.employees.reduce((s, e) => s + (BASE_MONTHLY_SALARIES[e.role] ?? 8_000_000), 0))} /bln
            </span>
          </div>

          {state.employees.map((emp) => {
            const fatigue = emp.fatigueLevel;
            const stamina = 100 - fatigue;

            return (
              <div
                key={emp.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">👨‍✈️</span>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{emp.name}</h4>
                    <span className="px-1.5 py-0.1 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {emp.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Dipo {emp.homeDepotId} • Jam Dinas: {emp.monthlyHoursWorked} Jam
                  </div>

                  {/* Stamina Meter */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Stamina:</span>
                    <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stamina < 40 ? 'bg-red-500' : stamina < 70 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${stamina}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        stamina < 40 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {stamina}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Kru ${emp.name} beristirahat di mess dipo!`)}
                  className="shrink-0 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-medium text-slate-700 flex items-center space-x-1 active:scale-95"
                >
                  <Coffee className="w-3 h-3 text-amber-600" />
                  <span>Istirahat</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. KARGO B2B */}
      {activeSection === 'contracts' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">
              Kontrak Logistik Aktif ({state.b2bContracts.length})
            </span>
          </div>

          {state.b2bContracts.map((ctr) => {
            const pct = Math.min(
              100,
              Math.round((ctr.deliveredVolumeTons / ctr.requiredWeeklyVolumeTons) * 100)
            );

            return (
              <div
                key={ctr.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {ctr.cargoCategory}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{ctr.clientName}</h4>
                    <div className="text-[10px] font-mono text-slate-500">
                      {ctr.originStationId.split('_')[1]} ➔ {ctr.destinationStationId.split('_')[1]}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold">
                      {ctr.status}
                    </span>
                    <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                      {formatRupiah(ctr.revenuePerTonDelivered)} /Ton
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span className="text-slate-500">Volume Terkirim:</span>
                    <span className="font-bold text-slate-800">
                      {ctr.deliveredVolumeTons} / {ctr.requiredWeeklyVolumeTons} Ton ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-100">
                  <span>Sisa Waktu: {ctr.remainingDays} Hari</span>
                  <span className="text-red-600">Penalti: {formatRupiah(ctr.latePenaltyPerTon)}/Ton</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
