import { z } from 'zod';

export const DaopRegionSchema = z.enum([
  'DAOP_1_JAKARTA',
  'DAOP_2_BANDUNG',
  'DAOP_3_CIREBON',
  'DAOP_4_SEMARANG',
  'DAOP_5_PURWOKERTO',
  'DAOP_6_YOGYAKARTA',
  'DAOP_7_MADIUN',
  'DAOP_8_SURABAYA',
  'DAOP_9_JEMBER',
]);

export type DaopRegion = z.infer<typeof DaopRegionSchema>;
