import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldDataCatalogLoader,
  JAVA_ROLLING_STOCK_CATALOG,
  RollingStockSpecCatalogEntrySchema,
  CatalogIntegrityError,
} from '../src/index.js';

describe('Rolling Stock Catalog & Loader', () => {
  beforeEach(() => {
    WorldDataCatalogLoader.reset();
  });

  it('validates every spec in JAVA_ROLLING_STOCK_CATALOG against RollingStockSpecCatalogEntrySchema', () => {
    for (const spec of JAVA_ROLLING_STOCK_CATALOG) {
      const parseResult = RollingStockSpecCatalogEntrySchema.safeParse(spec);
      expect(parseResult.success).toBe(true);
    }
  });

  it('loads exactly 9 authoritative rolling stock specifications', () => {
    const catalog = WorldDataCatalogLoader.initialize();
    expect(catalog.rollingStock.length).toBe(9);
  });

  it('provides O(1) lookup by spec ID', () => {
    WorldDataCatalogLoader.initialize();
    const cc206 = WorldDataCatalogLoader.getRollingStockSpecById('SPEC_LOCO_CC206');
    expect(cc206).toBeDefined();
    expect(cc206?.category).toBe('LOCOMOTIVE');
    expect(cc206?.maximumSpeedKmh).toBe(120);
    expect(cc206?.basePurchaseCost).toBe(32_000_000_000);

    const k1Exec = WorldDataCatalogLoader.getRollingStockSpecById('SPEC_COACH_K1_EXEC');
    expect(k1Exec).toBeDefined();
    expect(k1Exec?.category).toBe('PASSENGER_CARRIAGE');
    expect(k1Exec?.passengerClass).toBe('EXECUTIVE');
    expect(k1Exec?.passengerCapacity).toBe(50);
  });

  it('filters specifications by category', () => {
    WorldDataCatalogLoader.initialize();
    const locos = WorldDataCatalogLoader.getRollingStockSpecsByCategory('LOCOMOTIVE');
    expect(locos.length).toBe(2);
    expect(locos.map((l) => l.id)).toEqual(
      expect.arrayContaining(['SPEC_LOCO_CC206', 'SPEC_LOCO_CC201'])
    );

    const carriages = WorldDataCatalogLoader.getRollingStockSpecsByCategory('PASSENGER_CARRIAGE');
    expect(carriages.length).toBe(3); // K1 Exec, K3 Premium, K1 Luxury
  });

  it('strictly rejects duplicate rolling stock spec IDs', () => {
    const duplicate = [
      JAVA_ROLLING_STOCK_CATALOG[0]!,
      JAVA_ROLLING_STOCK_CATALOG[0]!,
    ];
    expect(() => {
      WorldDataCatalogLoader.loadRollingStock(duplicate);
    }).toThrow(CatalogIntegrityError);
  });
});
