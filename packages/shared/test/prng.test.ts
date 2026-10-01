import { describe, expect, it } from 'vitest';
import { DeterministicPRNG } from '../src/prng/mulberry32.js';

/**
 * Pure canonical 32-bit unsigned Mulberry32 generator.
 * Serves as an independent mathematical oracle for determinism tests.
 */
function createCanonicalMulberry32(seed: number) {
  let state = seed >>> 0;
  return {
    nextUint32(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    },
    getState(): number {
      return state;
    },
  };
}

describe('DeterministicPRNG (Mulberry32)', () => {
  describe('1. Reference Vectors & Basic Operations', () => {
    it('matches exact reference test vectors for seed 12345', () => {
      const prng = new DeterministicPRNG(12345);

      // Iteration 0
      const uint0 = prng.nextUint32();
      expect(uint0).toBe(4207900869);

      const expectedUint32 = [
        1317490944, 2079646450, 3513001552, 2187978186, 1492380277, 316786230,
        3291647763, 4281336957, 3543444592,
      ];

      for (let i = 0; i < expectedUint32.length; i++) {
        expect(prng.nextUint32()).toBe(expectedUint32[i]);
      }
    });

    it('matches float reference test vectors for seed 12345', () => {
      const prng = new DeterministicPRNG(12345);

      const f0 = prng.next();
      expect(f0).toBeCloseTo(0.9797282677609473, 14);

      const expectedFloats = [
        0.3067522644996643, 0.484205421525985, 0.817934412509203,
        0.5094283693470061, 0.34747186047025025, 0.07375754183158278,
        0.7663964673411101, 0.9968264393974096, 0.8250224851071835,
      ];

      for (let i = 0; i < expectedFloats.length; i++) {
        expect(prng.nextFloat()).toBeCloseTo(expectedFloats[i]!, 14);
      }
    });

    it('handles boundary seeds 0 and 4294967295 without locking or NaN', () => {
      const prng0 = new DeterministicPRNG(0);
      expect(prng0.nextUint32()).toBe(1144304738);
      expect(prng0.nextFloat()).toBeCloseTo(0.0003297457005828619, 14);

      const prngMax = new DeterministicPRNG(4294967295);
      expect(prngMax.nextUint32()).toBe(3850105811);
      expect(prngMax.nextFloat()).toBeCloseTo(0.189478256739676, 14);
    });

    it('generates uniform integers in [min, max] inclusive', () => {
      const prng = new DeterministicPRNG(12345);
      const expectedInts = [98, 31, 49, 82, 51, 35, 8, 77, 100, 83];
      for (let i = 0; i < expectedInts.length; i++) {
        expect(prng.nextInt(1, 100)).toBe(expectedInts[i]);
      }

      // min === max
      expect(prng.nextInt(5, 5)).toBe(5);

      // min > max throws RangeError
      expect(() => prng.nextInt(10, 5)).toThrow(RangeError);
    });

    it('picks elements uniformly and shuffles deterministically', () => {
      const prng1 = new DeterministicPRNG(999);
      const items = ['GMR', 'BD', 'CN', 'SMT', 'YK', 'SLO', 'SGU'];

      const picked1 = prng1.pick(items);
      const shuffled1 = prng1.shuffle(items);

      const prng2 = new DeterministicPRNG(999);
      const picked2 = prng2.pick(items);
      const shuffled2 = prng2.shuffle(items);

      expect(picked1).toBe(picked2);
      expect(shuffled1).toEqual(shuffled2);

      expect(() => prng1.pick([])).toThrow('Cannot pick from empty array');
    });

    it('supports state snapshots, restores, and fork for short sequences', () => {
      const prng = new DeterministicPRNG(42);
      prng.next();
      prng.next();
      const savedState = prng.getState();

      const val1 = prng.next();
      const val2 = prng.next();

      // Restore state
      prng.setState(savedState);
      expect(prng.next()).toBe(val1);
      expect(prng.next()).toBe(val2);

      // Fork
      prng.setState(savedState);
      const forked = prng.fork();
      expect(forked.next()).toBe(val1);
      expect(forked.next()).toBe(val2);
    });
  });

  describe('2. Boundary Seeds & Bitwise Normalization', () => {
    it('handles negative, overflowing, and extreme boundary seeds safely', () => {
      const testSeeds = [
        0,
        1,
        0xffffffff,
        -1,
        -42,
        4294967296, // 2^32
        2147483647, // 2^31 - 1
        -2147483648, // -2^31
        Number.MAX_SAFE_INTEGER,
      ];

      for (const s of testSeeds) {
        const prng = new DeterministicPRNG(s);
        const state = prng.getState();
        expect(Number.isSafeInteger(state)).toBe(true);
        expect(state).toBeGreaterThanOrEqual(0);
        expect(state).toBeLessThanOrEqual(0xffffffff);

        const n = prng.next();
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(1);
        expect(Number.isNaN(n)).toBe(false);

        const u = prng.nextUint32();
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(u)).toBe(true);

        const i = prng.nextInt(1, 10);
        expect(i).toBeGreaterThanOrEqual(1);
        expect(i).toBeLessThanOrEqual(10);
        expect(Number.isInteger(i)).toBe(true);
      }
    });

    it('enforces bitwise seed equivalence modulo 2^32', () => {
      const prngNeg = new DeterministicPRNG(-1);
      const prngMax = new DeterministicPRNG(0xffffffff);
      expect(prngNeg.getState()).toBe(prngMax.getState());
      for (let i = 0; i < 50; i++) {
        expect(prngNeg.nextUint32()).toBe(prngMax.nextUint32());
      }

      const prngOverflow = new DeterministicPRNG(4294967296);
      const prngZero = new DeterministicPRNG(0);
      expect(prngOverflow.getState()).toBe(prngZero.getState());
      for (let i = 0; i < 50; i++) {
        expect(prngOverflow.nextUint32()).toBe(prngZero.nextUint32());
      }
    });
  });

  describe('3. Long-Sequence Determinism & Uniformity', () => {
    it('produces 1,000,000 identical outputs across two independent instances', () => {
      const seed = 123456789;
      const prngA = new DeterministicPRNG(seed);
      const prngB = new DeterministicPRNG(seed);

      let mismatchIndex = -1;
      for (let i = 0; i < 1_000_000; i++) {
        if (prngA.nextUint32() !== prngB.nextUint32()) {
          mismatchIndex = i;
          break;
        }
      }
      expect(mismatchIndex).toBe(-1);
    });

    it('satisfies Chi-Square statistical uniformity on 100,000 samples (p=0.01)', () => {
      const prng = new DeterministicPRNG(987654321);
      const TRIALS = 100_000;
      const bins = new Array(11).fill(0);

      for (let i = 0; i < TRIALS; i++) {
        bins[prng.nextInt(1, 10)]++;
      }

      const expectedPerBin = TRIALS / 10;
      let chiSquare = 0;
      for (let b = 1; b <= 10; b++) {
        const diff = bins[b] - expectedPerBin;
        chiSquare += (diff * diff) / expectedPerBin;
      }

      // df = 9, critical value at p=0.01 is 21.67
      expect(chiSquare).toBeLessThanOrEqual(21.67);
    });
  });

  describe('4. Canonical Mulberry32 Compliance & Float Boundary (5M Steps)', () => {
    it(
      'matches canonical Mulberry32 across the IEEE-754 float precision boundary (5,000,000 steps)',
      () => {
        const seed = 42;
        const prng = new DeterministicPRNG(seed);
        const canon = createCanonicalMulberry32(seed);

        const TOTAL_STEPS = 5_000_000;
        let mismatchStep = -1;
        let actualValue = 0;
        let expectedValue = 0;

        for (let i = 0; i < TOTAL_STEPS; i++) {
          const act = prng.nextUint32();
          const exp = canon.nextUint32();
          if (act !== exp) {
            mismatchStep = i;
            actualValue = act;
            expectedValue = exp;
            break;
          }
        }

        expect({ mismatchStep, actualValue, expectedValue }).toEqual({
          mismatchStep: -1,
          actualValue: 0,
          expectedValue: 0,
        });

        // Verify final state matches canonical uint32 state
        const finalState = prng.getState();
        expect(finalState).toBe(canon.getState());
        expect(Number.isSafeInteger(finalState)).toBe(true);
        expect(finalState).toBeGreaterThanOrEqual(0);
        expect(finalState).toBeLessThanOrEqual(0xffffffff);
      },
      15000
    );
  });

  describe('5. Checkpoint Serialization & Restoration Round-Trip at Scale', () => {
    it(
      'preserves exact determinism across getState/setState serialization after 5,000,000 steps',
      () => {
        const seed = 42;
        const prng = new DeterministicPRNG(seed);

        // Advance 5,000,000 steps (past the 4,917,758 float-overflow threshold)
        for (let i = 0; i < 5_000_000; i++) {
          prng.nextUint32();
        }

        const savedState = prng.getState();
        expect(typeof savedState).toBe('number');
        expect(Number.isSafeInteger(savedState)).toBe(true);
        expect(savedState).toBeGreaterThanOrEqual(0);
        expect(savedState).toBeLessThanOrEqual(0xffffffff);

        // Restore into another instance initialized with seed 0
        const restored = new DeterministicPRNG(0);
        restored.setState(savedState);
        expect(restored.getState()).toBe(savedState);

        // Verify stream identity for next 1,000 outputs
        for (let i = 0; i < 1_000; i++) {
          expect(restored.nextUint32()).toBe(prng.nextUint32());
        }

        // Verify fork() at extreme tick count
        const forked = restored.fork();
        expect(forked.getState()).toBe(restored.getState());
        for (let i = 0; i < 1_000; i++) {
          expect(forked.nextUint32()).toBe(restored.nextUint32());
        }
      },
      15000
    );

    it('preserves exact determinism at key threshold checkpoints (4,917,757 and 4,917,758)', () => {
      const seed = 42;
      const prng = new DeterministicPRNG(seed);

      // Fast-forward to 4,917,757 (last safe integer step in unmasked implementation)
      for (let i = 0; i < 4_917_757; i++) {
        prng.nextUint32();
      }

      // Checkpoint 1: Step 4,917,757
      const s1 = prng.getState();
      const r1 = new DeterministicPRNG(0);
      r1.setState(s1);
      expect(s1).toBeGreaterThanOrEqual(0);
      expect(s1).toBeLessThanOrEqual(0xffffffff);
      expect(r1.nextUint32()).toBe(prng.nextUint32());

      // Checkpoint 2: Step 4,917,758 (divergence boundary)
      const s2 = prng.getState();
      const r2 = new DeterministicPRNG(0);
      r2.setState(s2);
      expect(s2).toBeGreaterThanOrEqual(0);
      expect(s2).toBeLessThanOrEqual(0xffffffff);
      expect(r2.nextUint32()).toBe(prng.nextUint32());
    });
  });
});
