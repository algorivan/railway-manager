import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import {
  createCatalogSpecCardViewModels,
  createProcurementPipelineOrderViewModels,
  formatRupiah,
} from '@railway/ui';
import { ShoppingBag, Factory, Clock, PackageCheck, Zap, Plus, ArrowRight } from 'lucide-react';

interface ProcurementScreenProps {
  readonly state: GameState;
  readonly onOrderSpec?: (specId: string, quantity: number) => void;
}

export const ProcurementScreen: React.FC<ProcurementScreenProps> = ({ state, onOrderSpec }) => {
  const [filterCat, setFilterCat] = useState<string>('ALL');

  const catalog = createCatalogSpecCardViewModels();
  const pipeline = createProcurementPipelineOrderViewModels(state.procurementOrders);

  const filteredCatalog = catalog.filter((c) => {
    if (filterCat === 'ALL') return true;
    return c.category === filterCat;
  });

  return (
    <div className="flex-1 flex flex-col p-4 pb-28 overflow-y-auto bg-[#020617] text-slate-100 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center space-x-2">
            <span className="text-lg">🏭</span>
            <span>Pabrik Sarana & Showroom INKA</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            Kemitraan Resmi PT INKA Madiun & General Electric
          </p>
        </div>

        <div className="bg-[#1E293B] px-2.5 py-1 rounded-full border border-[#334155] text-xs font-mono font-bold text-emerald-400">
          Kas: Rp {(state.generalLedger.currentCashBalance / 1_000_000_000).toFixed(1)} M
        </div>
      </div>

      {/* Active Manufacturing Pipeline Cards */}
      {pipeline.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center space-x-1.5">
            <Factory className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>Pesanan Sedang Dibuat ({pipeline.length})</span>
          </div>

          {pipeline.map((order) => (
            <div
              key={order.orderId}
              className="bg-[#0F172A] border border-[#334155] rounded-2xl p-3.5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[9px] font-mono font-bold text-[#F97316]">
                    {order.orderId}
                  </span>
                  <h4 className="font-bold text-sm text-white">{order.modelName}</h4>
                </div>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: order.statusBadge.bgHex,
                    color: order.statusBadge.colorHex,
                  }}
                >
                  {order.statusBadge.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Penyelesaian Fabrikasi</span>
                  <span className="font-bold text-[#F97316]">{order.progressPercent}%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-[#F97316] h-full rounded-full transition-all"
                    style={{ width: `${order.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2.5 pt-2 border-t border-[#334155]/60">
                <span>{order.quantity} Unit • Dipo {order.deliveryDepotName}</span>
                <span className="text-emerald-400 font-bold">{order.totalCostFormatted}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Category Scrollable Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {[
          { id: 'ALL', label: 'Semua Sarana' },
          { id: 'LOCOMOTIVE', label: 'Lokomotif' },
          { id: 'PASSENGER_CARRIAGE', label: 'Kereta Penumpang' },
          { id: 'POWER_GENERATOR_CAR', label: 'Pembangkit' },
          { id: 'CONTAINER_WAGON', label: 'Gerbong Datar' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCat(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filterCat === cat.id
                ? 'bg-[#F97316] text-white shadow'
                : 'bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Game Catalog Store Cards */}
      <div className="space-y-3">
        {filteredCatalog.map((spec) => (
          <div
            key={spec.specId}
            className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#1E293B] text-slate-300 border border-[#334155]">
                  {spec.categoryLabel}
                </span>
                <h3 className="font-bold text-base text-white mt-1 leading-snug">
                  {spec.modelName}
                </h3>
                <div className="text-[10px] text-slate-400 font-mono">
                  Lead Time: {spec.leadTimeDaysFormatted}
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-right">
                <div className="text-[9px] uppercase font-mono text-slate-400">Harga Satuan</div>
                <div className="text-sm font-mono font-black text-emerald-400">
                  {spec.basePurchaseCostCompact}
                </div>
              </div>
            </div>

            {/* Spec Chips */}
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono bg-[#1E293B]/70 p-2.5 rounded-xl border border-[#334155]/60 text-center">
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">Speed</span>
                <span className="font-bold text-white">{spec.maxSpeedFormatted}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">Kapasitas</span>
                <span className="font-bold text-[#0EA5E9]">{spec.passengerCapacityFormatted}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">Bobot</span>
                <span className="font-bold text-slate-300">{spec.tareWeightFormatted}</span>
              </div>
            </div>

            {/* Big Action Buy Button */}
            <button
              onClick={() => onOrderSpec?.(spec.specId, 1)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center space-x-1.5 active:scale-98 transition-all border border-orange-400/40"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>PESAN 1 UNIT ({spec.basePurchaseCostCompact})</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
