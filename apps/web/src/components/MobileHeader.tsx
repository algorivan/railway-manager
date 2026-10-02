import React, { useState } from 'react';
import { GameState, SimulationSpeed } from '@railway/simulation';
import { createGlobalStatusBarViewModel } from '@railway/ui';
import { Award, Wallet, Clock, Play, Pause, Plus, Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

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
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.getMuted());
  const vm = createGlobalStatusBarViewModel(state);

  const speedCycle: SimulationSpeed[] = ['PAUSED', '1X', '2X', '4X', '8X'];
  const nextSpeed = () => {
    soundEffects.playClickSound();
    const currentIndex = speedCycle.indexOf(state.speed);
    const next = speedCycle[(currentIndex + 1) % speedCycle.length] ?? '1X';
    onSetSpeed(next);
  };

  const handleToggleMute = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundEffects.playClickSound();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-xs select-none">
      {/* Primary Top HUD: Resources & Currencies (Clean Lightweight Sim Style) */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-2">
        {/* Left: Company Emblem & Level */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-white shadow-xs text-sm">
            🚂
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono font-bold text-blue-700 uppercase">
                LVL 1
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs font-bold text-slate-800 leading-none">
                KAI Persero
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Lintas Jawa</div>
          </div>
        </div>

        {/* Center: Currency / Cash Balance Pill (Clean Emerald) */}
        <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-mono font-bold text-emerald-700 tracking-tight">
            {vm.cashBalanceCompact}
          </span>
        </div>

        {/* Right: Sound Toggle, Reputation & Quick Dispatch */}
        <div className="flex items-center space-x-1.5">
          {/* Sound Mute/Unmute Toggle */}
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
              isMuted
                ? 'bg-slate-100 text-slate-400 border-slate-300'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
            title={isMuted ? 'Aktifkan Suara Audio' : 'Bisukan Suara Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Reputation Pill */}
          <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-mono font-bold text-amber-700">
              {Math.round(state.reputation * 100)}%
            </span>
          </div>

          {/* Quick Dispatch Shortcut */}
          <button
            onClick={onQuickDispatch}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Dispatch</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Simulation Clock, Speed Controller & Stepper */}
      <div className="px-3.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono">
        {/* Clock & Active Trains */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-slate-600">
            <Clock className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-slate-800">{vm.simClockLabel}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center space-x-1 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="font-medium">{vm.activeServicesCount} KA Beroperasi</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={nextSpeed}
            className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center space-x-1 border ${
              state.speed === 'PAUSED'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-blue-700 border-slate-300 shadow-2xs hover:bg-slate-50'
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

          {/* Stepper buttons */}
          <div className="flex items-center space-x-0.5 bg-white p-0.5 rounded border border-slate-200">
            <button
              onClick={() => {
                soundEffects.playClickSound();
                onStepMinutes(1);
              }}
              className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded font-medium"
              title="+1 Menit"
            >
              +1m
            </button>
            <button
              onClick={() => {
                soundEffects.playClickSound();
                onStepMinutes(60);
              }}
              className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded font-medium"
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
