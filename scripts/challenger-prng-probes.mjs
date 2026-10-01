import { DeterministicPRNG } from '../packages/shared/dist/prng/mulberry32.js';

function createCanonicalMulberry32(seed) {
  let state = seed >>> 0;
  return {
    nextUint32() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    },
    getState() {
      return state;
    },
  };
}

const probeResults = {
  passed: 0,
  failed: 0,
  details: [],
};

function record(name, pass, message = '') {
  if (pass) {
    probeResults.passed++;
    console.log(`[PASS] ${name}`);
  } else {
    probeResults.failed++;
    console.error(`[FAIL] ${name} — ${message}`);
  }
  probeResults.details.push({ name, pass, message });
}

console.log('================================================================');
console.log('  CHALLENGER INDEPENDENT PRNG STRESS PROBE SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PROBE 1: 10,000,000 Iteration Canonical Equivalence Test
// -----------------------------------------------------------------------------
console.log('--- PROBE 1: 10,000,000 Iterations Canonical Equivalence ---');
{
  const seed = 42;
  const prng = new DeterministicPRNG(seed);
  const canon = createCanonicalMulberry32(seed);

  const TARGET_STEPS = 10_000_000;
  let mismatchStep = -1;
  let mismatchActual = 0;
  let mismatchExpected = 0;

  const t0 = Date.now();
  for (let i = 0; i < TARGET_STEPS; i++) {
    const act = prng.nextUint32();
    const exp = canon.nextUint32();

    // Specific boundary inspection
    if (i === 4_917_757 || i === 4_917_758 || i === 4_917_759) {
      if (act !== exp) {
        mismatchStep = i;
        mismatchActual = act;
        mismatchExpected = exp;
        break;
      }
    }

    if (act !== exp) {
      mismatchStep = i;
      mismatchActual = act;
      mismatchExpected = exp;
      break;
    }
  }
  const t1 = Date.now();

  const passed = mismatchStep === -1 && prng.getState() === canon.getState();
  record(
    `10,000,000 steps canonical bit-for-bit equivalence (elapsed: ${t1 - t0}ms)`,
    passed,
    mismatchStep !== -1 ? `Mismatch at step ${mismatchStep}: act=${mismatchActual}, exp=${mismatchExpected}` : ''
  );
  record(
    `Step 4,917,758 IEEE-754 precision boundary verified bit-for-bit`,
    mismatchStep === -1
  );
}

// -----------------------------------------------------------------------------
// PROBE 2: State Serialization & Forking across 10,000 steps post-threshold
// -----------------------------------------------------------------------------
console.log('\n--- PROBE 2: State Serialization & Forking Across 10,000 Steps After Step 4,917,758 ---');
{
  const seed = 42;
  const prngOrig = new DeterministicPRNG(seed);

  // Fast-forward directly to step 4,917,758
  for (let i = 0; i < 4_917_758; i++) {
    prngOrig.nextUint32();
  }

  const savedState = prngOrig.getState();
  const prngRestored = new DeterministicPRNG(999999);
  prngRestored.setState(savedState);

  const prngForked = prngOrig.fork();

  let driftStep = -1;
  let origVal = 0;
  let restVal = 0;
  let forkVal = 0;

  for (let step = 0; step < 10_000; step++) {
    const uO = prngOrig.nextUint32();
    const uR = prngRestored.nextUint32();
    const uF = prngForked.nextUint32();

    if (uO !== uR || uO !== uF) {
      driftStep = step;
      origVal = uO;
      restVal = uR;
      forkVal = uF;
      break;
    }

    const fO = prngOrig.next();
    const fR = prngRestored.next();
    const fF = prngForked.next();

    if (fO !== fR || fO !== fF) {
      driftStep = step;
      origVal = fO;
      restVal = fR;
      forkVal = fF;
      break;
    }
  }

  record(
    'getState() -> setState() matches original instance across 10,000 steps after step 4,917,758',
    driftStep === -1 && origVal === restVal,
    driftStep !== -1 ? `Diverged at relative step ${driftStep}: orig=${origVal}, restored=${restVal}` : ''
  );
  record(
    'fork() matches original instance across 10,000 steps after step 4,917,758',
    driftStep === -1 && origVal === forkVal,
    driftStep !== -1 ? `Diverged at relative step ${driftStep}: orig=${origVal}, forked=${forkVal}` : ''
  );

  // Independence check: advancing forked should not advance original
  const stateOrigBefore = prngOrig.getState();
  prngForked.nextUint32();
  prngForked.nextUint32();
  const stateOrigAfter = prngOrig.getState();
  record(
    'Forked PRNG instance mutations do not alter original PRNG state',
    stateOrigBefore === stateOrigAfter
  );
}

// -----------------------------------------------------------------------------
// PROBE 3: Boundary & Pathological Seeds (Bit-for-Bit vs Canonical)
// -----------------------------------------------------------------------------
console.log('\n--- PROBE 3: Boundary & Pathological Seeds ---');
{
  const boundarySeeds = [
    { name: 'Seed 0', value: 0 },
    { name: 'Seed 1', value: 1 },
    { name: 'Seed 0xFFFFFFFF (2^32 - 1)', value: 0xFFFFFFFF },
    { name: 'Seed 0x80000000 (2^31)', value: 0x80000000 },
    { name: 'Seed -1 (cast to 0xFFFFFFFF)', value: -1 },
    { name: 'Seed -2147483648 (-2^31)', value: -2147483648 },
    { name: 'Seed Number.MAX_SAFE_INTEGER (9007199254740991)', value: Number.MAX_SAFE_INTEGER },
    { name: 'Seed Number.MIN_SAFE_INTEGER (-9007199254740991)', value: Number.MIN_SAFE_INTEGER },
    { name: 'Float seed 123.456 (casts via >>> 0 to 123)', value: 123.456 },
    { name: 'Negative float seed -0.5 (casts via >>> 0 to 0)', value: -0.5 },
  ];

  let allSeedsMatch = true;
  for (const item of boundarySeeds) {
    const prng = new DeterministicPRNG(item.value);
    const canon = createCanonicalMulberry32(item.value);

    // Verify uint32 match with canonical across 100,000 steps
    for (let step = 0; step < 100_000; step++) {
      const uAct = prng.nextUint32();
      const uExp = canon.nextUint32();
      if (uAct !== uExp) {
        allSeedsMatch = false;
        console.error(`Boundary seed failure on ${item.name} at step ${step}: act=${uAct}, exp=${uExp}`);
        break;
      }
    }

    // Verify next() float properties across 10,000 steps on a fresh instance
    const prngFloat = new DeterministicPRNG(item.value);
    for (let step = 0; step < 10_000; step++) {
      const f = prngFloat.next();
      if (f < 0 || f >= 1 || Number.isNaN(f)) {
        allSeedsMatch = false;
        console.error(`Float out of bounds on ${item.name} at step ${step}: f=${f}`);
        break;
      }
    }
  }

  record(
    'All 10 boundary and pathological seeds match canonical Mulberry32 across 100,000 steps each',
    allSeedsMatch
  );
}

// -----------------------------------------------------------------------------
// PROBE 4: Statistical Uniformity Chi-Square Test (1,000,000 samples, 100 bins)
// -----------------------------------------------------------------------------
console.log('\n--- PROBE 4: Statistical Uniformity Chi-Square Goodness-of-Fit ---');
{
  const seedsToTest = [42, 12345, 987654321, 0];
  const SAMPLES = 1_000_000;
  const NUM_BINS = 100;
  const expectedPerBin = SAMPLES / NUM_BINS; // 10,000

  // For df = 99:
  // p = 0.05 -> critical value ~ 123.23
  // p = 0.01 -> critical value ~ 134.64
  // p = 0.001 -> critical value ~ 148.23
  const CRITICAL_99 = 134.64;

  let allChiPassed = true;
  for (const s of seedsToTest) {
    const prng = new DeterministicPRNG(s);
    const bins = new Uint32Array(NUM_BINS);

    for (let i = 0; i < SAMPLES; i++) {
      const binIdx = Math.floor(prng.next() * NUM_BINS);
      bins[binIdx]++;
    }

    let chi2 = 0;
    for (let b = 0; b < NUM_BINS; b++) {
      const diff = bins[b] - expectedPerBin;
      chi2 += (diff * diff) / expectedPerBin;
    }

    console.log(`  Seed ${s}: Chi-Square = ${chi2.toFixed(4)} (df=99, critical p=0.01 is ${CRITICAL_99})`);
    if (chi2 > CRITICAL_99) {
      allChiPassed = false;
    }
  }

  record(
    `High-resolution Chi-Square uniformity test (1M samples x 100 bins across 4 seeds, df=99, p=0.01)`,
    allChiPassed
  );
}

// -----------------------------------------------------------------------------
// PROBE 5: NextInt Bounds & Range Invariants
// -----------------------------------------------------------------------------
console.log('\n--- PROBE 5: NextInt Bounds & Range Invariants ---');
{
  const prng = new DeterministicPRNG(777);
  let nextIntPassed = true;

  // Range [min, max] where min === max
  for (let i = 0; i < 100; i++) {
    if (prng.nextInt(42, 42) !== 42) {
      nextIntPassed = false;
      break;
    }
  }

  // Range [-50, 50]
  for (let i = 0; i < 10_000; i++) {
    const val = prng.nextInt(-50, 50);
    if (!Number.isInteger(val) || val < -50 || val > 50) {
      nextIntPassed = false;
      break;
    }
  }

  // Large range [0, 2147483647]
  for (let i = 0; i < 10_000; i++) {
    const val = prng.nextInt(0, 2147483647);
    if (!Number.isInteger(val) || val < 0 || val > 2147483647) {
      nextIntPassed = false;
      break;
    }
  }

  // Error condition: min > max
  let threwMinMax = false;
  try {
    prng.nextInt(10, 9);
  } catch (e) {
    threwMinMax = e instanceof RangeError;
  }

  record(
    'nextInt satisfies range boundary invariants and throws RangeError when min > max',
    nextIntPassed && threwMinMax
  );
}

// -----------------------------------------------------------------------------
// PROBE 6: Fisher-Yates Shuffle Uniformity & Immutability
// -----------------------------------------------------------------------------
console.log('\n--- PROBE 6: Fisher-Yates Shuffle Uniformity & Immutability ---');
{
  const prng = new DeterministicPRNG(54321);
  const originalArray = ['A', 'B', 'C'];
  const originalSnapshot = [...originalArray];

  // Immutability test
  const shuffled = prng.shuffle(originalArray);
  const immutabilityPassed =
    originalArray.length === 3 &&
    originalArray[0] === originalSnapshot[0] &&
    originalArray[1] === originalSnapshot[1] &&
    originalArray[2] === originalSnapshot[2] &&
    shuffled !== originalArray;

  // Permutation distribution test: 3! = 6 permutations
  // Expected = 60,000 / 6 = 10,000 per permutation
  const permCounts = new Map();
  const TRIALS = 60_000;
  for (let i = 0; i < TRIALS; i++) {
    const res = prng.shuffle(originalArray).join('');
    permCounts.set(res, (permCounts.get(res) || 0) + 1);
  }

  let chiPerm = 0;
  const expectedPerm = TRIALS / 6;
  for (const count of permCounts.values()) {
    const d = count - expectedPerm;
    chiPerm += (d * d) / expectedPerm;
  }
  // df = 5, critical p=0.01 is 15.09
  console.log(`  Shuffle Permutation Chi-Square = ${chiPerm.toFixed(4)} (df=5, critical p=0.01 is 15.09)`);
  const shufflePassed = permCounts.size === 6 && chiPerm <= 15.09;

  record(
    'Fisher-Yates shuffle is non-mutating and uniformly distributed (Chi-Square df=5, p=0.01)',
    immutabilityPassed && shufflePassed
  );
}

console.log('\n================================================================');
console.log(`PROBE SUMMARY: ${probeResults.passed} PASSED, ${probeResults.failed} FAILED`);
console.log('================================================================\n');

if (probeResults.failed > 0) {
  process.exit(1);
}
