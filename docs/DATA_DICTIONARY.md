# Railway Network Manager — Data Dictionary & Entity Schema Specification
**Document Version:** 1.0.0  
**Status:** Approved Reference / Data Architecture Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§7, §10, §11, §13, §20, §25, §36, §52)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Packages:** `@railway/game-data`, `database/schema`  

---

## 1. Executive Summary & Data Architecture

This document specifies the exact **data structures, field types, constraints, units, and validation rules** for all entities in *Railway Network Manager — Indonesia*.

Data is strictly divided into two architectural categories (PRD §36):
1. **Static Game Data (`@railway/game-data`):** Version-controlled, immutable catalog files (TypeScript/JSON) containing base specifications, stations, rolling stock catalog, and physical constants.
2. **Dynamic Player State (`database/schema`):** Server-authoritative PostgreSQL database managed via **Drizzle ORM**, recording player company assets, ledger transactions, operations, and simulation snapshots.

---

## 2. Common Units & Branded Primitives

To eliminate unit confusion across packages, the following branded types and primitive units are standard:

| Type / Unit | Base Primitive | Description & Validation Constraint |
| :--- | :--- | :--- |
| `Money` | `number` (Integer) | Currency in Indonesian Rupiah (IDR). No decimals. |
| `Km` | `number` (Float) | Distance in kilometers ($\ge 0.0$). Precision: 2 decimals. |
| `Kmh` | `number` (Integer) | Speed in kilometers per hour ($\ge 0$). |
| `Tons` | `number` (Float) | Weight / payload capacity in metric tons. Precision: 2 decimals. |
| `Meters` | `number` (Float) | Physical length of trains or platforms. |
| `Minutes` | `number` (Integer) | Time duration or minute of day ($0 \dots 1439$). |
| `Percentage` | `number` (Float) | Normalized ratio or percentage ($0.00 \dots 100.00$). |
| `Timestamp` | `string` (ISO-8601) | Wall-clock creation/update time in UTC. |

---

## 3. Static Game Data Catalogs (`@railway/game-data`)

### 3.1 Station Catalog (`stations.json`)

Defines existing railway stations across the Indonesian network.

```typescript
export interface StationCatalogEntry {
  /** Unique station identifier (e.g., "STN_GMR_GAMBIR") */
  id: string;
  /** Official 3-letter station telegram code */
  code: string; // Length: 2-4 uppercase characters
  /** Display name of the station */
  name: string;
  /** Administrative DAOP / Regional division */
  region: 'DAOP_1_JAKARTA' | 'DAOP_2_BANDUNG' | 'DAOP_3_CIREBON' | 'DAOP_4_SEMARANG' | 'DAOP_5_PURWOKERTO' | 'DAOP_6_YOGYAKARTA' | 'DAOP_7_MADIUN' | 'DAOP_8_SURABAYA' | 'DAOP_9_JEMBER';
  /** Geographic coordinates for MapLibre rendering */
  coordinates: {
    lat: number; // -11.0 to 6.0
    lng: number; // 95.0 to 141.0
  };
  /** Number of physical platform tracks */
  platformCount: number; // Min: 1, Max: 16
  /** Longest train composition permitted (meters) */
  maxTrainLengthMeters: number; // Typical: 250m to 450m
  /** Station facilities and connectivity */
  facilities: {
    hasCargoTerminal: boolean;
    hasDepotConnection: boolean;
    hasExecutiveLounge: boolean;
  };
  /** Baseline passenger generation profile */
  demandProfile: {
    baseDailyDemand: number;
    commuterShare: number; // 0.0 to 1.0
    businessShare: number; // 0.0 to 1.0
    touristShare: number;  // 0.0 to 1.0
  };
  provenance: DataProvenance;
}
```

### 3.2 Rolling Stock Catalog (`rolling-stock-specs.json`)

Defines all purchasable locomotives, passenger coaches, and freight wagons.

```typescript
export interface RollingStockSpecCatalogEntry {
  /** Unique specification ID (e.g., "SPEC_LOCO_CC206") */
  id: string;
  /** Public commercial name */
  modelName: string;
  /** Primary equipment category */
  category: 'LOCOMOTIVE' | 'PASSENGER_CARRIAGE' | 'POWER_GENERATOR_CAR' | 'DINING_CAR' | 'BAGGAGE_CAR' | 'PARCEL_CAR' | 'CONTAINER_WAGON' | 'COMMODITY_WAGON';
  /** Passenger class (if passenger carriage) */
  passengerClass?: 'ECONOMY' | 'EXECUTIVE' | 'LUXURY';
  /** Structural construction category */
  buildType: 'BASIC_STEEL' | 'CONVENTIONAL_STEEL' | 'MODERN_STEEL' | 'STAINLESS_STEEL';
  /** Bogie mechanical speed tier */
  bogieType: 'LOW_SPEED_100' | 'MEDIUM_SPEED_120' | 'HIGH_SPEED_160';
  /** Maximum safe operational speed (km/h) */
  maximumSpeedKmh: number;
  /** Seated passenger capacity */
  passengerCapacity: number; // 0 for freight/loco
  /** Cargo payload limit in metric tons */
  cargoCapacityTons: number; // 0 for passenger
  /** Empty tare weight in metric tons */
  tareWeightTons: number;
  /** Overall length over couplers (meters) */
  lengthMeters: number;
  /** Traction power source */
  energyType: 'DIESEL_ELECTRIC' | 'ELECTRIC_AC' | 'ELECTRIC_DC' | 'HYBRID';
  /** Consumption rate at cruising speed (L/km or kWh/km) */
  energyConsumptionRate: number;
  /** Capital purchase cost in IDR */
  basePurchaseCost: Money;
  /** Standard factory production lead time (simulated days) */
  standardLeadTimeDays: number;
  /** Maintenance interval before mandatory Level 2 service (km) */
  standardMaintenanceIntervalKm: number;
  /** Expected structural lifespan in simulated days */
  expectedServiceLifeDays: number;
  provenance: DataProvenance;
}
```

---

## 4. Dynamic Player State (PostgreSQL / Drizzle Schema)

All dynamic player state is persisted with foreign key constraints and transactional integrity.

```
┌────────────────────────────────────────────────────────┐
│                      COMPANIES                         │
│  (id, user_id, name, cash_balance, reputation, stage)  │
└───┬─────────────┬─────────────┬─────────────┬──────────┘
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────────────┐
│ DEPOTS │   │ FLEET  │   │ ROUTES │   │  TRANSACTIONS  │
└───┬────┘   └───┬────┘   └───┬────┘   └────────────────┘
    │            │            │
    ▼            ▼            ▼
┌────────┐   ┌────────┐   ┌────────┐
│ MAINT_ │   │ COMPOSI│   │ TIMETA │
│  JOBS  │   │  TIONS │   │  BLES  │
└────────┘   └────────┘   └────────┘
```

### 4.1 Table: `companies`
Represents the player's railway enterprise.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, `gen_random_uuid()` | Company unique identifier |
| `user_id` | `VARCHAR(64)` | Not Null, Unique, Indexed | Authentication user mapping |
| `name` | `VARCHAR(100)`| Not Null | Registered company display name |
| `cash_balance` | `BIGINT` | Not Null, Default: 100000000000 | Current liquid cash in IDR |
| `reputation` | `NUMERIC(4,3)`| Not Null, Default: 0.750 | Public reputation score ($0.0 \dots 1.0$) |
| `campaign_stage`| `SMALLINT` | Not Null, Default: 0 | Progression stage ($0 \dots 10$) |
| `created_at` | `TIMESTAMPTZ`| Not Null, `NOW()` | Company creation timestamp |
| `updated_at` | `TIMESTAMPTZ`| Not Null, `NOW()` | Last state persistence timestamp |

### 4.2 Table: `depots`
Physical operational bases owned or leased by the company.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Depot unique identifier |
| `company_id` | `UUID` | Foreign Key `companies(id)` | Owning company |
| `station_id` | `VARCHAR(64)`| Not Null | Nearby linked station |
| `name` | `VARCHAR(100)`| Not Null | e.g., "Depo Cipinang", "Depo Sidotopo" |
| `tier` | `SMALLINT` | Not Null, Default: 1 | Facility level ($1 \dots 3$) |
| `fleet_capacity` | `INTEGER` | Not Null | Maximum stabled rolling stock units |
| `maintenance_slots`| `INTEGER` | Not Null | Concurrent repair bay count |
| `created_at` | `TIMESTAMPTZ`| Not Null, `NOW()` | Registration date |

### 4.3 Table: `rolling_stock_units`
Individual physical locomotives, carriages, and wagons.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Physical unit unique identifier |
| `company_id` | `UUID` | Foreign Key `companies(id)` | Owning company |
| `spec_id` | `VARCHAR(64)`| Not Null | Static catalog reference ID |
| `serial_number` | `VARCHAR(50)`| Not Null, Unique | Registration (e.g., "CC206-13-01") |
| `home_depot_id` | `UUID` | Foreign Key `depots(id)` | Assigned maintenance depot |
| `current_depot_id`| `UUID` | Foreign Key `depots(id)` | Current physical location |
| `condition_pct` | `NUMERIC(5,2)`| Not Null, Default: 100.00 | Mechanical wear ($0.00 \dots 100.00$) |
| `odometer_km` | `NUMERIC(10,2)`| Not Null, Default: 0.00 | Total kilometers traveled |
| `km_since_service`| `NUMERIC(10,2)`| Not Null, Default: 0.00 | Distance since last Level 2 service |
| `status` | `VARCHAR(20)`| Not Null | `AVAILABLE`, `ASSIGNED`, `IN_MAINTENANCE` |
| `created_at` | `TIMESTAMPTZ`| Not Null, `NOW()` | Acquisition date |

### 4.4 Table: `procurement_orders`
Manufacturing and delivery orders placed with rolling stock factories.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Order unique identifier |
| `company_id` | `UUID` | Foreign Key `companies(id)` | Ordering company |
| `spec_id` | `VARCHAR(64)`| Not Null | Catalog specification ID |
| `quantity` | `INTEGER` | Not Null, Check $> 0$ | Number of units ordered |
| `unit_cost` | `BIGINT` | Not Null | Unit purchase price in IDR |
| `total_cost` | `BIGINT` | Not Null | Total order cost in IDR |
| `delivery_depot_id`| `UUID`| Foreign Key `depots(id)` | Target destination depot |
| `ordered_tick` | `BIGINT` | Not Null | Simulation tick when order placed |
| `delivery_tick`| `BIGINT` | Not Null | Simulation tick for scheduled delivery |
| `status` | `VARCHAR(20)`| Not Null | `ORDERED`, `IN_PRODUCTION`, `TESTING`, `DELIVERED`, `COMMISSIONED` |

### 4.5 Table: `routes`
Commercial operating corridors.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Route unique identifier |
| `company_id` | `UUID` | Foreign Key `companies(id)` | Operating company |
| `code` | `VARCHAR(50)`| Not Null | Commercial code (e.g., "RT-BDG-GMR") |
| `name` | `VARCHAR(100)`| Not Null | e.g., "Parahyangan Corridor" |
| `origin_station_id` | `VARCHAR(64)`| Not Null | First departure station |
| `destination_station_id`| `VARCHAR(64)`| Not Null | Final terminus station |
| `station_sequence`| `JSONB` | Not Null | Ordered array of Station IDs |
| `distance_km` | `NUMERIC(8,2)`| Not Null | Total corridor distance |
| `status` | `VARCHAR(20)`| Not Null | `PERMIT_GRANTED`, `SUSPENDED` |

### 4.6 Table: `timetable_slots`
Recurring operational schedules.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Slot unique identifier |
| `route_id` | `UUID` | Foreign Key `routes(id)` | Assigned route corridor |
| `composition_id` | `UUID` | Foreign Key `train_compositions(id)` | Assigned train consist |
| `departure_minute`| `SMALLINT` | Not Null, $0 \dots 1439$ | Daily departure time |
| `arrival_minute` | `SMALLINT` | Not Null, $0 \dots 1439$ | Scheduled arrival time |
| `operating_days` | `SMALLINT[]` | Not Null | Days of week ($0=\text{Sun} \dots 6=\text{Sat}$) |
| `is_active` | `BOOLEAN` | Not Null, Default: true | Current operational status |

### 4.7 Table: `financial_transactions`
The immutable double-entry ledger.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Transaction identifier |
| `company_id` | `UUID` | Foreign Key `companies(id)`, Indexed | Company account |
| `tick` | `BIGINT` | Not Null, Indexed | Simulation tick of occurrence |
| `category` | `VARCHAR(40)`| Not Null, Indexed | Enum category (e.g., `REV_TICKETS`) |
| `amount` | `BIGINT` | Not Null | Signed integer Rupiah |
| `balance_after` | `BIGINT` | Not Null | Snapshot cash balance after entry |
| `reference_id` | `VARCHAR(64)`| Nullable | Linked service/order/depot ID |
| `description` | `VARCHAR(255)`| Not Null | Human-readable explanation |
| `created_at` | `TIMESTAMPTZ`| Not Null, `NOW()` | Wall-clock recording timestamp |

---

## 5. Data Migration & Versioning Strategy

* **Tooling:** Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`).
* **Seeding:** Static catalog files in `packages/game-data` are loaded during system bootstrap. They are strictly read-only and never modified at runtime.
* **Schema Evolution:** All future database modifications must be additive (nullable new fields or default values) to prevent breaking savegame compatibility.
