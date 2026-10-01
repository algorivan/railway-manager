# Challenger Handoff Report: Phase 1 Iteration 2 Adversarial Stress Testing

**Agent:** `challenger_phase1_it2_1`  
**Milestone:** Phase 1 Iteration 2 (PRNG 5M+ Step Determinism, Checkpoint Serialization Round-Trip, Empirical Stress Suite)  
**Parent:** `orchestrator_1` (`7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Verdict:** **APPROVE**  
**Date:** 2026-09-30T16:03:00Z  

---

## 1. Observation

### 1.1 Empirical Stress Suite Execution
Executing `node scripts/empirical-stress-suite.mjs` directly in Node.js (v20+ ESM) produced the following verbatim output:
```text
================================================================
  CHALLENGER PHASE 1: EMPIRICAL STRESS & INVARIANT VERIFICATION  
================================================================


--- 1. PRNG STRESS TESTING ---
  [PASS] Seed boundary values: 0, 1, 0xFFFFFFFF, negatives, overflows handled safely
  [PASS] Long-sequence determinism: 1,000,000 identical uint32 generated (312ms)
    Chi-Square statistic on 100k samples: 6.9646 (df=9, critical 99%=21.67)
  [PASS] Uniform distribution check: Chi-Square satisfies uniformity at p=0.01

  [Adversarial Challenge Probe: 32-bit state truncation & float overflow]
  [PASS] PRNG matches canonical Mulberry32 beyond 5,000,000 iterations
  [PASS] PRNG state restore exact match after 5M iterations

--- 2. ARITHMETIC & MONEY PRECISION ---
  [PASS] toMoney accepts 9,007,199,254,740,991 IDR (MAX_SAFE_INTEGER)
  [PASS] toMoney strictly rejects values exceeding MAX_SAFE_INTEGER with RangeError
  [PASS] toMoney accepts MIN_SAFE_INTEGER (negative debt/loss)
  [PASS] toMoney strictly rejects fractional numbers with TypeError (0-decimal IDR constraint)
  [PASS] toMoney strictly rejects NaN, Infinity, strings, and non-number types
  [PASS] addMoney executes exact addition without precision loss
  [PASS] addMoney throws RangeError when result overflows safe integers
  [PASS] multiplyMoney produces exact rounded integer Rupiah
  [PASS] formatRupiah formats 0 correctly
  [PASS] formatRupiah formats 165M correctly
  [PASS] formatRupiah formats negative debt correctly

--- 3. ROUTE OPENING & TAC CALCULATORS ---
  [PASS] Route opening Gambir - Bandung (5 stations, 160km) = 165,000,000 IDR
  [PASS] calculateRouteOpeningFee alias matches
  [PASS] TAC Gambir - Bandung (160km, 350 tons) = 6,800,000 IDR
  [PASS] TAC handles fractional tonnage/distance (6833884 IDR integer)
  [PASS] Route opening handles fractional distance (135083333 IDR integer)
  [PASS] TAC for 0 km distance returns 0 IDR
  [PASS] Route opening rejects 0 km distance with InvalidRouteOpeningError
  [PASS] Route opening rejects 0 stations with InvalidRouteOpeningError
  [PASS] Route opening rejects 1 station with InvalidRouteOpeningError
  [PASS] TAC rejects 0 consist weight with InvalidTrackAccessInputError
  [PASS] TAC rejects negative distance with InvalidTrackAccessInputError
  [PASS] Route opening handles extreme distance 50,000km (Rp 13.300.000.000)
  [PASS] TAC handles extreme consist (10,000km, 5,000 tons = Rp 2.750.000.000)

--- 4. GAMETIMESTAMP INVARIANTS ---
  [PASS] Tick 0 is Day 1, 00:00
  [PASS] formatGameTimestamp(tick 0) = "Day 1, 00:00"
  [PASS] Tick 1439 is Day 1, 23:59
  [PASS] formatTimeOfDay(tick 1439) = "23:59"
  [PASS] Tick 1440 is Day 2, 00:00 (exact day rollover)
  [PASS] formatGameTimestamp(tick 1440) = "Day 2, 00:00"
  [PASS] Tick 1441 is Day 2, 00:01
  [PASS] createGameTimestamp(-1) throws RangeError
  [PASS] createGameTimestampFromDayMinute(0, 0) throws RangeError (day >= 1 required)
  [PASS] createGameTimestampFromDayMinute(1, 1440) throws RangeError (minuteOfDay < 1440)
  [PASS] addMinutes underflow below 0 throws RangeError
  [PASS] addMinutes(Day 2 00:00, -1) correctly wraps to Day 1, 23:59
  [PASS] diffMinutes forward across midnight = +10
  [PASS] diffMinutes backward across midnight = -10
  [PASS] 100 simulated years (52,560,000 mins) = Day 36501, 00:00
  [PASS] addMinutes at 100 years maintains monotonicity

--- 5. EFFECTIVE SPEED CALCULATOR ---
  [PASS] Speed calculator resolves minimum with TSR = 80 km/h
  [PASS] Speed calculator resolves minimum without TSR = 100 km/h
  [PASS] Speed calculator resolves 0 km/h stop restriction
  [PASS] Speed calculator rejects negative speed limits

================================================================
SUMMARY: 49 PASSED, 0 FAILED, 0 CHALLENGES IDENTIFIED
================================================================
```
Result: Exactly 49 assertions passed, 0 failed, 0 challenges detected.

### 1.2 Verification of Step 4,917,758 Float Overflow Boundary
Step 4,917,758 represents the exact point where unmasked state accumulation $(42 + 4,917,758 \times 1,831,565,813)$ exceeds $2^{53} - 1$ ($9,007,199,254,740,991$, `Number.MAX_SAFE_INTEGER`), which previously caused bit 0 to be lost due to double precision mantissa rounding.

Direct empirical probe on `DeterministicPRNG(42)` at this boundary yielded:
- Step 4,917,757: `state = 638067787`, `val = 735377169`
- Step 4,917,758: `state = 2469633600`, `val = 2345769536`

Comparison against canonical Mulberry32 oracle:
- Canonical Mulberry32 at step 4,917,758 produced: `2345769536`
- Difference: 0 (exact bit-for-bit match).

### 1.3 Independent Challenger Stress Probe Harness
An independent adversarial test probe script (`scripts/challenger-prng-probes.mjs`) was authored and executed. Verbatim results:
```text
================================================================
  CHALLENGER INDEPENDENT PRNG STRESS PROBE SUITE
================================================================

--- PROBE 1: 10,000,000 Iterations Canonical Equivalence ---
[PASS] 10,000,000 steps canonical bit-for-bit equivalence (elapsed: 709ms)
[PASS] Step 4,917,758 IEEE-754 precision boundary verified bit-for-bit

--- PROBE 2: State Serialization & Forking Across 10,000 Steps After Step 4,917,758 ---
[PASS] getState() -> setState() matches original instance across 10,000 steps after step 4,917,758
[PASS] fork() matches original instance across 10,000 steps after step 4,917,758
[PASS] Forked PRNG instance mutations do not alter original PRNG state

--- PROBE 3: Boundary & Pathological Seeds ---
[PASS] All 10 boundary and pathological seeds match canonical Mulberry32 across 100,000 steps each

--- PROBE 4: Statistical Uniformity Chi-Square Goodness-of-Fit ---
  Seed 42: Chi-Square = 122.0480 (df=99, critical p=0.01 is 134.64)
  Seed 12345: Chi-Square = 74.2128 (df=99, critical p=0.01 is 134.64)
  Seed 987654321: Chi-Square = 103.1468 (df=99, critical p=0.01 is 134.64)
  Seed 0: Chi-Square = 95.5986 (df=99, critical p=0.01 is 134.64)
[PASS] High-resolution Chi-Square uniformity test (1M samples x 100 bins across 4 seeds, df=99, p=0.01)

--- PROBE 5: NextInt Bounds & Range Invariants ---
[PASS] nextInt satisfies range boundary invariants and throws RangeError when min > max

--- PROBE 6: Fisher-Yates Shuffle Uniformity & Immutability ---
  Shuffle Permutation Chi-Square = 3.2362 (df=5, critical p=0.01 is 15.09)
[PASS] Fisher-Yates shuffle is non-mutating and uniformly distributed (Chi-Square df=5, p=0.01)

================================================================
PROBE SUMMARY: 9 PASSED, 0 FAILED
================================================================
```

### 1.4 Monorepo Build and Test Pipelines
- `pnpm turbo build`: 3 packages (`@railway/shared`, `@railway/game-data`, `@railway/network`) compiled successfully with `tsc`.
- `pnpm turbo typecheck`: 5 tasks passed under strict mode with 0 errors.
- `pnpm turbo test`: 17 test files and 113 tests passed 100% across the monorepo.

---

## 2. Logic Chain

1. **State Truncation & Prevention of Precision Loss (Observations 1.1, 1.2, 1.3 Probe 1)**:
   - In `packages/shared/src/prng/mulberry32.ts` line 30, the PRNG advances state using `let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);`.
   - The zero-fill right shift (`>>> 0`) forces the JavaScript Number value into an unsigned 32-bit integer in the range $[0, 2^{32}-1]$ on every step.
   - Because the internal state never exceeds $2^{32}-1$, it is always strictly less than $2^{53}-1$ (`Number.MAX_SAFE_INTEGER`). Consequently, float mantissa rounding cannot occur at step 4,917,758 or at any step up to $10,000,000$ and beyond.
   - Empirical observation confirmed bit-for-bit equivalence for $10,000,000$ continuous iterations against the independent reference oracle `createCanonicalMulberry32(42)`.

2. **State Serialization Round-Trip and Fork Fidelity (Observation 1.3 Probe 2)**:
   - When `getState()` is invoked at step 4,917,758, it returns `2469633600`, which is safe and exact.
   - When `setState(2469633600)` is called on a fresh instance initialized with seed 999999, it restores `this.state` to `2469633600`.
   - When `fork()` is called, it constructs a new instance and transfers `this.state`.
   - Across 10,000 sequential comparisons of `nextUint32()` and `next()`, the original running instance, the restored instance, and the forked instance produced bit-for-bit identical outputs without drift.
   - Advancing the forked instance independently did not alter the state of the original instance, verifying proper instance isolation.

3. **Boundary and Pathological Seed Robustness (Observation 1.3 Probe 3)**:
   - Evaluated 10 boundary seeds: `0`, `1`, `0xFFFFFFFF` ($2^{32}-1$), `0x80000000` ($2^{31}$), `-1`, `-2147483648`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`, `123.456`, and `-0.5`.
   - In each case, `seed >>> 0` normalizes the input to a valid 32-bit unsigned integer without throwing or locking into cycles.
   - Across 100,000 iterations for each seed, all 10 produced bit-for-bit identical results matching canonical Mulberry32, with floats strictly bounded in $[0, 1)$ without `NaN` or `Infinity`.

4. **Statistical Uniformity Validation (Observation 1.3 Probe 4 & Probe 6)**:
   - High-resolution Chi-Square goodness-of-fit was tested with 1,000,000 random samples partitioned into 100 uniform bins ($E = 10,000$ per bin, degrees of freedom = 99).
   - Across four divergent seeds (`42`, `12345`, `987654321`, `0`), the calculated $\chi^2$ statistics were 122.05, 74.21, 103.15, and 95.60.
   - All values fell safely below the critical threshold $\chi_{0.01, 99}^2 = 134.64$, confirming high statistical quality with no evidence of clustering, period shortening, or bias.
   - Fisher-Yates array shuffle generated all 6 permutations with uniform probability ($\chi^2 = 3.24 \le 15.09$, df=5, p=0.01) without mutating the input array.

---

## 3. Caveats

- **No Caveats**: All requested stress tests, empirical probes, and canonical equivalence verifications executed cleanly and completely with zero failures or performance bottlenecks.

---

## 4. Conclusion

**Verdict: APPROVE**

The Phase 1 Iteration 2 implementation has fully satisfied all adversarial requirements and empirical criteria:
1. `scripts/empirical-stress-suite.mjs` passes all 49 assertions with zero challenges.
2. Step 4,917,758 float mantissa truncation defect is completely eliminated.
3. 10,000,000-step canonical Mulberry32 bit-for-bit determinism is confirmed.
4. Checkpoint state serialization (`getState()` -> `setState()`) and `fork()` maintain 100% fidelity across 10,000 steps post-overflow.
5. All boundary and pathological seeds behave deterministically and conform to canonical output.
6. Statistical uniformity is validated across 1,000,000 samples under Chi-Square tests at $p=0.01$.
7. Entire monorepo build, strict typecheck, and Vitest test suite (113 tests) pass cleanly.

---

## 5. Verification Method

To independently verify the empirical challenger findings:

1. **Run Monorepo Stress Suite**:
   ```bash
   node scripts/empirical-stress-suite.mjs
   ```
   *Expected: `SUMMARY: 49 PASSED, 0 FAILED, 0 CHALLENGES IDENTIFIED`*

2. **Run Challenger Independent Stress Probes**:
   ```bash
   node scripts/challenger-prng-probes.mjs
   ```
   *Expected: `PROBE SUMMARY: 9 PASSED, 0 FAILED` (including 10M iteration test, post-step 4,917,758 serialization test, 10 boundary seeds, and 1M-sample Chi-Square test).*

3. **Run Turborepo Full Invariant Suite**:
   ```bash
   pnpm turbo test
   ```
   *Expected: 17 test files and 113 tests passing across all packages.*

4. **Verify Step 4,917,758 Bit-for-Bit Determinism**:
   ```bash
   node -e '
   import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
     const p = new DeterministicPRNG(42);
     for (let i = 0; i < 4917758; i++) p.nextUint32();
     const val = p.nextUint32();
     console.log("Step 4917758 output:", val, "Matches expected 2345769536:", val === 2345769536);
   });
   '
   ```
   *Expected: `Step 4917758 output: 2345769536 Matches expected 2345769536: true`*
