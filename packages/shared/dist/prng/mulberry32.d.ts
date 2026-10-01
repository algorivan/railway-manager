/**
 * Mulberry32 deterministic 32-bit pseudo-random number generator.
 * Conforms to docs/SIMULATION_RULES.md §2.3.
 */
export declare class DeterministicPRNG {
    private state;
    constructor(seed: number);
    /**
     * Generates next uniform pseudo-random float in [0, 1).
     */
    next(): number;
    /**
     * Alias for next() returning float in [0, 1).
     */
    nextFloat(): number;
    /**
     * Generates raw 32-bit unsigned integer in [0, 2^32 - 1].
     */
    nextUint32(): number;
    /**
     * Generates uniform integer in [min, max] inclusive.
     */
    nextInt(min: number, max: number): number;
    /**
     * Returns boolean with specified true probability (default 0.5).
     */
    nextBoolean(probability?: number): boolean;
    /**
     * Picks an element uniformly at random from an array.
     */
    pick<T>(items: readonly T[]): T;
    /**
     * Shuffles an array deterministically using Fisher-Yates algorithm.
     */
    shuffle<T>(items: readonly T[]): T[];
    /**
     * Returns the current internal 32-bit state for serialization or checkpoints.
     */
    getState(): number;
    /**
     * Restores internal 32-bit state.
     */
    setState(state: number): void;
    /**
     * Clones this PRNG with identical internal state.
     */
    fork(): DeterministicPRNG;
}
//# sourceMappingURL=mulberry32.d.ts.map