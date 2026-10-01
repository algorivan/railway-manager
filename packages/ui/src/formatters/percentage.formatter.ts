export interface FormatPercentageOptions {
  /** If true, treats input as fraction in [0, 1] and multiplies by 100 */
  readonly isRatio?: boolean;
  /** Number of decimal places (default: 0) */
  readonly decimals?: number;
}

/**
 * Formats a ratio or percentage number.
 * Example: 84.5 -> "84,5%"
 * Example: 0.845 with isRatio: true -> "84,5%"
 */
export function formatPercentage(val: number, options?: FormatPercentageOptions): string {
  const percent = options?.isRatio ? val * 100 : val;
  const decimals = options?.decimals ?? 0;
  const formatted = percent.toFixed(decimals).replace('.', ',');
  return `${formatted}%`;
}

/**
 * Formats company reputation into UI specification gauge string with star glyph.
 * Example: 0.84 -> "★ 84%" (UI_SPEC.md §2.1)
 * Example: 84 -> "★ 84%"
 */
export function formatReputation(reputation: number): string {
  const repPct = reputation <= 1.0 ? Math.round(reputation * 100) : Math.round(reputation);
  return `★ ${repPct}%`;
}

/**
 * Formats load factor into integer percentage.
 * Example: 0.88 -> "88%"
 * Example: 88 -> "88%"
 */
export function formatLoadFactor(loadFactor: number, isRatio = true): string {
  const val = isRatio ? Math.round(loadFactor * 100) : Math.round(loadFactor);
  return `${val}%`;
}
