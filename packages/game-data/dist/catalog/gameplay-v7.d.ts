/** Provisional single-player balance. These are game rules, not KAI specifications. */
export declare const CORE_BALANCE: {
    readonly starterHub: "STN_BD_BANDUNG";
    readonly starterReserveCash: 500000000;
    readonly fuelBasePrice: 14000;
    readonly fuelReserve: 0.1;
    readonly starterRealHours: 24;
    readonly depotCapacity: 50000;
    readonly dwellMinutes: 3;
    readonly turnaroundMinutes: 60;
    readonly changeServiceMinutes: 30;
    readonly headwayMinutes: 5;
    readonly crewPerHour: 150000;
    readonly maintenancePerKm: 800;
    readonly depotPerDay: 200000;
    readonly marketShare: 0.018;
    readonly tacBase: 25000;
    readonly tacWeightSurcharge: 5000;
    readonly depotContractCost: 10000000;
    readonly corridorAccessCost: 25000000;
    readonly storageUpgradeCost: 20000000;
    readonly p1CostFraction: 0.001;
    readonly retrofitCostFraction: 0.08;
    readonly marketing: readonly [{
        readonly name: "Promosi hub";
        readonly cost: 5000000;
        readonly days: 7;
        readonly lift: 0.05;
    }, {
        readonly name: "Promosi koridor";
        readonly cost: 15000000;
        readonly days: 7;
        readonly lift: 0.12;
    }, {
        readonly name: "Promosi regional";
        readonly cost: 40000000;
        readonly days: 14;
        readonly lift: 0.2;
    }];
};
export declare const CORE_STATION_PROVINCE: Readonly<Record<string, string>>;
export type CoreClass = "EC" | "EX" | "LX";
export interface CoreProduct {
    id: string;
    name: string;
    kind: "loco" | "coach" | "generator" | "dining" | "cargo";
    asset: string;
    cargoType?: "oil" | "mineral" | "logistics";
    cargoTons?: number;
    seats: number;
    serviceClass?: CoreClass;
    price: number;
    length: number;
    weight: number;
    speed: number;
    tank: number;
    litersPerKm: number;
    body: "mild-steel" | "stainless";
    comfort: number;
    powerKw: number;
    deliveryMinutes: number;
}
/** Planning-first balance v2: physical weight/length/speed stay intact; capital and delivery times are game values. */
export declare const CORE_PRODUCTS: readonly CoreProduct[];
export declare const CORE_REFUEL_STATION_CODES: Set<string>;
export declare const CORE_CARGO_OFFERS: readonly [{
    readonly id: "oil";
    readonly name: "Distribusi migas";
    readonly investment: 6000000000;
    readonly paymentPerTonKm: 5000;
    readonly bonus: 100000000;
    readonly trips: 6;
    readonly days: 4;
}, {
    readonly id: "mineral";
    readonly name: "Angkutan mineral";
    readonly investment: 5500000000;
    readonly paymentPerTonKm: 4200;
    readonly bonus: 90000000;
    readonly trips: 8;
    readonly days: 5;
}, {
    readonly id: "logistics";
    readonly name: "Logistik kontainer";
    readonly investment: 5000000000;
    readonly paymentPerTonKm: 5500;
    readonly bonus: 120000000;
    readonly trips: 8;
    readonly days: 5;
}];
export declare const CORE_ECONOMY_VERSION = 3;
/** Existing contracts keep their original investment/penalty basis. */
export declare const CORE_LEGACY_CARGO_INVESTMENT: {
    readonly oil: 1800000000;
    readonly mineral: 1600000000;
    readonly logistics: 1500000000;
};
export declare const CORE_FARES: {
    readonly EC: {
        readonly boarding: 5000;
        readonly perKm: 500;
        readonly elasticity: 1.6;
    };
    readonly EX: {
        readonly boarding: 15000;
        readonly perKm: 1000;
        readonly elasticity: 0.75;
    };
    readonly LX: {
        readonly boarding: 30000;
        readonly perKm: 2500;
        readonly elasticity: 0.35;
    };
};
/** Suggested allocation of an offer, not an automatic purchase or cash reservation. */
export declare function coreCargoInvestmentBudget(offerId: (typeof CORE_CARGO_OFFERS)[number]["id"]): {
    trainsets: number;
    setupCost: number;
    fleetCost: number;
    reserve: number;
    networkBudget: number;
};
//# sourceMappingURL=gameplay-v7.d.ts.map