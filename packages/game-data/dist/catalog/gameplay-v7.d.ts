/** Provisional single-player balance. These are game rules, not KAI specifications. */
export declare const CORE_BALANCE: {
    readonly starterHub: "STN_BD_BANDUNG";
    readonly starterReserveCash: 150000000;
    readonly fuelBasePrice: 14000;
    readonly fuelReserve: 0.1;
    readonly starterRealHours: 24;
    readonly depotCapacity: 12000;
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
    readonly retrofitCostFraction: 0.35;
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
    kind: "loco" | "coach" | "generator" | "dining";
    asset: string;
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
export declare const CORE_PRODUCTS: readonly CoreProduct[];
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
//# sourceMappingURL=gameplay-v7.d.ts.map