# Railway Network Manager — Mission Design & Progression Specification
**Document Version:** 1.0.0  
**Status:** Approved Reference / Progression Architecture Source of Truth  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§26, §27, §28, §42)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Package:** `@railway/missions`  

---

## 1. Executive Summary & Progression Philosophy

This document defines the **campaign structure, data-driven mission graph, milestone objectives, learning objectives, and reward systems** for *Railway Network Manager — Indonesia*.

### Core Principles (PRD §28)
Every mission in Railway Network Manager must serve as a **meaningful gameplay decision tutorial** rather than a passive checklist:
1. **What does the player learn?** A new operational constraint or economic relationship.
2. **What decision must the player make?** A trade-off involving capital, capacity, or scheduling.
3. **What consequence demonstrates the system?** Measurable simulation feedback (load factor, delay, cash flow).
4. **What new goal follows?** Progression to the next network tier.

```
       ┌───────────┐
       │   GOAL    │
       └─────┬─────┘
             │ introduces
             ▼
       ┌───────────┐
       │  PROBLEM  │ (e.g. Overcrowding, lead-time delay, cash deficit)
       └─────┬─────┘
             │ forces
             ▼
       ┌───────────┐
       │ DECISION  │ (e.g. Adjust fare, add carriage, schedule maintenance)
       └─────┬─────┘
             │ produces
             ▼
       ┌─────────────┐
       │ CONSEQUENCE │ (e.g. Improved OTP, higher margin, customer satisfaction)
       └─────┬───────┘
             │ unlocks
             ▼
       ┌────────────┐
       │  PROGRESS  │ ──► NEW GOAL
       └────────────┘
```

---

## 2. Campaign Progression Stages (PRD §27)

| Stage | Title | Operational Scope | Unlocked Systems |
| :---: | :--- | :--- | :--- |
| **0** | **First Service** | Single route corridor (e.g., Bandung – Cimahi or Gambir – Cirebon) | Base fleet, 1 route, basic timetable, economy class |
| **1** | **Local Operator** | Frequent suburban/regional corridor service | Multi-trip daily schedule, workforce payroll, preventive maintenance |
| **2** | **Regional Operator**| Intercity trunk corridor (Gambir – Bandung) | Executive class, Dining Car, periodic maintenance |
| **3** | **Regional Network** | Multi-corridor hub (Jakarta – Cirebon – Purwokerto) | Depot upgrades, crew qualification, peak/off-peak pricing |
| **4** | **Intercity Operator**| Cross-provincial services (Jakarta – Semarang – Surabaya) | Luxury sleeper carriages, high-speed bogies, B2B parcel cargo |
| **5** | **Growing Railway** | Mixed passenger & bulk freight operations | Container freight, charter requests, multi-loco consists |
| **6** | **Major Operator** | High-density operations across West & Central Java | Public Service Obligation (PSO) contracts, overhaul bays |
| **7** | **National Railway** | Island-wide network dominance (Pulau Jawa) | Complex track slot conflicts, express non-stop services |
| **8** | **Integrated Operator**| Synergized passenger, cargo, and premium charter logistics | Advanced route concessions, master maintenance depots |
| **9** | **Railway Group** | Conglomerate scale operations | Multi-regional holding operations |
| **10** | **Master Network** | Optimal network-wide operational and financial excellence | Complete sandbox freedom and mastery challenges |

---

## 3. Data-Driven Mission Entity & Schema (PRD §26)

All mission logic in `@railway/missions` evaluates pure state predicates against the simulation state:

```typescript
export type ObjectiveType =
  | 'PASSENGERS_TRANSPORTED'
  | 'REVENUE_REACHED'
  | 'PROFIT_MARGIN'
  | 'LOAD_FACTOR'
  | 'ON_TIME_PERFORMANCE'
  | 'FLEET_COUNT'
  | 'ROUTE_COUNT'
  | 'CONTRACT_COMPLETED'
  | 'PROCUREMENT_COMPLETED'
  | 'DEPOT_BUILT'
  | 'CASH_BALANCE';

export interface MissionObjective {
  readonly id: string;
  readonly type: ObjectiveType;
  readonly targetValue: number;
  readonly currentProgress: number;
  readonly isCompleted: boolean;
  readonly description: string;
}

export interface Mission {
  readonly id: string; // e.g., "MSN_01_FIRST_CORRIDOR"
  readonly stage: number; // 0..10
  readonly title: string;
  readonly summary: string;
  readonly narrativeContext: string;
  readonly prerequisites: ReadonlyArray<string>; // Mission IDs
  readonly objectives: ReadonlyArray<MissionObjective>;
  readonly rewards: {
    readonly cashBonus: Money;
    readonly unlockedSpecIds: ReadonlyArray<string>;
    readonly unlockedRouteIds: ReadonlyArray<string>;
    readonly reputationBonus: number;
  };
  readonly status: 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
}
```

---

## 4. MVP Campaign Missions (Stage 0 to Stage 1)

### Mission 0.1: "Pondasi Pertama" (First Foundation)
* **Stage:** 0 (First Service)
* **Narrative:** *"Selamat datang di Jawa Barat. Perusahaan Anda telah memperoleh izin operator awal. Langkah pertama adalah mendirikan kantor pusat, menyewa depo operasional di Bandung, dan memesan rangkaian kereta pertama Anda dari pabrik INKA."*
* **Pedagogical Goal:** Understand company registration, depot leasing, and the procurement lead-time flow.
* **Objectives:**
  1. `DEPOT_BUILT`: Acquire or lease 1 operational depot (Target: 1).
  2. `PROCUREMENT_COMPLETED`: Place and receive delivery of 1 Locomotive + 3 Passenger Carriages (Target: 4 units).
* **Rewards:**
  * Cash bonus: $5,000,000,000\text{ IDR}$.
  * Unlocks: Route corridor Gambir – Bandung (`RT_GMR_BDG`).

---

### Mission 0.2: "Peluit Pertama" (The First Whistle)
* **Stage:** 0 (First Service)
* **Narrative:** *"Rangkaian kereta telah tiba di Depo Bandung. Jalur Bandung – Gambir siap dioperasikan. Tetapkan jadwal harian pertama, tugaskan masinis bersertifikat, dan mulailah melayani penumpang umum."*
* **Pedagogical Goal:** Master timetable scheduling, consist composition, and crew assignment.
* **Objectives:**
  1. `ROUTE_COUNT`: Open the Bandung – Gambir corridor (Target: 1).
  2. `PASSENGERS_TRANSPORTED`: Safely transport 200 passengers (Target: 200).
* **Rewards:**
  * Cash bonus: $10,000,000,000\text{ IDR}$.
  * Reputation boost: $+0.05$.
  * Unlocks: Mission 0.3.

---

### Mission 0.3: "Keseimbangan Tarif" (Fare Balancing)
* **Stage:** 0 (First Service)
* **Narrative:** *"Layanan Anda diminati, namun banyak gerbong yang terlalu padat atau terlalu sepi pada jam-jam tertentu. Sesuaikan tarif per kilometer untuk mencapai tingkat keterisian (Load Factor) yang sehat tanpa menimbulkan penumpukan penumpang."*
* **Pedagogical Goal:** Master price elasticity and the trade-off between ticket pricing and overcrowding dwell penalties.
* **Objectives:**
  1. `LOAD_FACTOR`: Achieve an average Load Factor between $75\%$ and $95\%$ across 5 consecutive trips.
  2. `PROFIT_MARGIN`: Generate an operating profit margin $\ge 25\%$ across daily operations.
* **Rewards:**
  * Cash bonus: $15,000,000,000\text{ IDR}$.
  * Unlocks: Promotion to **Stage 1 (Local Operator)**, K1 Executive Carriages specification.

---

### Mission 1.1: "Ketepatan Waktu & Perawatan" (On-Time Performance & Maintenance)
* **Stage:** 1 (Local Operator)
* **Narrative:** *"Setelah menempuh ribuan kilometer, lokomotif mulai mengalami keausan mekanis. Bila kondisi mesin turun di bawah 80%, risiko keterlambatan melonjak. Jadwalkan perawatan berkala di depo tanpa mengganggu jadwal perjalanan."*
* **Pedagogical Goal:** Understand mechanical wear, depot maintenance slots, and spare rolling stock circulation.
* **Objectives:**
  1. Execute 2 successful `PREVENTIVE` or `PERIODIC` maintenance jobs at the home depot.
  2. `ON_TIME_PERFORMANCE`: Maintain On-Time Performance $\ge 90\%$ over 14 simulated days.
* **Rewards:**
  * Cash bonus: $25,000,000,000\text{ IDR}$.
  * Unlocks: Dining Car (Restorasi) specification (`SPEC_DINING_M1`).

---

## 5. Objective Evaluator Execution Contract

The mission engine evaluates progress deterministically at the conclusion of each simulated tick:

```typescript
export class MissionEvaluator {
  public evaluateState(
    mission: Mission,
    gameState: Readonly<GameState>
  ): MissionEvaluationResult {
    const updatedObjectives = mission.objectives.map((obj) => {
      const progress = this.calculateObjectiveProgress(obj.type, gameState);
      return {
        ...obj,
        currentProgress: progress,
        isCompleted: progress >= obj.targetValue,
      };
    });

    const allCompleted = updatedObjectives.every((o) => o.isCompleted);

    return {
      missionId: mission.id,
      isCompleted: allCompleted,
      updatedObjectives,
    };
  }
}
```

* **Security Rule:** Mission completion can never be triggered directly by the frontend client. The evaluator runs solely on the backend inside the application service layer upon state commit.
