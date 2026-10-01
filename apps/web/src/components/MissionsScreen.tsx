import React from 'react';
import { GameState } from '@railway/simulation';
import { CAMPAIGN_MISSION_CATALOG } from '@railway/missions';
import { formatRupiah } from '@railway/ui';
import { Trophy, CheckCircle2, Lock, Award, ArrowRight, Star } from 'lucide-react';

interface MissionsScreenProps {
  readonly state: GameState;
}

export const MissionsScreen: React.FC<MissionsScreenProps> = ({ state }) => {
  // Determine current active/completed mission progress from GameState
  const currentRep = state.reputation;
  const activeRoutesCount = (state.routes ?? []).filter((r) => r.accessStatus === 'PERMIT_GRANTED').length;
  const fleetCount = state.fleetUnits.length;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Tahapan Kampanye & Misi Progresi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Selesaikan tujuan operasional untuk membuka lokomotif baru, izin konsesi lintas, dan bonus subsidi pemerintah.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-[#0F172A] px-3.5 py-1.5 rounded-lg border border-[#334155]">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono text-slate-300">
            Reputasi Saat Ini: <strong className="text-amber-400 font-bold">{Math.round(currentRep * 100)}%</strong>
          </span>
        </div>
      </div>

      {/* Campaign Roadmap Stages */}
      <div className="mt-6 space-y-6">
        {CAMPAIGN_MISSION_CATALOG.map((mission, idx) => {
          // Calculate objective progress dynamically based on game state
          const isFirstMission = idx === 0;
          const isUnlocked = isFirstMission || idx === 1; // Stage 0 starter missions
          const isCompleted = idx === 0 && fleetCount >= 4;

          return (
            <div
              key={mission.id}
              className={`bg-[#0F172A] border rounded-xl p-5 shadow-lg transition-all ${
                isCompleted
                  ? 'border-[#10B981]/50 bg-gradient-to-r from-[#0F172A] to-[#064E3B]/20'
                  : isUnlocked
                  ? 'border-[#334155]'
                  : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#1E293B] text-[#F97316] border border-[#334155]">
                      Tahap {mission.stage}
                    </span>
                    <h3 className="font-bold text-base text-white">{mission.title}</h3>
                    {isCompleted && (
                      <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SELESAI</span>
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="flex items-center space-x-1 text-slate-500 text-xs font-mono">
                        <Lock className="w-3 h-3" />
                        <span>TERKUNCI</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl">{mission.narrativeContext}</p>
                </div>

                {/* Rewards Card */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-3 min-w-[200px] text-xs font-mono">
                  <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold mb-1">
                    Hadiah Penyelesaian:
                  </div>
                  <div className="text-emerald-400 font-bold">
                    + {formatRupiah(mission.rewards.cashBonus)}
                  </div>
                  <div className="text-amber-400 text-[11px] mt-0.5">
                    + {(mission.rewards.reputationBonus * 100).toFixed(0)}% Reputasi DJKA
                  </div>
                  {mission.rewards.unlockedSpecIds.length > 0 && (
                    <div className="text-slate-300 text-[10px] mt-1 truncate">
                      Buka: {mission.rewards.unlockedSpecIds.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Objectives List */}
              <div className="mt-4 pt-3 border-t border-[#334155]/60 space-y-2.5">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Sasaran Operasi:
                </div>
                {mission.objectives.map((obj) => {
                  let progressVal = 0;
                  if (obj.type === 'DEPOT_BUILT') progressVal = state.depots.length;
                  if (obj.type === 'PROCUREMENT_COMPLETED' || obj.type === 'FLEET_COUNT') progressVal = fleetCount;
                  if (obj.type === 'ROUTE_COUNT') progressVal = activeRoutesCount;

                  const percent = Math.min(100, Math.round((progressVal / obj.targetValue) * 100));

                  return (
                    <div key={obj.id} className="bg-[#1E293B]/70 p-3 rounded-lg border border-[#334155]/40 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-200 font-medium">{obj.description}</span>
                        <span className="font-mono font-bold text-slate-300">
                          {progressVal} / {obj.targetValue} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#020617] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F97316] rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
