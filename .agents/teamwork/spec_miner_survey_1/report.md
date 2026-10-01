# Specification Report: R1 (Monorepo Scaffolding & Tooling) & R2 (Core Shared Primitives & Seeded PRNG)

**Miner:** `spec_miner_survey_1`  
**Milestone:** Phase 1 (World & Regulatory Model)  
**Parent Contract:** `docs/PRODUCT_PRD.md`, `docs/SIMULATION_RULES.md`, `docs/DOMAIN_MODEL.md`, `docs/DATA_DICTIONARY.md`, `docs/ECONOMY_RULES.md`, `docs/AI_CODING_GUIDE.md`, `ORIGINAL_REQUEST.md`  

---

## 1. Executive Summary

This report establishes the authoritative, implementation-ready specification for:
1. **R1: Monorepo Scaffolding & Shared Tooling**: Setting up the pnpm + Turborepo monorepo with strict TypeScript configuration, workspace package management, build pipeline, and Vitest test configuration.
2. **R2: Core Shared Primitives & Seeded PRNG (`@railway/shared`)**: Defining zero-dependency domain primitives, branded types, the canonical Mulberry32 deterministic pseudo-random number generator, the `DataProvenance` schema, functional `Result`/`Error` types, branded ID helpers, and time models.

---

## 2. R1: Monorepo Scaffolding & Shared Tooling Specification

### 2.1 Workspace Structure & Package Naming
Per `docs/PRODUCT_PRD.md` §31, `docs/AI_CODING_GUIDE.md` §4–5, and `docs/DOMAIN_MODEL.md` §3.2:
- The repository is organized into `apps/` and `packages/`.
- Workspace packages are published under the `@railway/` npm scope.
- In Phase 1, the following packages are scaffolded:
  - `packages/shared` (`@railway/shared`)
  - `packages/game-data` (`@railway/game-data`)
  - `packages/network` (`@railway/network` / `@railway/domain`)
- Future packages outlined in architecture:
  - `packages/simulation`, `packages/fleet`, `packages/procurement`, `packages/timetable`, `packages/demand`, `packages/economy`, `packages/contracts`, `packages/workforce`, `packages/missions`, `packages/ui`
  - `apps/web`, `apps/api`, `apps/mobile`
  - `database/`

### 2.2 Configuration Specifications

#### 2.2.1 `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

#### 2.2.2 Root `package.json`
```json
{
  "name": "railway-network-manager",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@11.10.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

#### 2.2.3 `turbo.json`
Configured to support Turborepo pipeline caching across `build`, `typecheck`, `test`, `lint`, and `dev`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "tests/**/*.ts", "tsconfig.json"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

#### 2.2.4 Shared `tsconfig.base.json`
Strict TypeScript configuration enforced monorepo-wide per `AI_CODING_GUIDE.md`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

#### 2.2.5 Vitest Configuration
Monorepo supports running tests via Turborepo (`pnpm turbo test`). Each package contains its own `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## 3. R2: Core Shared Primitives & Seeded PRNG (`@railway/shared`)

### 3.1 Branded Nominal Types Architecture
To eliminate unit bugs (e.g. accidentally mixing speed, distance, or currency), `@railway/shared` provides lightweight nominal type tags with zero runtime overhead.

```typescript
declare const BrandTag: unique symbol;

export type Brand<T, TBrand extends string> = T & { readonly [BrandTag]: TBrand };
```

#### Branded Numeric Primitives & Helper Interfaces:
| Type | Underlying Type | Range / Constraints | Helper Functions | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `Money` | `number` | Safe integer ($-9\times 10^{15} \dots 9\times 10^{15}$), 0 decimals | `toMoney(n)`, `isMoney(v)`, `addMoney(a, b)`, `subtractMoney(a, b)`, `multiplyMoney(m, f)` | Currency in Indonesian Rupiah (IDR) |
| `Km` | `number` | Float $\ge 0.0$, rounded to 2 decimals | `toKm(n)`, `isKm(v)` | Route & track distances |
| `Kmh` | `number` | Integer $\ge 0$ | `toKmh(n)`, `isKmh(v)` | Speed limits & kinematics |
| `Tons` | `number` | Float $\ge 0.0$, rounded to 2 decimals | `toTons(n)`, `isTons(v)` | Rolling stock weight & cargo payload |
| `Meters` | `number` | Float $\ge 0.0$ | `toMeters(n)` | Train length & platform capacity |
| `Minutes` | `number` | Integer $\ge 0$ | `toMinutes(n)` | Durations & scheduling |
| `Percentage` | `number` | Float in range $[0.00, 100.00]$ | `toPercentage(n)` | Load factors & multipliers |

### 3.2 Time Model & `GameTimestamp`
Per `docs/SIMULATION_RULES.md` §2.1 and `docs/DOMAIN_MODEL.md` §4.2:
- 1 simulation tick = 1 simulated minute.
- 1 simulated day = 1,440 ticks.
- Monotonic Day index $D \in [1, \infty)$.
- Minute of the day $M \in [0, 1439]$.
- `totalMinutes` $\ge 0$ monotonic simulated minutes from start of game.

#### TypeScript Interface:
```typescript
export interface GameTimestamp {
  readonly day: number;         // 1-based simulated day index (>= 1)
  readonly minuteOfDay: number; // 0..1439 (minute of the 24h cycle)
  readonly totalMinutes: number;// Monotonic simulated minutes (>= 0)
}
```

#### Mathematical Invariants:
$$D = \left\lfloor \frac{\text{totalMinutes}}{1440} \right\rfloor + 1$$
$$M = \text{totalMinutes} \pmod{1440}$$
$$\text{totalMinutes} = (D - 1) \times 1440 + M$$

#### Standard Helpers:
- `createGameTimestamp(totalMinutes: number): GameTimestamp`
- `createGameTimestampFromDayMinute(day: number, minuteOfDay: number): GameTimestamp`
- `addMinutes(ts: GameTimestamp, minutes: number): GameTimestamp`
- `diffMinutes(a: GameTimestamp, b: GameTimestamp): number`
- `formatGameTimestamp(ts: GameTimestamp): string` $\rightarrow$ `"Day 1, 08:30"`
- `formatTimeOfDay(ts: GameTimestamp): string` $\rightarrow$ `"08:30"`

### 3.3 Data Provenance Schema
Per `docs/DOMAIN_MODEL.md` §2.5 and `docs/DATA_DICTIONARY.md` §2:
Every real-world Indonesian railway datum (stations, distances, track specs, rolling stock) must be accompanied by verified provenance metadata.

#### TypeScript Interface & Zod Schema:
```typescript
import { z } from 'zod';

export interface DataProvenance {
  readonly source: string;
  readonly sourceDate: string; // ISO-8601 Date (YYYY-MM-DD)
  readonly verified: boolean;
  readonly notes?: string;
}

export const DataProvenanceSchema = z.object({
  source: z.string().min(1, 'Provenance source is required'),
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid ISO-8601 date'),
  verified: z.boolean(),
  notes: z.string().optional(),
});
```

### 3.4 Deterministic Seeded PRNG (Mulberry32)
Per `docs/SIMULATION_RULES.md` §2.3:
Native `Math.random()` is strictly prohibited in simulation packages. All stochastic evaluations must use the **Mulberry32** 32-bit state generator.

#### Implementation Contract:
```typescript
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns uniform float in [0, 1) */
  public next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns alias for next() */
  public nextFloat(): number {
    return this.next();
  }

  /** Returns raw uint32 pseudo-random integer */
  public nextUint32(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Returns uniform integer in [min, max] inclusive */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns boolean based on threshold probability [0, 1] */
  public nextBoolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /** Picks an element uniformly at random from an array */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = this.nextInt(0, items.length - 1);
    return items[idx]!;
  }

  /** Shuffles array deterministically using Fisher-Yates */
  public shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  /** Returns internal 32-bit state for serialization */
  public getState(): number {
    return this.state;
  }

  /** Sets internal 32-bit state */
  public setState(state: number): void {
    this.state = state >>> 0;
  }

  /** Clones this PRNG with identical state */
  public fork(): DeterministicPRNG {
    const forked = new DeterministicPRNG(0);
    forked.setState(this.state);
    return forked;
  }
}
```

#### Deterministic Mulberry32 Reference Test Vectors:
##### Seed `12345`:
- **Raw `nextUint32()` values (iterations 1–10):**
  1. `4207900869`
  2. `1317490944`
  3. `2079646450`
  4. `3513001552`
  5. `2187978186`
  6. `1492380277`
  7. `316786230`
  8. `3291647763`
  9. `4281336957`
  10. `3543444592`

- **Float `next()` values (iterations 1–10, $\text{uint32} / 4294967296$):**
  1. `0.9797282677609473`
  2. `0.3067522644996643`
  3. `0.484205421525985`
  4. `0.817934412509203`
  5. `0.5094283693470061`
  6. `0.34747186047025025`
  7. `0.07375754183158278`
  8. `0.7663964673411101`
  9. `0.9968264393974096`
  10. `0.8250224851071835`

- **`nextInt(1, 100)` values (iterations 1–10):**
  `[98, 31, 49, 82, 51, 35, 8, 77, 100, 83]`

- **`nextInt(0, 1)` values (iterations 1–10):**
  `[1, 0, 0, 1, 1, 0, 0, 1, 1, 1]`

##### Seed `0` (Boundary Vector, iterations 1–5):
- `nextUint32()`: `[1144304738, 1416247, 958946056, 627933444, 2007157716]`
- `next()`: `[0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111, 0.46732782293111086]`

##### Seed `4294967295` (0xFFFFFFFF Max Uint32, iterations 1–5):
- `nextUint32()`: `[3850105811, 813802916, 3073704848, 4054706436, 3630262831]`
- `next()`: `[0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677, 0.8452364315744489]`

### 3.5 Functional Result & Error Types
To avoid throwing unhandled runtime exceptions in core simulation logic, standard `Result<T, E>` and `DomainError` structures are exported:

```typescript
export interface DomainError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(`Failed to unwrap Result: [${(r.error as any)?.code ?? 'ERROR'}] ${(r.error as any)?.message ?? JSON.stringify(r.error)}`);
};

export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T => (r.ok ? r.value : fallback);

export const mapResult = <T, U, E>(r: Result<T, E>, fn: (val: T) => U): Result<U, E> =>
  (r.ok ? ok(fn(r.value)) : r);

export const flatMapResult = <T, U, E>(r: Result<T, E>, fn: (val: T) => Result<U, E>): Result<U, E> =>
  (r.ok ? fn(r.value) : r);
```

### 3.6 Branded ID Helper Specification
Identified branded entity IDs across `docs/DOMAIN_MODEL.md` and `docs/API_SPEC.md`:
- `CompanyId = Brand<string, 'CompanyId'>`
- `StationId = Brand<string, 'StationId'>`
- `RouteId = Brand<string, 'RouteId'>`
- `SpecId = Brand<string, 'SpecId'>`
- `UnitId = Brand<string, 'UnitId'>`
- `CompositionId = Brand<string, 'CompositionId'>`
- `OrderId = Brand<string, 'OrderId'>`
- `DepotId = Brand<string, 'DepotId'>`
- `MaintenanceJobId = Brand<string, 'MaintenanceJobId'>`
- `TimetableSlotId = Brand<string, 'TimetableSlotId'>`
- `ServiceRunId = Brand<string, 'ServiceRunId'>`
- `ContractId = Brand<string, 'ContractId'>`
- `EmployeeId = Brand<string, 'EmployeeId'>`
- `TransactionId = Brand<string, 'TransactionId'>`
- `MissionId = Brand<string, 'MissionId'>`
- `EventId = Brand<string, 'EventId'>`

#### Helper Functions:
- `createBrandedId<T extends string>(id: string): T` (type cast helper)
- `generateDeterministicId<T extends string>(prefix: string, prng: DeterministicPRNG): T`
- `createUuid<T extends string>(): T` (pure RFC-4122 v4 UUID generator without external dependencies)

### 3.7 Pure Simulation Isolation Invariants
Per `AI_CODING_GUIDE.md` §4:
- In packages `@railway/shared`, `@railway/game-data`, `@railway/network`, `@railway/simulation`:
  - FORBIDDEN imports: `react`, `react-dom`, `next`, `expo`, `drizzle-orm`, `@nestjs/*`, `fetch`, `window`, `document`.
  - Zero filesystem or native Node.js socket I/O in domain calculation methods.
  - Zero unseeded `Math.random()`.

---

## 4. Features Discovered

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Scaffolding | pnpm Workspace | Monorepo layout configuring packages under `packages/*` and `apps/*` | `pnpm-workspace.yaml` | Resolvable internal workspace dependencies | Fails if missing workspace spec | PRD §31, AI_CODING_GUIDE §5 |
| 2 | Scaffolding | Turborepo Pipeline | Build, typecheck, test, and dev tasks with dependency graphing and outputs caching | `turbo.json` | Cached execution pipeline | Fails on cyclic task dependency | PRD §31, AI_CODING_GUIDE §5 |
| 3 | Tooling | Strict Base TSConfig | Monorepo base TypeScript compiler options enforcing strict typing | `tsconfig.base.json` | Shared compiler options | Strict typecheck errors on `any`, implicit returns, unchecked index | AI_CODING_GUIDE §6, PRD §30.1 |
| 4 | Tooling | Vitest Suite Scaffold | Unit testing configuration using Node.js environment and V8 coverage | `vitest.config.ts` | Test runner harness | Fails on assertion mismatch | PRD §30.6, ORIGINAL_REQUEST R5 |
| 5 | Shared Primitives | Brand Type Helper | Zero-runtime nominal typing constructor `Brand<T, Tag>` | Base type `T`, Tag string | Branded compile-time type | Compiler error if unbranded primitive assigned without cast | DATA_DICTIONARY §2, DOMAIN_MODEL §3 |
| 6 | Shared Primitives | Money Primitive | Safe integer Indonesian Rupiah with exact arithmetic helpers | `number` | `Money` branded integer | Throws / fails validation on non-integer or unsafe int | ECONOMY_RULES §2.1, DATA_DICTIONARY §2 |
| 7 | Shared Primitives | Km Distance Primitive | Kilometer distance float rounded to 2 decimals | `number` | `Km` branded float | Fails if negative distance | DATA_DICTIONARY §2, SIMULATION_RULES §3.2 |
| 8 | Shared Primitives | Kmh Speed Primitive | Speed limit or velocity integer $\ge 0$ | `number` | `Kmh` branded integer | Fails if negative or non-integer | DATA_DICTIONARY §2, SIMULATION_RULES §3.1 |
| 9 | Shared Primitives | Tons Mass Primitive | Mass and payload float in metric tons rounded to 2 decimals | `number` | `Tons` branded float | Fails if negative mass | DATA_DICTIONARY §2, DOMAIN_MODEL §5.2.1 |
| 10 | Shared Primitives | Minutes Duration Primitive | Duration or time interval in minutes | `number` | `Minutes` branded integer | Fails if negative or non-integer | DATA_DICTIONARY §2, SIMULATION_RULES §2.1 |
| 11 | Shared Primitives | Percentage Primitive | Normalized ratio or percentage $[0.0, 100.0]$ | `number` | `Percentage` branded float | Fails if outside $[0, 100]$ range | DATA_DICTIONARY §2, SIMULATION_RULES §4.1.2 |
| 12 | Time Model | GameTimestamp Interface | Discrete simulation time structure containing day, minuteOfDay, totalMinutes | `totalMinutes` or `(day, minuteOfDay)` | `GameTimestamp` object | Fails validation on inconsistent day/minute calculations | DOMAIN_MODEL §4.2, SIMULATION_RULES §2.1 |
| 13 | Time Model | GameTimestamp Helpers | Converters and string formatters (`formatGameTimestamp`, `formatTimeOfDay`, `addMinutes`) | `GameTimestamp`, minutes offset | Formatted string or updated `GameTimestamp` | Handles multi-day roll-overs deterministically | DOMAIN_MODEL §4.2, SIMULATION_RULES §2.1 |
| 14 | Provenance | DataProvenance Schema | Real-world data source verification metadata and Zod schema validator | Provenance object | Validated `DataProvenance` | ZodError if date format or source missing | DOMAIN_MODEL §2.5, DATA_DICTIONARY §3.1 |
| 15 | PRNG | Mulberry32 Generator | Deterministic seeded 32-bit pseudo-random number generator class | Seed `number` | Uniform float $[0, 1)$ or integer in range | Handles 32-bit integer overflow via unsigned shifts | SIMULATION_RULES §2.3 |
| 16 | PRNG | Integer Range Generation | Uniform integer generation `nextInt(min, max)` inclusive | `min`, `max` integers | Integer $x \in [\text{min}, \text{max}]$ | Throws if $\text{min} > \text{max}$ | SIMULATION_RULES §2.3 |
| 17 | PRNG | Array Helpers | Deterministic `pick(array)` and Fisher-Yates `shuffle(array)` | Array of elements | Random element or shuffled array copy | Throws on empty array | DOMAIN_MODEL §4.1 |
| 18 | PRNG | State Fork / Snapshot | Snapshotting PRNG state via `getState()`, `setState()`, and `fork()` | PRNG instance | Cloned PRNG reproducing identical sequence | Allows deterministic rollback/branching | SIMULATION_RULES §2.3 |
| 19 | Error Handling | Result Tagged Union | Functional `Result<T, E>` tagged union with `ok()` and `err()` helpers | Value `T` or Error `E` | `{ ok: true, value }` or `{ ok: false, error }` | Compile-time pattern matching | DOMAIN_MODEL §2.4, AI_CODING_GUIDE §3 |
| 20 | Error Handling | Result Utility Methods | `isOk`, `isErr`, `unwrap`, `unwrapOr`, `mapResult`, `flatMapResult` | `Result<T, E>` | Unwrapped value or mapped `Result` | `unwrap` throws detailed error on failure | DOMAIN_MODEL §2.4 |
| 21 | Identity | Branded ID Constructors | Typed ID creators for 16 domain entities (`StationId`, `RouteId`, etc.) | Raw string or PRNG | Branded string ID | Validates string non-emptiness | DOMAIN_MODEL §5, API_SPEC §3 |
| 22 | Architectural | Pure Domain Guardrails | Zero React/DOM/DB driver import invariant across shared/domain packages | Source AST / imports | Clean decoupled packages | CI / typecheck failure on forbidden imports | AI_CODING_GUIDE §4, PRD §33 |

---

## 5. Edge Cases & Boundary Evaluations

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | PRNG Mulberry32 | `seed = 0` | State becomes `0x6D2B79F5` on first iteration. First uint32 is `1144304738`, float `0.26642920868471265`. Never locks or divides by zero. |
| 2 | PRNG Mulberry32 | `seed = 4294967295` (0xFFFFFFFF) | Correctly coerced to unsigned uint32 via `>>> 0`. First uint32 `3850105811`, float `0.8964226141106337`. |
| 3 | PRNG Mulberry32 | Negative seed e.g. `-12345` | Converted to unsigned 32-bit int (`4294954951`), executes identically to uint32 representation without crashing. |
| 4 | PRNG `nextInt` | `min = max` (e.g. `nextInt(5, 5)`) | Always returns `5` with zero division error. |
| 5 | PRNG `nextInt` | Inverted bounds `min > max` (e.g. `nextInt(10, 5)`) | Fails input validation, throws explicit RangeError rather than silent invalid index. |
| 6 | PRNG `pick` | Empty array `[]` | Throws descriptive error `Cannot pick from empty array`. |
| 7 | Money | Negative monetary values (e.g. expenses, debit transactions) | Allowed for ledger debit amounts (e.g. `toMoney(-150000)`), preserving exact integer arithmetic. |
| 8 | Money | Floating point input e.g. `15000.75` | Disallowed; helper rounds or rejects fractional Rupiah (IDR has no cents). |
| 9 | Money | Values exceeding `Number.MAX_SAFE_INTEGER` ($9 \times 10^{15}$) | Helper rejects values beyond safe integer limits to prevent IEEE-754 precision loss. |
| 10 | GameTimestamp | `totalMinutes = 0` | Evaluates to `day = 1`, `minuteOfDay = 0` (00:00 on Day 1). |
| 11 | GameTimestamp | Day boundary transition `totalMinutes = 1439` $\to$ `1440` | `1439` is Day 1, 23:59. `1440` increments day to 2, resetting `minuteOfDay` to 0 (Day 2, 00:00). |
| 12 | Result `unwrap` | Called on `{ ok: false, error }` | Throws informative `Error` with serialized error code and message. |
| 13 | DataProvenance | Empty source string `""` or invalid ISO date `"2026-13-45"` | Zod validation fails with explicit schema issues. |
