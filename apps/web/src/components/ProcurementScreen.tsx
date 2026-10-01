import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import {
  createCatalogSpecCardViewModels,
  createProcurementPipelineOrderViewModels,
} from '@railway/ui';
import { Factory, ShoppingBag } from 'lucide-react';

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
    <div className="flex-1 flex flex-col text-slate-800 select-none">
      {/* Active Orders Pipeline Cards */}
      {pipeline.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-mono font-bold uppercase text-slate-600 flex items-center space-x-1.5">
            <Factory className="w-3.5 h-3.5 text-blue-600" />
            <span>Pesanan Sedang Dibuat di Pabrik ({pipeline.length})</span>
          </div>

          {pipeline.map((order) => (
            <div
              key={order.orderId}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-[9px] font-mono font-bold text-blue-700">
                    {order.orderId}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">{order.modelName}</h4>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  {order.statusBadge.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Penyelesaian Fabrikasi</span>
                  <span className="font-bold text-blue-700">{order.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${order.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>{order.quantity} Unit • Dipo {order.deliveryDepotName}</span>
                <span className="text-emerald-700 font-bold">{order.totalCostFormatted}</span>
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
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterCat === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Store Cards */}
      <div className="space-y-3">
        {filteredCatalog.map((spec) => (
          <div
            key={spec.specId}
            className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {spec.categoryLabel}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                  {spec.modelName}
                </h3>
                <div className="text-[10px] text-slate-500 font-mono">
                  Lead Time Pabrik: {spec.leadTimeDaysFormatted}
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-right">
                <div className="text-[9px] uppercase font-mono text-slate-500">Harga Satuan</div>
                <div className="text-sm font-mono font-bold text-emerald-700">
                  {spec.basePurchaseCostCompact}
                </div>
              </div>
            </div>

            {/* Spec Chips */}
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
              <div>
                <span className="text-[9px] text-slate-500 block font-sans">Speed</span>
                <span className="font-bold text-slate-800">{spec.maxSpeedFormatted}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-sans">Kapasitas</span>
                <span className="font-bold text-blue-700">{spec.passengerCapacityFormatted}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-sans">Bobot</span>
                <span className="font-bold text-slate-700">{spec.tareWeightFormatted}</span>
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => onOrderSpec?.(spec.specId, 1)}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Pesan 1 Unit ({spec.basePurchaseCostCompact})</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
