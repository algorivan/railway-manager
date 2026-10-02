export interface DepotCity {
    id: string;
    name: string;
    cost: number;
    stationIds: string[];
}
export declare const CORE_DEPOT_CITIES: readonly DepotCity[];
export declare function depotContractPrice(stationId: string): number;
export declare const CORE_ONBOARDING_MISSIONS: readonly [{
    readonly id: "company";
    readonly title: "Dirikan depo & pilih hub";
    readonly xp: 40;
    readonly cash: 100000000;
    readonly screen: "tutorial";
}, {
    readonly id: "orders";
    readonly title: "Pesan paket sarana starter";
    readonly xp: 30;
    readonly cash: 25000000;
    readonly screen: "market";
}, {
    readonly id: "accept";
    readonly title: "Terima sarana starter";
    readonly xp: 40;
    readonly cash: 50000000;
    readonly screen: "market";
}, {
    readonly id: "formation";
    readonly title: "Rakit trainset pertama";
    readonly xp: 60;
    readonly cash: 75000000;
    readonly screen: "fleet";
}, {
    readonly id: "crew";
    readonly title: "Penuhi kebutuhan SDM";
    readonly xp: 30;
    readonly cash: 25000000;
    readonly screen: "office";
}, {
    readonly id: "fuel";
    readonly title: "Isi fuel onboard";
    readonly xp: 40;
    readonly cash: 40000000;
    readonly screen: "fleet";
}, {
    readonly id: "service";
    readonly title: "Buat relasi pertama";
    readonly xp: 50;
    readonly cash: 50000000;
    readonly screen: "schedule";
}, {
    readonly id: "schedule";
    readonly title: "Aktifkan jadwal pertama";
    readonly xp: 70;
    readonly cash: 75000000;
    readonly screen: "schedule";
}, {
    readonly id: "run";
    readonly title: "Selesaikan dinas pertama";
    readonly xp: 100;
    readonly cash: 150000000;
    readonly screen: "fleet";
}];
export type OnboardingMissionId = (typeof CORE_ONBOARDING_MISSIONS)[number]["id"];
//# sourceMappingURL=company-onboarding.d.ts.map