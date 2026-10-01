import React from 'react';
import { GameState, SimulationSpeed } from '@railway/simulation';
import { createGlobalStatusBarViewModel } from '@railway/ui';
import { Clock, Play, Pause, FastForward, Activity, Award, Wallet, Plus } from 'lucide-react';

interface TopStatusBarProps {
  readonly state: GameState;
  readonly onSetSpeed: (speed: SimulationSpeed) => void;
  readonly onStepMinutes: (minutes: number) => void;
  readonly onQuickDispatch: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  state,
  onSetSpeed,
  onStepMinutes,
  onQuickDispatch,
}) => {
  const vm = createGlobalStatusBarViewModel(state);

  return (
    <header className="h-16 bg-[#0F172A] border-b border-[#334155] px-6 flex items-center justify-between shadow-md z-30 select-none">
      {/* Left: Brand Identity & Clock */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center font-bold text-white shadow-lg text-lg">
            🚂
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              Kereta Api Manager
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              Lintas Jawa • persero
            </p>
          </div>
        </div>

        {/* Sim Clock */}
        <div className="flex items-center space-x-2 bg-[#1E293B] px-3 py-1.5 rounded-md border border-[#334155]">
          <Clock className="w-4 h-4 text-[#F97316]" />
          <span className="text-xs font-mono font-semibold tracking-wide text-slate-200">
            {vm.simClockLabel}
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center bg-[#020617] p-1 rounded-lg border border-[#334155] space-x-1">
          {vm.speedOptions.map((opt) => (
            <button
              key={opt.speed}
              onClick={() => onSetSpeed(opt.speed)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                opt.active
                  ? 'bg-[#F97316] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Manual Step Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onStepMinutes(1)}
            title="Maju 1 Menit"
            className="px-2 py-1 text-[11px] font-mono bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded border border-[#334155] transition-colors"
          >
            +1m
          </button>
          <button
            onClick={() => onStepMinutes(60)}
            title="Maju 1 Jam"
            className="px-2 py-1 text-[11px] font-mono bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded border border-[#334155] transition-colors"
          >
            +1j
          </button>
          <button
            onClick={() => onStepMinutes(1440)}
            title="Maju 1 Hari"
            className="px-2 py-1 text-[11px] font-mono bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded border border-[#334155] transition-colors"
          >
            +1h
          </button>
        </div>
      </div>

      {/* Right: Cash Balance, Reputation, Status Badges */}
      <div className="flex items-center space-x-5">
        {/* Quick Dispatch Action */}
        <button
          onClick={onQuickDispatch}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Berangkatkan KA</span>
        </button>

        {/* Liquid Cash */}
        <div className="flex items-center space-x-2 bg-[#1E293B] px-3.5 py-1.5 rounded-lg border border-[#334155]">
          <Wallet className="w-4 h-4 text-[#10B981]" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium leading-none">
              Saldo Kas
            </div>
            <div
              className={`text-xs font-mono font-bold ${
                vm.isOverdrawn ? 'text-[#EF4444]' : 'text-[#10B981]'
              }`}
            >
              {vm.cashBalanceFormatted}
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="flex items-center space-x-2 bg-[#1E293B] px-3 py-1.5 rounded-lg border border-[#334155]">
          <Award className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium leading-none">
              Reputasi
            </div>
            <div className="text-xs font-bold text-amber-400 font-mono">
              {vm.reputationGaugeFormatted}
            </div>
          </div>
        </div>

        {/* Active Trains Badge */}
        <div className="flex items-center space-x-1.5 bg-[#020617] px-3 py-1.5 rounded-lg border border-[#334155]">
          <Activity className="w-3.5 h-3.5 text-[#0EA5E9] animate-pulse" />
          <span className="text-xs text-slate-300 font-mono font-semibold">
            {vm.activeServicesCount} KA Aktif
          </span>
        </div>

        {/* Solvency Badge */}
        <div
          className="px-2.5 py-1 rounded text-xs font-bold font-mono"
          style={{ backgroundColor: vm.solvencyBadge.bgHex, color: vm.solvencyBadge.colorHex }}
        >
          {vm.solvencyBadge.label}
        </div>
      </div>
    </header>
  );
};
