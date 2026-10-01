# Implementation Plan: Phase 1 (World & Regulatory Model)

## Goal
Build Phase 1 of Railway Network Manager simulation game per docs/ and ORIGINAL_REQUEST.md.

## Phases & Milestones
- **Phase 0: Survey & Specification Extraction**
  - Spawn 3 Explorers / Spec Miners to extract detailed specs from `docs/` and project files:
    - Spec Miner 1: Core Tooling & Shared Primitives (`AI_CODING_GUIDE.md`, `PRODUCT_PRD.md`, `SIMULATION_RULES.md §2.3` PRNG, Branded types, Provenance, Monorepo layout).
    - Spec Miner 2: Static World Data Catalog (`DATA_DICTIONARY.md`, Station coordinates, DAOP, platforms, track segments, distances, speeds).
    - Spec Miner 3: Regulatory & Network Domain Rules (`DOMAIN_MODEL.md`, `ECONOMY_RULES.md §4.1, §5.3`, `SIMULATION_RULES.md §3.1`, Depots, Routes, Stations).
  - Aggregate survey findings into `PROJECT.md § Feature Inventory` and architecture contracts.

- **Milestone 1: Monorepo Scaffolding & Tooling**
  - pnpm-workspace.yaml, root package.json, turbo.json, tsconfig.base.json, Vitest configuration.
  - Setup package skeletons: packages/shared, packages/game-data, packages/network (or domain).

- **Milestone 2: Core Shared Primitives & Seeded PRNG (@railway/shared)**
  - Branded types (Money in integer Rupiah, Km, Kmh, Tons, Minutes, GameTimestamp).
  - Mulberry32 seeded PRNG matching bit-for-bit test vectors.
  - Result/Error types, ID generators, DataProvenance schemas.
  - Vitest unit tests verifying determinism and types.

- **Milestone 3: Static World Data Catalog (@railway/game-data)**
  - Zod schemas for stations, track corridors, DAOPs.
  - Pulau Jawa stations (Gambir, Bandung, Cirebon, Semarang Tawang, Yogyakarta, Solo Balapan, Surabaya Gubeng) with real coordinates and metadata.
  - Track segments with distances, speed limits, electrification, double-track.
  - Catalog loader and validation functions.
  - Vitest tests validating schema conformance and coordinate bounds.

- **Milestone 4: Network & Regulatory Domain Module (@railway/network)**
  - Station, Route, Depot entities and physical constraints.
  - Route Opening Cost Calculator (Base + Stations*Prep + D_km*Licensing) with Gambir-Bandung exact vector: 165,000,000 IDR.
  - Track Access Charge (TAC) Calculator per ECONOMY_RULES.md §4.1.
  - Effective Speed Calculator (V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)).
  - Vitest unit tests for domain logic.

- **Milestone 5: Objective Verification & Full Test Suites**
  - Execute turbo build, typecheck, and vitest suites.
  - Dual track test verification across all packages.
  - Zero React/DOM imports verification.
  - Forensic audit & challenger stress testing.
