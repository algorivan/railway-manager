

async function runEmpiricalStressSuite() {
  console.log('================================================================');
  console.log('  CHALLENGER PHASE 1: EMPIRICAL STRESS & INVARIANT VERIFICATION  ');
  console.log('================================================================\n');

  const { DeterministicPRNG } = await import('../packages/shared/dist/prng/mulberry32.js');
  const {
    toMoney,
    isMoney,
    addMoney,
    subtractMoney,
    multiplyMoney,
    formatRupiah,
    toKm,
    toKmh,
    toTons,
  } = await import('../packages/shared/dist/units.js');
  const {
    createGameTimestamp,
    createGameTimestampFromDayMinute,
    addMinutes,
    diffMinutes,
    formatGameTimestamp,
    formatTimeOfDay,
  } = await import('../packages/shared/dist/time.js');
  const {
    calculateRouteOpeningCost,
    calculateRouteOpeningFee,
    InvalidRouteOpeningError,
    BASE_REGULATORY_FEE,
    PREP_COST_PER_STATION,
    CORRIDOR_LICENSING_PER_KM,
  } = await import('../packages/network/dist/calculators/route-opening.js');
  const {
    calculateTrackAccessCharge,
    InvalidTrackAccessInputError,
    TAC_BASE_RATE_PER_TRAIN_KM,
    TAC_WEIGHT_SURCHARGE,
  } = await import('../packages/network/dist/calculators/track-access.js');
  const {
    calculateEffectiveSpeed,
    InvalidSpeedConstraintError,
  } = await import('../packages/network/dist/calculators/speed.js');

  const results = {
    passed: 0,
    failed: 0,
    challenges: [],
  };

  function assert(condition, testName, details = '') {
    if (condition) {
      results.passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // =========================================================================
  // 1. PRNG STRESS TESTING
  // =========================================================================
  console.log('\n--- 1. PRNG STRESS TESTING ---');

  // 1.1 Seed boundaries
  const testSeeds = [0, 1, 0xFFFFFFFF, -1, -42, 4294967296, 2147483647, -2147483648];
  let allSeedsValid = true;
  for (const s of testSeeds) {
    const prng = new DeterministicPRNG(s);
    const n = prng.next();
    const u = prng.nextUint32();
    const i = prng.nextInt(1, 10);
    if (Number.isNaN(n) || n < 0 || n >= 1 || Number.isNaN(u) || u < 0 || u > 0xFFFFFFFF || i < 1 || i > 10) {
      allSeedsValid = false;
    }
  }
  assert(allSeedsValid, 'Seed boundary values: 0, 1, 0xFFFFFFFF, negatives, overflows handled safely');

  // 1.2 Long-sequence determinism (1,000,000 identical numbers)
  const seed = 123456789;
  const prngA = new DeterministicPRNG(seed);
  const prngB = new DeterministicPRNG(seed);
  let longSeqMismatch = -1;
  const t0Seq = Date.now();
  for (let i = 0; i < 1_000_000; i++) {
    if (prngA.nextUint32() !== prngB.nextUint32()) {
      longSeqMismatch = i;
      break;
    }
  }
  const t1Seq = Date.now();
  assert(longSeqMismatch === -1, `Long-sequence determinism: 1,000,000 identical uint32 generated (${t1Seq - t0Seq}ms)`);

  // 1.3 Uniform distribution check (100,000 nextInt(1, 10) with Chi-Square)
  const prngU = new DeterministicPRNG(987654321);
  const TRIALS = 100_000;
  const bins = new Array(11).fill(0);
  for (let i = 0; i < TRIALS; i++) {
    bins[prngU.nextInt(1, 10)]++;
  }
  const expectedPerBin = TRIALS / 10;
  let chiSquare = 0;
  for (let b = 1; b <= 10; b++) {
    const d = bins[b] - expectedPerBin;
    chiSquare += (d * d) / expectedPerBin;
  }
  // df = 9, critical p=0.01 is 21.67, p=0.001 is 27.88
  console.log(`    Chi-Square statistic on 100k samples: ${chiSquare.toFixed(4)} (df=9, critical 99%=21.67)`);
  assert(chiSquare <= 21.67, 'Uniform distribution check: Chi-Square satisfies uniformity at p=0.01');

  // 1.4 ADVERSARIAL CHALLENGE: PRNG State Overflow & Canonical Mulberry32 Divergence
  console.log('\n  [Adversarial Challenge Probe: 32-bit state truncation & float overflow]');
  let canonicalState = 42 >>> 0;
  function canonicalMulberry32() {
    canonicalState = (canonicalState + 0x6D2B79F5) >>> 0;
    let t = canonicalState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  const prngProbe = new DeterministicPRNG(42);
  let divergenceStep = -1;
  let divergenceActual = 0;
  let divergenceExpected = 0;
  // Step up to 5,000,000 iterations to test IEEE-754 precision boundary (2^53 / 1.83e9 = 4,917,758)
  for (let i = 0; i < 5_000_000; i++) {
    const act = prngProbe.nextUint32();
    const exp = canonicalMulberry32();
    if (act !== exp) {
      divergenceStep = i;
      divergenceActual = act;
      divergenceExpected = exp;
      break;
    }
  }

  if (divergenceStep !== -1) {
    const challengeMsg = `PRNG diverges from canonical Mulberry32 at step ${divergenceStep} (actual: ${divergenceActual}, expected: ${divergenceExpected}) due to unmasked state accumulation (this.state += 0x6D2B79F5 exceeds Number.MAX_SAFE_INTEGER at step 4,917,758)`;
    results.challenges.push({
      category: 'PRNG Determinism & State Bound',
      severity: 'HIGH',
      description: challengeMsg,
    });
    console.error(`  [CHALLENGE DETECTED] ${challengeMsg}`);
  } else {
    assert(true, 'PRNG matches canonical Mulberry32 beyond 5,000,000 iterations');
  }

  // 1.5 ADVERSARIAL CHALLENGE: Checkpoint serialization drift after 4,917,758 iterations
  const prngPreSave = new DeterministicPRNG(42);
  for (let i = 0; i < 4_917_758; i++) prngPreSave.nextUint32();
  const serializedState = prngPreSave.getState();
  const prngRestored = new DeterministicPRNG(0);
  prngRestored.setState(serializedState);
  const nextFromOrig = prngPreSave.nextUint32();
  const nextFromRestored = prngRestored.nextUint32();

  if (nextFromOrig !== nextFromRestored) {
    const driftMsg = `PRNG state restore drift: state serialized at step 4,917,758 (${serializedState}) restores to different sequence (original: ${nextFromOrig}, restored: ${nextFromRestored}) because setState casts >>> 0 while internal state was corrupted by float rounding`;
    results.challenges.push({
      category: 'PRNG Checkpoint Integrity',
      severity: 'HIGH',
      description: driftMsg,
    });
    console.error(`  [CHALLENGE DETECTED] ${driftMsg}`);
  } else {
    assert(true, 'PRNG state restore exact match after 5M iterations');
  }

  // =========================================================================
  // 2. ARITHMETIC & MONEY PRECISION
  // =========================================================================
  console.log('\n--- 2. ARITHMETIC & MONEY PRECISION ---');

  // 2.1 Large money sums up to 9e15 IDR without precision loss
  const MAX_SAFE = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991
  const mMax = toMoney(MAX_SAFE);
  assert(mMax === MAX_SAFE && isMoney(mMax), 'toMoney accepts 9,007,199,254,740,991 IDR (MAX_SAFE_INTEGER)');

  let overflowThrew = false;
  try {
    toMoney(MAX_SAFE + 1);
  } catch (e) {
    overflowThrew = e instanceof RangeError;
  }
  assert(overflowThrew, 'toMoney strictly rejects values exceeding MAX_SAFE_INTEGER with RangeError');

  // Negative bounds
  const mMin = toMoney(Number.MIN_SAFE_INTEGER);
  assert(mMin === Number.MIN_SAFE_INTEGER && isMoney(mMin), 'toMoney accepts MIN_SAFE_INTEGER (negative debt/loss)');

  // 2.2 Decimal rejection
  const invalidDecimals = [0.1, 0.0000001, 100.5, -99.99, Math.PI, 1e-10, 1 + 1e-15];
  let allDecimalsRejected = true;
  for (const d of invalidDecimals) {
    try {
      toMoney(d);
      allDecimalsRejected = false;
    } catch (e) {
      if (!(e instanceof TypeError)) allDecimalsRejected = false;
    }
  }
  assert(allDecimalsRejected, 'toMoney strictly rejects fractional numbers with TypeError (0-decimal IDR constraint)');

  // Non-finite rejection
  const nonFinites = [NaN, Infinity, -Infinity, null, undefined, '1000', {}, []];
  let allNonFinitesRejected = true;
  for (const nf of nonFinites) {
    try {
      toMoney(nf);
      allNonFinitesRejected = false;
    } catch {
      // expected
    }
  }
  assert(allNonFinitesRejected, 'toMoney strictly rejects NaN, Infinity, strings, and non-number types');

  // Arithmetic operations near bounds
  const halfMax = toMoney(Math.floor(MAX_SAFE / 2));
  const added = addMoney(halfMax, halfMax);
  assert(added === halfMax * 2, 'addMoney executes exact addition without precision loss');

  let addOverflowThrew = false;
  try {
    addMoney(toMoney(MAX_SAFE), toMoney(1));
  } catch (e) {
    addOverflowThrew = e instanceof RangeError;
  }
  assert(addOverflowThrew, 'addMoney throws RangeError when result overflows safe integers');

  // multiplyMoney rounding
  const multRes = multiplyMoney(toMoney(100), 0.333333333333);
  assert(multRes === 33 && Number.isInteger(multRes), 'multiplyMoney produces exact rounded integer Rupiah');

  // formatRupiah
  assert(formatRupiah(toMoney(0)) === 'Rp 0', 'formatRupiah formats 0 correctly');
  assert(formatRupiah(toMoney(165_000_000)) === 'Rp 165.000.000', 'formatRupiah formats 165M correctly');
  assert(formatRupiah(toMoney(-50_000)) === 'Rp -50.000', 'formatRupiah formats negative debt correctly');

  // =========================================================================
  // 3. REGULATORY ROUTE OPENING & TAC CALCULATORS
  // =========================================================================
  console.log('\n--- 3. ROUTE OPENING & TAC CALCULATORS ---');

  // 3.1 Gambir - Bandung Reference Vectors
  const routeOpeningRef = calculateRouteOpeningCost({ stationCount: 5, distanceKm: 160.0 });
  assert(routeOpeningRef === 165_000_000, 'Route opening Gambir - Bandung (5 stations, 160km) = 165,000,000 IDR');
  assert(calculateRouteOpeningFee({ stationCount: 5, distanceKm: 160.0 }) === 165_000_000, 'calculateRouteOpeningFee alias matches');

  const tacRef = calculateTrackAccessCharge({ distanceKm: 160.0, consistWeightTons: 350.0 });
  assert(tacRef === 6_800_000, 'TAC Gambir - Bandung (160km, 350 tons) = 6,800,000 IDR');

  // 3.2 Fractional tonnage & distance
  const tacFrac = calculateTrackAccessCharge({ distanceKm: 160.75, consistWeightTons: 350.25 });
  assert(Number.isInteger(tacFrac) && tacFrac > 0, `TAC handles fractional tonnage/distance (${tacFrac} IDR integer)`);

  const routeFrac = calculateRouteOpeningCost({ stationCount: 3, distanceKm: 160.3333333 });
  assert(Number.isInteger(routeFrac) && routeFrac > 0, `Route opening handles fractional distance (${routeFrac} IDR integer)`);

  // 3.3 Zero and negative handling
  const tac0Km = calculateTrackAccessCharge({ distanceKm: 0, consistWeightTons: 350.0 });
  assert(tac0Km === 0, 'TAC for 0 km distance returns 0 IDR');

  let route0KmThrew = false;
  try {
    calculateRouteOpeningCost({ stationCount: 2, distanceKm: 0 });
  } catch (e) {
    route0KmThrew = e instanceof InvalidRouteOpeningError;
  }
  assert(route0KmThrew, 'Route opening rejects 0 km distance with InvalidRouteOpeningError');

  let route0StationsThrew = false;
  try {
    calculateRouteOpeningCost({ stationCount: 0, distanceKm: 100 });
  } catch (e) {
    route0StationsThrew = e instanceof InvalidRouteOpeningError;
  }
  assert(route0StationsThrew, 'Route opening rejects 0 stations with InvalidRouteOpeningError');

  let route1StationThrew = false;
  try {
    calculateRouteOpeningCost({ stationCount: 1, distanceKm: 100 });
  } catch (e) {
    route1StationThrew = e instanceof InvalidRouteOpeningError;
  }
  assert(route1StationThrew, 'Route opening rejects 1 station with InvalidRouteOpeningError');

  let tac0TonsThrew = false;
  try {
    calculateTrackAccessCharge({ distanceKm: 100, consistWeightTons: 0 });
  } catch (e) {
    tac0TonsThrew = e instanceof InvalidTrackAccessInputError;
  }
  assert(tac0TonsThrew, 'TAC rejects 0 consist weight with InvalidTrackAccessInputError');

  let tacNegDistThrew = false;
  try {
    calculateTrackAccessCharge({ distanceKm: -10, consistWeightTons: 350 });
  } catch (e) {
    tacNegDistThrew = e instanceof InvalidTrackAccessInputError;
  }
  assert(tacNegDistThrew, 'TAC rejects negative distance with InvalidTrackAccessInputError');

  // 3.4 Extreme distances & tonnages
  const routeExtreme = calculateRouteOpeningCost({ stationCount: 50, distanceKm: 50_000 });
  assert(Number.isInteger(routeExtreme) && isMoney(routeExtreme), `Route opening handles extreme distance 50,000km (${formatRupiah(routeExtreme)})`);

  const tacExtreme = calculateTrackAccessCharge({ distanceKm: 10_000, consistWeightTons: 5_000 });
  assert(Number.isInteger(tacExtreme) && isMoney(tacExtreme), `TAC handles extreme consist (10,000km, 5,000 tons = ${formatRupiah(tacExtreme)})`);

  // =========================================================================
  // 4. GAMETIMESTAMP INVARIANTS
  // =========================================================================
  console.log('\n--- 4. GAMETIMESTAMP INVARIANTS ---');

  // 4.1 Day boundaries & tick 1440, 1441
  const t0 = createGameTimestamp(0);
  assert(t0.day === 1 && t0.minuteOfDay === 0 && t0.totalMinutes === 0, 'Tick 0 is Day 1, 00:00');
  assert(formatGameTimestamp(t0) === 'Day 1, 00:00', 'formatGameTimestamp(tick 0) = "Day 1, 00:00"');

  const t1439 = createGameTimestamp(1439);
  assert(t1439.day === 1 && t1439.minuteOfDay === 1439, 'Tick 1439 is Day 1, 23:59');
  assert(formatTimeOfDay(t1439) === '23:59', 'formatTimeOfDay(tick 1439) = "23:59"');

  const t1440 = createGameTimestamp(1440);
  assert(t1440.day === 2 && t1440.minuteOfDay === 0, 'Tick 1440 is Day 2, 00:00 (exact day rollover)');
  assert(formatGameTimestamp(t1440) === 'Day 2, 00:00', 'formatGameTimestamp(tick 1440) = "Day 2, 00:00"');

  const t1441 = createGameTimestamp(1441);
  assert(t1441.day === 2 && t1441.minuteOfDay === 1, 'Tick 1441 is Day 2, 00:01');

  // 4.2 Negative minute handling
  let negTotalThrew = false;
  try {
    createGameTimestamp(-1);
  } catch (e) {
    negTotalThrew = e instanceof RangeError;
  }
  assert(negTotalThrew, 'createGameTimestamp(-1) throws RangeError');

  let day0Threw = false;
  try {
    createGameTimestampFromDayMinute(0, 0);
  } catch (e) {
    day0Threw = e instanceof RangeError;
  }
  assert(day0Threw, 'createGameTimestampFromDayMinute(0, 0) throws RangeError (day >= 1 required)');

  let min1440Threw = false;
  try {
    createGameTimestampFromDayMinute(1, 1440);
  } catch (e) {
    min1440Threw = e instanceof RangeError;
  }
  assert(min1440Threw, 'createGameTimestampFromDayMinute(1, 1440) throws RangeError (minuteOfDay < 1440)');

  // 4.3 Subtraction across midnight & underflow
  let underflowThrew = false;
  try {
    addMinutes(t0, -1);
  } catch (e) {
    underflowThrew = e instanceof RangeError;
  }
  assert(underflowThrew, 'addMinutes underflow below 0 throws RangeError');

  const tPrevMid = addMinutes(t1440, -1);
  assert(tPrevMid.day === 1 && tPrevMid.minuteOfDay === 1439, 'addMinutes(Day 2 00:00, -1) correctly wraps to Day 1, 23:59');

  // 4.4 Midnight diffs
  const preMid = createGameTimestamp(1435);  // Day 1, 23:55
  const postMid = createGameTimestamp(1445); // Day 2, 00:05
  assert(diffMinutes(postMid, preMid) === 10, 'diffMinutes forward across midnight = +10');
  assert(diffMinutes(preMid, postMid) === -10, 'diffMinutes backward across midnight = -10');

  // 4.5 Extreme duration (100 simulated years)
  const t100Y = createGameTimestamp(52_560_000);
  assert(t100Y.day === 36501 && t100Y.minuteOfDay === 0, '100 simulated years (52,560,000 mins) = Day 36501, 00:00');
  const t100YNext = addMinutes(t100Y, 1);
  assert(t100YNext.totalMinutes === 52_560_001 && t100YNext.minuteOfDay === 1, 'addMinutes at 100 years maintains monotonicity');

  // =========================================================================
  // 5. EFFECTIVE SPEED CALCULATOR
  // =========================================================================
  console.log('\n--- 5. EFFECTIVE SPEED CALCULATOR ---');
  const v1 = calculateEffectiveSpeed({
    trainMaxSpeedKmh: 120,
    consistLimitKmh: 100,
    trackLimitKmh: 110,
    temporarySpeedRestriction: 80,
  });
  assert(v1 === 80, 'Speed calculator resolves minimum with TSR = 80 km/h');

  const v2 = calculateEffectiveSpeed({
    trainMaxSpeedKmh: 120,
    consistLimitKmh: 100,
    trackLimitKmh: 110,
  });
  assert(v2 === 100, 'Speed calculator resolves minimum without TSR = 100 km/h');

  const v0 = calculateEffectiveSpeed({
    trainMaxSpeedKmh: 120,
    consistLimitKmh: 100,
    trackLimitKmh: 110,
    operationalRestrictionKmh: 0,
  });
  assert(v0 === 0, 'Speed calculator resolves 0 km/h stop restriction');

  let speedNegThrew = false;
  try {
    calculateEffectiveSpeed({
      trainMaxSpeedKmh: -50,
      consistLimitKmh: 100,
      trackLimitKmh: 100,
    });
  } catch (e) {
    speedNegThrew = e instanceof InvalidSpeedConstraintError;
  }
  assert(speedNegThrew, 'Speed calculator rejects negative speed limits');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED, ${results.challenges.length} CHALLENGES IDENTIFIED`);
  console.log('================================================================\n');

  if (results.challenges.length > 0) {
    console.log('DETECTED CHALLENGES / VULNERABILITIES:');
    results.challenges.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.severity}] ${c.category}: ${c.description}`);
    });
  }

  return results;
}

runEmpiricalStressSuite().then((results) => {
  if (results.failed > 0 || results.challenges.length > 0) {
    process.exit(1);
  }
});
