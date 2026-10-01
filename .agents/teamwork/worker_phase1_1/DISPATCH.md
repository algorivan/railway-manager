## 2026-09-30T15:19:15Z

You are worker_phase1_1, a teamwork_preview_worker implementing Phase 1 (World & Regulatory Model) of the Railway Network Manager simulation game.

Working Directory for your agent metadata: /home/synx/railway-manager/.agents/teamwork/worker_phase1_1
Project Root: /home/synx/railway-manager
Parent: orchestrator_1 (Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
You MUST read the following authoritative files first before doing anything:
1. /home/synx/railway-manager/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/synx/railway-manager/.agents/teamwork/orchestrator_1/PROJECT.md
3. /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1/report.md (R1 & R2 specs)
4. /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_2/report.md (R3 specs)
5. /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_3/report.md (R4 & R5 specs)
6. /home/synx/railway-manager/docs/AI_CODING_GUIDE.md

Write Ownership:
You own all source code, tests, and configuration files in /home/synx/railway-manager:
- Root monorepo files: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, vitest.config.ts (or root test setup)
- packages/shared/**/*
- packages/game-data/**/*
- packages/network/**/*

Task Objectives:
1. R1: Monorepo Scaffolding & Shared Tooling
   - Initialize pnpm-workspace.yaml with `packages/*`.
   - Setup root package.json with scripts: `"build": "turbo run build"`, `"typecheck": "turbo run typecheck"`, `"test": "turbo run test"`.
   - turbo.json configured for build, typecheck, test tasks.
   - tsconfig.base.json with strict type checking, ES2022/NodeNext target, declaration: true.
   - Configure Vitest workspace runner.
   - Run `pnpm install` and ensure lockfile is cleanly generated.

2. R2: Core Shared Primitives & Seeded PRNG (@railway/shared)
   - Branded types: Money (safe integer IDR, zero decimals), Km, Kmh, Tons, Meters, Minutes, Percentage. Include runtime conversion and formatting helpers (e.g. toMoney, formatRupiah).
   - GameTimestamp: tick-based time model with day (1-based), minuteOfDay (0..1439), totalMinutes, bidirectional arithmetic and string formatting.
   - DataProvenance: Zod schema & TypeScript type for source, sourceDate (ISO-8601), verified, notes.
   - DeterministicPRNG: exact Mulberry32 implementation per docs/SIMULATION_RULES.md §2.3. Must match seed 12345 vectors:
     uint32[0] = 4207900869, float[0] = 0.9797282677609473.
   - Result/Error types: Result<T, E>, ok(), err(), unwrap().
   - Branded ID generators: helpers for StationId, RouteId, DepotId, CompanyId, etc.
   - Strict pure simulation isolation: ZERO imports of react, next, expo, DOM APIs.
   - Vitest suite in packages/shared/test covering all types, PRNG determinism, timestamps, provenance.

3. R3: Static World Data Catalog (@railway/game-data)
   - Zod schemas: StationCatalogEntry, TrackCorridorSegment, DaopRegion, CatchmentProfile, Coordinates, StationFacilities, CoordinateBounds.
   - Authoritative station records for 7 Java stations: Gambir (GMR), Bandung (BD), Cirebon (CN), Semarang Tawang (SMT), Yogyakarta (YK), Solo Balapan (SLO), Surabaya Gubeng (SGU) with real WGS84 coordinates, DAOP divisions, platform counts, and catchment profiles.
   - Authoritative track corridor records for 9 segments: distances, track speed limits, double-track flags, electrification flags.
     CRITICAL: Gambir - Bandung corridor distance must be exactly 160.0 km. Yogyakarta - Solo Balapan must be isElectrified: true (all others false).
   - Java geographic bounding box validators (lat [-9.0, -5.5], lng [105.0, 115.0]).
   - WorldDataCatalogLoader: Pure deterministic loader with schema validation, foreign key checks, duplicate detection, graph reachability check, and O(1) query lookups.
   - Vitest suite in packages/game-data/test covering schemas, catalog data, bounding checks, and loader integrity.

4. R4: Network & Regulatory Domain Module (@railway/network)
   - StationEntity and RouteEntity domain models.
   - Regulatory Route Opening Cost Calculator:
     Cost = BaseRegulatoryFee + (StationCount * PrepCostPerStation) + (D_km * CorridorLicensingPerKm)
     Constants: Base = 50,000,000 IDR, PrepCost = 15,000,000 IDR, Licensing = 250,000 IDR/km.
     Must verify Gambir - Bandung (5 stations, 160 km) = 165,000,000 IDR exact.
   - Track Access Charge (TAC) Calculator:
     Cost = D_km * (BaseRatePerTrainKm + WeightSurcharge * (ConsistWeightTons / 100))
     Constants: Base = 25,000 IDR/km, WeightSurcharge = 5,000 IDR/100T/km.
     Must verify Gambir - Bandung (160 km, 350 tons) = 6,800,000 IDR exact.
   - Effective Speed Calculator:
     V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)
     Must verify test vector: (120, 100, 110, 80) = 80 km/h. When TSR omitted, defaults to Infinity.
   - DepotEntity: 3 tiers, stabling fleet_capacity, maintenance_slots, and FIFO queue logic for excess units.
   - Vitest suite in packages/network/test covering calculators, entities, and edge cases.

5. R5: Verification Commands:
   You MUST execute and verify:
   - `pnpm install`
   - `pnpm turbo build` (passes 100%)
   - `pnpm turbo typecheck` (passes 100% strict)
   - `pnpm turbo test` (all Vitest suites pass 100%)
   - Grep verification that NO simulation or domain package imports React, Next, or DOM APIs.
