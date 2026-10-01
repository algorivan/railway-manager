import { describe, expect, it } from 'vitest';
import { JAVA_STATION_CATALOG } from '../src/catalog/stations.js';
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from '../src/catalog/tracks.js';

describe('Authoritative Java Catalog Data', () => {
  it('contains exactly 7 stations with unique codes and IDs', () => {
    expect(JAVA_STATION_CATALOG.length).toBe(7);

    const codes = JAVA_STATION_CATALOG.map((s) => s.code);
    expect(new Set(codes).size).toBe(7);
    expect(codes).toEqual(['GMR', 'BD', 'CN', 'SMT', 'YK', 'SLO', 'SGU']);

    const ids = JAVA_STATION_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('contains exactly 9 track corridor segments', () => {
    expect(JAVA_TRACK_CORRIDOR_SEGMENTS.length).toBe(9);
    const ids = JAVA_TRACK_CORRIDOR_SEGMENTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('verifies CRITICAL INVARIANT: Gambir - Bandung distance is exactly 160.0 km', () => {
    const gmrBd = JAVA_TRACK_CORRIDOR_SEGMENTS.find((s) => s.id === 'SEG_GMR_BD');
    expect(gmrBd).toBeDefined();
    expect(gmrBd!.distanceKm).toBe(160.0);
    expect(gmrBd!.originStationId).toBe('STN_GMR_GAMBIR');
    expect(gmrBd!.destinationStationId).toBe('STN_BD_BANDUNG');
    expect(gmrBd!.maxSpeedKmh).toBe(100);
  });

  it('verifies CRITICAL INVARIANT: Yogyakarta - Solo Balapan is the ONLY electrified segment', () => {
    const ykSlo = JAVA_TRACK_CORRIDOR_SEGMENTS.find((s) => s.id === 'SEG_YK_SLO');
    expect(ykSlo).toBeDefined();
    expect(ykSlo!.isElectrified).toBe(true);
    expect(ykSlo!.distanceKm).toBe(60.0);
    expect(ykSlo!.maxSpeedKmh).toBe(120);

    const otherSegments = JAVA_TRACK_CORRIDOR_SEGMENTS.filter((s) => s.id !== 'SEG_YK_SLO');
    for (const segment of otherSegments) {
      expect(segment.isElectrified).toBe(false);
    }
  });

  it('verifies all stations have verified provenance', () => {
    for (const s of JAVA_STATION_CATALOG) {
      expect(s.provenance.verified).toBe(true);
      expect(s.provenance.source.length).toBeGreaterThan(0);
      expect(s.provenance.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  it('verifies all track corridor segments have verified provenance', () => {
    for (const seg of JAVA_TRACK_CORRIDOR_SEGMENTS) {
      expect(seg.provenance.verified).toBe(true);
      expect(seg.provenance.source.length).toBeGreaterThan(0);
      expect(seg.provenance.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});
