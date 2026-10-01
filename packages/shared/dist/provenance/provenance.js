import { z } from 'zod';
export const DataProvenanceSchema = z.object({
    source: z.string().min(1, 'Source is required'),
    sourceDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/, 'sourceDate must be an ISO-8601 formatted date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'),
    verified: z.boolean(),
    notes: z.string().optional(),
});
//# sourceMappingURL=provenance.js.map