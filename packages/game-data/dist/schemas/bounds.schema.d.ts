import { z } from 'zod';
export declare const CoordinateBoundsSchema: z.ZodEffects<z.ZodObject<{
    minLat: z.ZodNumber;
    maxLat: z.ZodNumber;
    minLng: z.ZodNumber;
    maxLng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}, {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}>, {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}, {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}>;
export type CoordinateBounds = z.infer<typeof CoordinateBoundsSchema>;
/**
 * Coordinate bounding box for Java Island (Pulau Jawa) railway network.
 * Lat: [-9.0, -5.5], Lng: [105.0, 115.0].
 */
export declare const JAVA_COORDINATE_BOUNDS: CoordinateBounds;
/**
 * National coordinate bounding box for Indonesian territory (Sabang to Merauke).
 * Lat: [-11.0, 6.0], Lng: [95.0, 141.0].
 */
export declare const INDONESIA_COORDINATE_BOUNDS: CoordinateBounds;
export declare function isWithinBounds(coords: {
    lat: number;
    lng: number;
}, bounds: CoordinateBounds): boolean;
export declare function isWithinJavaBounds(coords: {
    lat: number;
    lng: number;
}): boolean;
export declare function isWithinIndonesiaBounds(coords: {
    lat: number;
    lng: number;
}): boolean;
//# sourceMappingURL=bounds.schema.d.ts.map