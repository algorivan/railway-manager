import React from 'react';
import {
  Map,
  Calendar,
  Layers,
  ShoppingBag,
  CircleDollarSign,
  Trophy,
  Users,
  Briefcase,
} from 'lucide-react';

export type ScreenTab =
  | 'network'
  | 'timetable'
  | 'fleet'
  | 'procurement'
  | 'finance'
  | 'missions'
  | 'workforce'
  | 'contracts';

interface SidebarProps {
  readonly activeTab: ScreenTab;
  readonly onSelectTab: (tab: ScreenTab) => void;
  readonly unfulfilledContractsCount: number;
  readonly activeAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unfulfilledContractsCount,
  activeAlertsCount,
}) => {
  const menuItems = [
    { id: 'network' as ScreenTab, label: 'Peta Operasi', sub: 'Pulau Jawa Corridor', icon: Map },
    { id: 'timetable' as ScreenTab, label: 'Jadwal & Gapeka', sub: 'Grafik Perjalanan', icon: Calendar },
    { id: 'fleet' as ScreenTab, label: 'Rangkaian Armada', sub: 'Consist Builder', icon: Layers },
    { id: 'procurement' as ScreenTab, label: 'Pengadaan Sarana', sub: 'Pabrik INKA & GE', icon: ShoppingBag },
    { id: 'finance' as ScreenTab, label: 'Laporan Keuangan', sub: 'Arus Kas & OPEX', icon: CircleDollarSign },
    { id: 'missions' as ScreenTab, label: 'Misi & Tahapan', sub: 'Progression Stages', icon: Trophy, badge: activeAlertsCount },
    { id: 'workforce' as ScreenTab, label: 'Kru & Masinis', sub: 'Roster & Istirahat', icon: Users },
    { id: 'contracts' as ScreenTab, label: 'Kontrak Logistik', sub: 'B2B Cargo & Tonase', icon: Briefcase, badge: unfulfilledContractsCount },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-[#334155] flex flex-col justify-between select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Menu Navigasi
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-[#1E293B] text-white border-l-4 border-[#F97316] shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-[#1E293B]/60 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#F97316]' : 'text-slate-400'
                  }`}
                />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">{item.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {item.sub}
                  </div>
                </div>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#F97316] text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#334155] bg-[#020617]/50 text-slate-400 text-[11px] font-mono flex items-center justify-between">
        <span>Gapeka 2026 Rev 1.0</span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>Online</span>
        </span>
      </div>
    </aside>
  );
};
