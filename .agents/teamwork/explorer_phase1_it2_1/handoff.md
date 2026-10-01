# Handoff Report: Mulberry32 PRNG State Overflow & Determinism Fix (Defect 1)

**Agent:** `explorer_phase1_it2_1`  
**Milestone:** Phase 1 Iteration 2 (Defect 1 Investigation & Fix Strategy)  
**Parent:** `orchestrator_1` (`7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Status:** COMPLETE (Hard Handoff)  
**Working Directory:** `/home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1`  
**Target File:** `packages/shared/src/prng/mulberry32.ts`  
**Related Docs:** `docs/SIMULATION_RULES.md` §2.3  

---

## 1. Observation

### 1.1 Verbatim Code Inspection
In `/home/synx/railway-manager/packages/shared/src/prng/mulberry32.ts`:
- **Lines 15–20 (`next` method)**:
  ```typescript
  public next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  ```
- **Lines 32–37 (`nextUint32` method)**:
  ```typescript
  public nextUint32(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  ```
- **Lines 82–94 (`getState` and `setState` methods)**:
  ```typescript
  /**
   * Returns the current internal 32-bit state for serialization or checkpoints.
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Restores internal 32-bit state.
   */
  public setState(state: number): void {
    this.state = state >>> 0;
  }
  ```
- **Lines 98–102 (`fork` method)**:
  ```typescript
  public fork(): DeterministicPRNG {
    const forked = new DeterministicPRNG(0);
    forked.setState(this.state);
    return forked;
  }
  ```

In `/home/synx/railway-manager/docs/SIMULATION_RULES.md` lines 112–117:
The mathematical specification snippet itself contains the identical unmasked accumulation:
```typescript
  public next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
```

### 1.2 Empirical Failure Reproductions

#### Observation 1: Immediate State Range Invariant Violation after Step 3
Running node execution against current `packages/shared/dist/prng/mulberry32.js`:
```bash
node -e '
import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
  const p = new DeterministicPRNG(42);
  p.nextUint32(); // step 1: state = 1831565855
  p.nextUint32(); // step 2: state = 3663131668
  p.nextUint32(); // step 3: state = 5494697481 (> 0xFFFFFFFF)
  const s = p.getState();
  const p2 = new DeterministicPRNG(0);
  p2.setState(s);
  console.log("p.getState():", s, "p2.getState():", p2.getState(), "Equal?", s === p2.getState());
});
'
```
Output:
```text
p.getState(): 5494697481 p2.getState(): 1199730185 Equal? false
```
`p.getState()` returns `5494697481`, which violates the 32-bit uint range $[0, 2^{32}-1]$. When loaded into `p2`, `setState` coerces via `>>> 0`, resulting in `1199730185`. Thus, state serialization symmetry `p2.getState() === p1.getState()` fails as early as step 3.

#### Observation 2: IEEE-754 Precision Loss & Divergence at Step 4,917,758
Executing the adversarial probe in `scripts/empirical-stress-suite.mjs`:
```bash
node scripts/empirical-stress-suite.mjs
```
Output:
```text
  [Adversarial Challenge Probe: 32-bit state truncation & float overflow]
  [CHALLENGE DETECTED] PRNG diverges from canonical Mulberry32 at step 4917758 (actual: 2543212789, expected: 2345769536) due to unmasked state accumulation (this.state += 0x6D2B79F5 exceeds Number.MAX_SAFE_INTEGER at step 4,917,758)
  [CHALLENGE DETECTED] PRNG state restore drift: state serialized at step 4,917,758 (9007197429407296) restores to different sequence (original: 2543212789, restored: 2345769536) because setState casts >>> 0 while internal state was corrupted by float rounding
```

Direct float precision breakdown at step 4,917,758:
- Prior state: `9,007,197,429,407,296`
- True mathematical sum: `9,007,197,429,407,296 + 1,831,565,813 = 9,007,199,260,973,109` (odd integer)
- `Number.MAX_SAFE_INTEGER` = $2^{53} - 1 = 9,007,199,254,740,991$
- Resulting IEEE-754 float: `9,007,199,260,973,108` (rounded to nearest even integer, bit 0 lost)
- Truncated `uint32`: `9007199260973108 >>> 0 = 6232116` vs canonical uint32 `6232117` (difference = -1)
- Generated `nextUint32()` output: `2543212789` vs expected canonical `2345769536`.

---

## 2. Logic Chain

1. **Origin of the Flaw**:
   The Mulberry32 algorithm is defined over 32-bit unsigned words ($W = \mathbb{Z}_{2^{32}}$). In systems languages like C or Rust, `state += 0x6D2B79F5` on `uint32_t` automatically executes modulo $2^{32}$ integer wrapping arithmetic. When translating this snippet into TypeScript (`docs/SIMULATION_RULES.md` and `packages/shared/src/prng/mulberry32.ts`), the author assumed `this.state += 0x6D2B79F5` would wrap at 32 bits.
2. **JavaScript Arithmetic Rules**:
   In JavaScript, primitive numbers are IEEE-754 double-precision 64-bit floats (`binary64`), possessing 53 bits of significand precision. Arithmetic operators (`+`, `-`, `*`, `/`) operate in double-precision float mode. Only bitwise operators (`|`, `&`, `^`, `>>>`, `<<`, `>>`) and `Math.imul` apply the ECMAScript `ToInt32` or `ToUint32` abstract conversions (modulo $2^{32}$).
3. **State Growth Invariant Violation**:
   Because `this.state += 0x6D2B79F5` is not wrapped by any bitwise operator:
   $$\text{state}_k = \text{seed} + k \times 1,831,565,813$$
   - At $k = 3$, $\text{state} \approx 5.49 \times 10^9 > 2^{32} - 1$, violating the 32-bit uint contract.
   - For $3 \le k < 4,917,758$, $( \text{state}_k \pmod{2^{32}} )$ remains exact only because double-precision floats represent all integers exactly up to $2^{53}-1$ (`Number.MAX_SAFE_INTEGER`).
4. **Catastrophic Float Mantissa Overflow**:
   At $k = 4,917,758$, $\text{state}_k > 2^{53}-1$. The spacing between representable floats (Unit in the Last Place / ULP) doubles from $1$ to $2$. The least significant bit (bit 0) of the Weyl counter cannot be stored and is truncated/rounded. Because Mulberry32 relies on bit avalanching across all 32 bits, corruption of bit 0 immediately produces incorrect pseudorandom values. Beyond $k = 4,917,758$, the ULP expands to 4, 8, etc., progressively destroying additional bits.
5. **Serialization & Checkpoint Drift**:
   - `getState()` returns `this.state` as an unmasked float.
   - `setState(s)` executes `this.state = s >>> 0`, restricting `state` to $[0, 2^{32}-1]$.
   - `fork()` executes `forked.setState(this.state)`.
   - Consequently:
     - Before step 4,917,758: The original PRNG state continues climbing towards $2^{53}$, while the restored/forked PRNG starts back at $< 2^{32}$. When the original hits step 4,917,758, it diverges from the restored instance.
     - At or after step 4,917,758: The serialized state is already corrupted by float rounding. When loaded, `setState` truncates the corrupted float, and the subsequent stream diverges immediately from the active instance.
6. **Mathematical Correctness of `(this.state + 0x6D2B79F5) >>> 0`**:
   - Given an invariant $0 \le \text{this.state} \le 2^{32}-1$:
     $$\text{this.state} + 1,831,565,813 \le 4,294,967,295 + 1,831,565,813 = 6,126,533,108$$
   - Since $6,126,533,108 < 2^{33} \ll 2^{53}-1$, the floating point addition is guaranteed 100% exact.
   - The unsigned zero-fill right shift operator `>>> 0` applies `ToUint32(x) = floor(x) mod 2^32`.
   - Assigning `(this.state + 0x6D2B79F5) >>> 0` back to `this.state` guarantees $0 \le \text{this.state} \le 2^{32}-1$ for all future steps $k \in [0, \infty)$.
   - All existing reference test vectors (seed 12345, seed 0, seed 4294967295) are identical.
   - `getState()` is guaranteed to return a true unsigned 32-bit integer, ensuring complete bidirectional symmetry for `setState()`, `fork()`, and JSON serialization.

---

## 3. Caveats

1. **Short Sequences Conceal the Flaw**: PRNG sequences shorter than 4,917,758 iterations initialized with identical seeds produce bit-for-bit identical outputs to each other *if not saved and restored*. This explains why standard test suites (which typically run 10 to 100,000 iterations) did not catch the issue.
2. **Specification Snippet Desynchronization**: `docs/SIMULATION_RULES.md` §2.3 line 113 contains the same unmasked TypeScript code `let t = (this.state += 0x6D2B79F5);`. Although updating the code in `packages/shared/src/prng/mulberry32.ts` fixes the runtime bug, `docs/SIMULATION_RULES.md` §2.3 should also be updated to prevent documentation drift.
3. **Save Game Compatibility**: Any existing save file that recorded `state > 4294967295` will be automatically normalized when passed into `setState(state)` via `state >>> 0`. However, long-running game states saved beyond step 4,917,758 under the old buggy code cannot recover the lost bit 0.

---

## 4. Conclusion & Actionable Fix Strategy

### Recommended Actions for Worker

#### Action 1: Update `packages/shared/src/prng/mulberry32.ts`
Wrap state accumulation with `>>> 0` to enforce 32-bit unsigned wrapping arithmetic.

**Option A (Minimal In-Place Fix — Recommended for lowest diff risk)**:
```typescript
<<<<
  public next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
====
  public next(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
>>>>
```
and in `nextUint32()`:
```typescript
<<<<
  public nextUint32(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
====
  public nextUint32(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
>>>>
```

**Option B (DRY Delegation — Cleanest Architecture)**:
Implement `nextUint32()` as the single source of truth for the Mulberry32 state step, and delegate `next()`:
```typescript
  public next(): number {
    return this.nextUint32() / 4294967296;
  }

  public nextUint32(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
```
*(Full drop-in replacement provided in `.agents/teamwork/explorer_phase1_it2_1/proposed_mulberry32.ts` and patch in `.agents/teamwork/explorer_phase1_it2_1/mulberry32.patch`)*.

#### Action 2: Synchronize `docs/SIMULATION_RULES.md` §2.3
Update line 113 in `docs/SIMULATION_RULES.md` from `let t = (this.state += 0x6D2B79F5);` to `let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);` to preserve exact alignment between documentation and code.

---

## 5. Verification Method

### Step 1: Run Vitest Unit Test Suite
Verify that all existing test vectors (seed 12345, seed 0, seed 4294967295, uniform integers, shuffling) continue to pass 100%:
```bash
pnpm --filter @railway/shared test
```
*Expected: 100% pass across all test suites.*

### Step 2: Build Workspace
Recompile TypeScript distributions:
```bash
pnpm turbo build
```
*Expected: Build succeeds with exit code 0.*

### Step 3: Run the 5,000,000 Step Canonical Divergence Check
Run standalone Node verification:
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
  let diverged = false;
  for (let i = 0; i < 5000000; i++) {
    const a = prng.nextUint32();
    const b = canon();
    if (a !== b) {
      console.error("Divergence at " + i + ": actual=" + a + ", expected=" + b);
      diverged = true;
      break;
    }
  }
  if (!diverged) console.log("SUCCESS: 5,000,000 steps match canonical Mulberry32 bit-for-bit!");
});
'
```
*Expected: Prints `SUCCESS: 5,000,000 steps match canonical Mulberry32 bit-for-bit!`.*

### Step 4: Run Checkpoint Serialization & Fork Invariance Check
Verify that `getState()` / `setState()` and `fork()` are strictly deterministic after step 4,917,758:
```bash
node -e '
import("./packages/shared/dist/prng/mulberry32.js").then(({ DeterministicPRNG }) => {
  const p1 = new DeterministicPRNG(42);
  for (let i = 0; i < 4917758; i++) p1.nextUint32();
  const s = p1.getState();
  const p2 = new DeterministicPRNG(0);
  p2.setState(s);
  const pFork = p1.fork();
  for (let i = 0; i < 10000; i++) {
    const v1 = p1.nextUint32();
    const v2 = p2.nextUint32();
    const vFork = pFork.nextUint32();
    if (v1 !== v2 || v1 !== vFork) {
      console.error("Mismatch at " + i);
      process.exit(1);
    }
  }
  console.log("SUCCESS: Serialization and fork match active instance across 10,000 subsequent steps!");
});
'
```
*Expected: Prints `SUCCESS: Serialization and fork match active instance across 10,000 subsequent steps!`.*

### Step 5: Invalidation Conditions
The fix is invalid if:
- Any existing test in `packages/shared/test/prng.test.ts` fails.
- `prng.getState()` returns a value $> 4294967295$ or $< 0$ or non-integer at any step.
- Step 4,917,758 outputs `2543212789` instead of `2345769536` for seed 42.
- `prng.fork()` outputs diverge from `prng` after step 4,917,758.
