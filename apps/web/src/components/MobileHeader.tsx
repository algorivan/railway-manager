import React, { useState } from 'react';
import { GameState, SimulationSpeed } from '@railway/simulation';
import { createGlobalStatusBarViewModel } from '@railway/ui';
import { Award, Wallet, Fuel, Clock, Play, Pause, FastForward, ChevronDown, Plus } from 'lucide-react';

interface MobileHeaderProps {
  readonly state: GameState;
  readonly onSetSpeed: (speed: SimulationSpeed) => void;
  readonly onStepMinutes: (minutes: number) => void;
  readonly onQuickDispatch: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  state,
  onSetSpeed,
  onStepMinutes,
  onQuickDispatch,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const vm = createGlobalStatusBarViewModel(state);

  const speedCycle: SimulationSpeed[] = ['PAUSED', '1X', '2X', '4X', '8X'];
  const nextSpeed = () => {
    const currentIndex = speedCycle.indexOf(state.speed);
    const next = speedCycle[(currentIndex + 1) % speedCycle.length] ?? '1X';
    onSetSpeed(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1120]/95 backdrop-blur-md border-b border-[#1E293B] shadow-xl select-none">
      {/* Primary Top HUD: Resources & Currencies (Airlines Manager 4 style) */}
      <div className="px-3 py-2 flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: Company Emblem & Level */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center font-black text-white shadow-md text-base border border-amber-300/30">
            🚂
          </div>
          <div className="hidden xs:block">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-black uppercase text-[#F97316] font-mono tracking-wider">
                LVL 1
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-500"></span>
              <span className="text-xs font-bold text-white leading-none">
                KAI Persero
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">Lintas Jawa</div>
          </div>
        </div>

        {/* Center: Currency / Cash Balance Pill (Gold/Emerald) */}
        <div className="flex items-center space-x-1.5 bg-gradient-to-r from-[#064E3B]/80 to-[#022C22]/90 px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-inner">
          <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400">
            <Wallet className="w-2.5 h-2.5" />
          </div>
          <span className="text-xs font-mono font-black text-emerald-300 tracking-tight">
            {vm.cashBalanceCompact}
          </span>
        </div>

        {/* Right: Reputation Stars & Fuel */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Reputation Pill */}
          <div className="flex items-center space-x-1 bg-[#1E293B]/80 px-2 py-1 rounded-full border border-amber-500/30">
            <Award className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] font-mono font-bold text-amber-400">
              {Math.round(state.reputation * 100)}%
            </span>
          </div>

          {/* Quick Dispatch Shortcut */}
          <button
            onClick={onQuickDispatch}
            className="flex items-center space-x-1 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all border border-orange-400/30"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span className="hidden sm:inline">Dispatch</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Simulation Clock, Speed Controller & Quick Stepper */}
      <div className="px-3 py-1 bg-[#020617]/90 border-t border-[#1E293B]/60 flex items-center justify-between text-[11px] font-mono">
        {/* Clock & Active Trains */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-slate-300">
            <Clock className="w-3 h-3 text-[#0EA5E9]" />
            <span className="font-bold text-white">{vm.simClockLabel}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center space-x-1 text-[#0EA5E9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
            <span className="font-semibold">{vm.activeServicesCount} KA Aktif</span>
          </div>
        </div>

        {/* Speed Controls (Tap to cycle or open buttons) */}
        <div className="flex items-center space-x-1">
          {/* Quick cycle button */}
          <button
            onClick={nextSpeed}
            className={`px-2 py-0.5 rounded font-bold transition-all flex items-center space-x-1 ${
              state.speed === 'PAUSED'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-[#F97316] text-white shadow-sm shadow-orange-500/30'
            }`}
          >
            {state.speed === 'PAUSED' ? (
              <>
                <Pause className="w-2.5 h-2.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{state.speed}</span>
              </>
            )}
          </button>

          {/* Manual Jump buttons */}
          <div className="flex items-center space-x-0.5 bg-[#0F172A] p-0.5 rounded border border-[#334155]/60">
            <button
              onClick={() => onStepMinutes(1)}
              className="px-1.5 py-0.5 hover:bg-[#1E293B] text-slate-400 hover:text-white rounded"
              title="+1 Menit"
            >
              +1m
            </button>
            <button
              onClick={() => onStepMinutes(60)}
              className="px-1.5 py-0.5 hover:bg-[#1E293B] text-slate-400 hover:text-white rounded"
              title="+1 Jam"
            >
              +1j
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
