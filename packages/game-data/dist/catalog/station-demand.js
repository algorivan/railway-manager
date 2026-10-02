const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, field) => {
    if (!Number.isFinite(value))
        throw new Error(`Invalid station demand factor: ${field}`);
    return value;
};
export function stationHumanDevelopmentMultiplier(hdi) {
    if (!hdi)
        return 1;
    if (!Number.isFinite(hdi.value) || hdi.value < 0 || hdi.value > 100 || !Number.isInteger(hdi.year) || !hdi.area.trim() || !/^https:\/\//.test(hdi.sourceUrl))
        throw new Error("IPM requires a 0–100 value, year, area and HTTPS source URL");
    // Small modifier only: IPM measures human development, not passenger volumes or purchasing power.
    return clamp(1 + (hdi.value - 70) / 300, 0.9, 1.1);
}
export function deriveStationDemand(f) {
    const development = clamp(finite(f.urbanDevelopment, "urbanDevelopment"), 0, 1);
    const jobs = clamp(finite(f.employment, "employment"), 0, 1);
    const education = clamp(finite(f.education, "education"), 0, 1);
    const tourism = clamp(finite(f.tourism, "tourism"), 0, 1);
    const interchange = clamp(finite(f.interchange, "interchange"), 0, 1);
    const daily = Math.max(0, finite(f.dailyCatchmentPotential, "dailyCatchmentPotential"))
        * (0.75 + 0.25 * development) * (0.8 + 0.2 * jobs + 0.1 * education)
        * (1 + 0.25 * tourism + 0.2 * interchange)
        * clamp(finite(f.railPreference, "railPreference"), 0.25, 1.5)
        * clamp(finite(f.stationCapture, "stationCapture"), 0, 1)
        * stationHumanDevelopmentMultiplier(f.humanDevelopment);
    const commuter = 0.3 + 0.45 * jobs + 0.35 * education;
    const business = 0.15 + 0.45 * development + 0.3 * jobs;
    const tourist = 0.1 + 0.9 * tourism;
    const total = commuter + business + tourist;
    return { baseDailyDemand: Math.round(daily), commuterShare: commuter / total, businessShare: business / total, touristShare: tourist / total };
}
const tiers = {
    local: { dailyCatchmentPotential: 1700, urbanDevelopment: 0.35, employment: 0.35, education: 0.25, tourism: 0.15, interchange: 0.05, railPreference: 0.85, stationCapture: 0.65 },
    district: { dailyCatchmentPotential: 4500, urbanDevelopment: 0.55, employment: 0.55, education: 0.45, tourism: 0.25, interchange: 0.2, railPreference: 0.9, stationCapture: 0.8 },
    regional: { dailyCatchmentPotential: 10000, urbanDevelopment: 0.7, employment: 0.7, education: 0.65, tourism: 0.4, interchange: 0.5, railPreference: 1, stationCapture: 0.85 },
    urban: { dailyCatchmentPotential: 20000, urbanDevelopment: 0.85, employment: 0.85, education: 0.75, tourism: 0.5, interchange: 0.7, railPreference: 1, stationCapture: 0.85 },
};
const urbanCodes = new Set("GMR BD SMT YK SLO SGU SBI SB BKS CMI KAC LPN PWS WO ML".split(" "));
const regionalCodes = new Set("CN TG PK PWT TSM MN MR KD BL PB JR BWI KTG".split(" "));
const districtCodes = new Set("KW CKP PWK PDL HGL JTB BB PML BTG WLR NBO CU BJ BBT LMG PPK BMA KYA GB KM KTA WT CCL CB CI BJR SDR MA MGW BBN KT SR NGW CRB NJ KTS GD TA NT WG KPN BG PS SDA KK TGL RBP KLT KBR GLM RGP".split(" "));
const overrides = {
    ML: { education: 0.95, tourism: 0.8, interchange: 0.55, railPreference: 0.95 },
    BL: { tourism: 0.65, employment: 0.6, education: 0.55, interchange: 0.35 },
    KD: { employment: 0.85, tourism: 0.3, education: 0.6 },
    PB: { employment: 0.65, tourism: 0.75, education: 0.45, railPreference: 0.9 },
    JR: { education: 0.9, employment: 0.7, tourism: 0.5, interchange: 0.7 },
    BWI: { tourism: 0.95, employment: 0.55, interchange: 0.45 },
    KTG: { dailyCatchmentPotential: 8500, urbanDevelopment: 0.55, employment: 0.6, education: 0.3, tourism: 0.9, interchange: 1, stationCapture: 0.8 },
    KTS: { interchange: 0.95 }, BG: { interchange: 0.9 }, KLT: { interchange: 0.9 },
    KBR: { tourism: 0.65 }, RGP: { tourism: 0.6, interchange: 0.5 },
    MGW: { education: 0.9, tourism: 0.65 }, BBN: { tourism: 0.95 },
    PDL: { interchange: 0.8 }, KYA: { interchange: 0.95 }, KTA: { interchange: 0.8 },
};
/** Legacy hub volumes stay calibrated to their old balance; all intermediate stations get distinct catchments. */
export function stationDemandFor(code, name, legacy) {
    const tier = urbanCodes.has(code) ? "urban" : regionalCodes.has(code) ? "regional" : districtCodes.has(code) ? "district" : "local";
    const factors = { ...tiers[tier], ...overrides[code] };
    if (legacy) {
        const unit = deriveStationDemand({ ...factors, dailyCatchmentPotential: 1_000_000 }).baseDailyDemand / 1_000_000;
        factors.dailyCatchmentPotential = legacy.baseDailyDemand / unit;
    }
    const profile = legacy ?? deriveStationDemand(factors);
    return { profile, context: { factors, catchment: name.replace(/^Stasiun /, ""), basis: legacy ? "legacy-calibration" : "provisional-game", hdiMultiplier: stationHumanDevelopmentMultiplier(factors.humanDevelopment),
            notes: "Estimated game catchment, not population or observed ridership. Official BPS IPM/population have not been loaded; absent IPM is neutral. stationCapture discounts the station catchment; a shared spatial population pool is not modelled; no official station class is inferred." } };
}
/** Purpose mix affects peaks; two endpoint factors are averaged by the booking engine. */
export function stationPurposeTimeFactor(profile, minute) {
    const hour = (((minute % 1440) + 1440) % 1440) / 60;
    const weights = hour >= 6 && hour < 10 ? [1.5, 1.2, 0.8]
        : hour >= 16 && hour < 20 ? [1.4, 1.15, 0.95]
            : hour >= 10 && hour < 16 ? [0.7, 1, 1.25]
                : hour >= 20 || hour < 4 ? [0.5, 0.65, 0.9] : [0.9, 0.75, 0.7];
    return profile.commuterShare * weights[0] + profile.businessShare * weights[1] + profile.touristShare * weights[2];
}
//# sourceMappingURL=station-demand.js.map