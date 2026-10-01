import React from 'react';
import { GameState } from '@railway/simulation';
import { formatRupiah } from '@railway/ui';
import { Briefcase, Box, Clock, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';

interface ContractsScreenProps {
  readonly state: GameState;
}

export const ContractsScreen: React.FC<ContractsScreenProps> = ({ state }) => {
  const contracts = state.b2bContracts;

  // Available new contract offers to tender
  const availableTenders = [
    {
      id: 'TENDER_KRAKATAU_STEEL',
      client: 'PT Krakatau Steel (Persero) Tbk',
      cargo: 'COIL_STEEL',
      origin: 'Cilegon (CLG)',
      destination: 'Surabaya Pasarturi (SBI)',
      weeklyTons: 650,
      ratePerTon: 110_000,
      penaltyPerTon: 20_000,
      durationDays: 14,
    },
    {
      id: 'TENDER_SEMEN_GRESIK',
      client: 'PT Semen Indonesia Group',
      cargo: 'CEMENT_BULK',
      origin: 'Cirebon (CN)',
      destination: 'Semarang Poncol (SMC)',
      weeklyTons: 800,
      ratePerTon: 75_000,
      penaltyPerTon: 15_000,
      durationDays: 30,
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <span>Kontrak Logistik B2B & Angkutan Barang</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pengelolaan komitmen volume mingguan, pengiriman kontainer curah, dan penalti keterlambatan tonase.
          </p>
        </div>

        <div className="bg-[#0F172A] px-3.5 py-1.5 rounded-lg border border-[#334155] text-xs font-mono text-slate-300">
          Kontrak Aktif: <strong className="text-emerald-400 font-bold">{contracts.length} Mitra</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Komitmen Volume Mingguan</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {contracts.reduce((sum, c) => sum + c.requiredWeeklyVolumeTons, 0)} Ton
          </div>
          <div className="text-xs text-slate-400 mt-1">Total kewajiban angkut gerbong datar</div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Potensi Pendapatan B2B</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatRupiah(
              contracts.reduce((sum, c) => sum + c.requiredWeeklyVolumeTons * c.revenuePerTonDelivered, 0)
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Per siklus mingguan terpenuhi</div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Risiko Penalti Keterlambatan</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            Rp 15.000 /Ton
          </div>
          <div className="text-xs text-slate-400 mt-1">Dipotong bila kuota mingguan tidak tercapai</div>
        </div>
      </div>

      {/* Active Contracts Section */}
      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Box className="w-4 h-4 text-[#F97316]" />
          <span>Kontrak Logistik Aktif ({contracts.length})</span>
        </h3>

        {contracts.map((ctr) => {
          const progressPercent = Math.min(
            100,
            Math.round((ctr.deliveredVolumeTons / ctr.requiredWeeklyVolumeTons) * 100)
          );

          return (
            <div
              key={ctr.id}
              className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 border border-[#334155]">
                      {ctr.cargoCategory}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{ctr.id}</span>
                  </div>
                  <h4 className="font-bold text-white text-base mt-1">{ctr.clientName}</h4>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    Relasi: {ctr.originStationId.split('_')[1]} ➔ {ctr.destinationStationId.split('_')[1]}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Tarif Angkut</div>
                    <div className="text-base font-mono font-bold text-emerald-400">
                      {formatRupiah(ctr.revenuePerTonDelivered)} /Ton
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold">
                    {ctr.status}
                  </span>
                </div>
              </div>

              {/* Volume Progress Bar */}
              <div className="mt-4 pt-4 border-t border-[#334155]/60">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-400">
                    Volume Terkirim Minggu Ini: {ctr.deliveredVolumeTons} / {ctr.requiredWeeklyVolumeTons} Ton
                  </span>
                  <span className="font-bold text-[#F97316]">{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#F97316] h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400 bg-[#1E293B]/60 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sisa Durasi Kontrak: {ctr.remainingDays} Hari</span>
                </div>
                <div>Gerbong Wajib: Gerbong Datar Kontainer (PPCW)</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tender Market Section */}
      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Lelang & Peluang Kontrak Baru (Logistics Tender Board)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTenders.map((tender) => (
            <div
              key={tender.id}
              className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 border border-[#334155]">
                    {tender.cargo}
                  </span>
                  <span className="text-slate-400">Durasi: {tender.durationDays} Hari</span>
                </div>

                <h4 className="font-bold text-white text-base mt-2">{tender.client}</h4>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Rute: {tender.origin} ➔ {tender.destination}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono bg-[#1E293B] p-3 rounded-lg border border-[#334155]/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Kuota Mingguan</span>
                    <span className="font-bold text-white">{tender.weeklyTons} Ton</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Tarif Pembayaran</span>
                    <span className="font-bold text-emerald-400">
                      {formatRupiah(tender.ratePerTon)} /Ton
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#334155] flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Penalti: {formatRupiah(tender.penaltyPerTon)} /Ton
                </span>
                <button
                  onClick={() => alert(`Pengajuan tender ${tender.client} dikirim ke direksi kargo!`)}
                  className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                >
                  <span>Ajukan Penawaran</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
