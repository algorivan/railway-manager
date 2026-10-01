import { z } from 'zod';
export declare const DataProvenanceSchema: z.ZodObject<{
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
export type DataProvenance = z.infer<typeof DataProvenanceSchema>;
//# sourceMappingURL=provenance.d.ts.map