import { describe, it, expect } from 'vitest';
import { RAIL_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../src/tokens/index.js';

describe('Design Tokens (UI_SPEC.md §4)', () => {
  it('defines the official Indonesian Railway color palette', () => {
    // Primary Brand: Rail Navy
    expect(RAIL_COLORS.brand.panel).toBe('#0F172A');
    expect(RAIL_COLORS.brand.surface).toBe('#1E293B');
    expect(RAIL_COLORS.brand.canvas).toBe('#020617');
    expect(RAIL_COLORS.brand.track).toBe('#64748B');

    // Accent: Indonesian Railway Safety Orange
    expect(RAIL_COLORS.accent.orange500).toBe('#F97316');

    // Semantic Status Colors
    expect(RAIL_COLORS.status.success.solid).toBe('#10B981');
    expect(RAIL_COLORS.status.warning.solid).toBe('#F59E0B');
    expect(RAIL_COLORS.status.danger.solid).toBe('#EF4444');
    expect(RAIL_COLORS.status.info.solid).toBe('#0EA5E9');

    // Passenger Classes
    expect(RAIL_COLORS.passengerClass.economy).toBe('#3B82F6');
    expect(RAIL_COLORS.passengerClass.executive).toBe('#8B5CF6');
    expect(RAIL_COLORS.passengerClass.luxury).toBe('#EAB308');
  });

  it('provides typography tokens for sans and mono text', () => {
    expect(TYPOGRAPHY.fontFamily.sans).toContain('Inter');
    expect(TYPOGRAPHY.fontFamily.mono).toContain('JetBrains Mono');
    expect(TYPOGRAPHY.fontWeight.bold).toBe('700');
    expect(TYPOGRAPHY.fontSize.base).toBe('1rem');
  });

  it('provides standard spacing and radius scales', () => {
    expect(SPACING.xs).toBe('4px');
    expect(SPACING.sm).toBe('8px');
    expect(SPACING.md).toBe('16px');
    expect(RADIUS.full).toBe('9999px');
    expect(SHADOWS.panel).toBeDefined();
  });
});
