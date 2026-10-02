import React, { useEffect } from 'react';
import {
  CheckCircle2,
  ShoppingBag,
  Train,
  Trophy,
  Coffee,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export type ActionFeedbackType =
  | 'PURCHASE'
  | 'DISPATCH'
  | 'MISSION'
  | 'REST'
  | 'WARNING'
  | 'INFO'
  | 'SUCCESS';

export interface ActionFeedbackDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ActionFeedbackData {
  type: ActionFeedbackType;
  title: string;
  subtitle: string;
  badge?: string;
  details?: ActionFeedbackDetail[];
  actionLabel?: string;
  onAction?: () => void;
  closeLabel?: string;
}

interface ActionResponseModalProps {
  readonly data: ActionFeedbackData | null;
  readonly onClose: () => void;
}

export const ActionResponseModal: React.FC<ActionResponseModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && data) {
        soundEffects.playClickSound();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const handleClose = () => {
    soundEffects.playClickSound();
    onClose();
  };

  const handleAction = () => {
    soundEffects.playClickSound();
    if (data.onAction) {
      data.onAction();
    }
    onClose();
  };

  // Determine styling based on action type
  const getTypeConfig = () => {
    switch (data.type) {
      case 'PURCHASE':
        return {
          icon: ShoppingBag,
          iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badgeText: data.badge || 'PESANAN SUKSES DIBELI',
          accentColor: 'text-emerald-700',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'DISPATCH':
        return {
          icon: Train,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-300',
          badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
          badgeText: data.badge || 'SEMBOYAN 40 DIBERIKAN',
          accentColor: 'text-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'MISSION':
        return {
          icon: Trophy,
          iconBg: 'bg-amber-100 text-amber-700 border-amber-300',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          badgeText: data.badge || 'SASARAN DJKA TERCAPAI',
          accentColor: 'text-amber-700',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'REST':
        return {
          icon: Coffee,
          iconBg: 'bg-orange-100 text-orange-700 border-orange-300',
          badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
          badgeText: data.badge || 'KEBUGARAN KRU PULIH',
          accentColor: 'text-orange-700',
          buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white',
        };
      case 'WARNING':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-rose-100 text-rose-700 border-rose-300',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          badgeText: data.badge || 'PERINGATAN OPERASI',
          accentColor: 'text-rose-700',
          buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'INFO':
      case 'SUCCESS':
      default:
        return {
          icon: CheckCircle2,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-300',
          badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
          badgeText: data.badge || 'TINDAKAN BERHASIL',
          accentColor: 'text-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Header with Badge & Close Button */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${config.iconBg}`}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span
                className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}
              >
                {config.badgeText}
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-1 leading-snug font-mono">
                {data.title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle / Descriptive Narrative */}
        <div className="px-5 pb-3">
          <p className="text-xs text-slate-600 leading-relaxed">{data.subtitle}</p>
        </div>

        {/* Details Grid (if provided) */}
        {data.details && data.details.length > 0 && (
          <div className="px-5 pb-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs font-mono">
              {data.details.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded-lg ${
                    item.highlight
                      ? 'bg-blue-50/80 border border-blue-200 col-span-2'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <span className="text-[9.5px] text-slate-500 block font-sans font-medium">
                    {item.label}
                  </span>
                  <span
                    className={`font-bold truncate block ${
                      item.highlight ? 'text-blue-800 text-xs' : 'text-slate-800 text-[11px]'
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          {data.actionLabel && (
            <button
              onClick={handleAction}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 ${config.buttonBg}`}
            >
              <span>{data.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-all active:scale-95"
          >
            {data.closeLabel || 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
};
