/**
 * Mulberry32 deterministic 32-bit pseudo-random number generator.
 * Conforms to docs/SIMULATION_RULES.md §2.3.
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generates next uniform pseudo-random float in [0, 1).
   */
  public next(): number {
    return this.nextUint32() / 4294967296;
  }

  /**
   * Alias for next() returning float in [0, 1).
   */
  public nextFloat(): number {
    return this.next();
  }

  /**
   * Generates raw 32-bit unsigned integer in [0, 2^32 - 1].
   */
  public nextUint32(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /**
   * Generates uniform integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`min (${min}) cannot be greater than max (${max})`);
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns boolean with specified true probability (default 0.5).
   */
  public nextBoolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Picks an element uniformly at random from an array.
   */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = this.nextInt(0, items.length - 1);
    return items[idx]!;
  }

  /**
   * Shuffles an array deterministically using Fisher-Yates algorithm.
   */
  public shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Returns the current internal 32-bit state for serialization or checkpoints.
   */
  public getState(): number {
    return this.state >>> 0;
  }

  /**
   * Restores internal 32-bit state.
   */
  public setState(state: number): void {
    this.state = state >>> 0;
  }

  /**
   * Clones this PRNG with identical internal state.
   */
  public fork(): DeterministicPRNG {
    const forked = new DeterministicPRNG(0);
    forked.setState(this.state);
    return forked;
  }
}
