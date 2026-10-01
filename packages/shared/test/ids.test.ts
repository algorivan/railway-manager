import { describe, expect, it } from 'vitest';
import {
  CompanyId,
  createBrandedId,
  createUuid,
  generateDeterministicId,
  StationId,
} from '../src/identifiers/ids.js';
import { DeterministicPRNG } from '../src/prng/mulberry32.js';

describe('Branded ID Generators', () => {
  it('creates strongly typed branded IDs', () => {
    const stationId = createBrandedId<StationId>('STN_GMR_GAMBIR');
    expect(stationId).toBe('STN_GMR_GAMBIR');

    const companyId = createBrandedId<CompanyId>('CMP_KAI_01');
    expect(companyId).toBe('CMP_KAI_01');

    expect(() => createBrandedId('')).toThrow(TypeError);
    expect(() => createBrandedId('   ')).toThrow(TypeError);
  });

  it('generates reproducible deterministic IDs from PRNG', () => {
    const prng1 = new DeterministicPRNG(12345);
    const id1 = generateDeterministicId('STN', prng1);

    const prng2 = new DeterministicPRNG(12345);
    const id2 = generateDeterministicId('STN', prng2);

    expect(id1).toBe(id2);
    expect(id1.startsWith('STN_')).toBe(true);

    expect(() => generateDeterministicId('', prng1)).toThrow(TypeError);
  });

  it('generates standard RFC-4122 v4 UUIDs', () => {
    const prng = new DeterministicPRNG(777);
    const uuid1 = createUuid(prng);
    const uuid2 = createUuid(new DeterministicPRNG(777));

    expect(uuid1).toBe(uuid2);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid1).toMatch(uuidRegex);

    // Non-deterministic invocation also matches format
    const randomUuid = createUuid();
    expect(randomUuid).toMatch(uuidRegex);
  });
});
