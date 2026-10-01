/**
 * Typography Tokens
 * Conforms to docs/UI_SPEC.md §4: Inter/Geist Sans for text, font-mono for numbers.
 */

export const TYPOGRAPHY = Object.freeze({
  fontFamily: Object.freeze({
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  }),

  fontSize: Object.freeze({
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  }),

  lineHeight: Object.freeze({
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  }),

  fontWeight: Object.freeze({
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }),
});
