# Railway Network Manager — Simulation Rules & Mathematical Specification
**Document Version:** 1.0.0  
**Status:** Approved Reference / Mathematical Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§9, §12, §15, §16, §18, §23, §34, §35)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Package:** `@railway/simulation`  

---

## 1. Executive Summary & Purpose

This document provides the **authoritative mathematical formulas, discrete time models, physical constraints, and deterministic algorithms** governing the simulation engine of *Railway Network Manager — Indonesia*.

In accordance with PRD §41 (Source-of-Truth Hierarchy) and PRD §37 (Law 4: Zero Game Rule Invention), all code implemented within `@railway/simulation` must strictly adhere to the numerical laws and state transition logic detailed herein. No arbitrary multipliers, unseeded random values, or heuristic rules may be introduced without updating this document.

---

## 2. Discrete Simulation Engine & Time Model

### 2.1 Simulation Clock & Units

The simulation operates on a **discrete tick model** (PRD §35). Continuous differential physics are replaced with deterministic interval-based calculations.

* **Base Unit of Time:** 1 simulation tick = 1 simulated minute.
* **Minutes per Simulated Day:** $T_{\text{day}} = 1,440\text{ ticks}$.
* **Simulated Day Index:** Monotonic integer $D \in [1, \infty)$.
* **Minute of the Day:** $M = (\text{tick} - 1) \pmod{1440} \in [0, 1439]$.
* **Time Representation:** $HH:MM = \left(\lfloor M / 60 \rfloor, M \pmod{60}\right)$.

### 2.2 Execution Pipeline within a Tick

Within each discrete tick $t \rightarrow t+1$, the simulation engine executes subsystems in a strict, deterministic sequence:

```
┌────────────────────────────────────────────────────────┐
│                   TICK START (t)                       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Event Queue Ingestion & Deadline Checks             │
│    (Departures, Arrival triggers, Maintenance expiries)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Fleet Movement & Route Traversal                    │
│    (Distance progressed, segment entry/exit, signals)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Station Dwell, Boarding & Alighting                 │
│    (Dwell countdown, passenger flow, capacity checks)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Dynamic Demand Generation & Accumulation            │
│    (Base station demand, elasticity, time-of-day)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. Rolling Stock Wear & Reliability Evaluation         │
│    (Odometer updates, condition drop, breakdown check) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 6. Depot Operations & Maintenance Work Progress        │
│    (Bay turnaround, mechanic hours applied)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 7. Workforce Workload & Fatigue Accumulation           │
│    (Masinis active duty hours, layover rest recovery)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 8. Financial Ledger Accruals                           │
│    (Fuel burned, track fees, ticket revenue settlement)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 9. Mission & Campaign Progress Evaluation              │
│    (Objective progress checks, milestone triggers)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   TICK END (t+1)                       │
└────────────────────────────────────────────────────────┘
```

### 2.3 Deterministic Pseudo-Random Number Generation (PRNG)

Native `Math.random()` is prohibited. The engine uses a seeded **Mulberry32** PRNG for all stochastic events.

```typescript
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns uniform float in [0, 1) */
  public next(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns uniform integer in [min, max] inclusive */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
```

---

## 3. Train Kinematics & Speed Model (PRD §9)

### 3.1 Effective Operating Speed

For any active service moving along a corridor track segment:

$$V_{\text{eff}} = \min \left( V_{\text{train\_max}},\, V_{\text{consist\_limit}},\, V_{\text{track\_limit}},\, V_{\text{restriction}} \right)$$

Where:
* $V_{\text{train\_max}}$: Maximum design speed of the lead locomotive (e.g., CC206 = $120\text{ km/h}$).
* $V_{\text{consist\_limit}}$: The lowest maximum speed rating of any attached carriage or wagon in the composition:
  $$V_{\text{consist\_limit}} = \min_{i \in \text{Units}} \left( V_{\text{spec\_max}, i} \right)$$
* $V_{\text{track\_limit}}$: Permitted permanent speed limit on the specific line segment (e.g., Cikampek–Cirebon double track = $120\text{ km/h}$; mountainous Padalarang–Cikadongdong = $60\text{ km/h}$).
* $V_{\text{restriction}}$: Temporary speed restrictions (TSR) caused by track maintenance, weather events, or signal caution.

### 3.2 Distance Progression & Segment Runtime

In each 1-minute tick, the distance traversed by a running train is:

$$\Delta D_{\text{tick}} = \frac{V_{\text{eff}}}{60}\text{ km}$$

Total run time for a non-stop segment of distance $D_{\text{seg}}$ with acceleration/braking allowance:

$$T_{\text{transit}} = \left\lceil \frac{D_{\text{seg}}}{V_{\text{eff}}} \times 60 + T_{\text{accel\_decel\_margin}} \right\rceil \text{ minutes}$$

Where:
* $T_{\text{accel\_decel\_margin}} = 2.0\text{ minutes}$ for locomotive-hauled passenger trains.
* $T_{\text{accel\_decel\_margin}} = 4.0\text{ minutes}$ for heavy freight/container consists.

---

## 4. Station Dwell, Overcrowding & Turnaround (PRD §15, §18)

### 4.1 Station Dwell Time

A scheduled train arriving at a station must dwell for a duration $T_{\text{dwell}}$ calculated as:

$$T_{\text{dwell}} = \left\lceil T_{\text{base\_dwell}} \times \left(1 + \Phi_{\text{overcrowd}}\right) \right\rceil$$

#### 4.1.1 Base Dwell Time by Station Category
* Minor Station / Halte ($< 2$ platforms): $T_{\text{base\_dwell}} = 2\text{ minutes}$.
* Intermediate Station ($2 - 4$ platforms): $T_{\text{base\_dwell}} = 4\text{ minutes}$.
* Major Terminal Station ($> 4$ platforms): $T_{\text{base\_dwell}} = 8\text{ minutes}$.

#### 4.1.2 Overcrowding Penalty Factor ($\Phi_{\text{overcrowd}}$)
Overcrowding occurs when the passenger Load Factor ($\text{LF}$) exceeds 100%:

$$\text{LF} = \frac{\sum \text{Passengers Onboard}}{\sum \text{Rated Consist Capacity}}$$

$$\Phi_{\text{overcrowd}} = \begin{cases} 
0 & \text{if } \text{LF} \le 1.00 \\ 
1.5 \times (\text{LF} - 1.00) & \text{if } 1.00 < \text{LF} \le 1.50 \\
0.75 + 3.0 \times (\text{LF} - 1.50) & \text{if } \text{LF} > 1.50 
\end{cases}$$

### 4.2 Turnaround Time at Terminus

Upon reaching the route terminus, rolling stock must undergo physical turnaround (locomotive decoupling/run-around, cab change, brake test, light interior cleaning) before commencing the return service:

$$T_{\text{turnaround}} = \begin{cases} 
20\text{ minutes} & \text{for Multiple Units (KRL/DMU, push-pull)} \\
45\text{ minutes} & \text{for Locomotive-hauled Passenger Consists} \\
60\text{ minutes} & \text{for Freight / Container Consists}
\end{cases}$$

**Turnaround Conflict Invariant:** A timetable slot scheduled with less than $T_{\text{turnaround}}$ between arrival and subsequent departure generates an operational conflict warning and propagates departure delays.

---

## 5. Passenger Demand Mathematical Model (PRD §6, §16, §17)

### 5.1 Demand Generation Formula

The number of passengers wishing to travel from origin station $A$ to destination station $B$ in service class $C \in \{\text{Economy}, \text{Executive}, \text{Luxury}\}$ during daily time window $W$ is:

$$\text{Demand}_{A,B,C}(W) = \left\lfloor \text{BaseDemand}_{A,B} \times \omega_C \times \mathcal{T}(W) \times \mathcal{E}_C\left(P_C, \bar{P}_C\right) \times \mathcal{F}(f) \times \mathcal{Q}(q) \times \mathcal{R}(\text{rep}) \right\rfloor$$

### 5.2 Component Functions & Curves

#### 5.2.1 Class Demand Distribution ($\omega_C$)
For standard intercity corridors in Java:
* Economy: $\omega_{\text{Eco}} = 0.70$
* Executive: $\omega_{\text{Exec}} = 0.25$
* Luxury: $\omega_{\text{Lux}} = 0.05$

#### 5.2.2 Time-of-Day Multiplier Curve ($\mathcal{T}(W)$)
Based on departure minute $M \in [0, 1439]$:

| Time Window | Hours | Description | $\mathcal{T}(W)$ Multiplier |
| :--- | :--- | :--- | :---: |
| **Early Morning** | 04:00 – 06:00 | Dawn departures | $0.80$ |
| **Morning Peak** | 06:00 – 09:00 | Business & commuter rush | $1.40$ |
| **Midday Off-Peak** | 09:00 – 15:00 | Regular daytime travel | $0.90$ |
| **Evening Peak** | 15:00 – 19:00 | Post-work & student rush | $1.35$ |
| **Night Travel** | 19:00 – 23:00 | Long-distance intercity overnight | $1.10$ |
| **Late Night** | 23:00 – 04:00 | Red-eye / low traffic | $0.30$ |

#### 5.2.3 Fare Price Elasticity Curve ($\mathcal{E}_C$)
Passengers evaluate the player's charged ticket price $P_C$ against the market benchmark price $\bar{P}_C$ using a power elasticity function:

$$\mathcal{E}_C\left(P_C, \bar{P}_C\right) = \left( \frac{P_C}{\bar{P}_C} \right)^{-\epsilon_C}$$

Elasticity parameters ($\epsilon_C$):
* **Economy ($\epsilon_{\text{Eco}} = 1.60$):** Highly price-sensitive. A $10\%$ price hike reduces demand by $\approx 15.3\%$.
* **Executive ($\epsilon_{\text{Exec}} = 0.75$):** Moderate sensitivity. Value speed and comfort.
* **Luxury ($\epsilon_{\text{Lux}} = 0.35$):** Inelastic prestige segment. Less sensitive to price than to quality.

*Constraint:* If $P_C > 2.5 \times \bar{P}_C$, demand collapses to zero: $\mathcal{E}_C = 0$.

#### 5.2.4 Service Frequency Multiplier ($\mathcal{F}(f)$)
Passengers prefer routes with regular departures throughout the day. Where $f$ is daily round-trips:

$$\mathcal{F}(f) = 1.0 - 0.7 \times e^{-0.45 \times f}$$

* $f = 1$ service/day: $\mathcal{F}(1) = 0.55$ (Infrequent, high waiting time).
* $f = 3$ services/day: $\mathcal{F}(3) = 0.82$.
* $f = 6$ services/day: $\mathcal{F}(6) = 0.95$.
* $f \ge 10$ services/day: $\mathcal{F}(f) \to 1.00$ (Optimal schedule convenience).

#### 5.2.5 Service Quality Index ($\mathcal{Q}(q)$)
Based on rolling stock cleanliness, dining car availability, and on-board amenities ($q \in [0.0, 1.0]$):

$$\mathcal{Q}(q) = 0.70 + 0.30 \times q$$

#### 5.2.6 Company Reputation Factor ($\mathcal{R}(\text{rep})$)
Driven by trailing 30-day On-Time-Performance ($\text{OTP}$) and cancellation rates ($\text{rep} \in [0.0, 1.0]$):

$$\mathcal{R}(\text{rep}) = 0.50 + 0.50 \times \text{rep}$$

---

## 6. Rolling Stock Degradation & Reliability Physics (PRD §7, §23, §24)

### 6.1 Distance-Based Degradation

Condition $C \in [0.00, 100.00]\%$ decays per kilometer traveled according to:

$$\Delta C = K_{\text{base}} \times \Delta D_{\text{km}} \times \left(1 + \beta_{\text{bogie}} + \beta_{\text{overload}}\right)$$

Where:
* $K_{\text{base}} = 0.0020\%$ condition loss per kilometer (standard wear: $100\%$ to $0\%$ over $50,000\text{ km}$).
* **Bogie Wear Modifier ($\beta_{\text{bogie}}$):**
  * Low-Speed Bogie: $\beta = +0.15$
  * Medium-Speed Bogie: $\beta = 0.00$
  * High-Speed Bogie: $\beta = -0.10$
* **Overload Factor ($\beta_{\text{overload}}$):**
  $$\beta_{\text{overload}} = \max\left(0,\, 0.50 \times (\text{LF} - 1.00)\right)$$

### 6.2 Component Reliability & Failure Probability

Reliability $R(C) \in [0.0, 1.0]$ is a piecewise non-linear function of condition $C$:

$$R(C) = \begin{cases} 
1.00 & \text{if } C \ge 85.0 \\
1.00 - 0.005 \times (85.0 - C) & \text{if } 60.0 \le C < 85.0 \\
0.875 - 0.025 \times (60.0 - C)^{1.35} & \text{if } 30.0 \le C < 60.0 \\
0.20 & \text{if } C < 30.0 \text{ (Critical hazard)}
\end{cases}$$

### 6.3 Breakdown Check Algorithm

During each operating hour, if a train is in transit:
1. Generate random sample $u \sim \text{Uniform}(0, 1)$ via seeded PRNG.
2. Hourly failure threshold:
   $$\theta_{\text{fail}} = \frac{1.0 - R(C)}{24}$$
3. If $u < \theta_{\text{fail}}$, a **Breakdown Incident** is triggered:
   * Consist speed reduced to emergency crawl: $V_{\text{limp}} = 20\text{ km/h}$.
   * Delay generated:
     $$T_{\text{delay}} = \text{PRNG.nextInt}(30, 90)\text{ minutes}$$
   * Company reputation penalized by $-0.02$ points.

---

## 7. Depot Operations & Maintenance Mechanics (PRD §11, §23)

### 7.1 Maintenance Types & Recovery Rates

When a rolling stock unit is placed into a depot maintenance slot:

| Type | Condition Restored | Duration Required | Depot Slot Required | Cost Formula |
| :--- | :---: | :---: | :---: | :--- |
| **Preventive (Daily / Light)** | $+15.00\%$ (up to $95\%$) | 4 hours (240 ticks) | Level 1 Bay | $5,000,000\text{ IDR}$ |
| **Periodic (Medium Inspection)**| $+40.00\%$ (up to $98\%$) | 12 hours (720 ticks)| Level 2 Bay | $25,000,000\text{ IDR}$ |
| **Overhaul (Heavy Refurbishment)**| Restores to $100.00\%$ | 72 hours (4320 ticks)| Level 3 Bay | $120,000,000\text{ IDR}$ |

### 7.2 Depot Capacity Constraints

A depot with $S_{\text{maint}}$ maintenance slots cannot service more than $S_{\text{maint}}$ concurrent units. Excess units assigned to maintenance enter a FIFO waiting queue (`QUEUED`) and continue to incur stabling fees without recovering condition.

---

## 8. Workforce Workload & Fatigue Model (PRD §12)

### 8.1 Required Crew Calculation

Avoid fixed $1 \text{ train} = X \text{ people}$. The required crew hours for a service run are:

$$\text{RequiredMasinisHours} = \frac{T_{\text{transit}} + T_{\text{dwell\_total}}}{60} \times K_{\text{night}}$$

Where:
* $K_{\text{night}} = 1.25$ if more than $50\%$ of the journey occurs between 22:00 and 05:00; otherwise $1.00$.

### 8.2 Driver Fatigue & Incident Hazard

Each active duty minute increments masinis fatigue:

$$\text{Fatigue}_{t+1} = \text{Fatigue}_t + \frac{1}{480} \times 100 \quad (100\%\text{ reached after } 8\text{ hours of driving})$$

* During layover / rest at a depot:
  $$\text{Fatigue}_{t+1} = \max\left(0,\, \text{Fatigue}_t - \frac{1}{240} \times 100\right) \quad (\text{Fully recovered in } 4\text{ hours})$$
* **Fatigue Safety Invariant:** If a masinis operates a service with $\text{Fatigue} > 80\%$, the risk of operational delay (signal checks, missed brake markers) increases by $+300\%$.

---

## 9. Financial Accrual Formulas (PRD §25)

### 9.1 Operating Revenue per Service

$$\text{Rev}_{\text{service}} = \sum_{c \in \{\text{Eco, Exec, Lux}\}} \left( \text{PassengersServed}_c \times \text{Fare}_c \right) + \text{OnboardSales}$$

Where $\text{OnboardSales} = \text{Passengers}_{\text{total}} \times 15,000\text{ IDR}$ (if a Dining Car is attached).

### 9.2 Operating Expenditure (OPEX) per Service

$$\text{OPEX}_{\text{service}} = \text{Cost}_{\text{energy}} + \text{Cost}_{\text{track\_access}} + \text{Cost}_{\text{crew}} + \text{Cost}_{\text{maint\_reserve}}$$

1. **Energy Cost (Diesel-Electric):**
   $$\text{Cost}_{\text{energy}} = D_{\text{run\_km}} \times \text{ConsumptionRate}_{\text{L/km}} \times \text{FuelPricePerLiter}$$
   *(Default: $\text{CC206} = 3.8\text{ L/km}$; Fuel price = $15,000\text{ IDR/liter}$.)*
2. **Track Access & Regulatory Fee (PRD §14):**
   $$\text{Cost}_{\text{track\_access}} = D_{\text{run\_km}} \times \text{TrackFeeRatePerKm}$$
   *(Default: $25,000\text{ IDR/train-km}$.)*
3. **Crew Operational Cost:**
   $$\text{Cost}_{\text{crew}} = \text{DurationHours} \times \text{HourlyCrewRate}$$
4. **Maintenance Reserve Depreciation:**
   $$\text{Cost}_{\text{maint\_reserve}} = D_{\text{run\_km}} \times \text{BaseWearRatePerKm}$$

---

## 10. Procurement Lead Time Engine (PRD §10)

The monotonic simulated timeline for procurement progresses through discrete milestones:

$$T_{\text{total\_lead\_time}} = T_{\text{production}} + T_{\text{testing}} + T_{\text{transit}} + T_{\text{commissioning}}$$

| Milestone Stage | Simulated Time Proportion | Description |
| :--- | :---: | :--- |
| `ORDERED` $\to$ `IN_PRODUCTION` | $10\%$ | Materials sourcing & factory slot allocation |
| `IN_PRODUCTION` $\to$ `TESTING` | $65\%$ | Chassis, bogie assembly, electrical integration |
| `TESTING` $\to$ `IN_TRANSIT` | $10\%$ | Static tests, dynamic braking, track trials |
| `IN_TRANSIT` $\to$ `DELIVERED` | $10\%$ | Delivery run to target depot |
| `DELIVERED` $\to$ `COMMISSIONED` | $5\%$ | Depot acceptance inspection & safety signoff |

*Example:* A standard order of 4 Executive carriages with a 120-day standard lead time spends 78 days in production, 12 days in testing, 12 days in transit, and 6 days in depot commissioning before becoming available for timetable assignment.

---

## 11. Deterministic Test Vectors & Verification Invariants

To satisfy PRD §30.6 (Deterministic Tests) and PRD §37 (Law 5), the test suite in `packages/simulation` must assert the following fixed reference vectors:

### Test Vector 1: Speed Model Invariant
* **Input:** Locomotive design speed $120\text{ km/h}$, 8 carriages rated at $100\text{ km/h}$, track limit $110\text{ km/h}$, TSR $80\text{ km/h}$.
* **Expected Result:** $V_{\text{eff}} = \min(120, 100, 110, 80) = 80\text{ km/h}$.
* **Invariant:** $\forall \text{ Inputs},\, V_{\text{eff}} \le \min(\text{all limits})$.

### Test Vector 2: Passenger Fare Elasticity
* **Input:** Economy class benchmark $\bar{P} = 100,000\text{ IDR}$. Player fare $P = 120,000\text{ IDR}$.
* **Ratio:** $120,000 / 100,000 = 1.20$.
* **Expected Multiplier:** $\mathcal{E}_{\text{Eco}} = 1.20^{-1.60} \approx 0.7451$.
* **Assertion:** Output matches $0.7451 \pm 0.0001$.

### Test Vector 3: Dwell Overcrowding Penalty
* **Input:** Rated capacity 500 passengers. Boarded passengers 650. Base dwell 4 minutes.
* **Load Factor:** $\text{LF} = 650 / 500 = 1.30$.
* **Penalty:** $\Phi = 1.5 \times (1.30 - 1.00) = 0.45$.
* **Expected Dwell:** $\lceil 4 \times (1 + 0.45) \rceil = \lceil 5.8 \rceil = 6\text{ minutes}$.

---

## 12. Sign-off

Any modification to these formulas must be accompanied by updated Vitest assertions in `packages/simulation/tests/simulation_rules.spec.ts`.
