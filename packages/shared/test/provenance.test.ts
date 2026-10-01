import { describe, expect, it } from 'vitest';
import { DataProvenanceSchema } from '../src/provenance/provenance.js';

describe('DataProvenance Schema', () => {
  it('validates authentic provenance metadata', () => {
    const valid = {
      source: 'PT Kereta Api Indonesia (Persero) - Gapeka 2026',
      sourceDate: '2026-01-15',
      verified: true,
      notes: 'Authoritative timetable distance',
    };

    const parsed = DataProvenanceSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source).toBe(valid.source);
      expect(parsed.data.verified).toBe(true);
    }
  });

  it('validates ISO-8601 timestamps with full time component', () => {
    const valid = {
      source: 'DISHUB Regulation 2026',
      sourceDate: '2026-02-10T14:30:00.000Z',
      verified: true,
    };
    expect(DataProvenanceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid or missing sources and dates', () => {
    // Empty source
    expect(
      DataProvenanceSchema.safeParse({
        source: '',
        sourceDate: '2026-01-15',
        verified: true,
      }).success
    ).toBe(false);

    // Invalid date format
    expect(
      DataProvenanceSchema.safeParse({
        source: 'KAI Manual',
        sourceDate: '15/01/2026',
        verified: true,
      }).success
    ).toBe(false);

    // Non-boolean verified
    expect(
      DataProvenanceSchema.safeParse({
        source: 'KAI Manual',
        sourceDate: '2026-01-15',
        verified: 'yes',
      }).success
    ).toBe(false);
  });
});
