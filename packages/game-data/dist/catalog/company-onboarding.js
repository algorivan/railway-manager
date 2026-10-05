import { CORE_SELECTABLE_STATIONS } from "./operating-network.js";
/** Provisional game prices and rewards; never presented as actual Indonesian depot costs. */
const cities = [
    {
        id: "jakarta",
        name: "Jakarta",
        cost: 20_000_000,
        station: "STN_GMR_GAMBIR",
    },
    {
        id: "bandung",
        name: "Bandung",
        cost: 15_000_000,
        station: "STN_BD_BANDUNG",
    },
    {
        id: "cirebon",
        name: "Cirebon",
        cost: 10_000_000,
        station: "STN_CN_CIREBON",
    },
    {
        id: "semarang",
        name: "Semarang",
        cost: 12_000_000,
        station: "STN_SMT_SEMARANGTAWANG",
    },
    {
        id: "yogyakarta",
        name: "Yogyakarta",
        cost: 12_000_000,
        station: "STN_YK_YOGYAKARTA",
    },
    {
        id: "surakarta",
        name: "Surakarta / Solo",
        cost: 10_000_000,
        station: "STN_SLO_SOLOBALAPAN",
    },
    {
        id: "surabaya",
        name: "Surabaya",
        cost: 18_000_000,
        station: "STN_SGU_SURABAYAGUBENG",
    },
];
export const CORE_DEPOT_CITIES = [
    ...cities.map((c) => ({
        ...c,
        stationIds: CORE_SELECTABLE_STATIONS.filter((s) => s.connected &&
            (s.id === c.station ||
                s.city?.toLocaleLowerCase("id").replace(/^kota\s+/, "") ===
                    c.name.toLocaleLowerCase("id") ||
                (c.id === "surakarta" && s.city?.toLowerCase() === "surakarta"))).map((s) => s.id),
    })),
    ...CORE_SELECTABLE_STATIONS.filter((s) => s.connected &&
        !cities.some((c) => c.station === s.id ||
            s.city?.toLocaleLowerCase("id").replace(/^kota\s+/, "") ===
                c.name.toLocaleLowerCase("id") ||
            (c.id === "surakarta" && s.city?.toLowerCase() === "surakarta"))).map((s) => ({
        id: `station:${s.id}`,
        name: s.city ?? `Kawasan ${s.name.replace(/^Stasiun /, "")}`,
        cost: 10_000_000,
        stationIds: [s.id],
    })),
];
export function depotContractPrice(stationId) {
    return (CORE_DEPOT_CITIES.find((c) => c.stationIds.includes(stationId))?.cost ??
        10_000_000);
}
export const CORE_ONBOARDING_MISSIONS = [
    {
        id: "company",
        title: "Dirikan depo & pilih hub",
        xp: 40,
        cash: 2_000_000_000,
        screen: "tutorial",
    },
    {
        id: "orders",
        title: "Pesan paket sarana starter",
        xp: 30,
        cash: 1_000_000_000,
        screen: "market",
    },
    {
        id: "accept",
        title: "Terima sarana starter",
        xp: 40,
        cash: 500_000_000,
        screen: "market",
    },
    {
        id: "formation",
        title: "Rakit trainset pertama",
        xp: 60,
        cash: 1_500_000_000,
        screen: "fleet",
    },
    {
        id: "crew",
        title: "Penuhi kebutuhan SDM",
        xp: 30,
        cash: 400_000_000,
        screen: "office",
    },
    {
        id: "fuel",
        title: "Isi fuel onboard",
        xp: 40,
        cash: 500_000_000,
        screen: "fleet",
    },
    {
        id: "service",
        title: "Buat relasi pertama",
        xp: 50,
        cash: 1_000_000_000,
        screen: "schedule",
    },
    {
        id: "schedule",
        title: "Aktifkan jadwal pertama",
        xp: 70,
        cash: 1_000_000_000,
        screen: "schedule",
    },
    {
        id: "run",
        title: "Selesaikan dinas pertama",
        xp: 100,
        cash: 2_000_000_000,
        screen: "fleet",
    },
];
/** v2 cash amounts for one-time upgrades of already claimed mission rewards. */
export const CORE_LEGACY_MISSION_CASH = {
    company: 100_000_000,
    orders: 25_000_000,
    accept: 50_000_000,
    formation: 75_000_000,
    crew: 25_000_000,
    fuel: 40_000_000,
    service: 50_000_000,
    schedule: 75_000_000,
    run: 150_000_000,
};
//# sourceMappingURL=company-onboarding.js.map