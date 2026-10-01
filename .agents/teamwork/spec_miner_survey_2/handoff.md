# Handoff Report: R3 Static World Data Catalog (`@railway/game-data`)

**Document Version:** 1.0.0  
**Date:** 2026-09-30  
**Agent:** spec_miner_survey_2 (teamwork_preview_spec_miner)  
**Recipient:** orchestrator_1 (Parent Conversation ID: `7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Target Package:** `@railway/game-data`  
**Related Requirements:** R3, R4, R5  

---

## 1. Observation

Direct observations from the authoritative project files and environment:

1. **Station Catalog Schema Contract** (`docs/DATA_DICTIONARY.md`, lines 44–77):
   ```typescript
   export interface StationCatalogEntry {
     id: string; // e.g. "STN_GMR_GAMBIR"
     code: string; // 2-4 uppercase characters
     name: string;
     region: 'DAOP_1_JAKARTA' | 'DAOP_2_BANDUNG' | 'DAOP_3_CIREBON' | 'DAOP_4_SEMARANG' | 'DAOP_5_PURWOKERTO' | 'DAOP_6_YOGYAKARTA' | 'DAOP_7_MADIUN' | 'DAOP_8_SURABAYA' | 'DAOP_9_JEMBER';
     coordinates: { lat: number; lng: number; }; // lat: -11.0 to 6.0, lng: 95.0 to 141.0
     platformCount: number; // Min: 1, Max: 16
     maxTrainLengthMeters: number; // Typical: 250m to 450m
     facilities: { hasCargoTerminal: boolean; hasDepotConnection: boolean; hasExecutiveLounge: boolean; };
     demandProfile: { baseDailyDemand: number; commuterShare: number; businessShare: number; touristShare: number; };
     provenance: DataProvenance;
   }
   ```
2. **Provenance Metadata Contract** (`docs/DOMAIN_MODEL.md`, lines 123–128):
   ```typescript
   export interface DataProvenance {
     readonly source: string;
     readonly sourceDate: string; // ISO-8601
     readonly verified: boolean;
     readonly notes?: string;
   }
   ```
3. **Authoritative Network Distance Test Vector** (`docs/ECONOMY_RULES.md`, lines 68, 202–211, 240–252):
   - Line 68: `*Example (Gambir – Bandung, 160 km):*`
   - Line 210–211: `*Example (Gambir – Bandung, 5 stations, 160 km):* Cost = 50,000,000 + (5 * 15,000,000) + (160 * 250,000) = 165,000,000 IDR`
   - Line 242: `* Distance: 160 km.`
   - Invariant: The Gambir – Bandung track segment in the world catalog must have distance set to exactly **160.0 km**.
4. **Permanent Track Speed Constraints** (`docs/SIMULATION_RULES.md`, line 140):
   - `Cikampek–Cirebon double track = 120 km/h; mountainous Padalarang–Cikadongdong = 60 km/h`
5. **Real-world Station Coordinates & Characteristics**:
   - Gambir (`GMR`): `-6.1767`, `106.8306`, DAOP 1 Jakarta, 4 platform tracks.
   - Bandung (`BD`): `-6.9142`, `107.6025`, DAOP 2 Bandung, 6 platform tracks.
   - Cirebon (`CN`): `-6.7053`, `108.5554`, DAOP 3 Cirebon, 6 platform tracks.
   - Semarang Tawang (`SMT`): `-6.9644`, `110.4278`, DAOP 4 Semarang, 8 platform tracks.
   - Yogyakarta (`YK`): `-7.7892`, `110.3635`, DAOP 6 Yogyakarta, 6 platform tracks.
   - Solo Balapan (`SLO`): `-7.5568`, `110.8214`, DAOP 6 Yogyakarta, 8 platform tracks.
   - Surabaya Gubeng (`SGU`): `-7.2653`, `112.7522`, DAOP 8 Surabaya, 7 platform tracks.
6. **Electrification Invariant**:
   - The Yogyakarta – Solo Balapan corridor (`SEG_YK_SLO`, 60.0 km) is the sole operational electrified mainline passenger corridor in Central Java (1500V DC overhead catenary). All other intercity mainline corridors in the initial network are diesel-operated (`isElectrified: false`).
7. **Monorepo File System**:
   - Directory `/home/synx/railway-manager` contains `docs/` and `ORIGINAL_REQUEST.md`. Monorepo packages (`packages/game-data`, `packages/shared`, `packages/network`) are currently being scaffolded by parallel agents.

---

## 2. Logic Chain

1. **Premise 1 (Model A Paradigm)**: Per PRD §13, §14 and DOMAIN_MODEL.md §5.1, the player operates over an existing railway network on Pulau Jawa. Therefore, station entities and corridor track segments must exist as static, immutable catalogs rather than player-built structures.
2. **Premise 2 (Schema Enforcement)**: Per DATA_DICTIONARY.md §3.1 and ORIGINAL_REQUEST.md R3, all static world data must be validated via Zod schemas at runtime/build time to ensure zero corrupted values (e.g. invalid platform counts, negative distances, or coordinates outside Java).
3. **Premise 3 (Deterministic Arithmetic Alignment)**: The downstream economic calculators (route opening cost, TAC) and simulation kinematics require exact distance and speed values. Specifically, Gambir – Bandung must equal 160.0 km so that the regulatory fee formula yields exactly 165,000,000 IDR (`docs/ECONOMY_RULES.md` §5.3, `ORIGINAL_REQUEST.md` line 68).
4. **Premise 4 (Network Connectivity & Integrity)**: The 7 stations form a connected graph over 9 corridor segments covering both the North Trunk (Pantura: GMR–CN–SMT–SGU) and South Trunk (GMR–BD–YK–SLO–SGU), plus cross-links (CN–YK, SMT–SLO). A deterministic loader must verify ID uniqueness, foreign key validity, absence of self-loops, and graph reachability.
5. **Premise 5 (Geographic Bounds Invariant)**: Java island is strictly bounded within latitude $[-9.0, -5.5]$ and longitude $[105.0, 115.0]$. Validating this enclosure catches coordinate inversion or out-of-region entries before they reach rendering layers (MapLibre GL).
6. **Conclusion**: The specification assembled in `report.md` provides complete Zod schemas, 7 validated station records, 9 verified corridor segments, coordinate bounding constants, and loader integrity algorithms required for implementing `@railway/game-data`.

---

## 3. Caveats

1. **Real-world Distances vs Game Balance**: In real-world KAI track geometry, the distance between Gambir and Bandung via Purwakarta is approximately 166 km, but `docs/ECONOMY_RULES.md` §5.3, §7 explicitly fixes the authoritative test distance to 160.0 km. We strictly adhere to the 160.0 km specification to maintain deterministic test compatibility.
2. **Undirected Segment Assumption**: Physical railway tracks support bidirectional train movement. In our catalog, each corridor segment is represented by a single entry connecting `originStationId` and `destinationStationId` with a query helper `getSegmentBetween(stationA, stationB)` that resolves symmetrically.
3. **Electrification Scope**: While the Jakarta commuter line (Jabodetabek) is electrified, the intercity terminal at Gambir does not use overhead catenary for intercity diesel consists. Only the Yogyakarta – Solo Balapan corridor (`SEG_YK_SLO`) is flagged with `isElectrified: true` in this intercity network scope.

---

## 4. Conclusion

The specification for **R3: Static World Data Catalog (`@railway/game-data`)** is fully resolved and documented in `report.md`. It includes:
- **Zod Schemas**: Complete schemas for stations, track segments, DAOP regions, catchment profiles, coordinate bounds, and data provenance.
- **7 Station Records**: Complete data for Gambir, Bandung, Cirebon, Semarang Tawang, Yogyakarta, Solo Balapan, and Surabaya Gubeng.
- **9 Track Corridor Segments**: Complete topology connecting all 7 stations with distances, speed limits, double-track flags, and electrification flags.
- **Bounding Boxes**: Exact bounding definitions for Pulau Jawa ($[-9.0, -5.5]$, $[105.0, 115.0]$) and Indonesia ($[-11.0, 6.0]$, $[95.0, 141.0]$).
- **Catalog Loader**: Architecture for `WorldDataCatalogLoader` enforcing schema validation, foreign key integrity, duplicate detection, graph reachability, and O(1) query indexing.

---

## 5. Verification Method

To verify the catalog implementation once coded in `@railway/game-data`:

1. **TypeScript Typecheck**:
   ```bash
   pnpm --filter @railway/game-data typecheck
   ```
2. **Vitest Unit Test Suite**:
   Run the dedicated test suite validating catalog integrity:
   ```bash
   pnpm --filter @railway/game-data test
   ```
3. **Validation Invariants to Test**:
   - `JAVA_STATION_CATALOG.length === 7`
   - `JAVA_TRACK_CORRIDOR_SEGMENTS.length === 9`
   - Gambir – Bandung segment distance must equal `160.0`
   - Yogyakarta – Solo Balapan segment must have `isElectrified === true`
   - All station coordinates must satisfy `isWithinJavaBounds(station.coordinates) === true`
   - Catalog loader must throw `CatalogIntegrityError` when passed duplicate station IDs or invalid foreign keys.
