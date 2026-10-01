# Railway Network Manager — API Specification & Server Contracts
**Document Version:** 1.0.0  
**Status:** Approved Reference / Communication Architecture Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§30.5, §32, §33, §45, §47)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Package:** `apps/api` (NestJS)  

---

## 1. Executive Summary & Communication Principles

This document specifies the **REST API endpoints, WebSocket event streams, Zod request/response validation schemas, and security contracts** connecting clients (Web Next.js and Mobile Expo) to the NestJS backend application.

### Core Architectural Rules
1. **Server-Authoritative Commands (PRD §47):** The client never dictates state outcomes (e.g., ticket revenue, mission completion, cash balances). The client submits *intent commands* (e.g., `OrderRollingStockCommand`); the backend validates invariants and applies state transitions.
2. **Stateless REST + Stateful Simulation Streams:** Standard operations follow REST semantics. Live simulation ticks and operational alerts are broadcast via authenticated WebSockets.
3. **Strict Schema Validation (PRD §30.5):** All incoming HTTP request payloads are validated via shared Zod schemas before reaching domain handlers.
4. **RFC 7807 Problem Details:** All API errors adhere to the standardized Problem Details specification.

---

## 2. Standard Error & Response Envelope

### 2.1 Success Envelope
```typescript
export interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: string; // ISO-8601
}
```

### 2.2 Error Envelope (RFC 7807 Standard)
```typescript
export interface ApiErrorResponse {
  readonly success: false;
  readonly type: string;        // URI identifier for error type
  readonly title: string;       // Short human-readable summary
  readonly status: number;      // HTTP status code
  readonly detail: string;      // Detailed explanation
  readonly instance: string;    // Request endpoint path
  readonly invalidParams?: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
  }>;
}
```

---

## 3. REST Endpoints Specification

### 3.1 Company & Profile Management

#### `POST /api/v1/company`
Creates the player's railway enterprise with initial capital endowment.
* **Headers:** `Authorization: Bearer <JWT>`
* **Request Body (Zod):**
  ```typescript
  export const CreateCompanySchema = z.object({
    name: z.string().min(3).max(60),
    headquartersStationId: z.string(),
  });
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c7a840e6-e069-42b7-a34c-cfb7db0a0001",
      "name": "Argo Pasundan Express",
      "cashBalance": 100000000000,
      "reputation": 0.75,
      "campaignStage": 0
    }
  }
  ```

#### `GET /api/v1/company`
Returns current financial and operational snapshot.
* **Response (200 OK):** Current company entity, total active fleet count, running routes, and liquid balance.

---

### 3.2 Network & Route Management

#### `GET /api/v1/stations`
Fetches the static list of operational stations on Pulau Jawa with geographic coordinates and facilities.
* **Query Params:** `region?: string`
* **Response (200 OK):** Array of `StationCatalogEntry`.

#### `POST /api/v1/routes`
Applies for and opens a new route concession between stations.
* **Request Body (Zod):**
  ```typescript
  export const OpenRouteSchema = z.object({
    code: z.string().min(3).max(20),
    name: z.string().min(3).max(100),
    originStationId: z.string(),
    destinationStationId: z.string(),
    intermediateStationIds: z.array(z.string()),
    serviceType: z.enum(['LOCAL', 'SEMI_EXPRESS', 'EXPRESS', 'INTERCITY']),
  });
  ```
* **Validation & Domain Guards:**
  * Origin and destination stations must be connected in the track topology.
  * Player must possess sufficient cash to cover $\text{Cost}_{\text{route\_open}}$.
* **Response (201 Created):** Created `Route` entity and resulting debit transaction.

---

### 3.3 Rolling Stock & Procurement Management

#### `GET /api/v1/catalog/rolling-stock`
Fetches all purchasable locomotive, carriage, and wagon specifications.
* **Response (200 OK):** Array of `RollingStockSpecCatalogEntry`.

#### `POST /api/v1/procurement/orders`
Places a formal manufacturing order with the rolling stock factory.
* **Request Body (Zod):**
  ```typescript
  export const CreateProcurementOrderSchema = z.object({
    specId: z.string(),
    quantity: z.number().int().min(1).max(20),
    targetDepotId: z.string().uuid(),
  });
  ```
* **Domain Guards:**
  * Target depot must exist and be owned by the company.
  * Total order price ($\text{unitCost} \times \text{quantity}$) must not exceed company liquid balance.
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "b1823a31-b66a-4d7a-8f4b-74b88981b002",
      "specId": "SPEC_LOCO_CC206",
      "quantity": 2,
      "totalCost": 64000000000,
      "orderedTick": 1440,
      "deliveryTick": 260640,
      "status": "ORDERED"
    }
  }
  ```

#### `POST /api/v1/fleet/compositions`
Assembles locomotives and carriages into an operational train consist.
* **Request Body (Zod):**
  ```typescript
  export const CreateCompositionSchema = z.object({
    name: z.string().min(3).max(60),
    locomotiveUnitId: z.string().uuid(),
    carriageUnitIds: z.array(z.string().uuid()).min(1),
    powerCarUnitId: z.string().uuid().optional(),
    diningCarUnitId: z.string().uuid().optional(),
  });
  ```
* **Domain Guards:**
  * All referenced units must be in `AVAILABLE` status and stabled at the same depot.
  * Hotel power invariants (Air-conditioned coaches require Power Car or HEP loco).
  * Consist length must not exceed system track limits ($450\text{m}$).

---

### 3.4 Timetable & Service Operations

#### `POST /api/v1/timetable/slots`
Creates a recurring daily or weekly scheduled service.
* **Request Body (Zod):**
  ```typescript
  export const CreateTimetableSlotSchema = z.object({
    routeId: z.string().uuid(),
    compositionId: z.string().uuid(),
    departureMinuteOfDay: z.number().int().min(0).max(1439),
    operatingDays: z.array(z.number().int().min(0).max(6)).min(1),
    fareEconomyPerKm: z.number().int().min(250).max(900).optional(),
    fareExecutivePerKm: z.number().int().min(800).max(2500).optional(),
  });
  ```
* **Domain Guards:**
  * Composition must not have overlapping timetable slots that violate minimum turnaround times.
* **Response (201 Created):** Created `TimetableSlot` entity.

---

### 3.5 Depot & Maintenance Operations

#### `POST /api/v1/depots/:id/maintenance`
Queues a degraded rolling stock unit for depot inspection or overhaul.
* **Request Body (Zod):**
  ```typescript
  export const ScheduleMaintenanceSchema = z.object({
    unitId: z.string().uuid(),
    type: z.enum(['PREVENTIVE', 'PERIODIC', 'OVERHAUL']),
  });
  ```
* **Domain Guards:**
  * Unit must be physically located at this depot.
  * Depot must possess appropriate maintenance level capability.
* **Response (200 OK):** Scheduled `MaintenanceJob` with estimated completion tick.

---

### 3.6 Simulation Controls (PRD §35)

#### `POST /api/v1/simulation/speed`
Controls the playback rate of the discrete simulation engine.
* **Request Body (Zod):**
  ```typescript
  export const SetSimulationSpeedSchema = z.object({
    speed: z.enum(['PAUSED', '1X', '2X', '4X', '8X']),
  });
  ```

#### `POST /api/v1/simulation/step`
Steps the simulation forward by exactly one tick when in `PAUSED` mode (used for debugging and deterministic testing).

---

## 4. WebSocket Event Streams (`/ws/simulation`)

Clients establish a persistent WebSocket connection authenticated via Bearer token query parameter: `ws://localhost:3001/ws/simulation?token=<JWT>`.

### 4.1 Broadcast Event Payloads

#### Event: `simulation:tick`
Emitted every simulated minute.
```typescript
export interface WsSimulationTickPayload {
  readonly tick: number;
  readonly day: number;
  readonly minuteOfDay: number;
  readonly wallClockSpeed: 'PAUSED' | '1X' | '2X' | '4X' | '8X';
}
```

#### Event: `operations:service_update`
Emitted when a train moves between stations, departs, or encounters delays.
```typescript
export interface WsServiceUpdatePayload {
  readonly serviceRunId: string;
  readonly compositionId: string;
  readonly routeCode: string;
  readonly currentStationCode: string;
  readonly nextStationCode: string;
  readonly status: 'BOARDING' | 'IN_TRANSIT' | 'DWELL' | 'COMPLETED';
  readonly delayMinutes: number;
  readonly loadFactorPct: number;
}
```

#### Event: `economy:transaction_settled`
Emitted immediately when ticket revenue, fuel costs, or maintenance fees are booked.
```typescript
export interface WsTransactionPayload {
  readonly transactionId: string;
  readonly category: string;
  readonly amount: number;
  readonly newCashBalance: number;
  readonly description: string;
}
```

#### Event: `operations:incident_alert`
Emitted when an unexpected operational event occurs (e.g., breakdown, signal delay, overcrowding).

---

## 5. Security & Rate Limiting (PRD §47)

* **Authentication:** Stateless JSON Web Tokens (RS256 signed).
* **Rate Limiting:**
  * Public endpoints: 60 requests/minute per IP.
  * Command endpoints (`POST /api/v1/*`): 120 requests/minute per user.
* **Sanitization:** All string inputs sanitized against XSS and SQL injection (handled natively by Drizzle parameterized queries).
