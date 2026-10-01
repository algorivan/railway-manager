import {
  ContractId,
  CompanyId,
  StationId,
  RouteId,
  SpecId,
  Money,
} from '@railway/shared';

export type CargoCategory = 'PARCEL' | 'CONTAINER' | 'INDUSTRIAL' | 'COMMODITY' | 'SPECIALIZED';

export type B2BContractStatus = 'OFFERED' | 'ACTIVE' | 'FULFILLED' | 'BREACHED';

export type PSOContractStatus = 'ACTIVE' | 'REVOKED' | 'COMPLETED';

export type CharterType = 'CORPORATE_EXECUTIVE' | 'TOURISM_GROUP';

export type CharterStatus = 'REQUESTED' | 'CONFIRMED' | 'DISPATCHED' | 'SETTLED' | 'REJECTED';

export interface CargoTariff {
  readonly cargoCategory: CargoCategory;
  readonly baseHandlingFeePerTon: Money;
  readonly tariffPerTonKm: Money;
  readonly defaultWagonSpecId: SpecId;
}

export interface B2BContractProps {
  readonly id: ContractId;
  readonly companyId: CompanyId;
  readonly clientName: string;
  readonly cargoCategory: CargoCategory;
  readonly originStationId: StationId;
  readonly destinationStationId: StationId;
  readonly requiredWeeklyVolumeTons: number;
  readonly requiredWagonSpecId: SpecId;
  readonly revenuePerTonDelivered: Money;
  readonly latePenaltyPerTon: Money;
  readonly durationDays: number;
  readonly remainingDays?: number;
  readonly status?: B2BContractStatus;
  readonly deliveredVolumeTons?: number;
}

export interface PSOContractProps {
  readonly id: ContractId;
  readonly companyId: CompanyId;
  readonly routeId: RouteId;
  readonly maximumFareCap: Money;
  readonly minimumWeeklyFrequency: number;
  readonly minimumOtpPercentage: number;
  readonly weeklySubsidyCompensation: Money;
  readonly penaltyForUnderperformance: Money;
  readonly contractDurationDays: number;
  readonly remainingDays?: number;
  readonly status?: PSOContractStatus;
}

export interface WeeklyComplianceResult {
  readonly weekNumber: number;
  readonly isCompliant: boolean;
  readonly completedTrips: number;
  readonly requiredTrips: number;
  readonly onTimeTrips: number;
  readonly actualOtpPercentage: number;
  readonly requiredOtpPercentage: number;
  readonly cancelledTrips: number;
  readonly subsidyEarned: Money;
  readonly otpPenalty: Money;
  readonly cancellationPenalty: Money;
  readonly netDisbursement: Money;
}

export interface CharterContractProps {
  readonly id: ContractId;
  readonly companyId: CompanyId;
  readonly clientName: string;
  readonly charterType: CharterType;
  readonly routeId: RouteId;
  readonly requestedDay: number;
  readonly departureMinuteOfDay: number;
  readonly directOpex: Money;
  readonly projectedRegularRevenue: Money;
  readonly agreedPrice?: Money;
  readonly status?: CharterStatus;
}
