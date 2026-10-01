import { z } from 'zod';
import { DataProvenanceSchema } from '@railway/shared';
export const TrackCorridorSegmentSchema = z
    .object({
    id: z.string().regex(/^SEG_[A-Z0-9]+_[A-Z0-9]+$/, 'Segment ID must follow pattern SEG_<FROM>_<TO>'),
    name: z.string().min(3).max(120),
    originStationId: z.string().min(1),
    destinationStationId: z.string().min(1),
    distanceKm: z.number().positive('Distance in km must be positive'),
    maxSpeedKmh: z.number().int().min(30, 'Minimum operational speed is 30 km/h').max(200, 'Maximum track speed is 200 km/h'),
    trackSpeedLimitKmh: z.number().int().min(30).max(200).optional(),
    isElectrified: z.boolean(),
    isDoubleTrack: z.boolean(),
    trackGaugeMm: z.number().int().default(1067),
    provenance: DataProvenanceSchema,
})
    .transform((data) => ({
    ...data,
    trackSpeedLimitKmh: data.trackSpeedLimitKmh ?? data.maxSpeedKmh,
    maxSpeedKmh: data.maxSpeedKmh,
}))
    .refine((seg) => seg.originStationId !== seg.destinationStationId, { message: 'Origin and destination station IDs must be distinct (no self-loops)' });
//# sourceMappingURL=track.schema.js.map