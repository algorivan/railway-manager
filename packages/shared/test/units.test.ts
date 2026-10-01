import { describe, expect, it } from 'vitest';
import {
  addMoney,
  formatRupiah,
  isKm,
  isKmh,
  isMeters,
  isMinutes,
  isMoney,
  isPercentage,
  isTons,
  multiplyMoney,
  subtractMoney,
  toKm,
  toKmh,
  toMeters,
  toMinutes,
  toMoney,
  toPercentage,
  toTons,
} from '../src/units.js';

describe('Shared Units & Branded Primitives', () => {
  describe('Money', () => {
    it('creates Money for valid safe integer values', () => {
      const m1 = toMoney(50000000);
      expect(m1).toBe(50000000);
      expect(isMoney(m1)).toBe(true);

      const mZero = toMoney(0);
      expect(mZero).toBe(0);

      const mNegative = toMoney(-15000000);
      expect(mNegative).toBe(-15000000);

      const mMax = toMoney(Number.MAX_SAFE_INTEGER);
      expect(mMax).toBe(Number.MAX_SAFE_INTEGER);
      expect(isMoney(mMax)).toBe(true);

      const mMin = toMoney(Number.MIN_SAFE_INTEGER);
      expect(mMin).toBe(Number.MIN_SAFE_INTEGER);
      expect(isMoney(mMin)).toBe(true);
    });

    it('rejects floating-point numbers because IDR has zero decimals', () => {
      expect(() => toMoney(15000.75)).toThrow(TypeError);
      expect(() => toMoney(0.1)).toThrow(TypeError);
    });

    it('rejects non-finite values and unsafe integers', () => {
      expect(() => toMoney(NaN)).toThrow(TypeError);
      expect(() => toMoney(Infinity)).toThrow(TypeError);
      expect(() => toMoney(Number.MAX_SAFE_INTEGER + 10)).toThrow(RangeError);
      expect(() => toMoney(9007199254740992)).toThrow(RangeError);
    });

    it('adds and subtracts money preserving integer guarantees', () => {
      const a = toMoney(50000000);
      const b = toMoney(75000000);
      const sum = addMoney(a, b);
      expect(sum).toBe(125000000);

      const diff = subtractMoney(sum, a);
      expect(diff).toBe(75000000);

      expect(() => addMoney(toMoney(Number.MAX_SAFE_INTEGER), toMoney(1))).toThrow(RangeError);
    });

    it('multiplies money and rounds to the nearest integer Rupiah', () => {
      const base = toMoney(100000);
      const multiplied = multiplyMoney(base, 1.155);
      expect(multiplied).toBe(115500);
      expect(Number.isInteger(multiplied)).toBe(true);
    });

    it('formats Rupiah in standard Indonesian locale format', () => {
      const m = toMoney(165000000);
      const formatted = formatRupiah(m);
      expect(formatted).toBe('Rp 165.000.000');

      const neg = toMoney(-50000);
      expect(formatRupiah(neg)).toBe('Rp -50.000');
    });
  });

  describe('Km, Kmh, Tons, Meters, Minutes, Percentage', () => {
    it('handles Km distance correctly with 2 decimal precision', () => {
      const d = toKm(160.004);
      expect(d).toBe(160);
      expect(isKm(d)).toBe(true);
      expect(() => toKm(-1)).toThrow(RangeError);
    });

    it('handles Kmh speed limits correctly', () => {
      const s = toKmh(120);
      expect(s).toBe(120);
      expect(isKmh(s)).toBe(true);
      expect(() => toKmh(120.5)).toThrow(RangeError);
      expect(() => toKmh(-5)).toThrow(RangeError);
    });

    it('handles Tons mass values correctly', () => {
      const t = toTons(350.25);
      expect(t).toBe(350.25);
      expect(isTons(t)).toBe(true);
      expect(() => toTons(-10)).toThrow(RangeError);
    });

    it('handles Meters length values correctly', () => {
      const m = toMeters(350);
      expect(m).toBe(350);
      expect(isMeters(m)).toBe(true);
      expect(() => toMeters(-50)).toThrow(RangeError);
    });

    it('handles Minutes duration values correctly', () => {
      const min = toMinutes(180);
      expect(min).toBe(180);
      expect(isMinutes(min)).toBe(true);
      expect(() => toMinutes(45.5)).toThrow(RangeError);
      expect(() => toMinutes(-1)).toThrow(RangeError);
    });

    it('handles Percentage correctly in range [0, 100]', () => {
      const p = toPercentage(85.5);
      expect(p).toBe(85.5);
      expect(isPercentage(p)).toBe(true);
      expect(() => toPercentage(-0.1)).toThrow(RangeError);
      expect(() => toPercentage(100.1)).toThrow(RangeError);
    });
  });
});
