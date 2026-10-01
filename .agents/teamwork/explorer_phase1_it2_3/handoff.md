# Handoff Report: Integrating Empirical PRNG Stress Tests into Permanent Vitest Suite

**Agent:** `explorer_phase1_it2_3`  
**Milestone:** Phase 1 Iteration 2 (PRNG Stress Test Integration Strategy)  
**Parent:** `orchestrator_1` (`7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Target File for Worker:** `packages/shared/test/prng.test.ts`  
**Status:** COMPLETE (Hard Handoff — Read-Only Investigation)  
**Date:** 2026-09-30T15:44:00Z  

---

## 1. Observation

### 1.1 Baseline Test Coverage in `packages/shared/test/prng.test.ts`
The existing test file `packages/shared/test/prng.test.ts` (114 lines) contains only 6 unit tests:
1. `matches exact reference test vectors for seed 12345`: tests only the first 10 uint32 values (lines 5–27).
2. `matches float reference test vectors for seed 12345`: tests only the first 10 float values (lines 29–50).
3. `handles boundary seeds 0 and 4294967295 without locking or NaN`: tests only 2 specific seeds (lines 52–60).
4. `generates uniform integers in [min, max] inclusive`: checks 10 integers (lines 62–74).
5. `picks elements uniformly and shuffles deterministically`: checks small array (lines 76–91).
6. `supports state snapshots, restores, and fork`: checks state save/restore after only 2 steps (lines 93–112).

Running `pnpm --filter @railway/shared test`:
```text
Test Files  6 passed (6)
Tests       32 passed (32)
Duration    1.54s
```
All tests pass cleanly despite the critical floating-point precision loss and serialization drift defects.

### 1.2 Empirical Stress Suite Demonstrations (`scripts/empirical-stress-suite.mjs`)
Running `node scripts/empirical-stress-suite.mjs` lines 80–189 revealed two HIGH severity defects:
```text
[CHALLENGE DETECTED] PRNG diverges from canonical Mulberry32 at step 4917758 (actual: 2543212789, expected: 2345769536) due to unmasked state accumulation (this.state += 0x6D2B79F5 exceeds Number.MAX_SAFE_INTEGER at step 4,917,758)
[CHALLENGE DETECTED] PRNG state restore drift: state serialized at step 4,917,758 (9007197429407296) restores to different sequence (original: 2543212789, restored: 2345769536) because setState casts >>> 0 while internal state was corrupted by float rounding
```

### 1.3 Execution Benchmarks for 5,000,000 Steps in Node.js V8
Empirical performance measurements in the current Node v22 environment:
- **5,000,000 raw uint32 Mulberry32 iterations:** **55.06 ms**
- **5,000,000 `DeterministicPRNG.nextUint32()` method calls:** **70.36 ms**
- **5,000,000 iterations comparing against independent canonical generator with early-exit diff:** **94.23 ms** (when passing) and **137.09 ms** (when failing at step 4,917,758)
- **1,000,000 twin-instance sequence comparison:** **39.72 ms**
- **100,000 sample Chi-Square uniformity test:** **12.94 ms**
- **5,000,000 step state serialization round-trip & fork:** **0.48 ms**
- **Total combined runtime for all 5 new stress suites:** **~213 ms**

### 1.4 Test Runner Memory & Assertion Allocation Findings
Direct profiling of Vitest / Chai assertion mechanisms demonstrated:
- Calling `expect(act).toBe(exp)` 5,000,000 times inside a tight loop allocates 5,000,000 assertion context and matcher objects, causing multi-gigabyte memory pressure, heavy GC thrashing, and inflating runtime from ~95ms to several seconds.
- In contrast, running a primitive uint32 loop that breaks on the first mismatch and asserts once at the end:
  ```typescript
  expect({ mismatchStep, actualValue, expectedValue }).toEqual({
    mismatchStep: -1,
    actualValue: 0,
    expectedValue: 0,
  });
  ```
  executes in **94 ms**, allocates zero garbage collection overhead, and on failure produces an immediately actionable Vitest diff identifying the exact step, actual value, and expected value.

---

## 2. Logic Chain

### 2.1 Why the Defect Evaded Vitest
1. `DeterministicPRNG` in `packages/shared/src/prng/mulberry32.ts` (lines 15 and 32) accumulates state using double-precision float addition: `this.state += 0x6D2B79F5`.
2. Each step adds $1,831,565,813$.
3. Floating-point safe integer precision is limited to $2^{53} - 1 = 9,007,199,254,740,991$ (`Number.MAX_SAFE_INTEGER`).
4. At step $4,917,757$, `this.state` is $9,007,197,429,407,296 \le 2^{53}$.
5. At step $4,917,758$, exact arithmetic yields $9,007,199,260,973,109 > 2^{53}-1$, which IEEE-754 rounds to $9,007,199,260,973,108$, dropping the lowest bit.
6. Because existing tests in `packages/shared/test/prng.test.ts` only evaluated the first 10 steps, the entire Vitest suite passed without testing the $4.917\text{M}$ boundary.

### 2.2 Why Empirical Script Tests Must Become Permanent Vitest Tests
1. `scripts/empirical-stress-suite.mjs` is an external ad-hoc verification script not run by standard `pnpm test`, `pnpm turbo test`, or CI pipelines.
2. In contrast, tests in `packages/shared/test/prng.test.ts` are automatically executed on every developer run, pre-commit check, and Turborepo CI build.
3. Incorporating these stress vectors into `packages/shared/test/prng.test.ts` creates a permanent regression lock: any future change that removes `>>> 0` from state updates will immediately fail the build before reaching code review or production.

### 2.3 Feasibility & CI Performance Safety
1. Vitest defaults to a 5,000ms (5 second) timeout per test.
2. 5,000,000 PRNG iterations require only ~95ms in Node.js V8 (less than 2% of the default timeout).
3. Even on severely throttled CI virtual machines (e.g. 5x slowdown), execution will remain under 500ms.
4. Adding an explicit `15000` (15s) timeout parameter to the 5M step test eliminates any risk of flakiness or false positive timeouts.

### 2.4 Test Architecture Principles for the Worker
To ensure maximum speed, mathematical rigor, and diagnostic clarity, the worker should apply three architectural rules:
1. **Independent Mathematical Oracle**: The test must not verify `DeterministicPRNG` against another instance of itself. Instead, define a local canonical Mulberry32 reference generator function (`createCanonicalMulberry32`) that implements the authoritative 32-bit unsigned wrapping algorithm.
2. **Fast Primitive Loop with Single Diff Assertion**: Compare values in a primitive loop with early exit. On divergence, capture `{ mismatchStep, actualValue, expectedValue }` and assert against `{ mismatchStep: -1, actualValue: 0, expectedValue: 0 }`.
3. **State Representation Invariants**: Explicitly assert that `prng.getState()` returns a valid 32-bit unsigned integer: `typeof state === 'number'`, `Number.isSafeInteger(state)`, and `0 <= state <= 0xFFFFFFFF`.

---

## 3. Caveats

1. **Test Execution Time Overhead**: Integrating all 5 stress test blocks adds ~210–250ms to the `@railway/shared` Vitest execution time (from ~1.54s to ~1.75s). This overhead is well within the acceptable threshold for unit testing.
2. **Strict Determinism (No Flakiness)**: All tests use fixed, deterministic seeds (`42`, `123456789`, `987654321`). The Chi-Square test over 100,000 samples for seed `987654321` produces an exact statistic of `6.9646`, which is far below the critical value of `21.67` at $p=0.01$. The tests will never fail randomly.
3. **Supplementary Domain Invariants**: Beyond PRNG, `scripts/empirical-stress-suite.mjs` also demonstrated bounds for Money safe integers and multi-year timestamps. While the primary mission is PRNG integration in `packages/shared/test/prng.test.ts`, recommendations for `units.test.ts` and `time.test.ts` are included in Section 4.3 as supplementary recommendations.

---

## 4. Conclusion & Recommended Worker Implementation Plan

### 4.1 Recommended Structure for `packages/shared/test/prng.test.ts`
Expand `packages/shared/test/prng.test.ts` to include 4 new structured test suites:
1. **`Boundary Seeds & Bitwise Normalization`**:
   - Negative seeds (`-1`, `-42`, `-2147483648`)
   - 32-bit overflow seeds (`4294967296`, `Number.MAX_SAFE_INTEGER`)
   - Seed equivalence modulo $2^{32}$ (`DeterministicPRNG(-1)` matches `DeterministicPRNG(0xFFFFFFFF)`)
   - State and output range safety checks.
2. **`Long-Sequence Determinism & Uniformity`**:
   - 1,000,000 identical uint32 generated between two independent instances.
   - Chi-Square goodness-of-fit on 100,000 samples ($\chi^2 \le 21.67$, df=9, $p=0.01$).
3. **`Canonical Mulberry32 Compliance & Float Boundary (5,000,000 Steps)`**:
   - 5,000,000 steps compared against independent canonical oracle.
   - Crosses step 4,917,758 where unmasked float accumulation breaks.
   - Verifies `prng.getState()` matches canonical state and satisfies uint32 bounds.
4. **`Checkpoint Serialization & Restoration Round-Trip at Scale`**:
   - Fast-forward to 5,000,000 steps.
   - Assert `prng.getState()` satisfies safe integer uint32 bounds.
   - Restore into a new instance with `setState(savedState)` and assert `restored.getState() === savedState`.
   - Assert next 1,000 outputs match between original and restored instances.
   - Assert `restored.fork()` produces an exact clone with identical outputs.
   - Assert checkpoint round-trips at threshold steps 4,917,757 and 4,917,758.

---

### 4.2 Exact Drop-In Code for `packages/shared/test/prng.test.ts`

The worker can replace `packages/shared/test/prng.test.ts` with the following comprehensive, production-grade test suite:

```typescript
import { describe, expect, it } from 'vitest';
import { DeterministicPRNG } from '../src/prng/mulberry32';

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
```

---

### 4.3 Supplementary Recommendations for Other Test Files
To capture all remaining tests from `scripts/empirical-stress-suite.mjs` into permanent Vitest files:
1. **`packages/shared/test/units.test.ts`**:
   - Add safe integer boundary tests for `toMoney(Number.MAX_SAFE_INTEGER)` and `toMoney(Number.MIN_SAFE_INTEGER)`.
   - Add safe integer overflow assertions for `addMoney`: `expect(() => addMoney(toMoney(MAX_SAFE), toMoney(1))).toThrow(RangeError)`.
2. **`packages/shared/test/time.test.ts`**:
   - Add 100 simulated years monotonic minute test: `createGameTimestamp(52_560_000) -> Day 36501, 00:00`.
   - Add midnight subtraction wrap test: `addMinutes(createGameTimestamp(1440), -1) -> Day 1, 23:59`.

---

## 5. Verification Method

To verify the test addition strategy:

1. **Simulate test execution against the unpatched PRNG**:
   ```bash
   node -e '
   function createCanonicalMulberry32(seed) {
     let state = seed >>> 0;
     return {
       nextUint32() {
         state = (state + 0x6D2B79F5) >>> 0;
         let t = state;
         t = Math.imul(t ^ (t >>> 15), t | 1);
         t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
         return (t ^ (t >>> 14)) >>> 0;
       },
       getState() { return state; }
     };
   }

   import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
     const prng = new DeterministicPRNG(42);
     const canon = createCanonicalMulberry32(42);
     let mismatchStep = -1, actualVal = 0, expectedVal = 0;
     for (let i = 0; i < 5_000_000; i++) {
       const act = prng.nextUint32();
       const exp = canon.nextUint32();
       if (act !== exp) {
         mismatchStep = i;
         actualVal = act;
         expectedVal = exp;
         break;
       }
     }
     console.log("Unpatched PRNG Divergence Result:", { mismatchStep, actualVal, expectedVal });
   });
   '
   ```
   *Expected Output:*
   ```json
   { "mismatchStep": 4917758, "actualVal": 2543212789, "expectedVal": 2345769536 }
   ```
   *Confirming that the 5M step canonical matching test accurately flags the regression.*

2. **Verify test execution against patched PRNG**:
   Once worker patches `packages/shared/src/prng/mulberry32.ts` (`(this.state = (this.state + 0x6D2B79F5) >>> 0)`), run:
   ```bash
   pnpm --filter @railway/shared test
   ```
   *Expected Output:*
   ```text
   Test Files  6 passed (6)
   Tests       38 passed (38)
   Duration    ~1.75s
   ```
   All 12 tests in `prng.test.ts` pass cleanly with zero warnings and zero timeouts.

3. **Workspace-Wide Verification**:
   ```bash
   pnpm turbo test
   ```
   *Expected Output:* 100% test pass across `@railway/shared`, `@railway/game-data`, and `@railway/network`.
