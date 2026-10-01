import { z } from 'zod';
import { DataProvenanceSchema } from '@railway/shared';

export const RollingStockCategorySchema = z.enum([
  'LOCOMOTIVE',
  'PASSENGER_CARRIAGE',
  'POWER_GENERATOR_CAR',
  'DINING_CAR',
  'BAGGAGE_CAR',
  'PARCEL_CAR',
  'CONTAINER_WAGON',
  'COMMODITY_WAGON',
  'SPECIALIZED_FREIGHT_WAGON',
]);

export type RollingStockCategory = z.infer<typeof RollingStockCategorySchema>;

export const PassengerClassSchema = z.enum(['ECONOMY', 'EXECUTIVE', 'LUXURY']);
export type PassengerClass = z.infer<typeof PassengerClassSchema>;

export const BuildTypeSchema = z.enum([
  'BASIC_STEEL',
  'CONVENTIONAL_STEEL',
  'MODERN_STEEL',
  'STAINLESS_STEEL',
]);
export type BuildType = z.infer<typeof BuildTypeSchema>;

export const BogieTypeSchema = z.enum([
  'LOW_SPEED_100',
  'MEDIUM_SPEED_120',
  'HIGH_SPEED_160',
]);
export type BogieType = z.infer<typeof BogieTypeSchema>;

export const EnergyTypeSchema = z.enum([
  'DIESEL_ELECTRIC',
  'ELECTRIC_AC',
  'ELECTRIC_DC',
  'HYBRID',
]);
export type EnergyType = z.infer<typeof EnergyTypeSchema>;

export const RollingStockSpecCatalogEntrySchema = z.object({
  id: z.string().regex(/^SPEC_[A-Z0-9_]+$/, 'Specification ID must follow pattern SPEC_<CATEGORY>_<NAME>'),
  modelName: z.string().min(2).max(100),
  category: RollingStockCategorySchema,
  passengerClass: PassengerClassSchema.optional(),
  buildType: BuildTypeSchema,
  bogieType: BogieTypeSchema,
  maximumSpeedKmh: z.number().int().min(40).max(200),
  passengerCapacity: z.number().int().min(0).max(200),
  cargoCapacityTons: z.number().min(0).max(150),
  tareWeightTons: z.number().min(5).max(150),
  lengthMeters: z.number().min(5).max(35),
  energyType: EnergyTypeSchema,
  energyConsumptionRate: z.number().min(0),
  basePurchaseCost: z.number().int().min(1),
  standardLeadTimeDays: z.number().int().min(1),
  standardMaintenanceIntervalKm: z.number().min(1000),
  expectedServiceLifeDays: z.number().int().min(365),
  headEndPowerEquipped: z.boolean().default(false),
  provenance: DataProvenanceSchema,
});

export type RollingStockSpecCatalogEntry = z.infer<typeof RollingStockSpecCatalogEntrySchema>;
