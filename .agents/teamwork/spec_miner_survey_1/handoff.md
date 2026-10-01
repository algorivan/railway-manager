# Handoff Report: Specification Mining for R1 & R2

**Agent:** `spec_miner_survey_1`  
**Parent:** `orchestrator_1` (Conversation ID: `7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Workspace:** `/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1`  
**Deliverable Files:**
- `/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1/report.md`
- `/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1/progress.md`
- `/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1/handoff.md`

---

## 1. Observation

1. **Repository State:**
   - Listing `/home/synx/railway-manager` returned only `.agents`, `ORIGINAL_REQUEST.md`, and `docs/`.
   - Node.js runtime is `v22.23.1`, pnpm is `11.10.0`.
   - Monorepo files (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`) are not yet initialized on disk.

2. **Authoritative Documentation Sources:**
   - `ORIGINAL_REQUEST.md` (lines 24–33, 61–74): Specifies R1 (pnpm monorepo, turbo.json, tsconfig.base.json, Vitest configuration) and R2 (`@railway/shared` with Money, Km, Kmh, Tons, Minutes, GameTimestamp, DataProvenance, Mulberry32 PRNG seed 12345, Result/Error, branded IDs, zero React/Next.js/DOM imports).
   - `docs/PRODUCT_PRD.md`:
     - §30 (lines 1055–1134): Core stack is TypeScript, Vitest for unit/domain/simulation tests, Zod for validation.
     - §31 (lines 1136–1177): Monorepo structure with `apps/` and `packages/`, Turborepo + pnpm.
     - §37 (lines 1378–1448): Six Invariant Laws (Law 4: Never invent game rules; Law 5: Tests before large refactors; Law 6: Keep game balance in data).
     - §44 (lines 1710–1723): Phase 1 deliverables (World & Regulatory Model).
   - `docs/AI_CODING_GUIDE.md`:
     - §4 (lines 153–161): Strict architectural guardrails prohibiting `react`, `next`, `expo`, `drizzle-orm`, `@nestjs/*`, `fetch`, `window` in `packages/simulation` and pure domain packages.
     - §5 (lines 165–184): Commands `pnpm install`, `pnpm turbo test`, `pnpm turbo typecheck`, `pnpm dev`.
   - `docs/SIMULATION_RULES.md`:
     - §2.1 (lines 21–29): Discrete tick model: 1 tick = 1 minute, $T_{\text{day}} = 1440$ ticks, day index $D \ge 1$, minute of day $M = (\text{tick} - 1) \pmod{1440} \in [0, 1439]$.
     - §2.3 (lines 99–124): Verbatim Mulberry32 algorithm:
       ```typescript
       export class DeterministicPRNG {
         private state: number;
         constructor(seed: number) { this.state = seed >>> 0; }
         public next(): number {
           let t = (this.state += 0x6D2B79F5);
           t = Math.imul(t ^ (t >>> 15), t | 1);
           t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
           return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
         }
         public nextInt(min: number, max: number): number {
           return Math.floor(this.next() * (max - min + 1)) + min;
         }
       }
       ```
   - `docs/DOMAIN_MODEL.md`:
     - §2.5 (lines 122–129): `DataProvenance` interface with `source`, `sourceDate` (ISO-8601), `verified`, `notes`.
     - §4.2 (lines 239–243): `GameTimestamp` interface: `day: number`, `minuteOfDay: number`, `totalMinutes: number`.
     - §5 (lines 258–742): 16 branded entity IDs (`CompanyId`, `StationId`, `RouteId`, `SpecId`, `UnitId`, `CompositionId`, `OrderId`, `DepotId`, `MaintenanceJobId`, `TimetableSlotId`, `ServiceRunId`, `ContractId`, `EmployeeId`, `TransactionId`, `MissionId`, `EventId`).
   - `docs/DATA_DICTIONARY.md`:
     - §2 (lines 24–34): Units & branded primitives (`Money`, `Km`, `Kmh`, `Tons`, `Meters`, `Minutes`, `Percentage`, `Timestamp`).
   - `docs/ECONOMY_RULES.md`:
     - §2.1 (lines 24–28): Currency is IDR, `Money` is integer safe up to $\pm 9 \times 10^{15}$, zero fractional decimals.

3. **Empirical Verification of Mulberry32 PRNG:**
   - Ran Node.js script executing the exact Mulberry32 algorithm for seed `12345`.
   - Resulting float sequence: `[0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203, 0.5094283693470061, 0.34747186047025025, 0.07375754183158278, 0.7663964673411101, 0.9968264393974096, 0.8250224851071835]`.
   - Resulting raw uint32 sequence: `[4207900869, 1317490944, 2079646450, 3513001552, 2187978186, 1492380277, 316786230, 3291647763, 4281336957, 3543444592]`.
   - Resulting `nextInt(1, 100)`: `[98, 31, 49, 82, 51, 35, 8, 77, 100, 83]`.

---

## 2. Logic Chain

1. **Monorepo Architecture (Observation 1 & 2):**
   `PRODUCT_PRD.md` §31 and `AI_CODING_GUIDE.md` §5 require a pnpm workspace with Turborepo managing pipelines across `apps/*` and `packages/*`. Since the repository currently contains only `docs/` and `ORIGINAL_REQUEST.md`, root scaffolding must establish `pnpm-workspace.yaml`, `turbo.json`, `package.json`, and `tsconfig.base.json` first before implementing packages.

2. **Package Isolation & Naming (Observation 2):**
   `AI_CODING_GUIDE.md` §4 specifies strict dependency isolation: domain packages cannot import UI frameworks (`react`, `next`) or runtime state drivers (`drizzle-orm`, network). All workspace packages must follow `@railway/<package>` naming (e.g., `@railway/shared`).

3. **Primitive Type System (Observation 2):**
   `DATA_DICTIONARY.md` §2 and `ECONOMY_RULES.md` §2 establish that `Money` is strictly an integer representing Rupiah with zero decimals, safe up to $\pm 9 \times 10^{15}$. Distance (`Km`) and weight (`Tons`) are floats with 2 decimals, speed (`Kmh`) is integer $\ge 0$. Using TypeScript nominal branding (`Brand<T, Tag>`) enforces compile-time unit correctness without introducing runtime serialization overhead.

4. **Time Model Invariance (Observation 2):**
   `SIMULATION_RULES.md` §2.1 and `DOMAIN_MODEL.md` §4.2 require `GameTimestamp` with `day` (1-based), `minuteOfDay` (0..1439), and `totalMinutes` (monotonic $\ge 0$). Because `day = floor(totalMinutes / 1440) + 1` and `minuteOfDay = totalMinutes % 1440`, helper functions must enforce bidirectional conversion and validation.

5. **PRNG Determinism & Test Vectors (Observation 2 & 3):**
   `SIMULATION_RULES.md` §2.3 provides the exact bitwise Mulberry32 implementation. Executing this code empirically establishes the definitive test vectors for seed `12345`, seed `0`, and seed `0xFFFFFFFF`. These vectors provide the exact assertions needed for Vitest test suites.

6. **Error Handling & Entity Identity (Observation 2):**
   Domain operations require functional `Result<T, E>` types to prevent unhandled throws in the simulation loop. The 16 domain entities discovered across `DOMAIN_MODEL.md` and `API_SPEC.md` require strongly typed branded IDs and UUID/prefixed generator helpers.

---

## 3. Caveats

1. **Turborepo Versioning:** The specification targets Turborepo v2 (`"tasks"` syntax with `"build"`, `"typecheck"`, `"test"`), which is also compatible with modern pnpm v11.
2. **UUID Generation in Zero-Dependency Packages:** While Node.js provides `crypto.randomUUID()`, domain packages must remain portable to Hermes and browser environments. The specification provides both standard UUID mapping and a pure PRNG-driven ID generator for deterministic test scenarios.
3. **Phase 1 Package Scope:** While 10 packages and 3 apps are mentioned across PRD documentation, only `@railway/shared`, `@railway/game-data`, and `@railway/network` are required for Phase 1.

---

## 4. Conclusion

The specifications for R1 and R2 are fully extracted, formalized, and verified against empirical test runs:
- **R1:** Ready for immediate scaffold creation (`pnpm-workspace.yaml`, `package.json`, `turbo.json`, `tsconfig.base.json`, `vitest.config.ts`).
- **R2:** All type definitions, validation rules, Zod schemas, mathematical equations, Mulberry32 PRNG implementation, and bit-for-bit test vectors are fully documented in `report.md`. Implementation agents can directly execute without ambiguity.

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Inspect Documentation Line References:**
   - Run `grep -n "Mulberry32" docs/SIMULATION_RULES.md` (verifies §2.3).
   - Run `grep -n "DataProvenance" docs/DOMAIN_MODEL.md` (verifies §2.5).
   - Run `grep -n "Common Units" docs/DATA_DICTIONARY.md` (verifies §2).
   - Run `grep -n "Primitive Type: type Money" docs/ECONOMY_RULES.md` (verifies §2.1).

2. **Verify Mulberry32 PRNG Test Vectors:**
   Execute in bash:
   ```bash
   node -e '
   class DeterministicPRNG {
     constructor(seed) { this.state = seed >>> 0; }
     next() {
       let t = (this.state += 0x6D2B79F5);
       t = Math.imul(t ^ (t >>> 15), t | 1);
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
     }
     nextUint32() {
       let t = (this.state += 0x6D2B79F5);
       t = Math.imul(t ^ (t >>> 15), t | 1);
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
       return (t ^ (t >>> 14)) >>> 0;
     }
   }
   const prng = new DeterministicPRNG(12345);
   console.log("First uint32:", prng.nextUint32()); // 4207900869
   console.log("Second uint32:", prng.nextUint32()); // 1317490944
   '
   ```
   Confirm that the first output matches `4207900869` and float matches `0.9797282677609473`.

3. **Invalidation Conditions:**
   - Any modification to the Mulberry32 bitwise constants (`0x6D2B79F5`, `15`, `7`, `61`, `14`) invalidates the test vectors.
   - Any introduction of decimals to `Money` violates `ECONOMY_RULES.md` §2.1.
