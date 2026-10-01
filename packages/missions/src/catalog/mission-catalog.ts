import {
  createBrandedId,
  toMoney,
  MissionId,
} from '@railway/shared';
import { MissionProps } from '../types/mission.types.js';

export const CAMPAIGN_MISSION_CATALOG: ReadonlyArray<MissionProps> = Object.freeze([
  // --- STAGE 0: FIRST SERVICE ---
  {
    id: createBrandedId<MissionId>('MSN_01_FIRST_FOUNDATION'),
    stage: 0,
    title: 'Pondasi Pertama (First Foundation)',
    summary: 'Mendirikan kantor pusat, menyewa depo Bandung, dan memesan rangkaian kereta pertama.',
    narrativeContext:
      'Selamat datang di Jawa Barat. Perusahaan Anda telah memperoleh izin operator awal. Langkah pertama adalah mendirikan kantor pusat, menyewa depo operasional di Bandung, dan memesan rangkaian kereta pertama Anda dari pabrik INKA.',
    prerequisites: [],
    objectives: [
      {
        id: 'OBJ_DEPOT_01',
        type: 'DEPOT_BUILT',
        targetValue: 1,
        currentProgress: 0,
        isCompleted: false,
        description: 'Miliki atau sewa minimal 1 depo operasional aktif.',
      },
      {
        id: 'OBJ_PROCURE_01',
        type: 'PROCUREMENT_COMPLETED',
        targetValue: 4,
        currentProgress: 0,
        isCompleted: false,
        description: 'Terima pengiriman 4 unit armada (1 Lokomotif + 3 Kereta Penumpang).',
      },
    ],
    rewards: {
      cashBonus: toMoney(5_000_000_000), // Rp 5 Miliar
      unlockedSpecIds: ['SPEC_LOCO_CC201', 'SPEC_COACH_K3_PREMIUM'],
      unlockedRouteIds: ['ROUTE_GMR_BD'],
      reputationBonus: 0.02,
    },
    status: 'AVAILABLE',
  },
  {
    id: createBrandedId<MissionId>('MSN_02_FIRST_WHISTLE'),
    stage: 0,
    title: 'Peluit Pertama (The First Whistle)',
    summary: 'Membuka rute Gambir - Bandung dan mengangkut 200 penumpang pertama.',
    narrativeContext:
      'Rangkaian kereta telah tiba di Depo Bandung. Jalur Bandung – Gambir siap dioperasikan. Tetapkan jadwal harian pertama, tugaskan masinis bersertifikat, dan mulailah melayani penumpang umum.',
    prerequisites: [createBrandedId<MissionId>('MSN_01_FIRST_FOUNDATION')],
    objectives: [
      {
        id: 'OBJ_ROUTE_01',
        type: 'ROUTE_COUNT',
        targetValue: 1,
        currentProgress: 0,
        isCompleted: false,
        description: 'Buka dan jadwalkan minimal 1 koridor rute aktif.',
      },
      {
        id: 'OBJ_PAX_01',
        type: 'PASSENGERS_TRANSPORTED',
        targetValue: 200,
        currentProgress: 0,
        isCompleted: false,
        description: 'Angkut minimal 200 penumpang secara selamat.',
      },
    ],
    rewards: {
      cashBonus: toMoney(10_000_000_000), // Rp 10 Miliar
      unlockedSpecIds: [],
      unlockedRouteIds: [],
      reputationBonus: 0.05,
    },
    status: 'LOCKED',
  },
  {
    id: createBrandedId<MissionId>('MSN_03_FARE_BALANCING'),
    stage: 0,
    title: 'Keseimbangan Tarif (Fare Balancing)',
    summary: 'Mencapai Load Factor optimal dan margin keuntungan operasional yang sehat.',
    narrativeContext:
      'Layanan Anda diminati, namun banyak gerbong yang terlalu padat atau terlalu sepi pada jam-jam tertentu. Sesuaikan tarif per kilometer untuk mencapai tingkat keterisian (Load Factor) yang sehat tanpa menimbulkan penumpukan penumpang.',
    prerequisites: [createBrandedId<MissionId>('MSN_02_FIRST_WHISTLE')],
    objectives: [
      {
        id: 'OBJ_LF_01',
        type: 'LOAD_FACTOR',
        targetValue: 80,
        currentProgress: 0,
        isCompleted: false,
        description: 'Capai rata-rata Load Factor minimal 80%.',
      },
      {
        id: 'OBJ_MARGIN_01',
        type: 'PROFIT_MARGIN',
        targetValue: 25,
        currentProgress: 0,
        isCompleted: false,
        description: 'Capai operating profit margin harian minimal 25%.',
      },
    ],
    rewards: {
      cashBonus: toMoney(15_000_000_000), // Rp 15 Miliar
      unlockedSpecIds: ['SPEC_COACH_K1_EXEC'],
      unlockedRouteIds: [],
      reputationBonus: 0.05,
    },
    status: 'LOCKED',
  },

  // --- STAGE 1: LOCAL OPERATOR ---
  {
    id: createBrandedId<MissionId>('MSN_11_MAINTENANCE_OTP'),
    stage: 1,
    title: 'Ketepatan Waktu & Perawatan (OTP & Maintenance)',
    summary: 'Menjaga On-Time Performance minimal 90% dan merawat armada di depo.',
    narrativeContext:
      'Setelah menempuh ribuan kilometer, lokomotif mulai mengalami keausan mekanis. Bila kondisi mesin turun di bawah 80%, risiko keterlambatan melonjak. Jadwalkan perawatan berkala di depo tanpa mengganggu jadwal perjalanan.',
    prerequisites: [createBrandedId<MissionId>('MSN_03_FARE_BALANCING')],
    objectives: [
      {
        id: 'OBJ_OTP_01',
        type: 'ON_TIME_PERFORMANCE',
        targetValue: 90,
        currentProgress: 0,
        isCompleted: false,
        description: 'Pertahankan On-Time Performance (OTP) minimal 90%.',
      },
      {
        id: 'OBJ_FLEET_01',
        type: 'FLEET_COUNT',
        targetValue: 6,
        currentProgress: 0,
        isCompleted: false,
        description: 'Perbesar armada operasional menjadi minimal 6 unit rolling stock.',
      },
    ],
    rewards: {
      cashBonus: toMoney(25_000_000_000), // Rp 25 Miliar
      unlockedSpecIds: ['SPEC_COACH_M1_DINING', 'SPEC_VAN_P_GENERATOR'],
      unlockedRouteIds: ['ROUTE_GMR_CN'],
      reputationBonus: 0.08,
    },
    status: 'LOCKED',
  },
]);
