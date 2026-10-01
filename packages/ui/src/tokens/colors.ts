/**
 * Indonesian Railway Design System — Core Color Tokens
 * Conforms to docs/UI_SPEC.md §4
 */

export const RAIL_COLORS = Object.freeze({
  // Primary Brand: Rail Navy
  brand: Object.freeze({
    canvas: '#020617',    // Deep Night Canvas
    panel: '#0F172A',     // Primary Top Bar & Nav Sidebar
    surface: '#1E293B',   // Cards & Workspace Surfaces
    border: '#334155',    // Card Outlines & Separators
    muted: '#475569',     // Inactive Text & Secondary Labels
    track: '#64748B',     // Track Infrastructure Lines
  }),

  // Indonesian Railway Accent Orange
  accent: Object.freeze({
    orange50: '#FFF7ED',
    orange100: '#FFEDD5',
    orange200: '#FED7AA',
    orange300: '#FDBA74',
    orange400: '#FB923C',
    orange500: '#F97316', // Primary Livery Safety Orange CTA
    orange600: '#EA580C', // Interactive Hover / Active
    orange700: '#C2410C',
  }),

  // Semantic Status Colors
  status: Object.freeze({
    // Solvency, Profit, On-Time, Good Health
    success: Object.freeze({
      bg: '#064E3B',
      border: '#059669',
      text: '#10B981',
      solid: '#10B981',
    }),
    // Minor Delays, Approaching Thresholds, Warnings
    warning: Object.freeze({
      bg: '#78350F',
      border: '#D97706',
      text: '#F59E0B',
      solid: '#F59E0B',
    }),
    // Insolvent, Overdraft, Breakdown, Severe Delays, Breached Contracts
    danger: Object.freeze({
      bg: '#7F1D1D',
      border: '#DC2626',
      text: '#EF4444',
      solid: '#EF4444',
    }),
    // Informational, Dispatched, In-Transit
    info: Object.freeze({
      bg: '#0C4A6E',
      border: '#0284C7',
      text: '#0EA5E9',
      solid: '#0EA5E9',
    }),
    // Neutral / Muted
    neutral: Object.freeze({
      bg: '#1E293B',
      border: '#475569',
      text: '#94A3B8',
      solid: '#64748B',
    }),
  }),

  // Passenger Service Classes
  passengerClass: Object.freeze({
    economy: '#3B82F6',   // Blue (Ekonomi)
    executive: '#8B5CF6', // Purple / Royal (Eksekutif)
    luxury: '#EAB308',    // Gold (Luxury / Suite Class)
  }),
});

export type ColorTheme = typeof RAIL_COLORS;
