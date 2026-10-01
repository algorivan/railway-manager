import { z } from 'zod';
import { DataProvenanceSchema } from '@railway/shared';
import { DaopRegionSchema } from './daop.schema.js';
import { CoordinatesSchema } from './coordinates.schema.js';
import { CatchmentProfileSchema } from './catchment.schema.js';
import { StationFacilitiesSchema } from './facilities.schema.js';
export const StationCatalogEntrySchema = z.object({
    id: z.string().regex(/^STN_[A-Z0-9]+(_[A-Z0-9]+)?$/, 'Station ID must follow pattern STN_<CODE>_<NAME> or STN_<CODE>'),
    code: z.string().regex(/^[A-Z0-9]{2,4}$/, 'Code must be 2 to 4 uppercase alphanumeric characters'),
    name: z.string().min(2).max(100),
    region: DaopRegionSchema,
    coordinates: CoordinatesSchema,
    platformCount: z.number().int().min(1, 'Minimum platform count is 1').max(16, 'Maximum platform count is 16'),
    maxTrainLengthMeters: z.number().min(100).max(600),
    facilities: StationFacilitiesSchema,
    demandProfile: CatchmentProfileSchema,
    provenance: DataProvenanceSchema,
});
//# sourceMappingURL=station.schema.js.map