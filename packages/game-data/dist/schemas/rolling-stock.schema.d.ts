import { z } from 'zod';
export declare const RollingStockCategorySchema: z.ZodEnum<["LOCOMOTIVE", "PASSENGER_CARRIAGE", "POWER_GENERATOR_CAR", "DINING_CAR", "BAGGAGE_CAR", "PARCEL_CAR", "CONTAINER_WAGON", "COMMODITY_WAGON", "SPECIALIZED_FREIGHT_WAGON"]>;
export type RollingStockCategory = z.infer<typeof RollingStockCategorySchema>;
export declare const PassengerClassSchema: z.ZodEnum<["ECONOMY", "EXECUTIVE", "LUXURY"]>;
export type PassengerClass = z.infer<typeof PassengerClassSchema>;
export declare const BuildTypeSchema: z.ZodEnum<["BASIC_STEEL", "CONVENTIONAL_STEEL", "MODERN_STEEL", "STAINLESS_STEEL"]>;
export type BuildType = z.infer<typeof BuildTypeSchema>;
export declare const BogieTypeSchema: z.ZodEnum<["LOW_SPEED_100", "MEDIUM_SPEED_120", "HIGH_SPEED_160"]>;
export type BogieType = z.infer<typeof BogieTypeSchema>;
export declare const EnergyTypeSchema: z.ZodEnum<["DIESEL_ELECTRIC", "ELECTRIC_AC", "ELECTRIC_DC", "HYBRID"]>;
export type EnergyType = z.infer<typeof EnergyTypeSchema>;
export declare const RollingStockSpecCatalogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    modelName: z.ZodString;
    category: z.ZodEnum<["LOCOMOTIVE", "PASSENGER_CARRIAGE", "POWER_GENERATOR_CAR", "DINING_CAR", "BAGGAGE_CAR", "PARCEL_CAR", "CONTAINER_WAGON", "COMMODITY_WAGON", "SPECIALIZED_FREIGHT_WAGON"]>;
    passengerClass: z.ZodOptional<z.ZodEnum<["ECONOMY", "EXECUTIVE", "LUXURY"]>>;
    buildType: z.ZodEnum<["BASIC_STEEL", "CONVENTIONAL_STEEL", "MODERN_STEEL", "STAINLESS_STEEL"]>;
    bogieType: z.ZodEnum<["LOW_SPEED_100", "MEDIUM_SPEED_120", "HIGH_SPEED_160"]>;
    maximumSpeedKmh: z.ZodNumber;
    passengerCapacity: z.ZodNumber;
    cargoCapacityTons: z.ZodNumber;
    tareWeightTons: z.ZodNumber;
    lengthMeters: z.ZodNumber;
    energyType: z.ZodEnum<["DIESEL_ELECTRIC", "ELECTRIC_AC", "ELECTRIC_DC", "HYBRID"]>;
    energyConsumptionRate: z.ZodNumber;
    basePurchaseCost: z.ZodNumber;
    standardLeadTimeDays: z.ZodNumber;
    standardMaintenanceIntervalKm: z.ZodNumber;
    expectedServiceLifeDays: z.ZodNumber;
    headEndPowerEquipped: z.ZodDefault<z.ZodBoolean>;
    provenance: z.ZodObject<{
        source: z.ZodString;
        sourceDate: z.ZodString;
        verified: z.ZodBoolean;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    }, {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    modelName: string;
    category: "LOCOMOTIVE" | "PASSENGER_CARRIAGE" | "POWER_GENERATOR_CAR" | "DINING_CAR" | "BAGGAGE_CAR" | "PARCEL_CAR" | "CONTAINER_WAGON" | "COMMODITY_WAGON" | "SPECIALIZED_FREIGHT_WAGON";
    buildType: "BASIC_STEEL" | "CONVENTIONAL_STEEL" | "MODERN_STEEL" | "STAINLESS_STEEL";
    bogieType: "LOW_SPEED_100" | "MEDIUM_SPEED_120" | "HIGH_SPEED_160";
    maximumSpeedKmh: number;
    passengerCapacity: number;
    cargoCapacityTons: number;
    tareWeightTons: number;
    lengthMeters: number;
    energyType: "DIESEL_ELECTRIC" | "ELECTRIC_AC" | "ELECTRIC_DC" | "HYBRID";
    energyConsumptionRate: number;
    basePurchaseCost: number;
    standardLeadTimeDays: number;
    standardMaintenanceIntervalKm: number;
    expectedServiceLifeDays: number;
    headEndPowerEquipped: boolean;
    passengerClass?: "ECONOMY" | "EXECUTIVE" | "LUXURY" | undefined;
}, {
    id: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    modelName: string;
    category: "LOCOMOTIVE" | "PASSENGER_CARRIAGE" | "POWER_GENERATOR_CAR" | "DINING_CAR" | "BAGGAGE_CAR" | "PARCEL_CAR" | "CONTAINER_WAGON" | "COMMODITY_WAGON" | "SPECIALIZED_FREIGHT_WAGON";
    buildType: "BASIC_STEEL" | "CONVENTIONAL_STEEL" | "MODERN_STEEL" | "STAINLESS_STEEL";
    bogieType: "LOW_SPEED_100" | "MEDIUM_SPEED_120" | "HIGH_SPEED_160";
    maximumSpeedKmh: number;
    passengerCapacity: number;
    cargoCapacityTons: number;
    tareWeightTons: number;
    lengthMeters: number;
    energyType: "DIESEL_ELECTRIC" | "ELECTRIC_AC" | "ELECTRIC_DC" | "HYBRID";
    energyConsumptionRate: number;
    basePurchaseCost: number;
    standardLeadTimeDays: number;
    standardMaintenanceIntervalKm: number;
    expectedServiceLifeDays: number;
    passengerClass?: "ECONOMY" | "EXECUTIVE" | "LUXURY" | undefined;
    headEndPowerEquipped?: boolean | undefined;
}>;
export type RollingStockSpecCatalogEntry = z.infer<typeof RollingStockSpecCatalogEntrySchema>;
//# sourceMappingURL=rolling-stock.schema.d.ts.map