import { Brand } from '../brand.js';
import { DeterministicPRNG } from '../prng/mulberry32.js';
export type CompanyId = Brand<string, 'CompanyId'>;
export type StationId = Brand<string, 'StationId'>;
export type RouteId = Brand<string, 'RouteId'>;
export type DepotId = Brand<string, 'DepotId'>;
export type SpecId = Brand<string, 'SpecId'>;
export type UnitId = Brand<string, 'UnitId'>;
export type CompositionId = Brand<string, 'CompositionId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type MaintenanceJobId = Brand<string, 'MaintenanceJobId'>;
export type TimetableSlotId = Brand<string, 'TimetableSlotId'>;
export type ServiceRunId = Brand<string, 'ServiceRunId'>;
export type ContractId = Brand<string, 'ContractId'>;
export type EmployeeId = Brand<string, 'EmployeeId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type MissionId = Brand<string, 'MissionId'>;
export type EventId = Brand<string, 'EventId'>;
/**
 * Casts a validated non-empty string into a strongly typed branded identifier.
 */
export declare function createBrandedId<T extends string>(id: string): T;
/**
 * Generates a deterministic identifier using the supplied Mulberry32 PRNG.
 */
export declare function generateDeterministicId<T extends string>(prefix: string, prng: DeterministicPRNG): T;
/**
 * Generates an RFC-4122 version 4 UUID without DOM or external dependencies.
 * If a DeterministicPRNG is passed, generates a reproducible pseudo-random UUID.
 */
export declare function createUuid<T extends string>(prng?: DeterministicPRNG): T;
//# sourceMappingURL=ids.d.ts.map