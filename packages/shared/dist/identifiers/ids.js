/**
 * Casts a validated non-empty string into a strongly typed branded identifier.
 */
export function createBrandedId(id) {
    if (typeof id !== 'string' || id.trim().length === 0) {
        throw new TypeError('Branded identifier must be a non-empty string');
    }
    return id;
}
/**
 * Generates a deterministic identifier using the supplied Mulberry32 PRNG.
 */
export function generateDeterministicId(prefix, prng) {
    if (typeof prefix !== 'string' || prefix.trim().length === 0) {
        throw new TypeError('ID prefix must be a non-empty string');
    }
    const part1 = prng.nextUint32().toString(16).padStart(8, '0');
    const part2 = prng.nextUint32().toString(16).padStart(8, '0');
    return `${prefix}_${part1}${part2}`;
}
/**
 * Generates an RFC-4122 version 4 UUID without DOM or external dependencies.
 * If a DeterministicPRNG is passed, generates a reproducible pseudo-random UUID.
 */
export function createUuid(prng) {
    const getByte = prng
        ? () => prng.nextInt(0, 255)
        : () => Math.floor(Math.random() * 256);
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = getByte();
    }
    // Set version 4 (0100 in bits 4-7 of byte 6)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant 10xx in bits 6-7 of byte 8
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [];
    for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    const uuidStr = [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join(''),
    ].join('-');
    return uuidStr;
}
//# sourceMappingURL=ids.js.map