import {
  CatchmentProfile,
  Coordinates,
  DaopRegion,
  StationCatalogEntry,
  StationFacilities,
} from '@railway/game-data';
import { createBrandedId, DataProvenance, StationId } from '@railway/shared';

export interface StationProps {
  readonly id: StationId;
  readonly code: string;
  readonly name: string;
  readonly region: DaopRegion | string;
  readonly coordinates: Coordinates;
  readonly platformCount: number;
  readonly maxTrainLengthMeters: number;
  readonly facilities: StationFacilities;
  readonly demandProfile: CatchmentProfile;
  readonly provenance: DataProvenance;
}

export class StationEntity {
  public readonly id: StationId;
  public readonly code: string;
  public readonly name: string;
  public readonly region: DaopRegion | string;
  public readonly coordinates: Coordinates;
  public readonly platformCount: number;
  public readonly maxTrainLengthMeters: number;
  public readonly facilities: StationFacilities;
  public readonly demandProfile: CatchmentProfile;
  public readonly provenance: DataProvenance;

  constructor(props: StationProps) {
    this.id = props.id;
    this.code = props.code.toUpperCase();
    this.name = props.name;
    this.region = props.region;
    this.coordinates = props.coordinates;
    this.platformCount = props.platformCount;
    this.maxTrainLengthMeters = props.maxTrainLengthMeters;
    this.facilities = props.facilities;
    this.demandProfile = props.demandProfile;
    this.provenance = props.provenance;
  }

  public static fromCatalogEntry(entry: StationCatalogEntry): StationEntity {
    return new StationEntity({
      id: createBrandedId<StationId>(entry.id),
      code: entry.code,
      name: entry.name,
      region: entry.region,
      coordinates: entry.coordinates,
      platformCount: entry.platformCount,
      maxTrainLengthMeters: entry.maxTrainLengthMeters,
      facilities: entry.facilities,
      demandProfile: entry.demandProfile,
      provenance: entry.provenance,
    });
  }

  /**
   * Checks whether the station platform can physically accommodate a consist of the given length.
   * Conforms to docs/DOMAIN_MODEL.md §5.2.2.
   */
  public canAccommodateConsistLength(consistLengthMeters: number): boolean {
    if (consistLengthMeters <= 0) {
      throw new RangeError(`Consist length must be positive, received: ${consistLengthMeters}`);
    }
    return consistLengthMeters <= this.maxTrainLengthMeters;
  }

  /**
   * Platform count determines base scheduled dwell time:
   * - Minor Station / Halte (< 2 platforms): 2 minutes
   * - Intermediate Station (2 - 4 platforms): 4 minutes
   * - Major Terminal Station (> 4 platforms): 8 minutes
   * Conforms to docs/SIMULATION_RULES.md §4.1.1.
   */
  public calculateBaseDwellTime(): number {
    if (this.platformCount < 2) {
      return 2;
    }
    if (this.platformCount <= 4) {
      return 4;
    }
    return 8;
  }

  /**
   * Calculates dwell time taking into account passenger overcrowding load factor.
   * T_dwell = ceil(T_base_dwell * (1 + Phi_overcrowd))
   * Conforms to docs/SIMULATION_RULES.md §4.1.
   */
  public calculateDwellTime(loadFactor = 1.0): number {
    if (loadFactor < 0) {
      throw new RangeError(`Load factor cannot be negative, received: ${loadFactor}`);
    }

    const baseDwell = this.calculateBaseDwellTime();
    let phiOvercrowd = 0;

    if (loadFactor > 1.5) {
      phiOvercrowd = 0.75 + 3.0 * (loadFactor - 1.5);
    } else if (loadFactor > 1.0) {
      phiOvercrowd = 1.5 * (loadFactor - 1.0);
    }

    return Math.ceil(baseDwell * (1 + phiOvercrowd));
  }
}
