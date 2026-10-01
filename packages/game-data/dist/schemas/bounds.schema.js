import { z } from 'zod';
export const CoordinateBoundsSchema = z
    .object({
    minLat: z.number(),
    maxLat: z.number(),
    minLng: z.number(),
    maxLng: z.number(),
})
    .refine((b) => b.minLat < b.maxLat && b.minLng < b.maxLng, {
    message: 'Minimum bounds must be strictly less than maximum bounds',
});
/**
 * Coordinate bounding box for Java Island (Pulau Jawa) railway network.
 * Lat: [-9.0, -5.5], Lng: [105.0, 115.0].
 */
export const JAVA_COORDINATE_BOUNDS = Object.freeze({
    minLat: -9.0,
    maxLat: -5.5,
    minLng: 105.0,
    maxLng: 115.0,
});
/**
 * National coordinate bounding box for Indonesian territory (Sabang to Merauke).
 * Lat: [-11.0, 6.0], Lng: [95.0, 141.0].
 */
export const INDONESIA_COORDINATE_BOUNDS = Object.freeze({
    minLat: -11.0,
    maxLat: 6.0,
    minLng: 95.0,
    maxLng: 141.0,
});
export function isWithinBounds(coords, bounds) {
    return (coords.lat >= bounds.minLat &&
        coords.lat <= bounds.maxLat &&
        coords.lng >= bounds.minLng &&
        coords.lng <= bounds.maxLng);
}
export function isWithinJavaBounds(coords) {
    return isWithinBounds(coords, JAVA_COORDINATE_BOUNDS);
}
export function isWithinIndonesiaBounds(coords) {
    return isWithinBounds(coords, INDONESIA_COORDINATE_BOUNDS);
}
//# sourceMappingURL=bounds.schema.js.map