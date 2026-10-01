import { z } from 'zod';
export declare const TrackCorridorSegmentSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    originStationId: z.ZodString;
    destinationStationId: z.ZodString;
    distanceKm: z.ZodNumber;
    maxSpeedKmh: z.ZodNumber;
    trackSpeedLimitKmh: z.ZodOptional<z.ZodNumber>;
    isElectrified: z.ZodBoolean;
    isDoubleTrack: z.ZodBoolean;
    trackGaugeMm: z.ZodDefault<z.ZodNumber>;
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
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    maxSpeedKmh: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackGaugeMm: number;
    trackSpeedLimitKmh?: number | undefined;
}, {
    id: string;
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    maxSpeedKmh: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackSpeedLimitKmh?: number | undefined;
    trackGaugeMm?: number | undefined;
}>, {
    trackSpeedLimitKmh: number;
    maxSpeedKmh: number;
    id: string;
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackGaugeMm: number;
}, {
    id: string;
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    maxSpeedKmh: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackSpeedLimitKmh?: number | undefined;
    trackGaugeMm?: number | undefined;
}>, {
    trackSpeedLimitKmh: number;
    maxSpeedKmh: number;
    id: string;
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackGaugeMm: number;
}, {
    id: string;
    name: string;
    provenance: {
        source: string;
        sourceDate: string;
        verified: boolean;
        notes?: string | undefined;
    };
    originStationId: string;
    destinationStationId: string;
    distanceKm: number;
    maxSpeedKmh: number;
    isElectrified: boolean;
    isDoubleTrack: boolean;
    trackSpeedLimitKmh?: number | undefined;
    trackGaugeMm?: number | undefined;
}>;
export type TrackCorridorSegment = z.infer<typeof TrackCorridorSegmentSchema>;
//# sourceMappingURL=track.schema.d.ts.map