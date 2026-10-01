import React from 'react';
import { Map, Calendar, Layers, ShoppingBag, Building2 } from 'lucide-react';

export type MobileTab = 'network' | 'timetable' | 'fleet' | 'procurement' | 'hub';

interface MobileBottomDockProps {
  readonly activeTab: MobileTab;
  readonly onSelectTab: (tab: MobileTab) => void;
  readonly unfulfilledContractsCount: number;
  readonly activeMissionsCount: number;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeTab,
  onSelectTab,
  unfulfilledContractsCount,
  activeMissionsCount,
}) => {
  const tabs = [
    {
      id: 'network' as MobileTab,
      label: 'Radar',
      sub: 'Peta',
      icon: Map,
      badge: 0,
    },
    {
      id: 'timetable' as MobileTab,
      label: 'Jadwal',
      sub: 'Dispatch',
      icon: Calendar,
      badge: 0,
    },
    {
      id: 'fleet' as MobileTab,
      label: 'Armada',
      sub: 'Dipo',
      icon: Layers,
      badge: 0,
    },
    {
      id: 'procurement' as MobileTab,
      label: 'Pabrik',
      sub: 'INKA / GE',
      icon: ShoppingBag,
      badge: 0,
    },
    {
      id: 'hub' as MobileTab,
      label: 'Kantor',
      sub: 'HQ',
      icon: Building2,
      badge: unfulfilledContractsCount + activeMissionsCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1120]/95 backdrop-blur-lg border-t border-[#1E293B] pb-safe shadow-2xl select-none">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center relative rounded-xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Tab Glow Pill */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#F97316]/20 to-transparent rounded-xl border-t-2 border-[#F97316] pointer-events-none" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-gradient-to-b from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-500/30'
                      : 'bg-[#1E293B]/60 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                {/* Badge Notification */}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 bg-[#EF4444] text-white text-[9px] font-mono font-black rounded-full shadow border border-slate-900 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-1 font-bold tracking-tight ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
