import { Money } from '@railway/shared';

export interface FormatRupiahOptions {
  /** If true, prefixes positive amounts with '+' (e.g. '+Rp 50.000') */
  readonly showSign?: boolean;
  /** If true, separates Rp and amount with space (default: true) */
  readonly space?: boolean;
}

/**
 * Formats integer monetary amount into standard Indonesian Rupiah with period separators.
 * Example: 94250000000 -> "Rp 94.250.000.000" (UI_SPEC.md §2.1)
 * Example: -12000000 -> "-Rp 12.000.000"
 */
export function formatRupiah(amount: Money | number, options?: FormatRupiahOptions): string {
  const num = Math.round(Number(amount));
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Group thousands by period (.)
  const parts = absNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const space = options?.space !== false ? ' ' : '';
  const prefix = isNegative ? `-Rp${space}` : options?.showSign && num > 0 ? `+Rp${space}` : `Rp${space}`;

  return `${prefix}${parts}`;
}

/**
 * Formats monetary amount into compact Indonesian abbreviated denomination.
 * Example: 94_250_000_000 -> "Rp 94,2 Miliar"
 * Example: 5_500_000 -> "Rp 5,5 Juta"
 * Example: 25_000 -> "Rp 25 Ribu"
 */
export function formatRupiahCompact(amount: Money | number): string {
  const num = Math.round(Number(amount));
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const sign = isNegative ? '-' : '';

  if (absNum >= 1_000_000_000_000) {
    const val = (absNum / 1_000_000_000_000).toFixed(1).replace('.', ',');
    return `${sign}Rp ${val.endsWith(',0') ? val.slice(0, -2) : val} Triliun`;
  }
  if (absNum >= 1_000_000_000) {
    const val = (absNum / 1_000_000_000).toFixed(1).replace('.', ',');
    return `${sign}Rp ${val.endsWith(',0') ? val.slice(0, -2) : val} Miliar`;
  }
  if (absNum >= 1_000_000) {
    const val = (absNum / 1_000_000).toFixed(1).replace('.', ',');
    return `${sign}Rp ${val.endsWith(',0') ? val.slice(0, -2) : val} Juta`;
  }
  if (absNum >= 1_000) {
    const val = (absNum / 1_000).toFixed(1).replace('.', ',');
    return `${sign}Rp ${val.endsWith(',0') ? val.slice(0, -2) : val} Ribu`;
  }

  return formatRupiah(num);
}

/**
 * Parses formatted Rupiah string back to integer number.
 * Example: "Rp 94.250.000.000" -> 94250000000
 */
export function parseRupiah(formatted: string): number {
  const isNegative = formatted.includes('-');
  const digits = formatted.replace(/\D/g, '');
  if (!digits) {
    return 0;
  }
  const val = parseInt(digits, 10);
  return isNegative ? -val : val;
}
