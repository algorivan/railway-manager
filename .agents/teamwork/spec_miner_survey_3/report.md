# Specification Mining Report: Network & Regulatory Domain Module & Test Vectors
**Module:** R4 (`@railway/network` or `@railway/domain`) & R5 (Verification Test Vectors)  
**Survey Agent:** `spec_miner_survey_3`  
**Date:** 2026-09-30  
**Target Package:** `packages/network` (or `packages/domain`)  
**Primary Authorities:**
- `docs/ORIGINAL_REQUEST.md` (R4, R5, Acceptance Criteria)
- `docs/ECONOMY_RULES.md` (§4.1 TAC, §5.2 Depot Tiers, §5.3 Route Opening Cost, §7 Test Vector 1)
- `docs/SIMULATION_RULES.md` (§3 Speed & Kinematics, §4 Station Dwell & Turnaround, §7 Depot Maintenance, §11 Test Vectors)
- `docs/DOMAIN_MODEL.md` (§3 Architectural Contracts, §5.1 Network Domain, §5.2 Fleet Invariants, §5.4 Depot Domain)
- `docs/DATA_DICTIONARY.md` (§2 Branded Primitives, §3 Static Catalogs, §4 Dynamic State Schemas)
- `docs/AI_CODING_GUIDE.md` (Deterministic Rules, Non-goals, Package Guardrails)

---

## 1. Executive Summary

This report establishes the complete, authoritative specification for the **Network & Regulatory Domain Module** (`@railway/network`) and the associated **Deterministic Test Vectors** (R4 and R5 of Phase 1).

Key deliverables covered:
1. **Station Entity & Operations:** Station metadata, DAOP administrative divisions, platform counts, maximum train length constraints, and dwell time calculations.
2. **Route Entity & Operations:** Ordered station sequences, corridor distances, runtime estimations, service types, and access concession lifecycles (`LOCKED` $\to$ `PERMIT_GRANTED` $\to$ `SUSPENDED`).
3. **Regulatory Route Opening Cost Calculator:** Exact mathematical formula with all rate constants and step-by-step validation of the reference Gambir – Bandung vector (**165,000,000 IDR**).
4. **Track Access Charge (TAC) Calculator:** Exact mathematical formula incorporating base rate and weight surcharge per gross hundred tons per kilometer, with validation of the Gambir – Bandung reference vector (**6,800,000 IDR**).
5. **Effective Speed Calculator:** Multi-constraint modular minimum resolver ($V_{\text{eff}} = \min(V_{\text{train\_max}}, V_{\text{consist\_limit}}, V_{\text{track\_limit}}, V_{\text{restriction}})$) with validation of the test vector (**80 km/h**).
6. **Depot Entity & Constraints:** 3-tier depot topology, stabling capacity (`fleet_capacity`), maintenance bay capacity (`maintenance_slots`), FIFO maintenance queuing, and maintenance capability tiers.

---

## 2. Station Entity & Domain Operations

### 2.1 Interface Contract
From `docs/DOMAIN_MODEL.md` §5.1.1 and `docs/DATA_DICTIONARY.md` §3.1:

```typescript
import { DataProvenance } from '@railway/shared';

export type StationCode = string; // 2-4 uppercase characters, e.g., 'GMR', 'BD', 'CN'
export type StationId = string;   // e.g., 'STN_GMR_GAMBIR'

export type DaopRegion =
  | 'DAOP_1_JAKARTA'
  | 'DAOP_2_BANDUNG'
  | 'DAOP_3_CIREBON'
  | 'DAOP_4_SEMARANG'
  | 'DAOP_5_PURWOKERTO'
  | 'DAOP_6_YOGYAKARTA'
  | 'DAOP_7_MADIUN'
  | 'DAOP_8_SURABAYA'
  | 'DAOP_9_JEMBER';

export interface StationCoordinates {
  readonly lat: number; // Java bounds: -11.0 to 6.0 (approx -6.0 to -9.0 for Java)
  readonly lng: number; // Java bounds: 95.0 to 141.0 (approx 105.0 to 115.0 for Java)
}

export interface StationCatchmentProfile {
  readonly commuterWeight: number; // 0.0 to 1.0 (relative distribution)
  readonly businessWeight: number; // 0.0 to 1.0
  readonly touristWeight: number;  // 0.0 to 1.0
  readonly economyBaseDemand: number; // daily base passengers
}

export interface StationFacilities {
  readonly hasCargoTerminal: boolean;
  readonly hasDepotConnection: boolean;
  readonly hasExecutiveLounge: boolean;
}

export interface Station {
  readonly id: StationId;
  readonly code: StationCode;
  readonly name: string;
  readonly region: DaopRegion | string;
  readonly coordinates: StationCoordinates;
  readonly platformCount: number; // Min: 1, Max: 16
  readonly maxTrainLengthMeters: number; // Typical: 250m to 450m
  readonly facilities: StationFacilities;
  readonly passengerCatchmentProfile: StationCatchmentProfile;
  readonly hasCargoTerminal: boolean;
  readonly provenance: DataProvenance;
}
```

### 2.2 Station Domain Invariants & Operations

1. **Maximum Composition Length Invariant (`DOMAIN_MODEL.md` §5.2.2):**
   - Any train composition assigned to a route must satisfy:
     $$\sum_{u \in \text{Composition}} u.\text{lengthMeters} \le \min_{s \in \text{Route.stationSequence}} (s.\text{maxTrainLengthMeters})$$
   - If a composition exceeds the maximum train length of *any* station on the route, timetable dispatch must be blocked.

2. **Station Category & Base Dwell Time (`SIMULATION_RULES.md` §4.1.1):**
   - Platform count determines base dwell time:
     - Minor Station / Halte ($< 2$ platforms): $T_{\text{base\_dwell}} = 2\text{ minutes}$.
     - Intermediate Station ($2 - 4$ platforms): $T_{\text{base\_dwell}} = 4\text{ minutes}$.
     - Major Terminal Station ($> 4$ platforms): $T_{\text{base\_dwell}} = 8\text{ minutes}$.

3. **Dynamic Dwell Time with Overcrowding (`SIMULATION_RULES.md` §4.1):**
   - $$T_{\text{dwell}} = \left\lceil T_{\text{base\_dwell}} \times (1 + \Phi_{\text{overcrowd}}) \right\rceil$$
   - Overcrowding penalty factor $\Phi_{\text{overcrowd}}$ where $\text{LF} = \frac{\text{Passengers Onboard}}{\text{Consist Capacity}}$:
     $$\Phi_{\text{overcrowd}} = \begin{cases}
     0 & \text{if } \text{LF} \le 1.00 \\
     1.5 \times (\text{LF} - 1.00) & \text{if } 1.00 < \text{LF} \le 1.50 \\
     0.75 + 3.0 \times (\text{LF} - 1.50) & \text{if } \text{LF} > 1.50
     \end{cases}$$

4. **Platform Occupancy Limit:**
   - A station cannot hold more simultaneous dwelling trains than `platformCount`.
   - Excess arrivals queue at outer home signals, accumulating delay.

---

## 3. Route Entity & Domain Operations

### 3.1 Interface Contract
From `docs/DOMAIN_MODEL.md` §5.1.2 and `docs/DATA_DICTIONARY.md` §4.5:

```typescript
import { CompanyId, Km, Minutes, Money, RouteId, StationId } from '@railway/shared';

export type ServiceType = 'LOCAL' | 'SEMI_EXPRESS' | 'EXPRESS' | 'INTERCITY';
export type RouteAccessStatus = 'LOCKED' | 'PERMIT_GRANTED' | 'SUSPENDED';

export interface Route {
  readonly id: RouteId;
  readonly companyId: CompanyId;
  readonly code: string; // e.g., "RT-BDG-GMR" or "ARGO-PARAHYANGAN-01"
  readonly name: string; // e.g., "Parahyangan Corridor"
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly stationSequence: ReadonlyArray<StationId>;
  readonly distanceKm: Km;
  readonly estimatedRuntimeMinutes: Minutes;
  readonly serviceType: ServiceType;
  readonly accessStatus: RouteAccessStatus;
  readonly trackAccessFeePerKm: Money;
}
```

### 3.2 Route Domain Invariants & Operations

1. **Station Sequence Topology:**
   - `stationSequence.length >= 2`.
   - `stationSequence[0] === originStationId`.
   - `stationSequence[stationSequence.length - 1] === destinationStationId`.
   - Every contiguous station pair $(s_i, s_{i+1})$ in `stationSequence` must correspond to a valid physical track segment in the network topology.
   - Total route distance: $D_{\text{km}} = \sum_{i=0}^{N-2} \text{segmentDistance}(s_i, s_{i+1})$.

2. **Route Concession Lifecycle:**
   - **`LOCKED`**: Route corridor is not yet permitted or licensed for the company.
   - **`PERMIT_GRANTED`**: Upfront route opening fee ($\text{Cost}_{\text{route\_open}}$) paid in full, regulatory permit granted, active timetables may run.
   - **`SUSPENDED`**: License suspended due to insolvency (cash $\le -15\text{ Billion IDR}$ for 14 days per `ECONOMY_RULES.md` §6.3) or regulatory breach. All departures blocked.

3. **Estimated Runtime Calculation (`SIMULATION_RULES.md` §3.2):**
   - For each segment $i$ of distance $D_{\text{seg}, i}$ traversed at effective speed $V_{\text{eff}, i}$:
     $$T_{\text{transit}, i} = \left\lceil \frac{D_{\text{seg}, i}}{V_{\text{eff}, i}} \times 60 + T_{\text{accel\_decel\_margin}} \right\rceil$$
     where $T_{\text{accel\_decel\_margin}} = 2.0\text{ min}$ (passenger) or $4.0\text{ min}$ (freight).
   - Plus scheduled dwell time at all intermediate stations:
     $$\text{EstimatedRuntime} = \sum_{i} T_{\text{transit}, i} + \sum_{s \in \text{intermediate}} T_{\text{base\_dwell}}(s)$$

---

## 4. Regulatory Route Opening Cost Calculator

### 4.1 Authoritative Formula
From `docs/ECONOMY_RULES.md` §5.3 (PRD §14):

$$\text{Cost}_{\text{route\_open}} = \text{BaseRegulatoryFee} + \left( \text{StationCount} \times \text{PrepCostPerStation} \right) + \left( D_{\text{route\_km}} \times \text{CorridorLicensingPerKm} \right)$$

### 4.2 Economic Constants
All constants reside as configuration parameters in `@railway/game-data` (per PRD Law 6):

| Constant Identifier | Value | Units | Description |
| :--- | :---: | :--- | :--- |
| `BASE_REGULATORY_FEE` | `50_000_000` | IDR (`Money`) | Fixed administrative/filing fee per route application |
| `PREP_COST_PER_STATION` | `15_000_000` | IDR (`Money`) | Station platform access guarantee, crew route-learning |
| `CORRIDOR_LICENSING_PER_KM`| `250_000` | IDR/km (`Money`) | Infrastructure safety certification & slot license per km |

### 4.3 Input Parameters & Validation Rules

```typescript
export interface RouteOpeningCostInput {
  /** Total number of stations served along the route (origin, intermediate, and destination) */
  readonly stationCount: number;
  /** Total route corridor distance in kilometers */
  readonly distanceKm: number;
}
```

- **Validation Guards:**
  - `stationCount` must be an integer $\ge 2$ (at least origin and destination). Throws `InvalidRouteError` if $< 2$.
  - `distanceKm` must be a positive number ($> 0$). Throws `InvalidRouteError` if $\le 0$.
  - Both inputs must be finite numbers (no `NaN`, no `Infinity`).

### 4.4 Reference Test Vector: Gambir – Bandung
From `docs/ECONOMY_RULES.md` §5.3:

* **Corridor:** Gambir (GMR) $\to$ Bandung (BD)
* **Stations Served (`stationCount`):** 5 stations (Gambir, Jatinegara, Bekasi, Cimahi, Bandung)
* **Corridor Distance (`distanceKm`):** 160.00 km
* **Calculation Breakdown:**
  1. $\text{BaseRegulatoryFee} = 50,000,000\text{ IDR}$
  2. $\text{StationCount} \times \text{PrepCostPerStation} = 5 \times 15,000,000 = 75,000,000\text{ IDR}$
  3. $D_{\text{route\_km}} \times \text{CorridorLicensingPerKm} = 160 \times 250,000 = 40,000,000\text{ IDR}$
  4. $\text{Total Cost} = 50,000,000 + 75,000,000 + 40,000,000 =$ **`165,000,000 IDR`**
* **Verification Invariant:** Output must match `165_000_000` down to the exact Rupiah.

---

## 5. Track Access Charge (TAC) Calculator

### 5.1 Authoritative Formula
From `docs/ECONOMY_RULES.md` §4.1 (PRD §14):

$$\text{Cost}_{\text{TAC}} = D_{\text{km}} \times \left( \text{BaseRatePerTrainKm} + \text{WeightSurcharge} \times \frac{\text{TotalConsistWeightTons}}{100} \right)$$

### 5.2 Rate Constants
All rates reside in game configuration:

| Constant Identifier | Value | Units | Description |
| :--- | :---: | :--- | :--- |
| `TAC_BASE_RATE_PER_TRAIN_KM` | `25_000` | IDR / train-km | Standard Intercity Track Access Base Rate |
| `TAC_WEIGHT_SURCHARGE` | `5_000` | IDR / 100 gross tons / train-km | Incremental track wear surcharge per 100 gross tons |

### 5.3 Input Parameters & Types

```typescript
export interface TrackAccessChargeInput {
  /** Distance traveled along the track segment or corridor in km */
  readonly distanceKm: number;
  /** Total gross weight of the train composition in metric tons (including locomotives, carriages, payload) */
  readonly totalConsistWeightTons: number;
}
```

- **Validation Guards:**
  - `distanceKm` must be $\ge 0$. If `distanceKm === 0`, return `0 IDR`.
  - `totalConsistWeightTons` must be $> 0$. A physical consist cannot have zero or negative mass.
  - Output is strictly integer `Money`:
    $$\text{Rate}_{\text{per\_km}} = \text{BaseRatePerTrainKm} + \frac{\text{WeightSurcharge} \times \text{TotalConsistWeightTons}}{100}$$
    $$\text{Cost}_{\text{TAC}} = \text{Math.round}(D_{\text{km}} \times \text{Rate}_{\text{per\_km}})$$

### 5.4 Reference Test Vector: Gambir – Bandung Executive Service
From `docs/ECONOMY_RULES.md` §7 (Test Vector 1):

* **Service Details:** Single intercity service, Gambir – Bandung.
* **Consist Composition:** 1 CC206 Locomotive + 4 Executive Carriages + 1 Dining Car + 1 Power Van.
* **Total Gross Weight (`totalConsistWeightTons`):** 350.00 tons.
* **Distance (`distanceKm`):** 160.00 km.
* **Calculation Breakdown:**
  1. Weight ratio in hundreds of tons:
     $$\frac{350}{100} = 3.5$$
  2. Weight surcharge per km:
     $$5,000 \times 3.5 = 17,500\text{ IDR / km}$$
  3. Total rate per train-km:
     $$\text{Base} + \text{Surcharge} = 25,000 + 17,500 = 42,500\text{ IDR / km}$$
  4. Total TAC for 160 km:
     $$\text{Cost}_{\text{TAC}} = 160 \times 42,500 =$ **`6,800,000 IDR`**
* **Verification Invariant:** Output must match `6_800_000` IDR exactly.

---

## 6. Effective Speed Calculator

### 6.1 Authoritative Formula
From `docs/SIMULATION_RULES.md` §3.1 (PRD §9) and `docs/DOMAIN_MODEL.md` §5.1.2:

$$V_{\text{eff}} = \min \left( V_{\text{train\_max}},\, V_{\text{consist\_limit}},\, V_{\text{track\_limit}},\, V_{\text{restriction}} \right)$$

### 6.2 Component Definitions

| Component | Variable Name | Source / Meaning |
| :--- | :--- | :--- |
| $V_{\text{train\_max}}$ | `trainMaxSpeedKmh` | Maximum design speed of the lead locomotive (e.g., CC206 = $120\text{ km/h}$, CC201 = $120\text{ km/h}$) |
| $V_{\text{consist\_limit}}$ | `consistLimitKmh` | Minimum design speed rating across all attached carriages/wagons: $\min_{i \in \text{Units}}(V_{\text{spec\_max}, i})$ |
| $V_{\text{track\_limit}}$ | `trackLimitKmh` | Permanent engineering speed limit of the track segment (e.g., flat mainline = $120\text{ km/h}$; mountain curves = $60\text{ km/h}$) |
| $V_{\text{restriction}}$ | `operationalRestrictionKmh` | Temporary Speed Restriction (TSR) from weather, maintenance work, or signal caution (optional; defaults to $\infty$ if no TSR) |

### 6.3 Interface Contract

```typescript
export interface SpeedConstraintInput {
  readonly trainMaxSpeedKmh: number;
  readonly consistLimitKmh: number;
  readonly trackLimitKmh: number;
  readonly operationalRestrictionKmh?: number; // Optional TSR; if omitted or undefined, TSR is inactive
}

export function calculateEffectiveSpeedKmh(input: SpeedConstraintInput): number {
  const tsr = input.operationalRestrictionKmh !== undefined ? input.operationalRestrictionKmh : Infinity;
  const vEff = Math.min(
    input.trainMaxSpeedKmh,
    input.consistLimitKmh,
    input.trackLimitKmh,
    tsr
  );
  if (vEff < 0) {
    throw new Error('Effective speed cannot be negative');
  }
  return vEff;
}
```

### 6.4 Reference Test Vector: Speed Model Invariant
From `docs/SIMULATION_RULES.md` §11 (Test Vector 1):

* **Inputs:**
  - Locomotive design speed ($V_{\text{train\_max}}$): $120\text{ km/h}$
  - Carriages rating ($V_{\text{consist\_limit}}$): $100\text{ km/h}$ (8 carriages rated at 100 km/h)
  - Permanent track limit ($V_{\text{track\_limit}}$): $110\text{ km/h}$
  - Temporary Speed Restriction ($V_{\text{restriction}}$): $80\text{ km/h}$
* **Calculation:**
  $$V_{\text{eff}} = \min(120, 100, 110, 80) = 80\text{ km/h}$$
* **Verification Invariant:**
  $$\forall \text{ Inputs},\, V_{\text{eff}} \le \min(\text{all limits})$$

### 6.5 Boundary Conditions & Special Cases
1. **No TSR Active:** If `operationalRestrictionKmh` is omitted, $V_{\text{eff}} = \min(120, 100, 110) = 100\text{ km/h}$.
2. **Zero Speed (Signal Stop / Obstruction):** If $V_{\text{restriction}} = 0$, $V_{\text{eff}} = 0\text{ km/h}$.
3. **Mountain Geometry Dominant:** On Padalarang – Cikadongdong ($V_{\text{track\_limit}} = 60\text{ km/h}$), even with $120\text{ km/h}$ locomotive and $120\text{ km/h}$ carriages, $V_{\text{eff}} = 60\text{ km/h}$.
4. **Emergency Limp Mode (`SIMULATION_RULES.md` §6.3):** Upon unrecovered breakdown, consist is restricted to $V_{\text{limp}} = 20\text{ km/h}$.

---

## 7. Depot Entity & Physical Capacity Constraints

### 7.1 Interface Contract
From `docs/DOMAIN_MODEL.md` §5.4 and `docs/DATA_DICTIONARY.md` §4.2:

```typescript
import { CompanyId, DepotId, Money, StationId } from '@railway/shared';

export type MaintenanceCapability =
  | 'LEVEL_1_DAILY'
  | 'LEVEL_2_PERIODIC'
  | 'LEVEL_3_OVERHAUL';

export interface Depot {
  readonly id: DepotId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly stationId: StationId;
  readonly fleetCapacity: number;          // Maximum physical stabled units
  readonly maintenanceSlots: number;       // Concurrent maintenance repair bays
  readonly stablingOccupancy: number;      // Currently parked units
  readonly activeMaintenanceCount: number; // Currently serviced units
  readonly maintenanceLevelCapability: MaintenanceCapability;
  readonly dailyOperatingCost: Money;
}
```

### 7.2 Depot Facility Tier Catalog
From `docs/ECONOMY_RULES.md` §5.2 (PRD §11):

| Facility Tier | Fleet Stabling Capacity (`fleet_capacity`) | Maintenance Bays (`maintenance_slots`) | Upfront CAPEX Cost | Daily Facility OPEX | Maintenance Capability Level |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Tier 1 (Small Regional)** | 6 Units | 1 Level-1 Bay | $15,000,000,000\text{ IDR}$ | $2,500,000\text{ IDR}$ | `LEVEL_1_DAILY` |
| **Tier 2 (Medium Operational)** | 16 Units | 3 Level-2 Bays | $45,000,000,000\text{ IDR}$ | $7,500,000\text{ IDR}$ | `LEVEL_2_PERIODIC` |
| **Tier 3 (Master Workshop)** | 40 Units | 8 Level-3 Bays | $120,000,000,000\text{ IDR}$ | $25,000,000\text{ IDR}$ | `LEVEL_3_OVERHAUL` |

### 7.3 Depot Physical Constraints & Domain Rules

1. **Fleet Stabling Invariant:**
   $$\text{stablingOccupancy} \le \text{fleetCapacity}$$
   - When placing a procurement order or transferring rolling stock, the target depot must satisfy:
     $$\text{stablingOccupancy} + \text{incomingUnits} \le \text{fleetCapacity}$$
   - Over-allocation is rejected by the domain model.

2. **Maintenance Bay Invariant & FIFO Queuing (`SIMULATION_RULES.md` §7.2):**
   $$\text{activeMaintenanceCount} \le \text{maintenanceSlots}$$
   - A depot cannot service more than `maintenanceSlots` concurrent units.
   - Any unit assigned to maintenance when all slots are occupied transitions to `QUEUED` status in a FIFO waiting queue.
   - Queued units occupy stabling capacity and incur daily facility overhead without recovering mechanical condition until an active bay opens.

3. **Maintenance Level Compatibility Matrix (`SIMULATION_RULES.md` §7.1):**
   - **Level 1 (Preventive / Daily Light):** +15.00% condition (cap 95%), 4 hours (240 ticks), $5,000,000\text{ IDR}$.
     - Requires $\ge \text{LEVEL\_1\_DAILY}$ (Supported by Tier 1, Tier 2, Tier 3).
   - **Level 2 (Periodic / Medium Inspection):** +40.00% condition (cap 98%), 12 hours (720 ticks), $25,000,000\text{ IDR}$.
     - Requires $\ge \text{LEVEL\_2\_PERIODIC}$ (Supported by Tier 2, Tier 3 only). Rejects Tier 1 depots.
   - **Level 3 (Overhaul / Heavy Refurbishment):** Restores to 100.00%, 72 hours (4320 ticks), $120,000,000\text{ IDR}$.
     - Requires $\text{LEVEL\_3\_OVERHAUL}$ (Supported by Tier 3 Master Workshop only). Rejects Tier 1 and Tier 2 depots.

---

## 8. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Network | Station Catalog & Entity | Entity representing railway stations with DAOP region, coordinates, platform count, and catchment profile | `StationId`, `code`, `name`, `region`, `coordinates`, `platformCount`, `maxTrainLengthMeters`, `facilities`, `passengerCatchmentProfile` | `Station` object | Reject invalid coordinates ($<-11$ or $>6$), platform count $<1$ | `DOMAIN_MODEL.md` §5.1.1, `DATA_DICTIONARY.md` §3.1 |
| 2 | Network | Station Dwell Time Calculator | Calculates scheduled passenger dwell time based on platform count and overcrowding load factor | `platformCount: number`, `loadFactor: number` | `dwellMinutes: number` | Throws if `loadFactor < 0` or `platformCount < 1` | `SIMULATION_RULES.md` §4.1 |
| 3 | Network | Platform Length Constraint | Invariant ensuring consist total length does not exceed maximum train length of any station on route | `consistLengthMeters: number`, `stationMaxLengths: number[]` | `boolean` (is valid) | Timetable assignment blocked if composition length exceeds platform | `DOMAIN_MODEL.md` §5.2.2 |
| 4 | Network | Route Entity & Concession Model | Route entity connecting an ordered sequence of stations with concession lifecycle status | `originStationId`, `destinationStationId`, `stationSequence`, `distanceKm`, `serviceType`, `accessStatus` | `Route` object | Reject if `stationSequence.length < 2` or endpoints do not match | `DOMAIN_MODEL.md` §5.1.2, `DATA_DICTIONARY.md` §4.5 |
| 5 | Regulatory | Route Opening Cost Calculator | Calculates upfront concession filing, station prep, and corridor licensing fees | `stationCount: number`, `distanceKm: number` | `Cost: Money` (integer IDR) | Throws if `stationCount < 2` or `distanceKm <= 0` | `ECONOMY_RULES.md` §5.3, `ORIGINAL_REQUEST.md` R4 |
| 6 | Economy / Ops | Track Access Charge (TAC) Calculator | Computes track infrastructure usage charge per train-km with gross weight surcharge | `distanceKm: number`, `totalConsistWeightTons: number` | `Cost: Money` (integer IDR) | Throws if `distanceKm < 0` or `totalConsistWeightTons <= 0` | `ECONOMY_RULES.md` §4.1, §7 Test Vector 1 |
| 7 | Simulation | Effective Operating Speed Calculator | Computes minimum allowable operating speed across locomotive, consist, track segment, and TSR | `trainMaxSpeedKmh`, `consistLimitKmh`, `trackLimitKmh`, `operationalRestrictionKmh?` | `vEff: number` (Kmh) | Throws if any speed constraint is negative | `SIMULATION_RULES.md` §3.1, §11 Test Vector 1 |
| 8 | Depot | Depot Entity & Physical Limits | Manages depot asset with stabling capacity, maintenance repair bays, and facility tier | `stationId`, `fleetCapacity`, `maintenanceSlots`, `maintenanceLevelCapability`, `dailyOperatingCost` | `Depot` object | Stabling over capacity rejected; excess maintenance queued | `DOMAIN_MODEL.md` §5.4, `ECONOMY_RULES.md` §5.2 |
| 9 | Depot | Depot Maintenance Slot Allocator | Manages concurrent repair bay usage and routes excess jobs to FIFO queue | `activeJobs: number`, `maintenanceSlots: number`, `jobLevel: MaintenanceCapability` | `AllocationResult` (`IN_PROGRESS` or `QUEUED`) | Rejects if depot lacks required capability tier | `SIMULATION_RULES.md` §7.1, §7.2 |
| 10 | Route / Sim | Segment Runtime Estimator | Computes non-stop transit time with acceleration/deceleration allowances | `distanceKm: number`, `effectiveSpeedKmh: number`, `isFreight: boolean` | `transitMinutes: number` | Throws if `effectiveSpeedKmh <= 0` | `SIMULATION_RULES.md` §3.2 |

---

## 9. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Route Opening Cost | `stationCount = 1`, `distanceKm = 50` | Invalid: a route requires at least 2 distinct stations (origin and destination). Must throw `InvalidRouteError` or return validation failure. |
| 2 | Route Opening Cost | `stationCount = 5`, `distanceKm = 160` (Gambir – Bandung) | Evaluates exact formula: $50\text{M} + 5 \times 15\text{M} + 160 \times 250\text{k} =$ **`165,000,000 IDR`**. Exact integer match. |
| 3 | Route Opening Cost | `distanceKm = 0` or negative | Invalid: corridor distance must be strictly positive ($> 0$). |
| 4 | TAC Calculator | `distanceKm = 0`, `weight = 350 tons` | Zero distance yields zero charge: **`0 IDR`**. |
| 5 | TAC Calculator | `distanceKm = 160`, `weight = 350 tons` (Gambir – Bandung) | Surcharge: $5,000 \times 3.5 = 17,500$. Rate: $25,000 + 17,500 = 42,500$. Total: $160 \times 42,500 =$ **`6,800,000 IDR`**. Exact match. |
| 6 | TAC Calculator | `totalConsistWeightTons = 0` or negative | Invalid: physical train consist cannot have non-positive mass. Throws error. |
| 7 | TAC Calculator | Fractional consist weight (e.g., 345.5 tons, 160 km) | Rate: $25,000 + (5000 \times 345.5 / 100) = 42,275\text{ IDR/km}$. Total: $160 \times 42,275 =$ **`6,764,000 IDR`**. Integer rounding enforced via `Math.round`. |
| 8 | Effective Speed | `trainMax = 120`, `consist = 100`, `track = 110`, `TSR = 80` | Resolves to strict minimum: $\min(120, 100, 110, 80) =$ **`80 km/h`** (SIMULATION_RULES §11 Test Vector 1). |
| 9 | Effective Speed | `trainMax = 120`, `consist = 100`, `track = 110`, `TSR = undefined` | When TSR is omitted, TSR is treated as $\infty$. Result: $\min(120, 100, 110) =$ **`100 km/h`**. |
| 10 | Effective Speed | `operationalRestrictionKmh = 0` (Red signal or track blocked) | Resolves to **`0 km/h`**. Train cannot move during this tick. |
| 11 | Effective Speed | Negative speed input (e.g. `trackLimitKmh = -10`) | Invalid: physical velocity limits cannot be negative. Throws `InvalidSpeedConstraintError`. |
| 12 | Depot Capacity | `stablingOccupancy = 6`, `fleetCapacity = 6`, incoming order = 1 unit | Depot stabling full: delivery or parking rejected until units are transferred or depot upgraded. |
| 13 | Depot Maintenance | `activeMaintenanceCount = 3`, `maintenanceSlots = 3`, new job submitted | Bay limit reached: new job status set to `QUEUED` in FIFO waiting queue, condition does not recover until slot frees up. |
| 14 | Depot Capability | Periodic Maintenance (Level 2) requested at Tier 1 Depot (`LEVEL_1_DAILY`) | Rejected: Tier 1 depot lacks Level 2 equipment. Job cannot start; unit must travel to Tier 2 or Tier 3 depot. |
| 15 | Station Platform Invariant | Train consist length 320m calling at station with `maxTrainLengthMeters = 250m` | Validation failure: train length exceeds physical platform capacity. Timetable allocation rejected. |

---

## 10. Architectural Recommendations for Implementation

1. **Package Location:**
   Place world and regulatory domain logic in `packages/network` (as named in `ORIGINAL_REQUEST.md` R4 and `orchestrator_1/plan.md`), importing shared branded types from `@railway/shared` and static catalogs from `@railway/game-data`.
2. **Branded Primitives Usage:**
   - Use `Money` (integer number) for all fees (`Cost_route_open`, `Cost_TAC`).
   - Use `Km` (number) for distances.
   - Use `Kmh` (number) for speeds.
   - Use `Tons` (number) for consist weights.
   - Use `StationId`, `RouteId`, `CompanyId`, `DepotId` branded strings.
3. **Pure Functional Calculators:**
   Export pure standalone functions alongside domain entities:
   - `calculateRouteOpeningCost(input: RouteOpeningCostInput): Money`
   - `calculateTrackAccessCharge(input: TrackAccessChargeInput): Money`
   - `calculateEffectiveSpeedKmh(input: SpeedConstraintInput): number`
4. **Deterministic Vitest Test Coverage (R5):**
   - Provide unit tests validating exact Rupiah arithmetic for the Gambir – Bandung test vectors.
   - Assert all edge cases (zero values, boundary conditions, negative values throwing).
