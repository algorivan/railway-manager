import { describe, expect, it } from 'vitest';
import { DaopRegionSchema } from '../src/schemas/daop.schema.js';
import { CoordinatesSchema } from '../src/schemas/coordinates.schema.js';
import { CatchmentProfileSchema } from '../src/schemas/catchment.schema.js';
import { StationFacilitiesSchema } from '../src/schemas/facilities.schema.js';
import { StationCatalogEntrySchema } from '../src/schemas/station.schema.js';
import { TrackCorridorSegmentSchema } from '../src/schemas/track.schema.js';
import { CoordinateBoundsSchema } from '../src/schemas/bounds.schema.js';

describe('Game Data Zod Schemas', () => {
  it('validates DAOP operational regions', () => {
    expect(DaopRegionSchema.safeParse('DAOP_1_JAKARTA').success).toBe(true);
    expect(DaopRegionSchema.safeParse('DAOP_8_SURABAYA').success).toBe(true);
    expect(DaopRegionSchema.safeParse('DAOP_99_BALI').success).toBe(false);
  });

  it('validates Coordinates within Indonesia bounds', () => {
    // Gambir
    expect(CoordinatesSchema.safeParse({ lat: -6.1767, lng: 106.8306 }).success).toBe(true);
    // Out of bounds
    expect(CoordinatesSchema.safeParse({ lat: 10.0, lng: 106.0 }).success).toBe(false);
    expect(CoordinatesSchema.safeParse({ lat: -12.0, lng: 106.0 }).success).toBe(false);
  });

  it('validates CatchmentProfile normalization (sum to 1.0)', () => {
    // Valid normalized shares
    const valid = {
      baseDailyDemand: 25000,
      commuterShare: 0.2,
      businessShare: 0.5,
      touristShare: 0.3,
    };
    expect(CatchmentProfileSchema.safeParse(valid).success).toBe(true);

    // Valid with floating point precision
    const validFloat = {
      baseDailyDemand: 10000,
      commuterShare: 0.333,
      businessShare: 0.333,
      touristShare: 0.334,
    };
    expect(CatchmentProfileSchema.safeParse(validFloat).success).toBe(true);

    // Invalid sum
    const invalidSum = {
      baseDailyDemand: 20000,
      commuterShare: 0.5,
      businessShare: 0.5,
      touristShare: 0.2,
    };
    expect(CatchmentProfileSchema.safeParse(invalidSum).success).toBe(false);

    // Negative demand
    const negativeDemand = {
      baseDailyDemand: -100,
      commuterShare: 0.4,
      businessShare: 0.3,
      touristShare: 0.3,
    };
    expect(CatchmentProfileSchema.safeParse(negativeDemand).success).toBe(false);
  });

  it('validates StationFacilities boolean properties', () => {
    const facilities = {
      hasCargoTerminal: true,
      hasDepotConnection: false,
      hasExecutiveLounge: true,
    };
    expect(StationFacilitiesSchema.safeParse(facilities).success).toBe(true);
    expect(StationFacilitiesSchema.safeParse({ hasCargoTerminal: 'true' }).success).toBe(false);
  });

  it('validates StationCatalogEntrySchema and platform counts', () => {
    const validStation = {
      id: 'STN_GMR_GAMBIR',
      code: 'GMR',
      name: 'Stasiun Gambir',
      region: 'DAOP_1_JAKARTA',
      coordinates: { lat: -6.1767, lng: 106.8306 },
      platformCount: 4,
      maxTrainLengthMeters: 400,
      facilities: {
        hasCargoTerminal: false,
        hasDepotConnection: false,
        hasExecutiveLounge: true,
      },
      demandProfile: {
        baseDailyDemand: 28000,
        commuterShare: 0.15,
        businessShare: 0.55,
        touristShare: 0.3,
      },
      provenance: {
        source: 'KAI DAOP 1',
        sourceDate: '2026-01-15',
        verified: true,
      },
    };
    expect(StationCatalogEntrySchema.safeParse(validStation).success).toBe(true);

    // Platform count 0 or > 16 rejected
    expect(
      StationCatalogEntrySchema.safeParse({ ...validStation, platformCount: 0 }).success
    ).toBe(false);
    expect(
      StationCatalogEntrySchema.safeParse({ ...validStation, platformCount: 17 }).success
    ).toBe(false);

    // Invalid code (lowercase or too long)
    expect(
      StationCatalogEntrySchema.safeParse({ ...validStation, code: 'gmr' }).success
    ).toBe(false);
    expect(
      StationCatalogEntrySchema.safeParse({ ...validStation, code: 'JAKARTA' }).success
    ).toBe(false);
  });

  it('validates TrackCorridorSegmentSchema and forbids self-loops', () => {
    const validSegment = {
      id: 'SEG_GMR_BD',
      name: 'Koridor Gambir - Bandung',
      originStationId: 'STN_GMR_GAMBIR',
      destinationStationId: 'STN_BD_BANDUNG',
      distanceKm: 160.0,
      maxSpeedKmh: 100,
      isElectrified: false,
      isDoubleTrack: false,
      trackGaugeMm: 1067,
      provenance: {
        source: 'Gapeka 2026',
        sourceDate: '2026-01-15',
        verified: true,
      },
    };
    const res = TrackCorridorSegmentSchema.safeParse(validSegment);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.trackSpeedLimitKmh).toBe(100);
    }

    // Rejects self-loops
    expect(
      TrackCorridorSegmentSchema.safeParse({
        ...validSegment,
        destinationStationId: 'STN_GMR_GAMBIR',
      }).success
    ).toBe(false);

    // Rejects non-positive distance
    expect(
      TrackCorridorSegmentSchema.safeParse({
        ...validSegment,
        distanceKm: 0,
      }).success
    ).toBe(false);
  });

  it('validates CoordinateBounds min < max', () => {
    expect(
      CoordinateBoundsSchema.safeParse({
        minLat: -9.0,
        maxLat: -5.5,
        minLng: 105.0,
        maxLng: 115.0,
      }).success
    ).toBe(true);

    // Inverted bounds
    expect(
      CoordinateBoundsSchema.safeParse({
        minLat: 5.0,
        maxLat: 2.0,
        minLng: 100.0,
        maxLng: 110.0,
      }).success
    ).toBe(false);
  });
});
