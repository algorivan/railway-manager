# Railway Network Manager — Indonesia
## Product Requirements Document (PRD) & AI Vibe-Coding Specification

**Document Version:** 0.1  
**Product Status:** Pre-Production / Architecture Definition  
**Target Platform:** Web-first, Android/iOS-ready  
**Primary Game Model:** Model A — Railway Operator  
**Setting:** Indonesia, initial geographic scope Pulau Jawa  
**Development Approach:** AI-assisted / Vibe Coding  
**Primary Language:** TypeScript

---

# 1. Product Overview

## 1.1 Product Vision

Railway Network Manager adalah game management simulation di mana pemain berperan sebagai pengelola perusahaan operator kereta api.

Pemain tidak membangun jaringan rel dari nol. Infrastructure railway utama diasumsikan tersedia melalui sistem akses dan regulasi. Fokus pemain adalah:

- merencanakan layanan;
- membuka dan mengelola rute;
- memperoleh rolling stock;
- memesan rolling stock dari industri manufaktur;
- membangun dan mengelola depo;
- mengelola SDM;
- menentukan komposisi kereta;
- mengatur jadwal;
- menetapkan tarif;
- mengelola penumpang;
- mengelola cargo;
- menerima charter;
- melakukan kerja sama B2B;
- mengikuti skema public service/subsidi;
- mengelola maintenance;
- mengoptimalkan fleet;
- menjaga reliability;
- mengelola keuangan;
- mengembangkan network.

Core fantasy:

> "Saya membangun dan mengoperasikan perusahaan kereta api yang sehat secara finansial, reliable, dan mampu berkembang dari operator kecil menjadi operator besar di Pulau Jawa."

---

# 2. Product Principles

## 2.1 Operator, bukan Infrastructure Builder

Core game menggunakan **Model A**.

Pemain terutama mengelola:

- rolling stock;
- route;
- timetable;
- depot;
- workforce;
- passenger service;
- cargo;
- charter;
- contracts;
- finances;
- operations.

Pemain tidak diwajibkan membangun seluruh jaringan rel Jawa.

Infrastructure access dimodelkan melalui:

- route access;
- regulatory requirements;
- track capacity;
- station/platform capacity;
- access fees;
- operational restrictions.

---

## 2.2 Simulation First

Simulation adalah source of truth.

Frontend hanya memvisualisasikan state dan mengirim player actions.

Business rules tidak boleh berada di React component.

---

## 2.3 Decisions Over Decoration

Setiap fitur harus menghasilkan minimal satu meaningful decision.

Contoh fitur yang baik:

- memilih train capacity;
- memilih fare;
- memilih frequency;
- memilih fleet allocation;
- menerima atau menolak cargo contract;
- memilih procurement configuration.

Contoh fitur yang harus dihindari:

- upgrade tanpa trade-off;
- bonus angka arbitrer;
- tombol "collect income" yang tidak mempunyai keputusan;
- progression yang hanya menaikkan angka.

---

## 2.4 Progressive Complexity

Sistem kompleks diperkenalkan secara bertahap.

Urutan:

```text
Route
→ Timetable
→ Passenger Demand
→ Fleet
→ Pricing
→ Maintenance
→ Workforce
→ Procurement
→ Cargo
→ Charter
→ Contracts
→ Government/Public Service
→ Network Optimization
→ Advanced Operations
```

---

# 3. Target Player Experience

## First 10 Minutes

Player memahami:

- perusahaan;
- station;
- route;
- train;
- timetable;
- basic passenger demand.

## First Hour

Player memahami:

- fare;
- capacity;
- load factor;
- revenue;
- operating cost;
- basic maintenance.

## Early Game

Player mulai bertanya:

> "Lebih baik membeli train baru atau menambah frequency?"

## Mid Game

Player menghadapi:

- fleet constraints;
- crew constraints;
- depot constraints;
- procurement lead time;
- route access cost;
- contracts.

## Late Game

Player berpikir:

> "Bagaimana seluruh network saya dapat beroperasi secara optimal?"

---

# 4. Core Game Loop

```text
OBSERVE
  ↓
IDENTIFY PROBLEM / OPPORTUNITY
  ↓
PLAN
  ↓
ALLOCATE CAPITAL & RESOURCES
  ↓
OPERATE
  ↓
SIMULATE
  ↓
MEASURE
  ↓
OPTIMIZE
  ↓
EXPAND
  ↓
NEW PROBLEM / OPPORTUNITY
  ↺
```

---

# 5. Business Model Simulation

## 5.1 Revenue Sources

### Passenger

- Economy;
- Executive;
- Luxury.

### Charter

- corporate charter;
- school/university charter;
- tourism charter;
- event charter;
- private group charter.

### Cargo

- parcel/logistics;
- container;
- industrial goods;
- commodity;
- specialized freight.

### Contract

- B2B logistics;
- industrial supply;
- recurring cargo;
- service contracts.

### Government/Public Service

- subsidized passenger service;
- public service contracts;
- service obligations.

### Future Ancillary

Late-game only:

- station retail;
- advertising;
- parking;
- premium lounge;
- commercial partnerships.

---

# 6. Passenger Service

## 6.1 Passenger Classes

### Economy

Characteristics:

- high potential demand;
- lower fare;
- high capacity;
- high price sensitivity.

### Executive

Characteristics:

- higher fare;
- lower price sensitivity;
- higher comfort expectation;
- reliability and travel time are important.

### Luxury

Characteristics:

- niche demand;
- premium fare;
- high service expectation;
- low capacity;
- prestige-oriented product.

The classes must not be hard-coded into UI logic. They are game-data entities.

---

# 7. Rolling Stock

## 7.1 Procurement Principle

Player cannot simply press "Buy Train".

The flow is:

```text
Demand Forecast
↓
Fleet Planning
↓
Select Specification
↓
Place Procurement Order
↓
Manufacturing Lead Time
↓
Testing / Commissioning
↓
Delivery to Depot
↓
Crew / Maintenance Preparation
↓
Available for Service
```

---

## 7.2 Rolling Stock Types

Minimum categories:

- locomotive;
- passenger carriage;
- economy carriage;
- executive carriage;
- luxury carriage;
- generator/power car;
- dining/restoration car;
- baggage car;
- parcel car;
- container wagon;
- commodity wagon;
- specialized freight wagon.

---

## 7.3 Rolling Stock Attributes

Every rolling stock entity should support configurable attributes such as:

```text
purchase_cost
build_type
bogie_type
maximum_speed
capacity
weight
length
energy_type
energy_consumption
maintenance_cost
maintenance_interval
reliability
service_life
procurement_lead_time
compatibility
```

---

# 8. Build and Bogie System

Build specification should affect simulation rather than acting as cosmetic rarity.

Potential build categories:

- basic/older construction;
- conventional steel;
- modern steel;
- stainless steel.

Potential bogie categories:

- low-speed;
- medium-speed;
- high-speed.

Bogie and build may affect:

- maximum permitted speed;
- ride quality;
- maintenance;
- acquisition cost;
- durability;
- compatibility.

Do not invent real-world technical limits unless they are explicitly researched and documented.

The simulation should initially use abstract game parameters.

---

# 9. Speed Model

Actual operating speed is constrained by multiple factors.

```text
Actual Speed
=
MIN(
    Train Maximum Speed,
    Rolling Stock Limit,
    Track Speed Limit,
    Operational Restriction
)
```

The architecture must keep these constraints modular.

---

# 10. Procurement System

## 10.1 Procurement Order

A procurement order should include:

```text
order_id
company_id
supplier_id
rolling_stock_spec
quantity
unit_cost
total_cost
order_date
expected_delivery_date
delivery_depot_id
status
```

Possible status:

```text
DRAFT
QUOTED
ORDERED
IN_PRODUCTION
TESTING
IN_TRANSIT
DELIVERED
COMMISSIONED
CANCELLED
```

---

## 10.2 Manufacturing Lead Time

Procurement must take simulated time.

Example:

```text
Order: Month 1
Production: Month 1–10
Testing: Month 11
Delivery: Month 12
Commissioning: Month 13
```

Exact values belong in configurable game data.

---

# 11. Depot System

Depot is a physical operational asset.

Depot attributes:

```text
fleet_capacity
maintenance_slots
stabling_capacity
crew_capacity
maintenance_capability
rolling_stock_compatibility
operating_cost
```

Depot upgrades can improve:

- fleet capacity;
- maintenance throughput;
- workforce capacity;
- turnaround efficiency;
- specialized service capability.

---

# 12. Workforce System

Every operating network requires human resources.

Minimum workforce categories:

- driver/masinis;
- traction support;
- conductor/kondektur;
- onboard service;
- engineer;
- technician;
- depot staff;
- cleaning;
- operations/dispatch;
- station staff;
- customer service;
- security;
- management/admin.

Not every category must be exposed in the first playable version.

---

## 12.1 Workforce Cost

Avoid a simplistic:

```text
1 train = X employees
```

Instead use workload.

Concept:

```text
Required Crew Hours
=
Service Workload
×
Train Type Complexity
×
Operating Pattern
```

Then:

```text
Required Crew Hours
vs
Available Crew Hours
```

This supports scalable simulation.

---

## 12.2 Training

Potential systems:

- recruitment;
- basic training;
- route familiarization;
- rolling-stock/type qualification;
- refresher training.

Training must be configurable and should not become mandatory micro-management in the MVP.

---

# 13. Route System

A route contains:

```text
origin
destination
station_sequence
distance
estimated_runtime
service_type
access_constraints
station_constraints
demand_profile
operating_cost_profile
```

Service types:

- local;
- semi-express;
- express;
- intercity.

---

# 14. Route Opening

Opening a route is an investment decision.

Potential costs:

### Initial

- access/regulatory preparation;
- station preparation;
- depot preparation;
- crew preparation;
- rolling-stock positioning;
- marketing;
- operational setup.

### Recurring

- infrastructure/access fees;
- station-related fees;
- crew;
- maintenance;
- energy/fuel;
- service;
- rolling-stock ownership/depreciation.

The game should use an abstraction such as:

> Railway Access & Regulatory Fees

until real-world institutional arrangements have been verified.

Do not hard-code the assumption that every payment literally goes to a specific government institution without validated source data.

---

# 15. Timetable System

Timetable is a core gameplay system.

It must support:

- departure time;
- arrival time;
- dwell time;
- turnaround;
- frequency;
- peak/off-peak service;
- crew constraints;
- rolling-stock circulation.

Future:

- platform conflicts;
- track conflicts;
- cascading delays.

---

# 16. Passenger Demand

Demand should be generated from:

```text
Base Demand
×
Time Factor
×
Fare Elasticity
×
Frequency Effect
×
Service Quality
×
Economic Activity
×
Tourism
×
Events
×
Reputation
```

Exact formulas belong in `SIMULATION_RULES.md`.

The first implementation should use simple transparent formulas before introducing advanced models.

---

# 17. Passenger Segmentation

Minimum segments:

- commuter;
- student;
- business;
- tourist;
- family.

Each segment can have different:

- price sensitivity;
- time sensitivity;
- comfort preference;
- frequency preference;
- reliability expectation.

---

# 18. Load Factor

Core metric:

```text
Load Factor
=
Passengers Served
/
Available Passenger Capacity
```

Load factor should influence:

- revenue;
- passenger satisfaction;
- opportunity detection;
- fleet planning.

Avoid making 100% load factor automatically optimal.

Overcrowding may negatively affect service quality.

---

# 19. Cargo System

Cargo is a separate business model from passenger service.

Cargo flow:

```text
Customer
↓
Contract
↓
Cargo Requirement
↓
Terminal Requirement
↓
Wagon Requirement
↓
Procurement / Allocation
↓
Operation
↓
Delivery
↓
Payment
```

Cargo types:

- parcel;
- logistics;
- container;
- industrial;
- commodity;
- specialized cargo.

---

# 20. B2B Contract System

A contract should include:

```text
contract_id
customer_id
cargo_type
origin
destination
volume_requirement
frequency
duration
payment_model
sla
penalty
required_rolling_stock
required_terminal
status
```

The player must evaluate:

```text
Contract Value
vs
CAPEX
+
OPEX
+
Capacity Requirement
+
Risk
+
Opportunity Cost
```

---

# 21. Charter System

Charter is an opportunistic service.

A charter request may include:

```text
client
passenger_count
route
date
service_class
required_train_composition
service_requirements
offered_price
```

Player decides whether to accept.

Charter should create an opportunity-cost decision when the fleet is already allocated.

---

# 22. Government / Public Service Contract

Government/public-service content should be represented as contractual obligations.

Example abstraction:

```text
Maximum Passenger Fare
Minimum Frequency
Minimum Capacity
Minimum Reliability
Contract Duration
Compensation
Penalty
```

Player receives compensation in exchange for meeting obligations.

This is not a free-money mechanic.

The player must calculate:

```text
Contract Compensation
-
Operating Cost
-
Compliance Cost
-
Penalty Risk
=
Expected Contract Contribution
```

---

# 23. Maintenance

Maintenance must distinguish:

- preventive;
- corrective;
- deferred.

Fleet condition affects:

- reliability;
- breakdown probability;
- maintenance cost;
- availability.

Do not create arbitrary failures solely to punish players.

---

# 24. Reliability vs Safety

These are separate concepts.

### Reliability

Ability to operate according to plan.

### Safety

Compliance with safe operational constraints.

For the MVP, safety should primarily be represented through operational constraints rather than detailed accident simulation.

---

# 25. Finance

Minimum financial system:

### Revenue

- passenger;
- cargo;
- charter;
- contract;
- government compensation.

### OPEX

- workforce;
- energy/fuel;
- maintenance;
- depot;
- station/access;
- service;
- administration.

### CAPEX

- rolling stock;
- depot;
- upgrades;
- equipment.

### Financing

Future:

- loans;
- leasing;
- interest;
- working capital.

---

# 26. Mission and Progression System

Mission is the primary guided progression layer.

Mission structure:

```text
Mission
├── prerequisites
├── objectives
├── unlocks
├── rewards
└── narrative/context
```

Mission objective types should be data-driven:

```text
PASSENGERS_TRANSPORTED
REVENUE_REACHED
PROFIT_MARGIN
LOAD_FACTOR
OTP
FLEET_COUNT
ROUTE_COUNT
CONTRACT_COMPLETED
PROCUREMENT_COMPLETED
DEPOT_BUILT
CASH_BALANCE
```

---

# 27. Campaign Progression

Core progression:

```text
Stage 0 — First Service
Stage 1 — Local Operator
Stage 2 — Regional Operator
Stage 3 — Regional Network
Stage 4 — Intercity Operator
Stage 5 — Growing Railway
Stage 6 — Major Operator
Stage 7 — National Railway
Stage 8 — Integrated Operator
Stage 9 — Railway Group
Stage 10 — Master Network
```

New mechanics should be introduced progressively.

---

# 28. Gamification Principles

Gamification should guide development rather than manipulate players.

Every mission should answer:

1. What should the player learn?
2. What decision should the player make?
3. What new system becomes available?
4. What consequence demonstrates the system?
5. What new goal follows?

Core loop:

```text
Goal
→ Problem
→ Decision
→ Consequence
→ Progress
→ New Goal
```

---

# 29. Monetization Principles

Monetization must not invalidate the simulation.

Avoid:

- pay-to-win;
- direct purchase of profitability;
- instant economic advantage;
- paid reduction of simulation difficulty;
- artificial waiting followed by payment.

Preferred monetization:

- scenario packs;
- expansion packs;
- historical scenarios;
- regional expansions;
- cosmetic liveries;
- company customization;
- optional premium campaigns.

The base simulation must remain playable without purchasing competitive advantage.

---

# 30. Technology Stack

## 30.1 Core

**TypeScript** is the primary language.

Reason:

- shared language across backend/frontend/mobile;
- excellent AI coding ecosystem;
- strong type safety;
- shared domain packages;
- easier code generation and validation.

---

## 30.2 Web

- Next.js
- React
- Tailwind CSS
- MapLibre GL JS

---

## 30.3 Mobile

- Expo
- React Native
- NativeWind or platform-native styling

The mobile application should reuse:

- API contracts;
- shared types;
- domain schemas;
- authentication;
- game state;
- simulation results.

It should not necessarily reuse desktop UI components.

---

## 30.4 Backend

Recommended:

- NestJS;
- PostgreSQL;
- Drizzle ORM;
- Redis;
- BullMQ;
- WebSocket.

Backend architecture:

> Modular Monolith.

Do not start with microservices.

---

## 30.5 Validation and API

- Zod;
- OpenAPI;
- shared TypeScript types.

API contracts must be explicit.

---

## 30.6 Testing

- Vitest — unit/domain/simulation tests;
- Playwright — web E2E;
- integration tests for backend modules.

Simulation logic must have deterministic tests.

---

# 31. Monorepo Structure

Recommended:

```text
railway-manager/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── mobile/
│
├── packages/
│   ├── simulation/
│   ├── economy/
│   ├── fleet/
│   ├── procurement/
│   ├── workforce/
│   ├── timetable/
│   ├── demand/
│   ├── contracts/
│   ├── missions/
│   ├── game-data/
│   ├── shared/
│   └── ui/
│
├── database/
├── docs/
│
├── tests/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Use:

- pnpm;
- Turborepo.

---

# 32. Architecture Layers

## Frontend

Responsible for:

- rendering;
- interaction;
- local UI state;
- navigation;
- presentation.

Must not contain authoritative game rules.

---

## API/Application Layer

Responsible for:

- authentication;
- commands;
- authorization;
- validation;
- orchestration;
- persistence;
- player actions.

---

## Domain Layer

Responsible for:

- business rules;
- entities;
- invariants;
- calculations;
- state transitions.

---

## Simulation Layer

Responsible for:

- time progression;
- events;
- demand;
- services;
- operations;
- delays;
- revenue;
- costs;
- maintenance;
- contracts.

---

## Infrastructure Layer

Responsible for:

- PostgreSQL;
- Redis;
- external services;
- queues;
- persistence.

---

# 33. Critical Architecture Rule

The simulation engine must not import:

- React;
- Next.js;
- Expo;
- browser APIs;
- HTTP controllers;
- database implementation.

Correct dependency direction:

```text
Frontend
   ↓
API
   ↓
Application
   ↓
Domain
   ↓
Simulation
```

Infrastructure can implement interfaces required by application/domain.

---

# 34. Simulation Engine

Simulation should be:

- deterministic;
- testable;
- serializable;
- independent from UI;
- independent from database;
- configurable.

Conceptual interface:

```ts
simulateTick(
  state,
  actions,
  config,
  seed
): SimulationResult
```

Same:

```text
state + actions + config + seed
```

should produce the same result.

---

# 35. Time Model

Use discrete simulation rather than frame-by-frame physics.

Potential modes:

```text
PAUSED
1x
2x
4x
8x
```

The engine can use:

- scheduled ticks;
- event queue;
- service events.

Events may include:

```text
DEPARTURE
ARRIVAL
DWELL_COMPLETE
TURNAROUND_COMPLETE
BREAKDOWN
MAINTENANCE_COMPLETE
PROCUREMENT_COMPLETE
CONTRACT_DEADLINE
MISSION_PROGRESS
```

---

# 36. Game Data vs Player State

## Static Game Data

Stored in version-controlled configuration:

- stations;
- rolling stock;
- bogies;
- cargo types;
- passenger classes;
- game parameters.

## Dynamic Player State

Stored in PostgreSQL:

- company;
- cash;
- fleet;
- employees;
- routes;
- contracts;
- procurement orders;
- missions;
- transactions;
- simulation state.

---

# 37. AI/Vibe Coding Development Rules

## Rule 1 — Never ask AI to build the entire game at once.

Bad:

> "Build the entire railway game."

Good:

> "Implement the procurement domain module according to the existing domain contract. Do not modify simulation, frontend, or database schema outside the procurement module."

---

## Rule 2 — Read project documentation first.

Before coding, AI must inspect:

```text
docs/
GAME_DESIGN.md
DOMAIN_MODEL.md
SIMULATION_RULES.md
API_SPEC.md
ARCHITECTURE.md
```

---

## Rule 3 — Modify the smallest possible scope.

AI should avoid unrelated refactoring.

---

## Rule 4 — Never invent game rules.

If a rule is missing:

```text
STOP
→ identify ambiguity
→ propose options
→ wait for approval
```

Do not silently invent business rules.

---

## Rule 5 — Tests before large refactors.

Every simulation rule should have tests.

---

## Rule 6 — Keep game balance in data.

Avoid hard-coding:

```ts
const fare = 50000;
```

Prefer:

```ts
config.passengerClasses.economy.baseFare
```

---

# 38. AI Prompting Protocol

Every implementation prompt should contain:

```text
CONTEXT
TASK
SOURCE OF TRUTH
SCOPE
CONSTRAINTS
EXPECTED FILES
ACCEPTANCE CRITERIA
TEST REQUIREMENTS
NON-GOALS
```

Example:

```text
CONTEXT:
We are developing Railway Network Manager.

TASK:
Implement the procurement order domain.

SOURCE OF TRUTH:
docs/GAME_DESIGN.md
docs/DOMAIN_MODEL.md

SCOPE:
packages/procurement/

CONSTRAINTS:
- TypeScript only
- no UI changes
- no direct database access from domain
- use existing shared schemas
- procurement must support lead time
- delivery must target a depot

ACCEPTANCE CRITERIA:
- player can create procurement order
- order validates required depot
- order has expected delivery date
- order transitions through valid statuses
- invalid state transitions are rejected

TEST:
Add unit tests for all state transitions.

NON-GOALS:
- no frontend
- no payment system
- no multiplayer
```

---

# 39. AI Agent Roles

Recommended logical roles:

### Architecture Agent

Reviews:

- dependencies;
- module boundaries;
- contracts.

### Simulation Agent

Works on:

- simulation;
- economy;
- demand;
- operations.

### Backend Agent

Works on:

- API;
- persistence;
- authentication;
- application services.

### Frontend Agent

Works on:

- dashboard;
- forms;
- tables;
- map;
- visualization.

### Mobile Agent

Works on:

- React Native;
- mobile navigation;
- responsive UX.

### QA Agent

Works on:

- tests;
- regression;
- simulation consistency.

Agents should not override each other's domain rules.

---

# 40. Documentation as AI Memory

The repository must contain:

```text
docs/
├── PRODUCT_PRD.md
├── GAME_DESIGN.md
├── ARCHITECTURE.md
├── DOMAIN_MODEL.md
├── SIMULATION_RULES.md
├── ECONOMY_RULES.md
├── API_SPEC.md
├── UI_SPEC.md
├── MISSION_DESIGN.md
├── MONETIZATION.md
├── DATA_DICTIONARY.md
└── AI_CODING_GUIDE.md
```

These files form the persistent context for AI coding.

---

# 41. Source-of-Truth Hierarchy

When documents conflict:

```text
PRODUCT_PRD
    ↓
GAME_DESIGN
    ↓
DOMAIN_MODEL
    ↓
SIMULATION_RULES
    ↓
API_SPEC
    ↓
IMPLEMENTATION
```

Implementation must not silently redefine product rules.

---

# 42. MVP Scope

The first playable prototype should contain:

## World

- 5–10 stations;
- 1–3 routes;
- basic station demand.

## Fleet

- 1 locomotive family;
- 2–3 passenger carriage types;
- basic train composition.

## Operations

- timetable;
- departures;
- arrivals;
- passenger boarding;
- basic delay.

## Economy

- fare;
- demand;
- revenue;
- basic OPEX;
- cash balance.

## Maintenance

- basic condition;
- maintenance cost;
- availability.

## Workforce

- basic crew requirement;
- payroll.

## Procurement

- order;
- lead time;
- delivery;
- depot assignment.

## Progression

- 3–5 missions.

No cargo, government contract, multiplayer, advanced infrastructure, or monetization is required for the first prototype.

---

# 43. Vertical Slice

The vertical slice should demonstrate:

```text
Company
↓
Route
↓
Fleet
↓
Procurement
↓
Depot
↓
Workforce
↓
Timetable
↓
Passenger Demand
↓
Operation
↓
Revenue
↓
OPEX
↓
Maintenance
↓
Mission
↓
Expansion
```

If this loop is fun and stable, expand the simulation.

---

# 44. Development Phases

## Phase 1 — World & Regulatory Model

Deliver:

- domain entities;
- station;
- route;
- access;
- depot;
- regulatory abstraction.

---

## Phase 2 — Fleet & Procurement

Deliver:

- rolling stock;
- train composition;
- procurement;
- manufacturing lead time;
- depot delivery.

---

## Phase 3 — Workforce

Deliver:

- crew;
- staffing;
- payroll;
- basic qualification.

---

## Phase 4 — Business Model

Deliver:

- passenger;
- cargo;
- charter;
- B2B;
- public-service contracts.

---

## Phase 5 — Infrastructure & Operations

Deliver:

- timetable;
- track constraints;
- station capacity;
- delays;
- energy;
- maintenance.

---

## Phase 6 — Gamification

Deliver:

- campaign;
- mission engine;
- milestones;
- unlocks;
- achievements.

---

## Phase 7 — Monetization

Deliver:

- content entitlements;
- scenario packs;
- expansion framework;
- cosmetic system.

Monetization must not be allowed to distort core simulation.

---

# 45. Web-to-Mobile Strategy

The web application is the first client.

Mobile should share:

- backend;
- authentication;
- database;
- simulation;
- domain schemas;
- API contracts.

Mobile should not require a rewrite of the simulation.

Architecture:

```text
                 BACKEND
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
       WEB APP            MOBILE APP
       Next.js            Expo/RN
```

The UX may differ significantly.

---

# 46. Deployment Strategy

Initial development:

```text
Local
├── PostgreSQL
├── Redis
└── API
```

Docker Compose should provide reproducible local development.

Later:

```text
Web Hosting
+
API Hosting
+
Managed PostgreSQL
+
Managed Redis
+
Object Storage
```

The exact cloud provider is intentionally not locked in during PRD stage.

---

# 47. Security Requirements

Minimum:

- authentication;
- authorization;
- server-authoritative game state;
- input validation;
- rate limiting;
- secure session/token handling;
- database backups.

Never trust client-submitted:

- cash;
- revenue;
- completed missions;
- fleet ownership;
- simulation results.

Client sends commands.

Server validates and applies them.

---

# 48. Observability

The backend should log:

- player commands;
- simulation errors;
- failed transactions;
- invalid state transitions;
- performance bottlenecks;
- important economy events.

Do not log sensitive credentials or secrets.

---

# 49. Performance Requirements

The architecture should support:

- fast dashboard loading;
- simulation speed independent from UI rendering;
- asynchronous heavy jobs;
- cached reports;
- incremental simulation;
- efficient database queries.

Do not optimize prematurely.

First target:

> Correctness → deterministic simulation → maintainability → performance.

---

# 50. Acceptance Criteria for the Core

The core prototype is successful when:

- player can create a company;
- player can open a route;
- player can procure a train;
- procurement takes simulated time;
- train is delivered to a depot;
- required workforce can be assigned;
- timetable can be created;
- service can operate;
- passenger demand is generated;
- passengers produce revenue;
- operation generates OPEX;
- fleet condition changes;
- maintenance can be performed;
- financial state changes correctly;
- mission progress is evaluated;
- player can reinvest and expand;
- simulation produces deterministic results under identical inputs.

---

# 51. Non-Goals for Early Development

Do not build initially:

- 3D train driving;
- detailed physics;
- full railway signaling simulation;
- multiplayer;
- user-generated content;
- live market economy;
- complex accident simulation;
- complete real-world Indonesian railway regulation;
- full nationwide infrastructure construction;
- microtransaction economy.

These can be considered only after the core management simulation is stable.

---

# 52. Real-World Data Policy

The game is inspired by the Indonesian railway ecosystem.

However:

- real technical specifications must be verified before inclusion;
- real regulatory relationships must be researched;
- real institution names must not be assumed;
- real tariffs must not be hard-coded without source/date;
- real rolling-stock specifications must be treated as data with provenance;
- fictionalized or abstracted data may be used for MVP.

Maintain data provenance where real-world data is introduced.

Suggested fields:

```text
source
source_date
verified
notes
```

---

# 53. Final Architectural Principle

The project should remain:

```text
DATA-DRIVEN
+
DOMAIN-MODULAR
+
SIMULATION-CENTRIC
+
SERVER-AUTHORITATIVE
+
AI-CODING-FRIENDLY
+
WEB-FIRST
+
MOBILE-READY
```

The most important separation is:

```text
              PLAYER
                 ↓
          FRONTEND CLIENT
                 ↓
              API
                 ↓
        APPLICATION SERVICES
                 ↓
          DOMAIN MODULES
                 ↓
        SIMULATION ENGINE
                 ↓
          GAME STATE
                 ↓
 PostgreSQL / Redis / Jobs
```

The frontend is replaceable.

The backend transport is replaceable.

The mobile client is replaceable.

The simulation engine is the core product.

---

# 54. Recommended Next Documents

After this PRD, implementation should proceed by creating these documents in order:

1. `DOMAIN_MODEL.md`
2. `SIMULATION_RULES.md`
3. `ECONOMY_RULES.md`
4. `DATA_DICTIONARY.md`
5. `API_SPEC.md`
6. `MISSION_DESIGN.md`
7. `UI_SPEC.md`
8. `AI_CODING_GUIDE.md`

The most important next document is:

> **DOMAIN_MODEL.md**

because it will define the entities and relationships before AI starts generating production code.

The second most important is:

> **SIMULATION_RULES.md**

because this becomes the mathematical source of truth for the railway simulation.
