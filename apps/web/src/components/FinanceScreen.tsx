import React from 'react';
import { GameState } from '@railway/simulation';
import { createFinanceDashboardViewModel, formatRupiah, formatSimTime } from '@railway/ui';
import { CircleDollarSign, TrendingUp, TrendingDown, Wallet, ShieldAlert, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface FinanceScreenProps {
  readonly state: GameState;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ state }) => {
  const financeVm = createFinanceDashboardViewModel(state.generalLedger);
  const transactions = state.generalLedger.transactions.slice().reverse(); // newest first

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#020617] text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#334155] gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <CircleDollarSign className="w-5 h-5 text-[#10B981]" />
            <span>Laporan Keuangan & Buku Besar (General Ledger)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit arus kas masuk, pengeluaran OPEX (BBM, TAC, Kru, Pemeliharaan), dan evaluasi solvabilitas perusahaan.
          </p>
        </div>

        {/* Solvency Status Badge */}
        <div className="flex items-center space-x-3">
          <div
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold border"
            style={{
              backgroundColor: financeVm.solvencyBadge.bgHex,
              color: financeVm.solvencyBadge.colorHex,
              borderColor: financeVm.solvencyBadge.colorHex + '40',
            }}
          >
            Status Solvabilitas: {financeVm.solvencyBadge.label}
          </div>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Saldo Kas Likuid</span>
            <Wallet className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#10B981] mt-2">
            {financeVm.currentCashBalanceFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Modal Awal: Rp 50.000.000.000
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Total Pendapatan</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-2">
            {financeVm.totalRevenueFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tiket penumpang & kontrak kargo
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Total Beban Operasional</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-red-400 mt-2">
            {financeVm.totalOpexFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Fuel, TAC, Payroll, Suku Cadang
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Laba Operasional Bersih</span>
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                financeVm.isProfitable
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              Margin: {financeVm.profitMarginFormatted}
            </span>
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-2 ${
              financeVm.isProfitable ? 'text-emerald-400' : 'text-slate-200'
            }`}
          >
            {financeVm.netOperatingIncomeFormatted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {financeVm.isProfitable ? 'Kondisi Neraca Menguntungkan' : 'Belum Mencapai Titik Impas'}
          </div>
        </div>
      </div>

      {/* Cost Center Breakdown & Audit Ledger */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Centers (1 Col) */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <h3 className="font-bold text-white text-sm mb-4">
            Struktur Biaya Operasional (OPEX)
          </h3>

          <div className="space-y-4">
            {financeVm.costCenters.map((cc) => (
              <div key={cc.label} className="bg-[#1E293B] p-3.5 rounded-lg border border-[#334155]/60">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cc.colorHex }}
                    />
                    <span className="font-medium text-slate-200">{cc.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-300">
                    {cc.percentageOfTotalOpex}%
                  </span>
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {cc.amountFormatted}
                </div>
                <div className="w-full bg-[#020617] h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cc.percentageOfTotalOpex}%`,
                      backgroundColor: cc.colorHex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Transaction Journal (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Jurnal Transaksi Keuangan ({transactions.length} Entri)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Double-Entry Invariant Checked
            </span>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#1E293B] text-slate-400 font-mono uppercase text-[10px] border-b border-[#334155]">
                <tr>
                  <th className="py-2.5 px-3">Waktu Sim</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-3 text-right">Nominal Arus Kas</th>
                  <th className="py-2.5 px-3 text-right">ID Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60 font-mono">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada transaksi yang tercatat dalam buku besar.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isIncome = tx.amount >= 0;
                    return (
                      <tr key={tx.id} className="hover:bg-[#1E293B]/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {formatSimTime(tx.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">
                          <span className="bg-[#1E293B] px-2 py-0.5 rounded text-[10px] border border-[#334155]">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans max-w-[220px] truncate">
                          {tx.description}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                            isIncome ? 'text-[#10B981]' : 'text-red-400'
                          }`}
                        >
                          <div className="flex items-center justify-end space-x-1">
                            {isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            <span>{formatRupiah(tx.amount, { showSign: true })}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap font-mono text-[10px]">
                          {tx.id}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
