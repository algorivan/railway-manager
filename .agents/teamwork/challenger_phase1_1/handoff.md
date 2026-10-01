# Handoff Report: Phase 1 Adversarial Challenge

**Agent:** `challenger_phase1_1`  
**Milestone:** Phase 1 (Focus: PRNG determinism, arithmetic precision, and time models)  
**Parent:** `orchestrator_1` (`7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Status:** COMPLETE (Hard Handoff)  
**Date:** 2026-09-30T15:40:00Z  
**Verdict:** **CHALLENGE_FOUND**  

---

## 1. Observation

### 1.1 Baseline Test Suite Execution
Running `pnpm turbo test` against the initial implementation:
```text
@railway/shared:test:  Test Files  6 passed (6)
@railway/shared:test:       Tests  32 passed (32)
@railway/game-data:test:  Test Files  4 passed (4)
@railway/game-data:test:       Tests  24 passed (24)
@railway/network:test:  Test Files  5 passed (5)
@railway/network:test:       Tests  28 passed (28)

Tasks: 6 successful, 6 total
Cached: 1 cached, 6 total
Time: 20.416s
```
All 84 baseline unit tests pass.

---

### 1.2 Empirical Stress Suite Results (`scripts/empirical-stress-suite.mjs`)
Running the independent stress harness via `node scripts/empirical-stress-suite.mjs`:
```text
================================================================
  CHALLENGER PHASE 1: EMPIRICAL STRESS & INVARIANT VERIFICATION  
================================================================

--- 1. PRNG STRESS TESTING ---
  [PASS] Seed boundary values: 0, 1, 0xFFFFFFFF, negatives, overflows handled safely
  [PASS] Long-sequence determinism: 1,000,000 identical uint32 generated (74ms)
    Chi-Square statistic on 100k samples: 6.9646 (df=9, critical 99%=21.67)
  [PASS] Uniform distribution check: Chi-Square satisfies uniformity at p=0.01

  [Adversarial Challenge Probe: 32-bit state truncation & float overflow]
  [CHALLENGE DETECTED] PRNG diverges from canonical Mulberry32 at step 4917758 (actual: 2543212789, expected: 2345769536) due to unmasked state accumulation (this.state += 0x6D2B79F5 exceeds Number.MAX_SAFE_INTEGER at step 4,917,758)
  [CHALLENGE DETECTED] PRNG state restore drift: state serialized at step 4,917,758 (9007197429407296) restores to different sequence (original: 2543212789, restored: 2345769536) because setState casts >>> 0 while internal state was corrupted by float rounding

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
SUMMARY: 47 PASSED, 0 FAILED, 2 CHALLENGES IDENTIFIED
================================================================
```

---

### 1.3 Verbatim Code Inspection of Discovered Defects

#### Challenge 1 & 2: PRNG State Unmasked Double-Precision Accumulation & Serialization Drift
File: `packages/shared/src/prng/mulberry32.ts`
Lines 15–20:
```typescript
  public next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
```
Lines 32–37:
```typescript
  public nextUint32(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
```
Lines 84–94:
```typescript
  public getState(): number {
    return this.state;
  }

  public setState(state: number): void {
    this.state = state >>> 0;
  }
```

#### Challenge 3: Native Node.js ESM Import Resolution Failure
When importing compiled `@railway/shared` or `@railway/network` from pure Node without Vite/bundler:
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/shared/dist/brand' imported from /home/synx/railway-manager/packages/shared/dist/index.js
```
In `packages/shared/src/index.ts`:
```typescript
export * from './brand';
export * from './units';
export * from './time';
...
```
`package.json` specifies `"type": "module"`, but relative re-exports in `./dist/index.js` omit `.js` extensions.

---

## 2. Logic Chain

### 2.1 PRNG State Overflow & Canonical Divergence
1. In `mulberry32.ts` lines 16 and 33, `this.state` is updated as:
   $$\text{this.state} \leftarrow \text{this.state} + \text{0x6D2B79F5}$$
   In JavaScript, `+=` performs standard double-precision addition, rather than 32-bit unsigned wrapping arithmetic ($2^{32}$).
2. Each step adds $1,831,565,813$ to `this.state`.
3. In IEEE-754 double precision, the maximum safe integer is $2^{53} - 1 = 9,007,199,254,740,991$ (`Number.MAX_SAFE_INTEGER`).
4. At step $N = 4,917,758$:
   $$4,917,758 \times 1,831,565,813 \approx 9,007,199,260,973,108 > 2^{53} - 1$$
   The lower bits of `this.state` suffer floating-point rounding precision loss.
5. In standard/canonical Mulberry32, state is uint32 and wraps modulo $2^{32}$. Because of the floating-point rounding beyond $2^{53}$, `this.state` in `DeterministicPRNG` loses its least significant bits, producing:
   - At iteration $4,917,758$: `uint32 = 2543212789` (Actual) vs `2345769536` (Expected Canonical).
6. Furthermore, `getState()` returns `this.state` as a float ($> 9 \times 10^{15}$). When this state is passed to `setState(savedState)`, line 92 casts `state >>> 0`. `9007197429407296 >>> 0` truncates modulo $2^{32}$, creating a permanent divergence between the in-memory running PRNG and the restored PRNG.
7. This directly violates the Core Mindset in `docs/AI_CODING_GUIDE.md` §1 ("Determinism as a Religion") and `docs/SIMULATION_RULES.md` §2.3 for multi-day long simulation sessions.

### 2.2 Robustness of Other Domain Primitives
1. `units.ts`:
   - `toMoney` strictly enforces `Number.isSafeInteger(val)` and non-negativity where appropriate.
   - Fractional numbers (e.g. `0.1`, `100.5`, `1e-10`) throw `TypeError`.
   - Overflow beyond $9 \times 10^{15}$ throws `RangeError`.
   - Negative amounts are accepted (representing losses/debt) while preserving zero decimals.
2. `time.ts`:
   - Monotonic minute tracking and bidirectional conversion between `totalMinutes` and `{ day, minuteOfDay }` are invariant across day rollovers (tick 1439 $\to$ tick 1440 $\to$ tick 1441).
   - Negative durations underflowing below 0 throw `RangeError`.
   - Midnight differences correctly compute positive forward differences and negative backward differences.
   - Multi-year scale (52,560,000 minutes = 100 years) maintains exact integer arithmetic and monotonicity.
3. Network Calculators:
   - Gambir – Bandung reference vectors evaluate to the exact Rupiah: Route Opening = $165,000,000$ IDR; TAC = $6,800,000$ IDR.
   - Fractional distances and weights round to nearest integer Rupiah without floating-point artifacts.
   - Boundary inputs ($0$ km, $0$ stations, negative speeds) trigger strict custom domain errors (`InvalidRouteOpeningError`, `InvalidTrackAccessInputError`, `InvalidSpeedConstraintError`).

---

## 3. Caveats

1. The PRNG divergence occurs only after $4,917,758$ calls to `next()` or `nextUint32()`. For short sequences ($< 4.9\text{M}$ ticks), two instances initialized with the same seed generate bit-for-bit identical numbers (as verified over $1,000,000$ iterations).
2. The ESM extension issue only manifests when running pure Node.js scripts without a bundler or module hook. In Vitest/Vite and Turborepo typechecking, module resolution succeeds.

---

## 4. Conclusion

**Verdict:** **CHALLENGE_FOUND**

While Arithmetic, Money, Time, and Network Calculators are robust, two critical challenges were empirically demonstrated in `@railway/shared`:

1. **Defect 1 (PRNG State Unmasked Accumulation & Checkpoint Drift):**
   - **Impact:** Simulation determinism breaks after $4,917,758$ random calls, and serialization checkpoints (`getState()` $\to$ `setState()`) drift from active instances.
   - **Remedy:** In `packages/shared/src/prng/mulberry32.ts`, wrap the state update in `>>> 0`:
     - Line 16: `let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);`
     - Line 33: `let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);`
2. **Defect 2 (ESM Import Resolution in Dist):**
   - **Impact:** Pure Node.js tools and CLI runners cannot import compiled `@railway/shared` or `@railway/network` directly due to missing `.js` extensions in `dist/index.js`.
   - **Remedy:** Update relative imports in `src/index.ts` to include `.js` extensions (e.g. `export * from './brand.js'`) or configure a build tool / tsconfig `moduleResolution: "NodeNext"`.

---

## 5. Verification Method

To independently reproduce the empirical findings:

1. **Execute the independent empirical stress suite:**
   ```bash
   node scripts/empirical-stress-suite.mjs
   ```
   *Expected result: 47 assertions pass, with 2 HIGH-severity challenges detected regarding PRNG divergence at step 4,917,758 and serialization drift.*

2. **Verify Mulberry32 canonical divergence directly via Node:**
   ```bash
   node -e '
   import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
     let cState = 42 >>> 0;
     function canon() {
       cState = (cState + 0x6D2B79F5) >>> 0;
       let t = cState;
       t = Math.imul(t ^ (t >>> 15), t | 1);
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
       return (t ^ (t >>> 14)) >>> 0;
     }
     const prng = new DeterministicPRNG(42);
     for (let i = 0; i < 5000000; i++) {
       const a = prng.nextUint32();
       const b = canon();
       if (a !== b) {
         console.log("DIVERGENCE at step " + i + ": actual=" + a + ", expected=" + b);
         break;
       }
     }
   });
   '
   ```
   *Expected result: Prints `DIVERGENCE at step 4917758: actual=2543212789, expected=2345769536`.*

3. **Verify state serialization drift:**
   ```bash
   node -e '
   import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
     const p1 = new DeterministicPRNG(42);
     for (let i = 0; i < 4917758; i++) p1.nextUint32();
     const s = p1.getState();
     const p2 = new DeterministicPRNG(0);
     p2.setState(s);
     console.log("Original:", p1.nextUint32(), "Restored:", p2.nextUint32(), "Equal?", p1.nextUint32() === p2.nextUint32());
   });
   '
   ```
   *Expected result: Prints `Equal? false`.*
