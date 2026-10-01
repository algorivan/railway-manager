import { z } from 'zod';
export declare const CoordinatesSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
//# sourceMappingURL=coordinates.schema.d.ts.map