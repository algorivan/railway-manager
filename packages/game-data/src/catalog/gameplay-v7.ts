import { CORE_LARGE_HUB_CODES } from "./station-class.js";
/** Provisional single-player balance. These are game rules, not KAI specifications. */
export const CORE_BALANCE = {
  starterHub: "STN_BD_BANDUNG",
  starterReserveCash: 500_000_000,
  fuelBasePrice: 14_000,
  fuelReserve: 0.1,
  starterRealHours: 24,
  depotCapacity: 50_000,
  dwellMinutes: 3,
  turnaroundMinutes: 60,
  changeServiceMinutes: 30,
  headwayMinutes: 5,
  crewPerHour: 150_000,
  maintenancePerKm: 800,
  depotPerDay: 200_000,
  marketShare: 0.018,
  tacBase: 25_000,
  tacWeightSurcharge: 5_000,
  depotContractCost: 10_000_000,
  corridorAccessCost: 25_000_000,
  storageUpgradeCost: 20_000_000,
  p1CostFraction: 0.001,
  retrofitCostFraction: 0.08,
  marketing: [
    { name: "Promosi hub", cost: 5_000_000, days: 7, lift: 0.05 },
    { name: "Promosi koridor", cost: 15_000_000, days: 7, lift: 0.12 },
    { name: "Promosi regional", cost: 40_000_000, days: 14, lift: 0.2 },
  ],
} as const;

export const CORE_STATION_PROVINCE: Readonly<Record<string, string>> = {
  STN_GMR_GAMBIR: "DKI Jakarta",
  STN_BD_BANDUNG: "Jawa Barat",
  STN_CN_CIREBON: "Jawa Barat",
  STN_SMT_SEMARANGTAWANG: "Jawa Tengah",
  STN_SLO_SOLOBALAPAN: "Jawa Tengah",
  STN_YK_YOGYAKARTA: "DI Yogyakarta",
  STN_SGU_SURABAYAGUBENG: "Jawa Timur",
};

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
const coach = (
  id: string,
  name: string,
  seats: number,
  serviceClass: CoreClass,
  price: number,
  comfort: number,
  body: CoreProduct["body"] = "stainless",
): CoreProduct => ({
  id,
  name,
  kind: "coach",
  asset:
    serviceClass === "EC"
      ? "ekonomi"
      : serviceClass === "EX"
        ? "eksekutif"
        : "luxury",
  seats,
  serviceClass,
  price,
  comfort,
  body,
  length: 20,
  weight: 36,
  speed: body === "mild-steel" ? 100 : 120,
  tank: 0,
  litersPerKm: 0,
  powerKw: -25,
  deliveryMinutes: body === "mild-steel" ? 4320 : 10080,
});
const REFERENCE_PRODUCTS: readonly CoreProduct[] = [
  {
    id: "cc201",
    name: "CC201 • Baru",
    kind: "loco",
    asset: "cc201",
    seats: 0,
    price: 18_000_000_000,
    length: 14.13,
    weight: 84,
    speed: 100,
    tank: 3028,
    litersPerKm: 2.6,
    body: "mild-steel",
    comfort: 0,
    powerKw: 0,
    deliveryMinutes: 4320,
  },
  {
    id: "cc206",
    name: "CC206 • Baru",
    kind: "loco",
    asset: "cc206",
    seats: 0,
    price: 32_000_000_000,
    length: 20.92,
    weight: 90,
    speed: 120,
    tank: 3000,
    litersPerKm: 3.8,
    body: "mild-steel",
    comfort: 0,
    powerKw: 0,
    deliveryMinutes: 4320,
  },
  coach(
    "ec-standard",
    "Ekonomi Standar",
    106,
    "EC",
    4_000_000_000,
    0.7,
    "mild-steel",
  ),
  coach(
    "ec-regular",
    "Ekonomi Regular",
    80,
    "EC",
    4_500_000_000,
    0.8,
    "mild-steel",
  ),
  coach("ec-premium", "Ekonomi Premium", 80, "EC", 5_500_000_000, 0.9),
  coach("ec-ng", "Ekonomi SSNG", 72, "EC", 6_000_000_000, 1.05),
  coach(
    "ec-ng-retrofit",
    "Ekonomi NG Retrofit • Mild Steel",
    72,
    "EC",
    4_000_000_000,
    1.05,
    "mild-steel",
  ),
  coach(
    "ex-steel",
    "Eksekutif Mild Steel",
    50,
    "EX",
    6_000_000_000,
    0.9,
    "mild-steel",
  ),
  coach("ex-ss", "Eksekutif Stainless", 50, "EX", 7_500_000_000, 1),
  coach("ex-ng", "Eksekutif SSNG", 50, "EX", 8_000_000_000, 1.1),
  coach("luxury-1", "Luxury Gen 1", 18, "LX", 12_000_000_000, 1.2),
  coach("luxury-2", "Luxury Gen 2", 26, "LX", 14_000_000_000, 1.15),
  {
    id: "generator",
    name: "Kereta Pembangkit",
    kind: "generator",
    asset: "pembangkit",
    seats: 0,
    price: 5_000_000_000,
    length: 20,
    weight: 42,
    speed: 100,
    tank: 1000,
    litersPerKm: 0.2,
    body: "stainless",
    comfort: 0,
    powerKw: 300,
    deliveryMinutes: 4320,
  },
  {
    id: "dining",
    name: "Kereta Restorasi",
    kind: "dining",
    asset: "restorasi",
    seats: 0,
    price: 6_000_000_000,
    length: 20,
    weight: 42,
    speed: 100,
    tank: 0,
    litersPerKm: 0,
    body: "stainless",
    comfort: 0,
    powerKw: -30,
    deliveryMinutes: 4320,
  },
];
/** Planning-first balance v2: physical weight/length/speed stay intact; capital and delivery times are game values. */
export const CORE_PRODUCTS: readonly CoreProduct[] = [
  ...REFERENCE_PRODUCTS,
  ...(["oil", "mineral", "logistics"] as const).map((cargoType) => ({
    ...REFERENCE_PRODUCTS.find((p) => p.id === "dining")!,
    id: `cargo-${cargoType}`,
    name:
      cargoType === "oil"
        ? "Gerbong tangki migas"
        : cargoType === "mineral"
          ? "Gerbong hopper mineral"
          : "Gerbong kontainer logistik",
    kind: "cargo" as const,
    cargoType,
    cargoTons: 40,
    asset: `cargo-${cargoType}`,
    price: 1_600_000_000,
    length: 15,
    weight: 24,
    powerKw: 0,
  })),
].map((p) => ({
  ...p,
  price: Math.round(p.price * 0.05),
  tank: p.tank * 3,
  deliveryMinutes: p.kind === "loco" ? 120 : p.kind === "cargo" ? 45 : 90,
}));
export const CORE_REFUEL_STATION_CODES = CORE_LARGE_HUB_CODES;
export const CORE_CARGO_OFFERS = [
  {
    id: "oil",
    name: "Distribusi migas",
    investment: 6_000_000_000,
    paymentPerTonKm: 5000,
    bonus: 100_000_000,
    trips: 6,
    days: 4,
  },
  {
    id: "mineral",
    name: "Angkutan mineral",
    investment: 5_500_000_000,
    paymentPerTonKm: 4200,
    bonus: 90_000_000,
    trips: 8,
    days: 5,
  },
  {
    id: "logistics",
    name: "Logistik kontainer",
    investment: 5_000_000_000,
    paymentPerTonKm: 5500,
    bonus: 120_000_000,
    trips: 8,
    days: 5,
  },
] as const;
export const CORE_ECONOMY_VERSION = 3;
/** Existing contracts keep their original investment/penalty basis. */
export const CORE_LEGACY_CARGO_INVESTMENT = {
  oil: 1_800_000_000,
  mineral: 1_600_000_000,
  logistics: 1_500_000_000,
} as const;
export const CORE_FARES = {
  EC: { boarding: 5000, perKm: 500, elasticity: 1.6 },
  EX: { boarding: 15000, perKm: 1000, elasticity: 0.75 },
  LX: { boarding: 30000, perKm: 2500, elasticity: 0.35 },
} as const;

/** Suggested allocation of an offer, not an automatic purchase or cash reservation. */
export function coreCargoInvestmentBudget(
  offerId: (typeof CORE_CARGO_OFFERS)[number]["id"],
) {
  const offer = CORE_CARGO_OFFERS.find((o) => o.id === offerId)!;
  const setupCost =
    CORE_PRODUCTS.find((p) => p.id === "cc201")!.price +
    2 * CORE_PRODUCTS.find((p) => p.id === `cargo-${offerId}`)!.price;
  const trainsets = 3,
    reserve = CORE_BALANCE.starterReserveCash * 2;
  return {
    trainsets,
    setupCost,
    fleetCost: setupCost * trainsets,
    reserve,
    networkBudget: Math.max(
      0,
      offer.investment - setupCost * trainsets - reserve,
    ),
  };
}
