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
      tooltip: 'Peta Operasi',
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
    <aside className="fixed bottom-5 right-4 z-40 flex flex-col items-center space-y-2 select-none pointer-events-auto">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isCurrentActive = activeTab === item.id && (item.id === 'network' || isSheetOpen);

        return (
          <button
            key={item.id}
            onClick={() => onToggleTab(item.id)}
            title={item.tooltip}
            aria-label={item.tooltip}
            className={`w-10 h-10 rounded-full flex items-center justify-center relative transition-all duration-150 shadow-md active:scale-95 ${
              isCurrentActive
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-blue-500/30'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4 stroke-[2.2]" />

            {/* Notification Badge if any */}
            {item.badge > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-mono font-bold rounded-full border border-white shadow-xs">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
};
