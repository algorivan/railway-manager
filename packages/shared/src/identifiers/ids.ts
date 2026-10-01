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
export function createBrandedId<T extends string>(id: string): T {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError('Branded identifier must be a non-empty string');
  }
  return id as T;
}

/**
 * Generates a deterministic identifier using the supplied Mulberry32 PRNG.
 */
export function generateDeterministicId<T extends string>(prefix: string, prng: DeterministicPRNG): T {
  if (typeof prefix !== 'string' || prefix.trim().length === 0) {
    throw new TypeError('ID prefix must be a non-empty string');
  }
  const part1 = prng.nextUint32().toString(16).padStart(8, '0');
  const part2 = prng.nextUint32().toString(16).padStart(8, '0');
  return `${prefix}_${part1}${part2}` as T;
}

/**
 * Generates an RFC-4122 version 4 UUID without DOM or external dependencies.
 * If a DeterministicPRNG is passed, generates a reproducible pseudo-random UUID.
 */
export function createUuid<T extends string>(prng?: DeterministicPRNG): T {
  const getByte = prng
    ? () => prng.nextInt(0, 255)
    : () => Math.floor(Math.random() * 256);

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = getByte();
  }

  // Set version 4 (0100 in bits 4-7 of byte 6)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // Set variant 10xx in bits 6-7 of byte 8
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, '0'));
  }

  const uuidStr = [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');

  return uuidStr as T;
}
