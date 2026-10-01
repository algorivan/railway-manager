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
  Clock,
  Sparkles,
  Coffee,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Box,
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
    <div className="flex-1 flex flex-col p-4 pb-28 overflow-y-auto bg-[#020617] text-slate-100 select-none">
      {/* HQ Header Card */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4 rounded-2xl border border-[#334155] shadow-xl relative overflow-hidden mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#F97316] to-amber-500 flex items-center justify-center text-2xl shadow-lg border border-amber-300/40">
              🏢
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#F97316] font-bold">
                KANTOR PUSAT • DIREKSI
              </div>
              <h2 className="text-base font-black text-white leading-tight">
                Manajemen PT KAI Persero
              </h2>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Wilayah Operasi: Lintas Pulau Jawa
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
              Kesehatan Kas
            </div>
            <div
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 border"
              style={{
                backgroundColor: financeVm.solvencyBadge.bgHex,
                color: financeVm.solvencyBadge.colorHex,
                borderColor: financeVm.solvencyBadge.colorHex + '50',
              }}
            >
              {financeVm.solvencyBadge.label}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Nav Pills (Mobile App Style) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#0F172A] rounded-xl border border-[#334155]/80 mb-4 text-xs font-bold">
        {[
          { id: 'missions' as HubSection, label: 'Misi', icon: Trophy, count: 2 },
          { id: 'finance' as HubSection, label: 'Keuangan', icon: CircleDollarSign },
          { id: 'workforce' as HubSection, label: 'Masinis', icon: Users, count: state.employees.length },
          { id: 'contracts' as HubSection, label: 'Kargo', icon: Briefcase, count: state.b2bContracts.length },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-[#F97316] to-[#EA580C] text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]/60'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <div className="flex items-center space-x-1">
                <span className="text-[11px]">{sec.label}</span>
                {sec.count !== undefined && sec.count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.1 rounded-full font-mono ${
                      isActive ? 'bg-white text-orange-600' : 'bg-slate-700 text-slate-300'
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

      {/* Content Section: 1. MISI KAMPANYE (Quests) */}
      {activeSection === 'missions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              Daftar Misi & Hadiah Regulator
            </span>
            <span className="text-[11px] font-mono text-amber-400 font-bold">
              Reputasi: {Math.round(state.reputation * 100)}% ★★★★★
            </span>
          </div>

          {CAMPAIGN_MISSION_CATALOG.map((mission, idx) => {
            const isFirst = idx === 0;
            const isCompleted = isFirst && fleetCount >= 4;
            const isUnlocked = isFirst || idx === 1;

            return (
              <div
                key={mission.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-r from-[#0F172A] to-[#064E3B]/30 border-emerald-500/40 shadow-lg'
                    : isUnlocked
                    ? 'bg-[#0F172A] border-[#334155] shadow'
                    : 'bg-[#0B1120] border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-[#F97316]/20 text-[#F97316] border border-orange-500/30">
                        TAHAP {mission.stage}
                      </span>
                      <h3 className="font-bold text-sm text-white">{mission.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {mission.narrativeContext}
                    </p>
                  </div>

                  {isCompleted ? (
                    <span className="shrink-0 flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>KLAIMED</span>
                    </span>
                  ) : !isUnlocked ? (
                    <span className="shrink-0 flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-800 text-slate-500 text-[10px] font-mono">
                      <Lock className="w-3 h-3" />
                      <span>TERKUNCI</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => alert(`Selesaikan seluruh sasaran operasi untuk mengklaim hadiah ${mission.title}!`)}
                      className="shrink-0 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Klaim</span>
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 pt-3 border-t border-[#334155]/60 space-y-2">
                  {mission.objectives.map((obj) => {
                    let val = 0;
                    if (obj.type === 'DEPOT_BUILT') val = state.depots.length;
                    if (obj.type === 'PROCUREMENT_COMPLETED' || obj.type === 'FLEET_COUNT') val = fleetCount;
                    if (obj.type === 'ROUTE_COUNT') val = activeRoutesCount;

                    const pct = Math.min(100, Math.round((val / obj.targetValue) * 100));

                    return (
                      <div key={obj.id} className="text-xs">
                        <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                          <span className="truncate">{obj.description}</span>
                          <span className="font-mono font-bold text-amber-400 ml-2">
                            {val}/{obj.targetValue} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#F97316] h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reward preview */}
                <div className="mt-3 bg-[#1E293B]/70 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Bonus Hadiah:</span>
                  <span className="font-bold text-emerald-400">
                    + {formatRupiah(mission.rewards.cashBonus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Section: 2. KEUANGAN (Financial Health) */}
      {activeSection === 'finance' && (
        <div className="space-y-4">
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                Saldo Kas Perusahaan
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Margin: {financeVm.profitMarginFormatted}
              </span>
            </div>
            <div className="text-2xl font-mono font-black text-emerald-400">
              {financeVm.currentCashBalanceFormatted}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
              <div className="bg-[#1E293B] p-2.5 rounded-lg border border-[#334155]/60">
                <div className="text-[10px] text-slate-400">Pendapatan Tiket</div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">
                  {financeVm.totalRevenueFormatted}
                </div>
              </div>
              <div className="bg-[#1E293B] p-2.5 rounded-lg border border-[#334155]/60">
                <div className="text-[10px] text-slate-400">Beban OPEX</div>
                <div className="font-bold text-red-400 text-sm mt-0.5">
                  {financeVm.totalOpexFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Centers Bar */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-400">
              Breakdown Beban Operasional (OPEX)
            </h4>
            {financeVm.costCenters.map((cc) => (
              <div key={cc.label} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 font-medium">{cc.label}</span>
                  <span className="font-mono font-bold text-white">
                    {cc.amountFormatted} ({cc.percentageOfTotalOpex}%)
                  </span>
                </div>
                <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
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

      {/* Content Section: 3. KRU MASINIS (Workforce) */}
      {activeSection === 'workforce' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Awak KA Terdaftar ({state.employees.length})
            </span>
            <span className="text-[11px] font-mono text-[#0EA5E9]">
              Payroll: {formatRupiah(state.employees.reduce((s, e) => s + (BASE_MONTHLY_SALARIES[e.role] ?? 8_000_000), 0))} /bln
            </span>
          </div>

          {state.employees.map((emp) => {
            const fatigue = emp.fatigueLevel;
            const stamina = 100 - fatigue;
            const isTired = fatigue > 50;

            return (
              <div
                key={emp.id}
                className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 shadow-md flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">👨‍✈️</span>
                    <h4 className="font-bold text-sm text-white truncate">{emp.name}</h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#1E293B] text-slate-300 border border-[#334155]">
                      {emp.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Dipo: {emp.homeDepotId} • Dinas: {emp.monthlyHoursWorked} Jam
                  </div>

                  {/* Stamina Meter */}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-mono">Stamina:</span>
                    <div className="w-20 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stamina < 40 ? 'bg-red-500' : stamina < 70 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${stamina}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        stamina < 40 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {stamina}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Masinis ${emp.name} beristirahat di mess dipo!`)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-slate-200 flex items-center space-x-1 active:scale-95"
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>Istirahat</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Section: 4. KARGO B2B (Logistics Contracts) */}
      {activeSection === 'contracts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
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
                className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#1E293B] text-amber-400 border border-amber-500/30">
                      {ctr.cargoCategory}
                    </span>
                    <h4 className="font-bold text-sm text-white mt-1">{ctr.clientName}</h4>
                    <div className="text-[11px] font-mono text-slate-400">
                      {ctr.originStationId.split('_')[1]} ➔ {ctr.destinationStationId.split('_')[1]}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      {ctr.status}
                    </span>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                      {formatRupiah(ctr.revenuePerTonDelivered)} /Ton
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">Volume Terkirim:</span>
                    <span className="font-bold text-amber-400">
                      {ctr.deliveredVolumeTons} / {ctr.requiredWeeklyVolumeTons} Ton ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-[#F97316] h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-[#334155]/60">
                  <span>Sisa Kontrak: {ctr.remainingDays} Hari</span>
                  <span className="text-red-400">Penalti: {formatRupiah(ctr.latePenaltyPerTon)}/Ton</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
