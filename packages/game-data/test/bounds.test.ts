import { describe, expect, it } from 'vitest';
import {
  INDONESIA_COORDINATE_BOUNDS,
  JAVA_COORDINATE_BOUNDS,
  isWithinBounds,
  isWithinIndonesiaBounds,
  isWithinJavaBounds,
} from '../src/schemas/bounds.schema.js';
import { JAVA_STATION_CATALOG } from '../src/catalog/stations.js';

describe('Geographic Coordinate Bounds Validation', () => {
  it('confirms Java bounding box covers all 7 Java stations', () => {
    for (const station of JAVA_STATION_CATALOG) {
      expect(isWithinJavaBounds(station.coordinates)).toBe(true);
      expect(isWithinIndonesiaBounds(station.coordinates)).toBe(true);

      // Explicit bounds check
      expect(station.coordinates.lat).toBeGreaterThanOrEqual(JAVA_COORDINATE_BOUNDS.minLat);
      expect(station.coordinates.lat).toBeLessThanOrEqual(JAVA_COORDINATE_BOUNDS.maxLat);
      expect(station.coordinates.lng).toBeGreaterThanOrEqual(JAVA_COORDINATE_BOUNDS.minLng);
      expect(station.coordinates.lng).toBeLessThanOrEqual(JAVA_COORDINATE_BOUNDS.maxLng);

      expect(station.coordinates.lat).toBeGreaterThanOrEqual(INDONESIA_COORDINATE_BOUNDS.minLat);
      expect(station.coordinates.lat).toBeLessThanOrEqual(INDONESIA_COORDINATE_BOUNDS.maxLat);
    }
  });

  it('correctly rejects foreign coordinates outside Java bounds', () => {
    // Singapore: 1.3521, 103.8198
    expect(isWithinJavaBounds({ lat: 1.3521, lng: 103.8198 })).toBe(false);

    // Tokyo: 35.6762, 139.6503
    expect(isWithinJavaBounds({ lat: 35.6762, lng: 139.6503 })).toBe(false);

    // Null Island: 0.0, 0.0
    expect(isWithinJavaBounds({ lat: 0.0, lng: 0.0 })).toBe(false);
    expect(isWithinIndonesiaBounds({ lat: 0.0, lng: 0.0 })).toBe(false);

    // Medan (Sumatra): 3.5952, 98.6722 (in Indonesia, but NOT in Java bounds)
    expect(isWithinJavaBounds({ lat: 3.5952, lng: 98.6722 })).toBe(false);
    expect(isWithinIndonesiaBounds({ lat: 3.5952, lng: 98.6722 })).toBe(true);
  });

  it('evaluates custom bounds with isWithinBounds', () => {
    const box = { minLat: 10, maxLat: 20, minLng: 30, maxLng: 40 };
    expect(isWithinBounds({ lat: 15, lng: 35 }, box)).toBe(true);
    expect(isWithinBounds({ lat: 9, lng: 35 }, box)).toBe(false);
  });
});
