# Project: Railway Network Manager — Phase 1 (World & Regulatory Model)

## Architecture
Phase 1 implements the World & Regulatory Model of the Railway Network Manager simulation game in a high-performance pnpm monorepo driven by Turborepo and TypeScript.
- **Monorepo Structure**: Managed with `pnpm-workspace.yaml`, Turborepo (`turbo.json`), shared TypeScript configuration (`tsconfig.base.json`), and Vitest runner.
- **Pure Domain & Simulation Isolation**: Simulation and domain packages are strictly pure TypeScript libraries. In accordance with `AI_CODING_GUIDE.md` §4, zero dependencies or imports of `react`, `react-dom`, `next`, `expo`, `drizzle-orm`, or browser DOM APIs are permitted.
- **Data Integrity & Determinism**: All entities and static world catalogs are validated with Zod schemas. Randomness is strictly governed by a seeded Mulberry32 PRNG producing bit-for-bit reproducible sequences.

```
/home/synx/railway-manager/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── vitest.config.ts
└── packages/
    ├── shared/         # @railway/shared: Branded types, Mulberry32 PRNG, Result/Error, Provenance
    ├── game-data/      # @railway/game-data: Zod schemas, 7 Java stations, 9 track segments, catalog loader
    └── network/        # @railway/network: Station, Route, Depot entities, Route Opening & TAC calculators, Speed calculator
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Monorepo Workspace | pnpm workspace setup, root package.json, turbo.json pipeline caching | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Shared TypeScript Config | tsconfig.base.json with strict typechecking, ES2022/NodeNext | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Vitest Runner Setup | Root and per-package Vitest configurations | M1 | ORIGINAL_REQUEST §R1, §R5 |
| 4 | Branded Numeric Primitives | Branded types for Money (integer IDR), Km, Kmh, Tons, Meters, Minutes | M2 | ORIGINAL_REQUEST §R2 |
| 5 | GameTimestamp & Tick Model | Day (1-based), minuteOfDay (0..1439), totalMinutes, bidirectional math | M2 | docs/SIMULATION_RULES §2.1 |
| 6 | DataProvenance Schema | Zod schema & types for source, sourceDate (ISO-8601), verified, notes | M2 | docs/DOMAIN_MODEL §2.5 |
| 7 | Deterministic Mulberry32 PRNG | Bit-for-bit reproducible PRNG matching seed 12345 vectors | M2 | ORIGINAL_REQUEST §R2, docs/SIMULATION_RULES §2.3 |
| 8 | Functional Result/Error Types | Result<T, E>, ok(), err(), unwrap() to prevent unhandled exceptions | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Branded Entity ID Generators | Strongly typed nominal IDs (StationId, RouteId, DepotId, CompanyId, etc.) | M2 | docs/DOMAIN_MODEL §5 |
| 10 | Static World Zod Schemas | Schemas for StationCatalogEntry, TrackCorridorSegment, DaopRegion, Catchment | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Java 7 Stations Catalog | Authoritative data for GMR, BD, CN, SMT, YK, SLO, SGU with WGS84 coords | M3 | ORIGINAL_REQUEST §R3, docs/DATA_DICTIONARY |
| 12 | Java 9 Track Segments | Connected corridor topology with distances (Gambir-BD 160km), speed limits, electrification | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Java Geographic Bounds | Bounding box validators for Java [-9.0..-5.5, 105.0..115.0] & Indonesia | M3 | docs/DATA_DICTIONARY §2.2 |
| 14 | World Data Catalog Loader | Loader with schema validation, foreign key check, reachability check, O(1) indices | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Station & Route Entities | Domain entity models with platform constraints, concession states (LOCKED, PERMIT_GRANTED) | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Regulatory Route Opening Fee | Exact calculator: 50M Base + (StationCount*15M) + (D_km*250k) -> 165M IDR | M4 | ORIGINAL_REQUEST §R4, docs/ECONOMY_RULES §5.3 |
| 17 | Track Access Charge (TAC) | Exact calculator: D_km * (25k + 5k * WeightTons/100) -> 6.8M IDR for 350T consist | M4 | ORIGINAL_REQUEST §R4, docs/ECONOMY_RULES §4.1 |
| 18 | Effective Speed Calculator | V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction) -> 80 km/h | M4 | ORIGINAL_REQUEST §R4, docs/SIMULATION_RULES §3.1 |
| 19 | Depot Entity & Physical Constraints | 3 tiers, stabling fleet_capacity, maintenance_slots, FIFO queue for overflow | M4 | ORIGINAL_REQUEST §R4, docs/DOMAIN_MODEL §5.4 |
| 20 | Dual Track Test & Invariant Suite | Monorepo-wide test suites verifying all domain invariants and acceptance criteria | M5 | ORIGINAL_REQUEST §R5, Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Monorepo Scaffolding & Tooling | Root package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, package skeletons | none | PLANNED |
| M2 | Core Shared Primitives & Seeded PRNG | @railway/shared: branded types, Mulberry32 PRNG, Result/Error, Provenance, unit tests | M1 | PLANNED |
| M3 | Static World Data Catalog | @railway/game-data: Zod schemas, 7 stations, 9 corridors, bounds, catalog loader, unit tests | M2 | PLANNED |
| M4 | Network & Regulatory Domain Module | @railway/network: Station/Route/Depot entities, Route opening fee, TAC, Effective Speed, unit tests | M2, M3 | PLANNED |
| M5 | Objective Verification & Invariant Suite | Turbo build, strict typecheck, 100% Vitest pass, zero DOM imports check, invariant verification | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### `@railway/shared`
- `Money`: branded `number` (safe integer IDR, zero decimals). Helpers: `toMoney(val: number): Money`, `formatRupiah(m: Money): string`.
- `Km`, `Kmh`, `Tons`, `Meters`, `Minutes`: branded `number`.
- `GameTimestamp`: `{ day: number; minuteOfDay: number; totalMinutes: number; }`. Helpers: `createTimestampFromMinutes(m: number): GameTimestamp`, `formatClock(ts: GameTimestamp): string`.
- `DeterministicPRNG`:
  - `constructor(seed: number)`
  - `next(): number` (returns float in [0, 1))
  - `nextUint32(): number` (returns unsigned 32-bit integer)
  - `nextInt(min: number, max: number): number` (returns integer in [min, max] inclusive)
  - `getState(): number`
- `Result<T, E>`: `{ ok: true; value: T } | { ok: false; error: E }`.
- `DataProvenance`: Zod schema `DataProvenanceSchema` and TypeScript interface with `source`, `sourceDate` (ISO string), `verified` (boolean), `notes` (optional string).

### `@railway/game-data`
- Depends on `@railway/shared` (imports `DataProvenance`, `Km`, `Kmh`, `Meters`).
- `StationCatalogEntry`: Zod schema and interface with `id`, `code`, `name`, `region`, `coordinates: { lat, lng }`, `platformCount`, `maxTrainLengthMeters`, `facilities`, `demandProfile`, `provenance`.
- `TrackCorridorSegment`: Zod schema and interface with `id`, `originStationId`, `destinationStationId`, `distanceKm`, `trackSpeedLimitKmh`, `isElectrified`, `isDoubleTrack`, `maxAxleLoadTons`, `provenance`.
- `JAVA_STATION_CATALOG`: Array of 7 station catalog records.
- `JAVA_TRACK_CORRIDOR_SEGMENTS`: Array of 9 corridor segment records.
- `WorldDataCatalogLoader`: Pure deterministic loader class / function validating catalog entries, indexing stations by id and code, indexing segments bidirectionally, verifying reachability.

### `@railway/network`
- Depends on `@railway/shared` and `@railway/game-data`.
- `calculateRouteOpeningFee(input: { stationCount: number; distanceKm: Km | number }): Money`
  - Formula: `50_000_000 + (stationCount * 15_000_000) + Math.round(distanceKm * 250_000)`
- `calculateTrackAccessCharge(input: { distanceKm: Km | number; consistWeightTons: Tons | number }): Money`
  - Formula: `Math.round(distanceKm * (25_000 + 5_000 * (consistWeightTons / 100)))`
- `calculateEffectiveSpeed(input: { trainMaxSpeed: Kmh | number; consistLimitSpeed: Kmh | number; trackLimitSpeed: Kmh | number; temporarySpeedRestriction?: Kmh | number }): Kmh`
  - Formula: `Math.min(trainMaxSpeed, consistLimitSpeed, trackLimitSpeed, temporarySpeedRestriction ?? Infinity)`
- `StationEntity`, `RouteEntity`, `DepotEntity`: Domain models conforming to `docs/DOMAIN_MODEL.md` with operational state transitions.

## Code Layout
```
/home/synx/railway-manager/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── vitest.config.ts
└── packages/
    ├── shared/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── primitives/
    │   │   │   ├── brand.ts
    │   │   │   ├── units.ts
    │   │   │   └── time.ts
    │   │   ├── prng/
    │   │   │   └── mulberry32.ts
    │   │   ├── provenance/
    │   │   │   └── provenance.ts
    │   │   ├── result/
    │   │   │   └── result.ts
    │   │   └── identifiers/
    │   │       └── ids.ts
    │   └── test/
    │       ├── units.test.ts
    │       ├── time.test.ts
    │       ├── prng.test.ts
    │       └── provenance.test.ts
    ├── game-data/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── schemas/
    │   │   │   ├── station.schema.ts
    │   │   │   ├── track.schema.ts
    │   │   │   └── bounds.schema.ts
    │   │   ├── catalog/
    │   │   │   ├── stations.ts
    │   │   │   └── tracks.ts
    │   │   └── loader/
    │   │       └── catalog-loader.ts
    │   └── test/
    │       ├── schemas.test.ts
    │       ├── catalog.test.ts
    │       └── loader.test.ts
    └── network/
        ├── package.json
        ├── tsconfig.json
        ├── src/
        │   ├── index.ts
        │   ├── calculators/
        │   │   ├── route-opening.ts
        │   │   ├── track-access.ts
        │   │   └── speed.ts
        │   └── entities/
        │       ├── station.entity.ts
        │       ├── route.entity.ts
        │       └── depot.entity.ts
        └── test/
            ├── route-opening.test.ts
            ├── track-access.test.ts
            ├── speed.test.ts
            └── depot.test.ts
```
