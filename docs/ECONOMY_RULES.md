# Railway Network Manager — Economy Rules & Financial Specification
**Document Version:** 1.0.0  
**Status:** Approved Reference / Financial Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§5, §6, §10, §14, §20, §22, §25, §29)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Package:** `@railway/economy`  

---

## 1. Executive Summary & Philosophy

This document establishes the **authoritative financial formulas, tariff structures, cost models, balance sheets, and transaction constraints** for *Railway Network Manager — Indonesia*.

### Core Economic Tenets
1. **Decisions Over Decoration (PRD §2.3):** No "free money" buttons or idle clicker progression. Every financial reward is the result of a capital allocation decision with operational risk.
2. **Server-Authoritative Ledger (PRD §47):** Cash balances cannot be directly incremented or decremented. Every balance alteration requires a discrete, signed `FinancialTransaction` recorded to the double-entry general ledger.
3. **Integer Currency Arithmetic:** To avoid IEEE-754 floating-point drift across distributed runtimes, all monetary values are stored and calculated as exact integer Rupiah (IDR).
4. **Data-Driven Balance (PRD §37, Law 6):** All base tariffs, fuel prices, and salary schedules reside as configuration parameters in `@railway/game-data`.

---

## 2. Currency, Precision & Ledger Invariants

### 2.1 Currency Representation
* **Currency Code:** `IDR` (Indonesian Rupiah).
* **Primitive Type:** `type Money = number;` *(Constrained to safe integers up to $\pm 9 \times 10^{15}$, well above national rail budget scales).*
* **Minimum Currency Unit:** $1\text{ IDR}$ (no sub-cent fractional coinage).

### 2.2 Double-Entry General Ledger Contract
Every transaction has an immutable category, timestamp, amount, and reference entity:

```typescript
export interface FinancialTransaction {
  readonly id: TransactionId;
  readonly companyId: CompanyId;
  readonly timestamp: GameTimestamp;
  readonly category: TransactionCategory;
  readonly amount: Money; // Positive: Inflow (Credit); Negative: Outflow (Debit)
  readonly referenceEntityId?: string; // e.g., routeId, unitId, orderId
  readonly description: string;
}
```

* **Solvency Invariant:**
  $$\text{CurrentCashBalance} = \text{InitialCapital} + \sum_{i=1}^{N} \text{TransactionAmount}_i$$
  *If $\text{CurrentCashBalance} < 0$ and credit limits are exhausted, the company enters technical insolvency (`INSOLVENT` state).*

---

## 3. Revenue Models & Pricing Tariffs (PRD §5, §6)

### 3.1 Passenger Ticket Fares

Passenger fares are set per passenger per kilometer traveled ($P_{\text{per\_km}}$), with a fixed boarding fee component ($P_{\text{boarding}}$):

$$\text{Fare}_{\text{class}}(D) = P_{\text{boarding}, \text{class}} + \left( P_{\text{per\_km}, \text{class}} \times D_{\text{km}} \right)$$

#### 3.1.1 Baseline Benchmark Tariffs ($\bar{P}$)

These values represent market-neutral expectations. Charging above reduces demand elasticity; charging below increases demand but reduces yield.

| Service Class | Base Boarding Fee ($P_{\text{boarding}}$) | Benchmark per Km ($\bar{P}_{\text{per\_km}}$) | Allowed Fare Range per Km |
| :--- | :---: | :---: | :---: |
| **Economy** | $15,000\text{ IDR}$ | $450\text{ IDR/km}$ | $250 - 900\text{ IDR/km}$ |
| **Executive** | $50,000\text{ IDR}$ | $1,250\text{ IDR/km}$ | $800 - 2,500\text{ IDR/km}$ |
| **Luxury** | $150,000\text{ IDR}$ | $3,500\text{ IDR/km}$ | $2,000 - 7,000\text{ IDR/km}$ |

*Example (Gambir – Bandung, 160 km):*
* Benchmark Economy: $15,000 + (450 \times 160) = 87,000\text{ IDR}$.
* Benchmark Executive: $50,000 + (1,250 \times 160) = 250,000\text{ IDR}$.
* Benchmark Luxury: $150,000 + (3,500 \times 160) = 710,000\text{ IDR}$.

### 3.2 On-Board Ancillary Revenue
When a consist includes an operational `DINING_CAR` (Restorasi):

$$\text{Rev}_{\text{ancillary}} = \text{PassengersServed} \times \text{AvgSpendPerPax}$$

* Economy Passengers: $10,000\text{ IDR/pax}$ (instant noodles, mineral water, tea).
* Executive Passengers: $35,000\text{ IDR/pax}$ (hot meals, espresso, snacks).
* Luxury Passengers: $85,000\text{ IDR/pax}$ (premium dining, welcome drinks).

### 3.3 Freight & Cargo Revenue (PRD §19, §20)

Cargo services are billed per ton delivered according to cargo category:

$$\text{Rev}_{\text{cargo}} = \text{VolumeTons} \times \left( \text{BaseHandlingFee} + \text{TariffPerTonKm} \times D_{\text{km}} \right)$$

| Cargo Category | Base Handling Fee (per Ton) | Tariff per Ton-Km | Required Rolling Stock |
| :--- | :---: | :---: | :--- |
| **Parcel / Express** | $150,000\text{ IDR}$ | $850\text{ IDR}$ | Baggage / Parcel Wagon |
| **Container (ISO Intermodal)**| $50,000\text{ IDR}$ | $550\text{ IDR}$ | Flat Car / Container Wagon |
| **Industrial (Steel/Cement)** | $30,000\text{ IDR}$ | $420\text{ IDR}$ | Boxcar / Specialized Wagon |
| **Bulk Commodity (Coal/Sand)**| $15,000\text{ IDR}$ | $300\text{ IDR}$ | Open Hopper Wagon |

### 3.4 Charter Operations (PRD §21)

Charter is an unbundled, high-margin, spot-market contract:

$$\text{OfferedCharterPrice} = \text{DirectOPEX} \times (1.0 + \text{MarginMarkup}) + \text{FleetOpportunityCost}$$

* **Corporate / Executive Charter:** Minimum Margin Markup $= 80\%$.
* **Tourism / Group Charter:** Minimum Margin Markup $= 45\%$.
* **Fleet Opportunity Cost:** Calculated as $120\%$ of the projected revenue the rolling stock would have generated on its regular scheduled route during that time window.

### 3.5 Public Service Obligation (PSO) & Government Subsidies (PRD §22)

Under a Government PSO Contract:
1. **Fare Cap:** Player must cap Economy fare at a mandated ceiling:
   $$\text{Fare}_{\text{charged}} \le \text{MaxMandatedFare}$$
2. **Weekly Subsidy Inflow:** Government disburses a fixed operating subsidy:
   $$\text{Subsidy}_{\text{weekly}} = \text{BaselineOperatingCost} \times 1.15$$
3. **Non-Compliance Penalties:**
   * If weekly On-Time-Performance ($\text{OTP}$) falls below the agreed threshold (e.g., $90\%$):
     $$\text{Penalty}_{\text{OTP}} = \text{Subsidy}_{\text{weekly}} \times 0.25$$
   * If scheduled trips are cancelled without prior regulatory relief:
     $$\text{Penalty}_{\text{cancel}} = 2.0 \times \text{NormalTripSubsidy}$$

---

## 4. Operating Expenditure (OPEX) Structure (PRD §25)

OPEX is categorized into direct trip-dependent variable costs and recurring period fixed costs.

```
┌────────────────────────────────────────────────────────┐
│                      OPERATING COSTS                   │
└───────────────────────────┬────────────────────────────┘
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐┌───────────────────────────┐
│       Variable OPEX       ││        Fixed OPEX         │
│ - Diesel Fuel / Electric  ││ - Staff Monthly Salaries  │
│ - Track Access Charges    ││ - Depot Facility Leases   │
│ - Crew Hourly Overtime    ││ - HQ & Admin Overhead    │
│ - Consist Wear Reserve    ││ - Route Concession Fees   │
└───────────────────────────┘└───────────────────────────┘
```

### 4.1 Track Access & Regulatory Charge (TAC) (PRD §14)

Under Model A, the operator pays the infrastructure owner a usage fee per gross train-kilometer:

$$\text{Cost}_{\text{TAC}} = D_{\text{km}} \times \left( \text{BaseRatePerTrainKm} + \text{WeightSurcharge} \times \frac{\text{TotalConsistWeightTons}}{100} \right)$$

* **Standard Intercity Track Rate:** $25,000\text{ IDR / train-km}$.
* **Weight Surcharge:** $5,000\text{ IDR / 100 gross tons / train-km}$.

### 4.2 Energy Consumption Costs

$$\text{Cost}_{\text{fuel}} = D_{\text{km}} \times \text{FuelBurnRate}_{\text{L/km}} \times \text{DieselPricePerLiter}$$

* **Industrial Diesel Benchmark:** $15,000\text{ IDR / liter}$.
* **Locomotive Consumption Rates:**
  * Light Diesel Locomotive (CC201 / CC203): $3.0\text{ L/km}$.
  * Heavy Diesel Locomotive (CC206): $3.8\text{ L/km}$.
  * Multiple Unit / DMU (per 4-car consist): $2.2\text{ L/km}$.

### 4.3 Workforce Payroll & Compensation (PRD §12)

Staff are remunerated via monthly base salaries plus run-time allowances:

| Staff Role | Base Monthly Salary | Run Allowance (per Service Hour) |
| :--- | :---: | :---: |
| **Masinis (Lead Driver)** | $12,000,000\text{ IDR}$ | $75,000\text{ IDR/hr}$ |
| **Asisten Masinis (Co-Driver)** | $7,500,000\text{ IDR}$ | $45,000\text{ IDR/hr}$ |
| **Kondektur (Conductor)** | $6,500,000\text{ IDR}$ | $35,000\text{ IDR/hr}$ |
| **Technician / Mechanic** | $8,000,000\text{ IDR}$ | — |
| **Depot Ground Staff** | $5,000,000\text{ IDR}$ | — |
| **Dispatcher / Operations** | $9,000,000\text{ IDR}$ | — |
| **HQ Admin & Management** | $8,500,000\text{ IDR}$ | — |

*Payroll Accrual Invariant:* Base salaries are debited automatically at the end of every 30th simulated day (`FINANCIAL_ACCRUAL`).

---

## 5. Capital Expenditure (CAPEX) Catalog (PRD §7, §10, §11)

### 5.1 Rolling Stock Procurement Catalog

| Model Specification | Category | Base Purchase Cost | Standard Lead Time |
| :--- | :--- | :---: | :---: |
| **CC206 Heavy Freight & Intercity** | Locomotive | $32,000,000,000\text{ IDR}$ | 180 Days |
| **CC201 Conventional Diesel** | Locomotive | $18,000,000,000\text{ IDR}$ | 120 Days |
| **K1 Stainless Steel Executive** | Passenger Carriage | $7,500,000,000\text{ IDR}$ | 120 Days |
| **K3 Premium Modern Economy** | Passenger Carriage | $5,500,000,000\text{ IDR}$ | 90 Days |
| **K1 Luxury Sleeper / Suite** | Luxury Carriage | $12,000,000,000\text{ IDR}$ | 150 Days |
| **M1 Dining Car (Restorasi)** | Service Carriage | $6,000,000,000\text{ IDR}$ | 90 Days |
| **P Generator Car (Power Van)** | Power Car | $5,000,000,000\text{ IDR}$ | 90 Days |
| **PPCW 40ft Container Flatcar** | Freight Wagon | $950,000,000\text{ IDR}$ | 45 Days |
| **ZZOW Coal Hopper Wagon** | Freight Wagon | $1,200,000,000\text{ IDR}$ | 60 Days |

### 5.2 Depot Establishment & Upgrades (PRD §11)

| Depot Facility Tier | Stabling Capacity | Maintenance Slots | CAPEX Cost | Daily Facility OPEX |
| :--- | :---: | :---: | :---: | :---: |
| **Tier 1 (Small Regional)** | 6 Units | 1 Level-1 Bay | $15,000,000,000\text{ IDR}$ | $2,500,000\text{ IDR}$ |
| **Tier 2 (Medium Operational)**| 16 Units | 3 Level-2 Bays | $45,000,000,000\text{ IDR}$ | $7,500,000\text{ IDR}$ |
| **Tier 3 (Master Workshop)** | 40 Units | 8 Level-3 Bays | $120,000,000,000\text{ IDR}$| $25,000,000\text{ IDR}$ |

### 5.3 Route Opening Initial Preparation Costs (PRD §14)

Opening a new route corridor requires upfront regulatory filing, driver line familiarization, and station access guarantees:

$$\text{Cost}_{\text{route\_open}} = \text{BaseRegulatoryFee} + \left( \text{StationCount} \times \text{PrepCostPerStation} \right) + \left( D_{\text{route\_km}} \times \text{CorridorLicensingPerKm} \right)$$

* $\text{BaseRegulatoryFee} = 50,000,000\text{ IDR}$.
* $\text{PrepCostPerStation} = 15,000,000\text{ IDR}$ per served station.
* $\text{CorridorLicensingPerKm} = 250,000\text{ IDR / km}$.

*Example (Gambir – Bandung, 5 stations, 160 km):*
$$\text{Cost} = 50,000,000 + (5 \times 15,000,000) + (160 \times 250,000) = 165,000,000\text{ IDR}$$

---

## 6. Financing, Working Capital & Solvency (PRD §25)

### 6.1 Starter Capital (Stage 0: First Service)
* **Initial Capital Endowment:** $100,000,000,000\text{ IDR}$ ($100\text{ Billion IDR}$).
* Sufficient to procure 1 locomotive, 4–5 passenger carriages, open 1 regional corridor, lease 1 small depot, and fund initial operational runway.

### 6.2 Debt & Loans Framework (Future Expansion)
When player liquidity falls below safe reserves:
1. **Working Capital Overdraft:**
   * Maximum limit: $10,000,000,000\text{ IDR}$.
   * Daily interest rate: $0.05\%$ per day ($18.25\%$ annual effective).
2. **Rolling Stock Equipment Loan:**
   * Loan-to-Value (LTV): Up to $70\%$ of new rolling stock purchase cost.
   * Amortization: 360 simulated days (1 year), fixed daily principal + interest repayment.

### 6.3 Insolvency Trigger Rules
* If cash balance $\text{CurrentCash} \le -15,000,000,000\text{ IDR}$ continuously for $14\text{ simulated days}$:
  1. Operating license suspended (`SUSPENDED`).
  2. All active departures blocked.
  3. Player forced to sell assets, restructure loans, or declare bankruptcy.

---

## 7. Deterministic Financial Test Vectors

### Test Vector 1: Gambir – Bandung Single Service Profitability
* **Consist:** 1 CC206 + 4 Executive Carriages (200 seats) + 1 Dining Car + 1 Power Van.
* **Distance:** $160\text{ km}$.
* **Load Factor:** $85\%$ (170 passengers onboard).
* **Fare:** Executive benchmark $= 250,000\text{ IDR}$.
* **Gross Ticket Revenue:** $170 \times 250,000 = 42,500,000\text{ IDR}$.
* **Dining Revenue:** $170 \times 35,000 = 5,950,000\text{ IDR}$.
* **Total Revenue:** $48,450,000\text{ IDR}$.
* **OPEX Breakdown:**
  * Fuel: $160 \times 3.8 \times 15,000 = 9,120,000\text{ IDR}$.
  * Track Access: $160 \times (25,000 + 5,000 \times 3.5) = 6,800,000\text{ IDR}$.
  * Crew Run Allowance: $3\text{ hrs} \times (75k + 45k + 35k) = 465,000\text{ IDR}$.
  * Maintenance Reserve: $160 \times 12,000 = 1,920,000\text{ IDR}$.
  * Total Direct OPEX: $18,305,000\text{ IDR}$.
* **Net Trip Operating Margin:**
  $$\text{NetMargin} = 48,450,000 - 18,305,000 = +30,145,000\text{ IDR} \quad (+62.2\%)$$

---

## 8. Sign-off & Implementation Boundary

These financial formulas represent the fixed economic parameters of `@railway/economy`. Changes must be verified against game balance tests in `packages/economy/tests/ledger.spec.ts`.
