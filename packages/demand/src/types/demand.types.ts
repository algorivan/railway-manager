import { StationId, Money, Km } from '@railway/shared';

export type PassengerClass = 'ECONOMY' | 'EXECUTIVE' | 'LUXURY';

export type PassengerSegment = 'COMMUTER' | 'STUDENT' | 'BUSINESS' | 'TOURIST' | 'FAMILY';

export interface SegmentPreference {
  readonly priceElasticity: number;     // Negative float
  readonly timeSensitivity: number;    // Weight on speed
  readonly comfortExpectation: number; // Expectation for Executive/Luxury
  readonly reliabilityWeight: number;  // Weight on On-Time-Performance (OTP)
}

export type TimeWindow =
  | 'EARLY_MORNING'   // 04:00 – 06:00
  | 'MORNING_PEAK'    // 06:00 – 09:00
  | 'MIDDAY_OFF_PEAK' // 09:00 – 15:00
  | 'EVENING_PEAK'    // 15:00 – 19:00
  | 'NIGHT_TRAVEL'    // 19:00 – 23:00
  | 'LATE_NIGHT';     // 23:00 – 04:00

export interface DemandCalculationInput {
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly distanceKm: Km;
  readonly departureMinuteOfDay: number; // 0..1439
  readonly baseDemand: number;
  readonly chargedFares: Record<PassengerClass, Money>;
  readonly dailyFrequency: number;       // Number of daily round trips
  readonly serviceQuality: number;       // 0.0 .. 1.0
  readonly companyReputation: number;    // 0.0 .. 1.0
}

export interface ClassDemandBreakdown {
  readonly classShare: number;
  readonly baseAllocation: number;
  readonly fareCharged: Money;
  readonly benchmarkFare: Money;
  readonly elasticityFactor: number;
  readonly generatedDemand: number;
}

export interface DemandCalculationResult {
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly distanceKm: Km;
  readonly departureMinuteOfDay: number;
  readonly timeWindow: TimeWindow;
  readonly timeOfDayMultiplier: number;
  readonly frequencyMultiplier: number;
  readonly serviceQualityIndex: number;
  readonly reputationFactor: number;
  readonly byClass: Record<PassengerClass, ClassDemandBreakdown>;
  readonly totalGeneratedDemand: number;
}

export interface FareStructure {
  readonly boardingFee: Money;
  readonly benchmarkPerKm: Money;
  readonly minAllowedFarePerKm: Money;
  readonly maxAllowedFarePerKm: Money;
}
