import { z } from 'zod';

export const CoordinatesSchema = z.object({
  lat: z
    .number()
    .min(-11.0, 'Latitude below Indonesia southernmost bound (-11.0)')
    .max(6.0, 'Latitude above Indonesia northernmost bound (6.0)'),
  lng: z
    .number()
    .min(95.0, 'Longitude below Indonesia westernmost bound (95.0)')
    .max(141.0, 'Longitude above Indonesia easternmost bound (141.0)'),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;
