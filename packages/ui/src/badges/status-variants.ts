import { SolvencyStatus } from '@railway/economy';
import { ServiceStatus } from '@railway/timetable';
import { ProcurementStatus } from '@railway/procurement';
import { B2BContractStatus } from '@railway/contracts';
import { EmployeeStatus } from '@railway/workforce';
import { RAIL_COLORS } from '../tokens/colors.js';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeDescriptor {
  readonly label: string;
  readonly variant: BadgeVariant;
  readonly colorHex: string;
  readonly bgHex: string;
}

/**
 * Returns UI badge descriptor for company solvency status.
 */
export function getSolvencyBadge(status: SolvencyStatus): StatusBadgeDescriptor {
  switch (status) {
    case 'SOLVENT':
      return {
        label: 'Solven',
        variant: 'success',
        colorHex: RAIL_COLORS.status.success.text,
        bgHex: RAIL_COLORS.status.success.bg,
      };
    case 'WARNING':
      return {
        label: 'Peringatan Defisit',
        variant: 'warning',
        colorHex: RAIL_COLORS.status.warning.text,
        bgHex: RAIL_COLORS.status.warning.bg,
      };
    case 'INSOLVENT':
      return {
        label: 'Insolven',
        variant: 'danger',
        colorHex: RAIL_COLORS.status.danger.text,
        bgHex: RAIL_COLORS.status.danger.bg,
      };
    case 'SUSPENDED':
      return {
        label: 'Izin Dicabut',
        variant: 'danger',
        colorHex: RAIL_COLORS.status.danger.text,
        bgHex: RAIL_COLORS.status.danger.bg,
      };
  }
}

/**
 * Returns delay severity descriptor based on operational delay minutes.
 */
export function getDelaySeverity(delayMinutes: number): {
  readonly severity: 'on_time' | 'minor' | 'moderate' | 'severe';
  readonly label: string;
  readonly variant: BadgeVariant;
} {
  if (delayMinutes <= 0) {
    return { severity: 'on_time', label: 'Tepat Waktu', variant: 'success' };
  }
  if (delayMinutes <= 15) {
    return { severity: 'minor', label: `+${delayMinutes} mnt`, variant: 'warning' };
  }
  if (delayMinutes <= 60) {
    return { severity: 'moderate', label: `+${delayMinutes} mnt`, variant: 'danger' };
  }
  return { severity: 'severe', label: `+${delayMinutes} mnt (Keterlambatan Berat)`, variant: 'danger' };
}

/**
 * Returns UI badge descriptor for active train service runs.
 */
export function getServiceStatusBadge(
  status: ServiceStatus,
  delayMinutes = 0
): StatusBadgeDescriptor {
  switch (status) {
    case 'BOARDING':
      return {
        label: 'Boarding Penumpang',
        variant: 'info',
        colorHex: RAIL_COLORS.status.info.text,
        bgHex: RAIL_COLORS.status.info.bg,
      };
    case 'IN_TRANSIT':
      if (delayMinutes > 15) {
        return {
          label: `Perjalanan (+${delayMinutes}m)`,
          variant: 'danger',
          colorHex: RAIL_COLORS.status.danger.text,
          bgHex: RAIL_COLORS.status.danger.bg,
        };
      }
      if (delayMinutes > 0) {
        return {
          label: `Perjalanan (+${delayMinutes}m)`,
          variant: 'warning',
          colorHex: RAIL_COLORS.status.warning.text,
          bgHex: RAIL_COLORS.status.warning.bg,
        };
      }
      return {
        label: 'Dalam Perjalanan',
        variant: 'success',
        colorHex: RAIL_COLORS.status.success.text,
        bgHex: RAIL_COLORS.status.success.bg,
      };
    case 'DWELL':
      return {
        label: 'Berhenti di Stasiun',
        variant: 'info',
        colorHex: RAIL_COLORS.status.info.text,
        bgHex: RAIL_COLORS.status.info.bg,
      };
    case 'TURNAROUND':
      return {
        label: 'Langsir / Putar Rangkaian',
        variant: 'neutral',
        colorHex: RAIL_COLORS.status.neutral.text,
        bgHex: RAIL_COLORS.status.neutral.bg,
      };
    case 'COMPLETED':
      return {
        label: 'Selesai',
        variant: 'neutral',
        colorHex: RAIL_COLORS.status.neutral.text,
        bgHex: RAIL_COLORS.status.neutral.bg,
      };
    case 'CANCELLED':
      return {
        label: 'Dibatalkan',
        variant: 'danger',
        colorHex: RAIL_COLORS.status.danger.text,
        bgHex: RAIL_COLORS.status.danger.bg,
      };
    case 'SCHEDULED':
    default:
      return {
        label: 'Terjadwal',
        variant: 'neutral',
        colorHex: RAIL_COLORS.status.neutral.text,
        bgHex: RAIL_COLORS.status.neutral.bg,
      };
  }
}

/**
 * Returns UI badge descriptor for rolling stock manufacturing orders.
 */
export function getProcurementBadge(status: ProcurementStatus): StatusBadgeDescriptor & { readonly progressPercent: number } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', variant: 'neutral', progressPercent: 0, colorHex: RAIL_COLORS.status.neutral.text, bgHex: RAIL_COLORS.status.neutral.bg };
    case 'QUOTED':
      return { label: 'Penawaran Harga', variant: 'info', progressPercent: 5, colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
    case 'ORDERED':
      return { label: 'Dipesan ke Pabrik', variant: 'info', progressPercent: 10, colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
    case 'IN_PRODUCTION':
      return { label: 'Proses Fabrikasi', variant: 'warning', progressPercent: 50, colorHex: RAIL_COLORS.status.warning.text, bgHex: RAIL_COLORS.status.warning.bg };
    case 'TESTING':
      return { label: 'Uji Statis & Dinamis', variant: 'warning', progressPercent: 80, colorHex: RAIL_COLORS.status.warning.text, bgHex: RAIL_COLORS.status.warning.bg };
    case 'IN_TRANSIT':
      return { label: 'Pengiriman ke Depo', variant: 'info', progressPercent: 90, colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
    case 'DELIVERED':
      return { label: 'Tiba di Depo', variant: 'success', progressPercent: 100, colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
    case 'COMMISSIONED':
      return { label: 'Siap Operasi', variant: 'success', progressPercent: 100, colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
    case 'CANCELLED':
      return { label: 'Dibatalkan', variant: 'danger', progressPercent: 0, colorHex: RAIL_COLORS.status.danger.text, bgHex: RAIL_COLORS.status.danger.bg };
  }
}

/**
 * Returns UI badge descriptor for commercial B2B freight contracts.
 */
export function getB2BContractBadge(status: B2BContractStatus): StatusBadgeDescriptor {
  switch (status) {
    case 'OFFERED':
      return { label: 'Tawaran Baru', variant: 'info', colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
    case 'ACTIVE':
      return { label: 'Kontrak Aktif', variant: 'success', colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
    case 'FULFILLED':
      return { label: 'Terpenuhi (Selesai)', variant: 'success', colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
    case 'BREACHED':
      return { label: 'Gagal / Denda Pinalti', variant: 'danger', colorHex: RAIL_COLORS.status.danger.text, bgHex: RAIL_COLORS.status.danger.bg };
  }
}

/**
 * Returns UI badge descriptor for rolling stock physical condition.
 */
export function getConditionBadge(conditionPercentage: number): StatusBadgeDescriptor {
  if (conditionPercentage >= 85) {
    return { label: 'Prima', variant: 'success', colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
  }
  if (conditionPercentage >= 60) {
    return { label: 'Baik', variant: 'info', colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
  }
  if (conditionPercentage >= 30) {
    return { label: 'Perlu Rawat', variant: 'warning', colorHex: RAIL_COLORS.status.warning.text, bgHex: RAIL_COLORS.status.warning.bg };
  }
  return { label: 'Kritis', variant: 'danger', colorHex: RAIL_COLORS.status.danger.text, bgHex: RAIL_COLORS.status.danger.bg };
}

/**
 * Returns UI badge descriptor for staff employee operational status.
 */
export function getEmployeeStatusBadge(status: EmployeeStatus): StatusBadgeDescriptor {
  switch (status) {
    case 'AVAILABLE':
      return { label: 'Tersedia', variant: 'success', colorHex: RAIL_COLORS.status.success.text, bgHex: RAIL_COLORS.status.success.bg };
    case 'ON_DUTY':
      return { label: 'Sedang Dinas', variant: 'info', colorHex: RAIL_COLORS.status.info.text, bgHex: RAIL_COLORS.status.info.bg };
    case 'RESTING':
      return { label: 'Istirahat Depo', variant: 'warning', colorHex: RAIL_COLORS.status.warning.text, bgHex: RAIL_COLORS.status.warning.bg };
    case 'ON_LEAVE':
      return { label: 'Cuti', variant: 'neutral', colorHex: RAIL_COLORS.status.neutral.text, bgHex: RAIL_COLORS.status.neutral.bg };
    case 'TERMINATED':
      return { label: 'Purna / Diberhentikan', variant: 'danger', colorHex: RAIL_COLORS.status.danger.text, bgHex: RAIL_COLORS.status.danger.bg };
  }
}
