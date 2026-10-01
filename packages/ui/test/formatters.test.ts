import { describe, it, expect } from 'vitest';
import { toMoney, createGameTimestamp, toKm, toKmh, toTons, toMeters } from '@railway/shared';
import {
  formatRupiah,
  formatRupiahCompact,
  parseRupiah,
  formatSimTime,
  formatClock,
  formatDuration,
  formatSimulationSpeed,
  formatDistance,
  formatSpeed,
  formatMass,
  formatLength,
  formatPercentage,
  formatReputation,
  formatLoadFactor,
} from '../src/formatters/index.js';

describe('UI Formatters (UI_SPEC.md §2.1 & §4)', () => {
  describe('Currency Formatter', () => {
    it('formats exact Indonesian Rupiah with period thousands separators', () => {
      // Reference PRD example
      expect(formatRupiah(toMoney(94_250_000_000))).toBe('Rp 94.250.000.000');
      expect(formatRupiah(toMoney(12_000_000))).toBe('Rp 12.000.000');
      expect(formatRupiah(toMoney(0))).toBe('Rp 0');
    });

    it('formats negative amounts for debit expenses', () => {
      expect(formatRupiah(toMoney(-12_000_000))).toBe('-Rp 12.000.000');
      expect(formatRupiah(toMoney(-50_000))).toBe('-Rp 50.000');
    });

    it('formats compact abbreviated Rupiah values', () => {
      expect(formatRupiahCompact(toMoney(94_250_000_000))).toBe('Rp 94,3 Miliar');
      expect(formatRupiahCompact(toMoney(1_500_000_000_000))).toBe('Rp 1,5 Triliun');
      expect(formatRupiahCompact(toMoney(5_500_000))).toBe('Rp 5,5 Juta');
      expect(formatRupiahCompact(toMoney(25_000))).toBe('Rp 25 Ribu');
      expect(formatRupiahCompact(toMoney(500))).toBe('Rp 500');
    });

    it('parses formatted Rupiah strings back to integers', () => {
      expect(parseRupiah('Rp 94.250.000.000')).toBe(94_250_000_000);
      expect(parseRupiah('-Rp 12.000.000')).toBe(-12_000_000);
      expect(parseRupiah('Rp 0')).toBe(0);
    });
  });

  describe('Time Formatter', () => {
    it('formats simulation clock label per UI_SPEC.md §2.1', () => {
      // Day 12, 08:45 WIB
      const ts = createGameTimestamp((12 - 1) * 1440 + 525);
      expect(formatSimTime(ts)).toBe('Hari 12 • 08:45 WIB');
    });

    it('formats 24-hour clock with minute padding', () => {
      expect(formatClock(0)).toBe('00:00 WIB');
      expect(formatClock(480)).toBe('08:00 WIB');
      expect(formatClock(1439)).toBe('23:59 WIB');
    });

    it('formats duration in Indonesian compact notation', () => {
      expect(formatDuration(160)).toBe('2j 40m');
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(120)).toBe('2j 00m');
      expect(formatDuration(0)).toBe('0m');
    });

    it('formats simulation speed toggle button labels', () => {
      expect(formatSimulationSpeed('PAUSED')).toBe('⏸ Pause');
      expect(formatSimulationSpeed('1X')).toBe('1x');
      expect(formatSimulationSpeed('2X')).toBe('2x');
      expect(formatSimulationSpeed('4X')).toBe('4x');
      expect(formatSimulationSpeed('8X')).toBe('8x');
    });
  });

  describe('Distance, Velocity, Mass & Length Formatters', () => {
    it('formats distance in kilometers with comma separator', () => {
      expect(formatDistance(toKm(160))).toBe('160,0 km');
      expect(formatDistance(toKm(219.5))).toBe('219,5 km');
    });

    it('formats speed in km/h', () => {
      expect(formatSpeed(toKmh(120))).toBe('120 km/h');
      expect(formatSpeed(toKmh(100))).toBe('100 km/h');
    });

    it('formats weight in metric tons', () => {
      expect(formatMass(toTons(320))).toBe('320,0 Ton');
      expect(formatMass(toTons(84.5))).toBe('84,5 Ton');
    });

    it('formats length in meters', () => {
      expect(formatLength(toMeters(145))).toBe('145 m');
    });
  });

  describe('Percentage, Reputation & Load Factor Formatters', () => {
    it('formats percentage with Indonesian decimal comma', () => {
      expect(formatPercentage(84.5, { decimals: 1 })).toBe('84,5%');
      expect(formatPercentage(0.845, { isRatio: true, decimals: 1 })).toBe('84,5%');
    });

    it('formats reputation gauge with star glyph per UI_SPEC.md §2.1', () => {
      expect(formatReputation(0.84)).toBe('★ 84%');
      expect(formatReputation(0.95)).toBe('★ 95%');
    });

    it('formats load factor into integer percentage', () => {
      expect(formatLoadFactor(0.88)).toBe('88%');
      expect(formatLoadFactor(1.15)).toBe('115%');
    });
  });
});
