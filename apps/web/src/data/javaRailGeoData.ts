export interface RealStation {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly city: string;
  readonly daop: string;
  readonly lat: number;
  readonly lng: number;
  readonly isHub: boolean;
  readonly facilities: string;
  readonly elevationMeters: number;
}

export interface TrackLineSegment {
  readonly id: string;
  readonly name: string;
  readonly path: ReadonlyArray<[number, number]>;
  readonly isActiveDefault: boolean;
}

/**
 * All major railway stations across all cities in Java Island (DAOP 1 to DAOP 9)
 * with accurate real-world GPS coordinates (WGS84).
 */
export const JAVA_ALL_MAJOR_STATIONS: ReadonlyArray<RealStation> = [
  // --- DAOP 1 JAKARTA & BANTEN ---
  {
    id: 'STN_GMR_GAMBIR',
    code: 'GMR',
    name: 'Stasiun Gambir',
    city: 'Jakarta Pusat',
    daop: 'DAOP 1 Jakarta',
    lat: -6.1767,
    lng: 106.8306,
    isHub: true,
    facilities: 'Terminal Eksekutif, VIP Lounge, 4 Jalur Layang',
    elevationMeters: 16,
  },
  {
    id: 'STN_PSE_PASARSENEN',
    code: 'PSE',
    name: 'Stasiun Pasar Senen',
    city: 'Jakarta Pusat',
    daop: 'DAOP 1 Jakarta',
    lat: -6.1747,
    lng: 106.8447,
    isHub: true,
    facilities: 'Terminal Campuran Utama, 6 Jalur',
    elevationMeters: 4,
  },
  {
    id: 'STN_JAKK_JAKARTAKOTA',
    code: 'JAKK',
    name: 'Stasiun Jakarta Kota (Beos)',
    city: 'Jakarta Barat',
    daop: 'DAOP 1 Jakarta',
    lat: -6.1376,
    lng: 106.8146,
    isHub: true,
    facilities: 'Terminus Bersejarah, 12 Jalur Terminal',
    elevationMeters: 4,
  },
  {
    id: 'STN_BKS_BEKASI',
    code: 'BKS',
    name: 'Stasiun Bekasi',
    city: 'Bekasi',
    daop: 'DAOP 1 Jakarta',
    lat: -6.2361,
    lng: 106.9995,
    isHub: false,
    facilities: 'Double-Double Track (DDT) Hub',
    elevationMeters: 19,
  },
  {
    id: 'STN_CKR_CIKARANG',
    code: 'CKR',
    name: 'Stasiun Cikarang',
    city: 'Bekasi',
    daop: 'DAOP 1 Jakarta',
    lat: -6.2555,
    lng: 107.1517,
    isHub: false,
    facilities: 'Ujung Elektrifikasi KRL Commuter Line',
    elevationMeters: 18,
  },
  {
    id: 'STN_KW_KARAWANG',
    code: 'KW',
    name: 'Stasiun Karawang',
    city: 'Karawang',
    daop: 'DAOP 1 Jakarta',
    lat: -6.3059,
    lng: 107.3006,
    isHub: false,
    facilities: 'Jalur Ganda Pantura',
    elevationMeters: 16,
  },
  {
    id: 'STN_CKP_CIKAMPEK',
    code: 'CKP',
    name: 'Stasiun Cikampek',
    city: 'Karawang',
    daop: 'DAOP 1 Jakarta',
    lat: -6.4172,
    lng: 107.4589,
    isHub: true,
    facilities: 'Percabangan Segitiga Pantura & Bandung, Dipo Traksi',
    elevationMeters: 46,
  },
  {
    id: 'STN_RK_RANGKASBITUNG',
    code: 'RK',
    name: 'Stasiun Rangkasbitung',
    city: 'Lebak',
    daop: 'DAOP 1 Jakarta',
    lat: -6.3575,
    lng: 106.2483,
    isHub: false,
    facilities: 'Terminus Jalur Barat Banten',
    elevationMeters: 22,
  },
  {
    id: 'STN_MER_MERAK',
    code: 'MER',
    name: 'Stasiun Merak',
    city: 'Cilegon',
    daop: 'DAOP 1 Jakarta',
    lat: -5.9328,
    lng: 105.9997,
    isHub: true,
    facilities: 'Integrasi Pelabuhan Ferry Merak-Bakauheni',
    elevationMeters: 3,
  },

  // --- DAOP 2 BANDUNG & PRIANGAN ---
  {
    id: 'STN_PWK_PURWAKARTA',
    code: 'PWK',
    name: 'Stasiun Purwakarta',
    city: 'Purwakarta',
    daop: 'DAOP 2 Bandung',
    lat: -6.5567,
    lng: 107.4447,
    isHub: false,
    facilities: 'Dipo Kereta Cadangan, Tanjakan Cisomang',
    elevationMeters: 84,
  },
  {
    id: 'STN_PDL_PADALARANG',
    code: 'PDL',
    name: 'Stasiun Padalarang',
    city: 'Bandung Barat',
    daop: 'DAOP 2 Bandung',
    lat: -6.8407,
    lng: 107.4795,
    isHub: true,
    facilities: 'Hub Integrasi Kereta Cepat Whoosh & Feeder KA',
    elevationMeters: 695,
  },
  {
    id: 'STN_CMI_CIMAHI',
    code: 'CMI',
    name: 'Stasiun Cimahi',
    city: 'Cimahi',
    daop: 'DAOP 2 Bandung',
    lat: -6.8856,
    lng: 107.5364,
    isHub: false,
    facilities: 'Pemberhentian Utama Aglomerasi Bandung',
    elevationMeters: 723,
  },
  {
    id: 'STN_BD_BANDUNG',
    code: 'BD',
    name: 'Stasiun Bandung',
    city: 'Bandung',
    daop: 'DAOP 2 Bandung',
    lat: -6.9142,
    lng: 107.6025,
    isHub: true,
    facilities: 'Dipo Lokomotif & Kereta Bandung, Kantor DAOP 2',
    elevationMeters: 709,
  },
  {
    id: 'STN_KAC_KIARACONDONG',
    code: 'KAC',
    name: 'Stasiun Kiaracondong',
    city: 'Bandung',
    daop: 'DAOP 2 Bandung',
    lat: -6.9328,
    lng: 107.6461,
    isHub: false,
    facilities: 'Terminal Kereta Ekonomi Jarak Jauh',
    elevationMeters: 681,
  },
  {
    id: 'STN_TSM_TASIKMALAYA',
    code: 'TSM',
    name: 'Stasiun Tasikmalaya',
    city: 'Tasikmalaya',
    daop: 'DAOP 2 Bandung',
    lat: -7.3228,
    lng: 108.2239,
    isHub: true,
    facilities: 'Hub Utama Jalur Selatan Priangan',
    elevationMeters: 349,
  },
  {
    id: 'STN_CI_CIAMIS',
    code: 'CI',
    name: 'Stasiun Ciamis',
    city: 'Ciamis',
    daop: 'DAOP 2 Bandung',
    lat: -7.3278,
    lng: 108.3536,
    isHub: false,
    facilities: 'Jalur Tunggal Berliku Lembah Cirahong',
    elevationMeters: 199,
  },
  {
    id: 'STN_BJR_BANJAR',
    code: 'BJR',
    name: 'Stasiun Banjar',
    city: 'Banjar',
    daop: 'DAOP 2 Bandung',
    lat: -7.3719,
    lng: 108.5414,
    isHub: true,
    facilities: 'Stasiun Batas Wilayah Jabar - Jateng',
    elevationMeters: 32,
  },

  // --- DAOP 3 CIREBON ---
  {
    id: 'STN_JTB_JATIBARANG',
    code: 'JTB',
    name: 'Stasiun Jatibarang',
    city: 'Indramayu',
    daop: 'DAOP 3 Cirebon',
    lat: -6.4744,
    lng: 108.3072,
    isHub: false,
    facilities: 'Jalur Ganda Pantura Barat',
    elevationMeters: 8,
  },
  {
    id: 'STN_CN_CIREBON',
    code: 'CN',
    name: 'Stasiun Cirebon (Kejaksan)',
    city: 'Cirebon',
    daop: 'DAOP 3 Cirebon',
    lat: -6.7053,
    lng: 108.5554,
    isHub: true,
    facilities: 'Dipo Lokomotif Kejaksan, Terminal Peti Kemas, DAOP 3',
    elevationMeters: 4,
  },
  {
    id: 'STN_CNP_PRUJAKAN',
    code: 'CNP',
    name: 'Stasiun Cirebon Prujakan',
    city: 'Cirebon',
    daop: 'DAOP 3 Cirebon',
    lat: -6.7214,
    lng: 108.5606,
    isHub: false,
    facilities: 'Terminal KA Ekonomi & Barang Pantura',
    elevationMeters: 4,
  },
  {
    id: 'STN_BB_BREBES',
    code: 'BB',
    name: 'Stasiun Brebes',
    city: 'Brebes',
    daop: 'DAOP 3 Cirebon',
    lat: -6.8661,
    lng: 109.0433,
    isHub: false,
    facilities: 'Pintu Gerbang Jawa Tengah Jalur Pantura',
    elevationMeters: 4,
  },

  // --- DAOP 4 SEMARANG ---
  {
    id: 'STN_TG_TEGAL',
    code: 'TG',
    name: 'Stasiun Tegal',
    city: 'Tegal',
    daop: 'DAOP 4 Semarang',
    lat: -6.8687,
    lng: 109.1418,
    isHub: true,
    facilities: 'Dipo Lokomotif Tegal, Percabangan Prupuk/Purwokerto',
    elevationMeters: 4,
  },
  {
    id: 'STN_PML_PEMALANG',
    code: 'PML',
    name: 'Stasiun Pemalang',
    city: 'Pemalang',
    daop: 'DAOP 4 Semarang',
    lat: -6.8872,
    lng: 109.3853,
    isHub: false,
    facilities: 'Jalur Ganda Kecepatan Tinggi Pantura',
    elevationMeters: 6,
  },
  {
    id: 'STN_PK_PEKALONGAN',
    code: 'PK',
    name: 'Stasiun Pekalongan',
    city: 'Pekalongan',
    daop: 'DAOP 4 Semarang',
    lat: -6.8889,
    lng: 109.6644,
    isHub: true,
    facilities: 'Pusat Kota Batik Pantura, 7 Jalur',
    elevationMeters: 4,
  },
  {
    id: 'STN_SMT_SEMARANGTAWANG',
    code: 'SMT',
    name: 'Stasiun Semarang Tawang',
    city: 'Semarang',
    daop: 'DAOP 4 Semarang',
    lat: -6.9644,
    lng: 110.4278,
    isHub: true,
    facilities: 'Terminal Eksekutif DAOP 4, Akses Pelabuhan Tanjung Emas',
    elevationMeters: 2,
  },
  {
    id: 'STN_SMC_SEMARANGPONCOL',
    code: 'SMC',
    name: 'Stasiun Semarang Poncol',
    city: 'Semarang',
    daop: 'DAOP 4 Semarang',
    lat: -6.9728,
    lng: 110.4144,
    isHub: false,
    facilities: 'Dipo Kereta Poncol, KA Ekonomi & Komuter',
    elevationMeters: 3,
  },
  {
    id: 'STN_CU_CEPU',
    code: 'CU',
    name: 'Stasiun Cepu',
    city: 'Blora',
    daop: 'DAOP 4 Semarang',
    lat: -7.1517,
    lng: 111.5908,
    isHub: true,
    facilities: 'Stasiun Hub Migas & Kayu Jati, Batas Jateng-Jatim',
    elevationMeters: 28,
  },

  // --- DAOP 5 PURWOKERTO ---
  {
    id: 'STN_PWT_PURWOKERTO',
    code: 'PWT',
    name: 'Stasiun Purwokerto',
    city: 'Banyumas',
    daop: 'DAOP 5 Purwokerto',
    lat: -7.4191,
    lng: 109.2223,
    isHub: true,
    facilities: 'Dipo Lokomotif PWT, Kantor DAOP 5, Lintas Ganda',
    elevationMeters: 75,
  },
  {
    id: 'STN_KYA_KROYA',
    code: 'KYA',
    name: 'Stasiun Kroya',
    city: 'Cilacap',
    daop: 'DAOP 5 Purwokerto',
    lat: -7.6297,
    lng: 109.2541,
    isHub: true,
    facilities: 'Segitiga Emas Kroya (Pertemuan Bandung & Pantura)',
    elevationMeters: 11,
  },
  {
    id: 'STN_GB_GOMBONG',
    code: 'GB',
    name: 'Stasiun Gombong',
    city: 'Kebumen',
    daop: 'DAOP 5 Purwokerto',
    lat: -7.6067,
    lng: 109.5147,
    isHub: false,
    facilities: 'Jalur Ganda Kroya - Kutoarjo, Terowongan Ijo',
    elevationMeters: 18,
  },
  {
    id: 'STN_KM_KEBUMEN',
    code: 'KM',
    name: 'Stasiun Kebumen',
    city: 'Kebumen',
    daop: 'DAOP 5 Purwokerto',
    lat: -7.6767,
    lng: 109.6542,
    isHub: false,
    facilities: 'Lintas Jalur Selatan Jawa',
    elevationMeters: 21,
  },
  {
    id: 'STN_KTA_KUTOARJO',
    code: 'KTA',
    name: 'Stasiun Kutoarjo',
    city: 'Purworejo',
    daop: 'DAOP 5 Purwokerto',
    lat: -7.7172,
    lng: 109.9122,
    isHub: true,
    facilities: 'Dipo Kereta Kutoarjo, Terminus KA Prameks',
    elevationMeters: 16,
  },

  // --- DAOP 6 YOGYAKARTA & SURAKARTA ---
  {
    id: 'STN_WT_WATES',
    code: 'WT',
    name: 'Stasiun Wates',
    city: 'Kulon Progo',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.8594,
    lng: 110.1581,
    isHub: false,
    facilities: 'Hub Akses Bandara YIA (Yogyakarta International)',
    elevationMeters: 18,
  },
  {
    id: 'STN_YK_YOGYAKARTA',
    code: 'YK',
    name: 'Stasiun Yogyakarta (Tugu)',
    city: 'Yogyakarta',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.7892,
    lng: 110.3635,
    isHub: true,
    facilities: 'Terminal Wisatawan Utama, Balai Yasa Pengok, KRL Hub',
    elevationMeters: 113,
  },
  {
    id: 'STN_LPN_LEMPUYANGAN',
    code: 'LPN',
    name: 'Stasiun Lempuyangan',
    city: 'Yogyakarta',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.7903,
    lng: 110.3756,
    isHub: false,
    facilities: 'Terminal KA Ekonomi & Komuter Yogyakarta',
    elevationMeters: 114,
  },
  {
    id: 'STN_KT_KLATEN',
    code: 'KT',
    name: 'Stasiun Klaten',
    city: 'Klaten',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.7089,
    lng: 110.6053,
    isHub: false,
    facilities: 'Jalur Ganda Elektrifikasi KRL Solo-Jogja',
    elevationMeters: 151,
  },
  {
    id: 'STN_SLO_SOLOBALAPAN',
    code: 'SLO',
    name: 'Stasiun Solo Balapan',
    city: 'Surakarta',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.5568,
    lng: 110.8214,
    isHub: true,
    facilities: 'Skybridge Terminal Tirtonadi, Dipo Solo, KA Bandara',
    elevationMeters: 93,
  },
  {
    id: 'STN_SK_SOLOJEBRES',
    code: 'SK',
    name: 'Stasiun Solo Jebres',
    city: 'Surakarta',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.5619,
    lng: 110.8406,
    isHub: false,
    facilities: 'Stasiun Cagar Budaya & Barang',
    elevationMeters: 97,
  },
  {
    id: 'STN_SR_SRAGEN',
    code: 'SR',
    name: 'Stasiun Sragen',
    city: 'Sragen',
    daop: 'DAOP 6 Yogyakarta',
    lat: -7.4275,
    lng: 111.0206,
    isHub: false,
    facilities: 'Jalur Ganda Solo - Madiun',
    elevationMeters: 86,
  },

  // --- DAOP 7 MADIUN ---
  {
    id: 'STN_MN_MADIUN',
    code: 'MN',
    name: 'Stasiun Madiun',
    city: 'Madiun',
    daop: 'DAOP 7 Madiun',
    lat: -7.6186,
    lng: 111.5244,
    isHub: true,
    facilities: 'Pabrik Manufaktur Kereta Api PT INKA, Dipo Traksi MN',
    elevationMeters: 63,
  },
  {
    id: 'STN_NJ_NGANJUK',
    code: 'NJ',
    name: 'Stasiun Nganjuk',
    city: 'Nganjuk',
    daop: 'DAOP 7 Madiun',
    lat: -7.6025,
    lng: 111.9036,
    isHub: false,
    facilities: 'Jalur Ganda Lintas Madiun - Kertosono',
    elevationMeters: 56,
  },
  {
    id: 'STN_KTS_KERTOSONO',
    code: 'KTS',
    name: 'Stasiun Kertosono',
    city: 'Nganjuk',
    daop: 'DAOP 7 Madiun',
    lat: -7.5911,
    lng: 112.0931,
    isHub: true,
    facilities: 'Percabangan Segitiga Surabaya vs Kediri/Blitar',
    elevationMeters: 43,
  },
  {
    id: 'STN_JG_JOMBANG',
    code: 'JG',
    name: 'Stasiun Jombang',
    city: 'Jombang',
    daop: 'DAOP 7 Madiun',
    lat: -7.5583,
    lng: 112.2333,
    isHub: false,
    facilities: 'Hub Utama Lintas Tengah Jawa Timur',
    elevationMeters: 44,
  },
  {
    id: 'STN_KD_KEDIRI',
    code: 'KD',
    name: 'Stasiun Kediri',
    city: 'Kediri',
    daop: 'DAOP 7 Madiun',
    lat: -7.8183,
    lng: 112.0167,
    isHub: true,
    facilities: 'Jalur Lingkar Wilis Selatan',
    elevationMeters: 68,
  },
  {
    id: 'STN_TA_TULUNGAGUNG',
    code: 'TA',
    name: 'Stasiun Tulungagung',
    city: 'Tulungagung',
    daop: 'DAOP 7 Madiun',
    lat: -8.0617,
    lng: 111.9056,
    isHub: false,
    facilities: 'Pemberhentian Utama Wilayah Pesisir Selatan',
    elevationMeters: 85,
  },
  {
    id: 'STN_BL_BLITAR',
    code: 'BL',
    name: 'Stasiun Blitar',
    city: 'Blitar',
    daop: 'DAOP 7 Madiun',
    lat: -8.1006,
    lng: 112.1644,
    isHub: true,
    facilities: 'Dipo Lokomotif Blitar, Jalur Penghubung Malang',
    elevationMeters: 167,
  },

  // --- DAOP 8 SURABAYA & MALANG ---
  {
    id: 'STN_MR_MOJOKERTO',
    code: 'MR',
    name: 'Stasiun Mojokerto',
    city: 'Mojokerto',
    daop: 'DAOP 8 Surabaya',
    lat: -7.4667,
    lng: 112.4361,
    isHub: false,
    facilities: 'Pintu Gerbang Barat Metropolitan Surabaya',
    elevationMeters: 22,
  },
  {
    id: 'STN_SGU_SURABAYAGUBENG',
    code: 'SGU',
    name: 'Stasiun Surabaya Gubeng',
    city: 'Surabaya',
    daop: 'DAOP 8 Surabaya',
    lat: -7.2653,
    lng: 112.7522,
    isHub: true,
    facilities: 'Terminal Terbesar Jatim, Dipo Sidotopo, DAOP 8',
    elevationMeters: 5,
  },
  {
    id: 'STN_SBI_SURABAYAPASARTURI',
    code: 'SBI',
    name: 'Stasiun Surabaya Pasarturi',
    city: 'Surabaya',
    daop: 'DAOP 8 Surabaya',
    lat: -7.2472,
    lng: 112.7358,
    isHub: true,
    facilities: 'Terminus Utama Lintas Pantura (Semarang & Jakarta)',
    elevationMeters: 1,
  },
  {
    id: 'STN_SDA_SIDOARJO',
    code: 'SDA',
    name: 'Stasiun Sidoarjo',
    city: 'Sidoarjo',
    daop: 'DAOP 8 Surabaya',
    lat: -7.4475,
    lng: 112.7175,
    isHub: false,
    facilities: 'Percabangan Jalur Tarik & Bangil',
    elevationMeters: 4,
  },
  {
    id: 'STN_BG_BANGIL',
    code: 'BG',
    name: 'Stasiun Bangil',
    city: 'Pasuruan',
    daop: 'DAOP 8 Surabaya',
    lat: -7.6006,
    lng: 112.7661,
    isHub: true,
    facilities: 'Junction Utama Percabangan Malang vs Banyuwangi',
    elevationMeters: 9,
  },
  {
    id: 'STN_ML_MALANG',
    code: 'ML',
    name: 'Stasiun Malang (Kotabaru)',
    city: 'Malang',
    daop: 'DAOP 8 Surabaya',
    lat: -7.9778,
    lng: 112.6375,
    isHub: true,
    facilities: 'Dipo Kereta Malang, Bangunan Baru Sisi Timur',
    elevationMeters: 444,
  },

  // --- DAOP 9 JEMBER & BANYUWANGI ---
  {
    id: 'STN_PS_PASURUAN',
    code: 'PS',
    name: 'Stasiun Pasuruan',
    city: 'Pasuruan',
    daop: 'DAOP 9 Jember',
    lat: -7.6433,
    lng: 112.9083,
    isHub: false,
    facilities: 'Jalur Tunggal Lintas Tapal Kuda',
    elevationMeters: 4,
  },
  {
    id: 'STN_PB_PROBOLINGGO',
    code: 'PB',
    name: 'Stasiun Probolinggo',
    city: 'Probolinggo',
    daop: 'DAOP 9 Jember',
    lat: -7.7461,
    lng: 113.2167,
    isHub: true,
    facilities: 'Pintu Gerbang Wisata Gunung Bromo',
    elevationMeters: 5,
  },
  {
    id: 'STN_KK_KLAKAH',
    code: 'KK',
    name: 'Stasiun Klakah',
    city: 'Lumajang',
    daop: 'DAOP 9 Jember',
    lat: -8.0056,
    lng: 113.2556,
    isHub: false,
    facilities: 'Stasiun Kereta Api Terdekat ke Lumajang',
    elevationMeters: 193,
  },
  {
    id: 'STN_JR_JEMBER',
    code: 'JR',
    name: 'Stasiun Jember',
    city: 'Jember',
    daop: 'DAOP 9 Jember',
    lat: -8.1652,
    lng: 113.7032,
    isHub: true,
    facilities: 'Kantor DAOP 9 Jember, Dipo Lokomotif Jember',
    elevationMeters: 89,
  },
  {
    id: 'STN_KLT_KALISAT',
    code: 'KLT',
    name: 'Stasiun Kalisat',
    city: 'Jember',
    daop: 'DAOP 9 Jember',
    lat: -8.1256,
    lng: 113.8117,
    isHub: false,
    facilities: 'Percabangan Bondowoso/Panarukan',
    elevationMeters: 265,
  },
  {
    id: 'STN_KBR_KALIBARU',
    code: 'KBR',
    name: 'Stasiun Kalibaru',
    city: 'Banyuwangi',
    daop: 'DAOP 9 Jember',
    lat: -8.2917,
    lng: 113.9856,
    isHub: false,
    facilities: 'Stasiun Tertinggi Jalur Timur, Terowongan Mrawan',
    elevationMeters: 428,
  },
  {
    id: 'STN_RGP_ROGOJAMPI',
    code: 'RGP',
    name: 'Stasiun Rogojampi',
    city: 'Banyuwangi',
    daop: 'DAOP 9 Jember',
    lat: -8.3075,
    lng: 114.2933,
    isHub: false,
    facilities: 'Percabangan Jalur Kereta Api ke Srono',
    elevationMeters: 89,
  },
  {
    id: 'STN_BWI_BANYUWANGIKOTA',
    code: 'BWI',
    name: 'Stasiun Banyuwangi Kota',
    city: 'Banyuwangi',
    daop: 'DAOP 9 Jember',
    lat: -8.2256,
    lng: 114.3564,
    isHub: false,
    facilities: 'Pusat Kota Banyuwangi & Wisata Kawah Ijen',
    elevationMeters: 82,
  },
  {
    id: 'STN_KTG_KETAPANG',
    code: 'KTG',
    name: 'Stasiun Ketapang',
    city: 'Banyuwangi',
    daop: 'DAOP 9 Jember',
    lat: -8.1469,
    lng: 114.3972,
    isHub: true,
    facilities: 'Ujung Timur Rel Pulau Jawa, Integrasi Ferry Selat Bali',
    elevationMeters: 7,
  },
];

/**
 * Real geographical railway corridors of Java Island (coordinates array: [lat, lng])
 */
export const JAVA_REAL_TRACK_CORRIDORS: ReadonlyArray<TrackLineSegment> = [
  // 1. Pantura West Mainline: Jakarta ➔ Cikampek ➔ Cirebon
  {
    id: 'TRACK_PANTURA_WEST',
    name: 'Lintas Pantura Barat (Jakarta - Cirebon)',
    isActiveDefault: true,
    path: [
      [-6.1767, 106.8306], // Gambir
      [-6.1747, 106.8447], // Senen
      [-6.2361, 106.9995], // Bekasi
      [-6.2555, 107.1517], // Cikarang
      [-6.3059, 107.3006], // Karawang
      [-6.4172, 107.4589], // Cikampek
      [-6.4744, 108.3072], // Jatibarang
      [-6.7053, 108.5554], // Cirebon
    ],
  },
  // 2. Priangan Mountain Line: Cikampek ➔ Purwakarta ➔ Bandung
  {
    id: 'TRACK_PRIANGAN_WEST',
    name: 'Lintas Pegunungan Priangan (Cikampek - Bandung)',
    isActiveDefault: true,
    path: [
      [-6.4172, 107.4589], // Cikampek
      [-6.5567, 107.4447], // Purwakarta
      [-6.7350, 107.4100], // Cisomang Viaduct
      [-6.8407, 107.4795], // Padalarang
      [-6.8856, 107.5364], // Cimahi
      [-6.9142, 107.6025], // Bandung
      [-6.9328, 107.6461], // Kiaracondong
    ],
  },
  // 3. Pantura Central & East Mainline: Cirebon ➔ Semarang ➔ Surabaya
  {
    id: 'TRACK_PANTURA_EAST',
    name: 'Lintas Pantura Timur (Cirebon - Semarang - Surabaya)',
    isActiveDefault: false,
    path: [
      [-6.7053, 108.5554], // Cirebon
      [-6.8661, 109.0433], // Brebes
      [-6.8687, 109.1418], // Tegal
      [-6.8872, 109.3853], // Pemalang
      [-6.8889, 109.6644], // Pekalongan
      [-6.9644, 110.4278], // Semarang Tawang
      [-7.1517, 111.5908], // Cepu
      [-7.1560, 111.8820], // Bojonegoro
      [-7.1200, 112.4160], // Lamongan
      [-7.2472, 112.7358], // Surabaya Pasarturi
      [-7.2653, 112.7522], // Surabaya Gubeng
    ],
  },
  // 4. Central Trunk Line: Cirebon ➔ Purwokerto ➔ Kroya ➔ Jogja ➔ Solo ➔ Madiun ➔ Surabaya
  {
    id: 'TRACK_TRANS_CENTRAL',
    name: 'Lintas Tengah (Cirebon - Purwokerto - Yogyakarta - Solo - Surabaya)',
    isActiveDefault: false,
    path: [
      [-6.7053, 108.5554], // Cirebon
      [-7.1500, 108.9800], // Prupuk
      [-7.4191, 109.2223], // Purwokerto
      [-7.6297, 109.2541], // Kroya
      [-7.6067, 109.5147], // Gombong
      [-7.6767, 109.6542], // Kebumen
      [-7.7172, 109.9122], // Kutoarjo
      [-7.8594, 110.1581], // Wates
      [-7.7892, 110.3635], // Yogyakarta
      [-7.7089, 110.6053], // Klaten
      [-7.5568, 110.8214], // Solo Balapan
      [-7.4275, 111.0206], // Sragen
      [-7.6186, 111.5244], // Madiun
      [-7.6025, 111.9036], // Nganjuk
      [-7.5911, 112.0931], // Kertosono
      [-7.5583, 112.2333], // Jombang
      [-7.4667, 112.4361], // Mojokerto
      [-7.2653, 112.7522], // Surabaya Gubeng
    ],
  },
  // 5. Southern Priangan Line: Bandung ➔ Tasikmalaya ➔ Banjar ➔ Kroya
  {
    id: 'TRACK_PRIANGAN_SOUTH',
    name: 'Lintas Priangan Selatan (Bandung - Tasikmalaya - Kroya)',
    isActiveDefault: false,
    path: [
      [-6.9328, 107.6461], // Kiaracondong
      [-7.0150, 107.8200], // Nagreg
      [-7.1000, 107.9800], // Cibatu
      [-7.3228, 108.2239], // Tasikmalaya
      [-7.3278, 108.3536], // Ciamis
      [-7.3719, 108.5414], // Banjar
      [-7.6297, 109.2541], // Kroya
    ],
  },
  // 6. East Horseshoe Line: Surabaya ➔ Pasuruan ➔ Jember ➔ Banyuwangi
  {
    id: 'TRACK_TAPAL_KUDA',
    name: 'Lintas Tapal Kuda (Surabaya - Jember - Ketapang)',
    isActiveDefault: false,
    path: [
      [-7.2653, 112.7522], // Surabaya Gubeng
      [-7.4475, 112.7175], // Sidoarjo
      [-7.6006, 112.7661], // Bangil
      [-7.6433, 112.9083], // Pasuruan
      [-7.7461, 113.2167], // Probolinggo
      [-8.0056, 113.2556], // Klakah
      [-8.1652, 113.7032], // Jember
      [-8.1256, 113.8117], // Kalisat
      [-8.2917, 113.9856], // Kalibaru
      [-8.3075, 114.2933], // Rogojampi
      [-8.2256, 114.3564], // Banyuwangi Kota
      [-8.1469, 114.3972], // Ketapang
    ],
  },
  // 7. Malang Loop Line: Kertosono ➔ Kediri ➔ Blitar ➔ Malang ➔ Bangil
  {
    id: 'TRACK_MALANG_LOOP',
    name: 'Lintas Lingkar Malang (Kertosono - Kediri - Malang - Bangil)',
    isActiveDefault: false,
    path: [
      [-7.5911, 112.0931], // Kertosono
      [-7.8183, 112.0167], // Kediri
      [-8.0617, 111.9056], // Tulungagung
      [-8.1006, 112.1644], // Blitar
      [-7.9778, 112.6375], // Malang Kotabaru
      [-7.6006, 112.7661], // Bangil
    ],
  },
];
