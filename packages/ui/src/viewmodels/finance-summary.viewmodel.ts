import { toMoney } from '@railway/shared';
import { GeneralLedgerEntity, SolvencyEngine } from '@railway/economy';
import {
  FinanceDashboardViewModel,
  CostCenterSlice,
} from '../types/ui.types.js';
import { formatRupiah, formatRupiahCompact } from '../formatters/currency.formatter.js';
import { formatPercentage } from '../formatters/percentage.formatter.js';
import { getSolvencyBadge } from '../badges/status-variants.js';
import { RAIL_COLORS } from '../tokens/colors.js';

export function createFinanceDashboardViewModel(
  ledger: GeneralLedgerEntity
): FinanceDashboardViewModel {
  const summary = ledger.getSummary();
  const transactions = ledger.transactions;

  // Breakdown OPEX by category
  let fuelOpex = 0;
  let tacOpex = 0;
  let payrollOpex = 0;
  let maintOpex = 0;

  for (const tx of transactions) {
    if (tx.amount < 0) {
      const outflow = Math.abs(tx.amount);
      if (tx.category === 'OPEX_FUEL_ENERGY') {
        fuelOpex += outflow;
      } else if (tx.category === 'OPEX_TRACK_ACCESS_FEE') {
        tacOpex += outflow;
      } else if (tx.category === 'OPEX_WORKFORCE_PAYROLL') {
        payrollOpex += outflow;
      } else if (tx.category === 'OPEX_MAINTENANCE_PARTS') {
        maintOpex += outflow;
      }
    }
  }

  const totalOpexVal = summary.totalOpex > 0 ? summary.totalOpex : 1;

  const costCenters: CostCenterSlice[] = [
    {
      label: 'Bahan Bakar & Energi',
      amount: toMoney(fuelOpex),
      amountFormatted: formatRupiah(fuelOpex),
      percentageOfTotalOpex: Math.round((fuelOpex / totalOpexVal) * 100),
      colorHex: RAIL_COLORS.accent.orange500,
    },
    {
      label: 'Track Access Charge (TAC)',
      amount: toMoney(tacOpex),
      amountFormatted: formatRupiah(tacOpex),
      percentageOfTotalOpex: Math.round((tacOpex / totalOpexVal) * 100),
      colorHex: RAIL_COLORS.brand.track,
    },
    {
      label: 'Gaji Tenaga Kerja (Payroll)',
      amount: toMoney(payrollOpex),
      amountFormatted: formatRupiah(payrollOpex),
      percentageOfTotalOpex: Math.round((payrollOpex / totalOpexVal) * 100),
      colorHex: RAIL_COLORS.passengerClass.executive,
    },
    {
      label: 'Suku Cadang & Pemeliharaan',
      amount: toMoney(maintOpex),
      amountFormatted: formatRupiah(maintOpex),
      percentageOfTotalOpex: Math.round((maintOpex / totalOpexVal) * 100),
      colorHex: RAIL_COLORS.passengerClass.economy,
    },
  ];

  const netMargin =
    summary.totalRevenue > 0
      ? (summary.netOperatingIncome / summary.totalRevenue) * 100
      : 0;

  const solvency = SolvencyEngine.evaluateSolvency(summary.currentCashBalance);

  return {
    totalRevenueFormatted: formatRupiah(summary.totalRevenue),
    totalOpexFormatted: formatRupiah(summary.totalOpex),
    netOperatingIncomeFormatted: formatRupiah(summary.netOperatingIncome, { showSign: true }),
    currentCashBalanceFormatted: formatRupiah(summary.currentCashBalance),
    currentCashBalanceCompact: formatRupiahCompact(summary.currentCashBalance),
    isProfitable: summary.netOperatingIncome > 0,
    profitMarginFormatted: formatPercentage(netMargin, { decimals: 1 }),
    solvencyBadge: getSolvencyBadge(solvency.status),
    costCenters: Object.freeze(costCenters),
    transactionCount: summary.transactionCount,
  };
}
