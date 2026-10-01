import React from 'react';
import { Map, Calendar, Layers, ShoppingBag, Building2 } from 'lucide-react';

export type FloatingTab = 'network' | 'timetable' | 'fleet' | 'procurement' | 'hub';

interface FloatingActionDockProps {
  readonly activeTab: FloatingTab;
  readonly isSheetOpen: boolean;
  readonly onToggleTab: (tab: FloatingTab) => void;
  readonly unfulfilledContractsCount: number;
  readonly activeMissionsCount: number;
}

export const FloatingActionDock: React.FC<FloatingActionDockProps> = ({
  activeTab,
  isSheetOpen,
  onToggleTab,
  unfulfilledContractsCount,
  activeMissionsCount,
}) => {
  const dockItems = [
    {
      id: 'network' as FloatingTab,
      icon: Map,
      tooltip: 'Peta Radar',
      badge: 0,
    },
    {
      id: 'timetable' as FloatingTab,
      icon: Calendar,
      tooltip: 'Jadwal & Dispatch',
      badge: 0,
    },
    {
      id: 'fleet' as FloatingTab,
      icon: Layers,
      tooltip: 'Armada & Dipo',
      badge: 0,
    },
    {
      id: 'procurement' as FloatingTab,
      icon: ShoppingBag,
      tooltip: 'Pabrik INKA',
      badge: 0,
    },
    {
      id: 'hub' as FloatingTab,
      icon: Building2,
      tooltip: 'Kantor Direksi',
      badge: unfulfilledContractsCount + activeMissionsCount,
    },
  ];

  return (
    <aside className="fixed bottom-6 right-4 z-40 flex flex-col items-center space-y-2 select-none">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isCurrentActive = activeTab === item.id && (item.id === 'network' || isSheetOpen);

        return (
          <button
            key={item.id}
            onClick={() => onToggleTab(item.id)}
            title={item.tooltip}
            aria-label={item.tooltip}
            className={`w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-200 shadow-xl active:scale-90 ${
              isCurrentActive
                ? 'bg-gradient-to-tr from-[#F97316] to-[#EA580C] text-white shadow-orange-500/40 ring-2 ring-orange-400 scale-105'
                : 'bg-[#0F172A]/90 backdrop-blur-md text-slate-300 hover:text-white hover:bg-[#1E293B] border border-[#334155]/80'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />

            {/* Notification Badge if any */}
            {item.badge > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#EF4444] text-white text-[9px] font-mono font-black rounded-full border border-slate-900 shadow animate-pulse">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
};
