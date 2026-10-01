# Railway Network Manager — User Interface Specification & UX Contract
**Document Version:** 1.0.0  
**Status:** Approved Reference / Presentation Architecture Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§2.2, §30.2, §30.3, §32, §35, §45)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Package:** `apps/web` (Next.js), `apps/mobile` (Expo)  

---

## 1. Executive Summary & Architectural Invariant

This document defines the **information architecture, screen layouts, component contracts, navigation structures, and interactive states** for the web and mobile frontends of *Railway Network Manager — Indonesia*.

### Non-Negotiable Presentation Invariants (PRD §2.2, §32)
1. **Simulation First:** The frontend is strictly a visualization and interaction layer. It reflects server state and sends player action commands.
2. **Zero Business Rules in React:** Components must never calculate passenger elasticity, track wear, fuel burn rates, or mission eligibility. All business logic and financial calculations are executed server-side.
3. **Decisions Over Decoration (PRD §2.3):** Every UI panel must clearly highlight actionable trade-offs (e.g., ticket price vs. load factor, CAPEX vs. lead time) rather than passive counters.

---

## 2. Information Architecture & Navigation

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL STATUS BAR (Sim Clock, Speed [⏸ 1x 2x 4x 8x], Cash, Reputation, Stage)│
├──────────────┬─────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN CONTENT WORKSPACE                                          │
│              │                                                                 │
│ 1. Network   │ ┌─────────────────────────────────────────────────────────────┐ │
│    Map       │ │                                                             │ │
│ 2. Timetable │ │                      INTERACTIVE WORKSPACE                  │ │
│ 3. Fleet     │ │                  (MapLibre GL / Table / Modal)              │ │
│ 4. Procure   │ │                                                             │ │
│ 5. Depots    │ └─────────────────────────────────────────────────────────────┘ │
│ 6. Contracts │                                                                 │
│ 7. Staff     │ ┌─────────────────────────────────────────────────────────────┐ │
│ 8. Finance   │ │ CONTEXT DRAWER / INSPECTOR                                  │ │
│ 9. Missions  │ │ (Selected train details, station info, order progress)      │ │
└──────────────┴─┴─────────────────────────────────────────────────────────────┘
```

### 2.1 Global Top Bar (Always Visible)
* **Simulation Clock:** Current simulated day and 24h clock: `Hari 12 • 08:45 WIB`.
* **Speed Controls:** Interactive toggle button group: `[ ⏸ Pause | 1x | 2x | 4x | 8x ]`. Emits `POST /api/v1/simulation/speed`.
* **Liquid Cash Balance:** Formatted Rupiah: `Rp 94.250.000.000` (Red if overdraft, Green if solvent).
* **Company Reputation:** Gauge widget: `★ 84%`.
* **Campaign Stage:** Badge: `Stage 1: Operator Lokal`.
* **Active Alerts Badge:** Notification popover displaying breakdown alerts, contract deadlines, or mission completions.

---

## 3. Core Screens & Component Specifications

### 3.1 Screen 1: Network Map & Operations Overview (`/network`)

The primary situational awareness dashboard.

```
┌────────────────────────────────────────────────────────────────────────┐
│ MAPLIBRE GL CANVAS: Pulau Jawa Track Corridor                          │
│                                                                        │
│   [Jakarta (GMR)] ══════════ [Cirebon (CN)] ══════════ [Surabaya (SGU)]│
│         ║                                                              │
│         ║                                                              │
│   [Bandung (BD)]                                                       │
│                                                                        │
│  • Green Dot: Service BDG-01 (On Time, 88% Load Factor)                │
│  • Orange Dot: Service GMR-03 (Delayed +12 min, Overcrowded)           │
└────────────────────────────────────────────────────────────────────────┘
```

* **Technology:** MapLibre GL JS with custom railway style layers (vector tiles of Indonesian railway corridors).
* **Visual Elements:**
  * **Station Nodes:** Interactive markers color-coded by platform occupancy.
  * **Track Corridors:** Lines colored by operational status (Owned Concession = Solid Brand Blue; Available = Dashed Gray).
  * **Train Consists:** Live animated markers interpolated between tick updates. Hovering displays train code, speed, current delay, and load factor.
* **Context Inspector Drawer:** Clicking any station or train opens a slide-over panel displaying real-time statistics (catchment demand, next departures, locomotive mechanical condition).

---

### 3.2 Screen 2: Fleet Composition Builder (`/fleet/builder`)

Enables the player to assemble locomotives, carriages, and wagons into valid operating consists.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TRAIN CONSIST BUILDER: "Parahyangan Express Consist A"                 │
├────────────────────────────────────────────────────────────────────────┤
│ CURRENT FORMATION (Slots: 1 to 10):                                    │
│ [ Slot 1: CC206 Loco ] ── [ Slot 2: P Gen-Car ] ── [ Slot 3: M1 Resto ]│
│ ── [ Slot 4: K1 Exec ] ── [ Slot 5: K1 Exec ] ── [ Slot 6: K3 Eco ]   │
├────────────────────────────────────────────────────────────────────────┤
│ VALIDATION & SPECS INDICATOR:                                          │
│ • Total Length: 145m / Max Allowed: 400m                     [✓ PASS]  │
│ • Traction Power: 2,250 HP / Consist Weight: 320 Tons        [✓ PASS]  │
│ • Air Conditioning Power: Generator Car Present              [✓ PASS]  │
│ • Maximum Safe Speed: 120 km/h (Bogie Limited)               [✓ PASS]  │
├────────────────────────────────────────────────────────────────────────┤
│ [ Cancel ]                                         [ Assemble Consist ]│
└────────────────────────────────────────────────────────────────────────┘
```

* **Component Contracts:**
  * Displays real-time validation warnings based on domain invariants (e.g., "Warning: Executive carriages require a Generator Car or HEP Locomotive").
  * Submits payload to `POST /api/v1/fleet/compositions`.

---

### 3.3 Screen 3: Timetable & Gapeka Scheduler (`/timetable`)

Enables slot planning and frequency configuration.

* **Two Visualization Modes:**
  1. **Tabular Slot Matrix:** Card-based list of recurring departures organized by route corridor.
  2. **Gapeka Chart (Grafik Perjalanan Kereta Api):** Time-distance graph displaying distance along vertical axis and 24 hours along horizontal axis. Slanted lines represent train runs. Visualizes platform and track conflicts clearly.
* **Interactive Controls:**
  * Add departure slot modal (Route selection, Consist picker, Masinis assignment, Departure minute slider).
  * Dynamic pricing sliders for Economy and Executive ticket tariffs with real-time elasticity benchmark indicators.

---

### 3.4 Screen 4: Procurement Center (`/procurement`)

Interface for acquiring new rolling stock from manufacturers.

* **Catalog Browser:** Filterable by category (Locomotives, Passenger Carriages, Freight Wagons). Displays build type, bogie speed tier, tare weight, purchase price, and lead time.
* **Active Orders Pipeline:** Visual progress timeline for orders in manufacturing:
  $$\text{ORDERED} \longrightarrow \text{IN\_PRODUCTION} \longrightarrow \text{TESTING} \longrightarrow \text{IN\_TRANSIT} \longrightarrow \text{DELIVERED}$$
  Displays countdown of remaining simulated days.

---

### 3.5 Screen 5: Financial Statement & Double-Entry Ledger (`/finance`)

Detailed accounting breakdown for strategic analysis.

* **Executive Summary:** Revenue vs. OPEX vs. Net Operating Margin.
* **Cost Center Breakdown:** Pie charts detailing Fuel/Energy, Track Access Charges, Payroll, and Maintenance.
* **Audit Ledger Table:** Filterable, paginated list of all debits and credits with category, timestamp, and linked entity references.

---

## 4. Design System & Tokens

* **Primary Framework:** Tailwind CSS 3.4+ / Radix UI primitives.
* **Color Palette:**
  * Primary Brand: Rail Navy `#0F172A` / `#1E293B`.
  * Accent / Safety Orange: `#F97316` (Indonesian railway livery accent).
  * Success / Solvency: `#10B981` (Emerald).
  * Hazard / Delay: `#EF4444` (Rose / Red).
  * Track Infrastructure: `#64748B` (Slate).
* **Typography:** `Inter` or `Geist Sans` for tabular numbers (`font-mono` for currency, odometers, and timestamps).

---

## 5. Web-to-Mobile Strategy (PRD §45)

* **Web (`apps/web`):** Rich desktop workstation with full MapLibre canvas, multi-column Gapeka chart, and side-by-side inspectors.
* **Mobile (`apps/mobile`):** Streamlined pocket companion built with Expo / React Native:
  * Bottom tab navigation (Overview, Timetable, Fleet, Alerts).
  * Vertical card feeds replacing multi-axis Gapeka charts.
  * Native haptic feedback on speed toggles and order placements.
