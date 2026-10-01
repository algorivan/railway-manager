import React, { useState } from 'react';
import { GameState } from '@railway/simulation';
import {
  createCatalogSpecCardViewModels,
  createProcurementPipelineOrderViewModels,
  formatRupiah,
} from '@railway/ui';
import { ShoppingBag, Factory, Clock, PackageCheck, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface ProcurementScreenProps {
  readonly state: GameState;
  readonly onOrderSpec?: (specId: string, quantity: number) => void;
}

export const ProcurementScreen: React.FC<ProcurementScreenProps> = ({ state, onOrderSpec }) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const catalogCards = createCatalogSpecCardViewModels();
  const pipelineOrders = createProcurementPipelineOrderViewModels(state.procurementOrders);

  const filteredCatalog = catalogCards.filter((c) => {
    if (activeCategoryFilter === 'ALL') return true;
    return c.category === activeCategoryFilter;
  });

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-[#F97316]" />
            <span>Pengadaan Sarana & Katalog Manufaktur</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kemitraan pengadaan armada baru dari PT INKA Madiun dan General Electric Transportation.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-[#334155] text-xs">
          {[
            { id: 'ALL', label: 'Semua Sarana' },
            { id: 'LOCOMOTIVE', label: 'Lokomotif' },
            { id: 'PASSENGER_CARRIAGE', label: 'Kereta Penumpang' },
            { id: 'POWER_GENERATOR_CAR', label: 'Pembangkit' },
            { id: 'CONTAINER_WAGON', label: 'Gerbong Barang' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1.5 font-medium rounded transition-colors ${
                activeCategoryFilter === cat.id
                  ? 'bg-[#F97316] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Active Orders Section */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <Factory className="w-4 h-4 text-[#0EA5E9]" />
          <span>Pipeline Fabrikasi Aktif ({pipelineOrders.length} Pesanan)</span>
        </h3>

        {pipelineOrders.length === 0 ? (
          <div className="p-6 bg-[#0F172A] border border-[#334155] rounded-xl text-center text-slate-400 text-xs">
            Belum ada pesanan pabrikasi aktif saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineOrders.map((order) => (
              <div
                key={order.orderId}
                className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">
                      Pesanan {order.orderId}
                    </span>
                    <h4 className="font-bold text-white text-base mt-0.5">
                      {order.modelName}
                    </h4>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded text-xs font-mono font-bold"
                    style={{
                      backgroundColor: order.statusBadge.bgHex,
                      color: order.statusBadge.colorHex,
                    }}
                  >
                    {order.statusBadge.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-400">Kemajuan Produksi</span>
                    <span className="font-bold text-[#F97316]">{order.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#1E293B] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#F97316] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${order.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono bg-[#1E293B] p-3 rounded-lg border border-[#334155]/60">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Kuantitas</div>
                    <div className="font-bold text-white mt-0.5">{order.quantity} Unit</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Total Investasi</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{order.totalCostFormatted}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-sans">Dipo Tujuan</div>
                    <div className="font-bold text-slate-300 mt-0.5 truncate">{order.deliveryDepotName}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalog Grid Section */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span>Katalog Resmi Sarana Perkeretaapian Indonesia</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatalog.map((spec) => (
            <div
              key={spec.specId}
              className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-500 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 border border-[#334155]">
                    {spec.categoryLabel}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#F97316]">
                    {spec.leadTimeDaysFormatted}
                  </span>
                </div>

                <h4 className="font-bold text-white text-base leading-snug">
                  {spec.modelName}
                </h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ID: {spec.specId}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono bg-[#1E293B]/70 p-3 rounded-lg border border-[#334155]/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Kecepatan Maks</span>
                    <span className="font-bold text-white">{spec.maxSpeedFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Kapasitas Kursi</span>
                    <span className="font-bold text-[#0EA5E9]">{spec.passengerCapacityFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Berat Tare</span>
                    <span className="font-bold text-slate-300">{spec.tareWeightFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Harga Satuan</span>
                    <span className="font-bold text-emerald-400">{spec.basePurchaseCostCompact}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#334155] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-sans">Harga Satuan Penuh</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {spec.basePurchaseCostFormatted}
                  </div>
                </div>

                <button
                  onClick={() => onOrderSpec?.(spec.specId, 1)}
                  className="px-3.5 py-1.5 bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
                >
                  Pesan Unit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
