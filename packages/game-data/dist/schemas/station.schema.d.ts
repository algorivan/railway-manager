import { z } from 'zod';
export declare const StationCatalogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
    region: z.ZodEnum<["DAOP_1_JAKARTA", "DAOP_2_BANDUNG", "DAOP_3_CIREBON", "DAOP_4_SEMARANG", "DAOP_5_PURWOKERTO", "DAOP_6_YOGYAKARTA", "DAOP_7_MADIUN", "DAOP_8_SURABAYA", "DAOP_9_JEMBER"]>;
    coordinates: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    platformCount: z.ZodNumber;
    maxTrainLengthMeters: z.ZodNumber;
    facilities: z.ZodObject<{
        hasCargoTerminal: z.ZodBoolean;
        hasDepotConnection: z.ZodBoolean;
        hasExecutiveLounge: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        hasCargoTerminal: boolean;
        hasDepotConnection: boolean;
        hasExecutiveLounge: boolean;
    }, {
        hasCargoTerminal: boolean;
        hasDepotConnection: boolean;
        hasExecutiveLounge: boolean;
    }>;
    demandProfile: z.ZodEffects<z.ZodObject<{
        baseDailyDemand: z.ZodNumber;
        commuterShare: z.ZodNumber;
        businessShare: z.ZodNumber;
        touristShare: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    }, {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    }>, {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    }, {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    }>;
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
    code: string;
    id: string;
    name: string;
    region: "DAOP_1_JAKARTA" | "DAOP_2_BANDUNG" | "DAOP_3_CIREBON" | "DAOP_4_SEMARANG" | "DAOP_5_PURWOKERTO" | "DAOP_6_YOGYAKARTA" | "DAOP_7_MADIUN" | "DAOP_8_SURABAYA" | "DAOP_9_JEMBER";
    coordinates: {
        lat: number;
        lng: number;
    };
    platformCount: number;
    maxTrainLengthMeters: number;
    facilities: {
        hasCargoTerminal: boolean;
        hasDepotConnection: boolean;
        hasExecutiveLounge: boolean;
    };
    demandProfile: {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    };
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
}, {
    code: string;
    id: string;
    name: string;
    region: "DAOP_1_JAKARTA" | "DAOP_2_BANDUNG" | "DAOP_3_CIREBON" | "DAOP_4_SEMARANG" | "DAOP_5_PURWOKERTO" | "DAOP_6_YOGYAKARTA" | "DAOP_7_MADIUN" | "DAOP_8_SURABAYA" | "DAOP_9_JEMBER";
    coordinates: {
        lat: number;
        lng: number;
    };
    platformCount: number;
    maxTrainLengthMeters: number;
    facilities: {
        hasCargoTerminal: boolean;
        hasDepotConnection: boolean;
        hasExecutiveLounge: boolean;
    };
    demandProfile: {
        baseDailyDemand: number;
        commuterShare: number;
        businessShare: number;
        touristShare: number;
    };
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
}>;
export type StationCatalogEntry = z.infer<typeof StationCatalogEntrySchema>;
//# sourceMappingURL=station.schema.d.ts.map