// Adversarial Challenger Suite for Phase 1 Iteration 2
// Tests native ESM resolution, subpath imports, catalog invariants, domain arithmetic, and PRNG determinism.

async function runAdversarialChallengerSuite() {
  console.log('================================================================');
  console.log('  CHALLENGER PHASE 1 IT2: ADVERSARIAL STRESS & VERIFICATION SUITE');
  console.log('================================================================\n');

  const challenges = [];
  const results = { passed: 0, failed: 0 };

  function assert(condition, name, errorMsg = '') {
    if (condition) {
      results.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${name}: ${errorMsg}`);
    }
  }

  function recordChallenge(category, severity, description) {
    challenges.push({ category, severity, description });
    console.error(`  [CHALLENGE DETECTED] [${severity}] ${category}: ${description}`);
  }

  // ---------------------------------------------------------------------------
  // 1. NATIVE ESM IMPORT STRESS TESTING
  // ---------------------------------------------------------------------------
  console.log('--- 1. NATIVE ESM IMPORT STRESS TESTING ---');

  // 1.1 Root Package Imports
  try {
    const sharedMod = await import('@railway/shared');
    assert(Object.keys(sharedMod).length >= 30, 'Native ESM import of @railway/shared without hooks');
  } catch (err) {
    assert(false, 'Native ESM import of @railway/shared without hooks', err.message);
    recordChallenge('ESM Root Resolution', 'CRITICAL', `@railway/shared failed to import natively: ${err.message}`);
  }

  try {
    const gameDataMod = await import('@railway/game-data');
    assert(Object.keys(gameDataMod).length >= 10, 'Native ESM import of @railway/game-data without hooks');
  } catch (err) {
    assert(false, 'Native ESM import of @railway/game-data without hooks', err.message);
    recordChallenge('ESM Root Resolution', 'CRITICAL', `@railway/game-data failed to import natively: ${err.message}`);
  }

  try {
    const networkMod = await import('@railway/network');
    assert(Object.keys(networkMod).length >= 15, 'Native ESM import of @railway/network without hooks');
  } catch (err) {
    assert(false, 'Native ESM import of @railway/network without hooks', err.message);
    recordChallenge('ESM Root Resolution', 'CRITICAL', `@railway/network failed to import natively: ${err.message}`);
  }

  // 1.2 Subpath Package Imports without .js extension
  try {
    const prngMod = await import('@railway/shared/prng/mulberry32');
    assert(typeof prngMod.DeterministicPRNG === 'function', 'Subpath import @railway/shared/prng/mulberry32 (extensionless)');
  } catch (err) {
    assert(false, 'Subpath import @railway/shared/prng/mulberry32 (extensionless)', err.message);
    recordChallenge('ESM Subpath Resolution', 'HIGH', `Extensionless subpath failed: ${err.message}`);
  }

  try {
    const stationCatMod = await import('@railway/game-data/catalog/stations');
    assert(Array.isArray(stationCatMod.JAVA_STATION_CATALOG), 'Subpath import @railway/game-data/catalog/stations (extensionless)');
  } catch (err) {
    assert(false, 'Subpath import @railway/game-data/catalog/stations (extensionless)', err.message);
    recordChallenge('ESM Subpath Resolution', 'HIGH', `Extensionless subpath failed: ${err.message}`);
  }

  try {
    const routeOpenMod = await import('@railway/network/calculators/route-opening');
    assert(typeof routeOpenMod.calculateRouteOpeningCost === 'function', 'Subpath import @railway/network/calculators/route-opening (extensionless)');
  } catch (err) {
    assert(false, 'Subpath import @railway/network/calculators/route-opening (extensionless)', err.message);
    recordChallenge('ESM Subpath Resolution', 'HIGH', `Extensionless subpath failed: ${err.message}`);
  }

  // 1.3 Subpath Package Imports WITH .js extension (per Node ESM spec and worker claim)
  const subpathsWithJs = [
    '@railway/shared/prng/mulberry32.js',
    '@railway/shared/units.js',
    '@railway/game-data/catalog/stations.js',
    '@railway/game-data/loader/catalog-loader.js',
    '@railway/network/calculators/route-opening.js',
    '@railway/network/entities/depot.entity.js',
  ];

  for (const sp of subpathsWithJs) {
    try {
      await import(sp);
      assert(true, `Subpath import with explicit .js: ${sp}`);
    } catch (err) {
      assert(false, `Subpath import with explicit .js: ${sp}`, err.message);
      recordChallenge(
        'ESM Subpath Resolution',
        'HIGH',
        `Subpath import '${sp}' failed under pure Node.js ESM: ${err.message}. Wildcard exports "./*": "./dist/*.js" causes double extension (.js.js) when importing with .js.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CATALOG INTEGRITY & ADVERSARIAL TOPOLOGY
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. CATALOG INTEGRITY & ADVERSARIAL TOPOLOGY ---');
  try {
    const { WorldDataCatalogLoader, CatalogIntegrityError } = await import('@railway/game-data');
    const { JAVA_STATION_CATALOG } = await import('@railway/game-data');
    const { JAVA_TRACK_CORRIDOR_SEGMENTS } = await import('@railway/game-data');

    WorldDataCatalogLoader.reset();
    const catalog = WorldDataCatalogLoader.initialize();
    assert(catalog.stations.length === 7, 'Catalog loads exactly 7 authoritative Java stations');
    assert(catalog.segments.length === 9, 'Catalog loads exactly 9 authoritative corridor segments');

    // Test O(1) Indexing Throughput
    const t0 = performance.now();
    for (let i = 0; i < 100_000; i++) {
      const s = WorldDataCatalogLoader.getStationById('STN_GMR_GAMBIR');
      const c = WorldDataCatalogLoader.getStationByCode('BD');
      const seg = WorldDataCatalogLoader.getSegmentById('SEG_GMR_BD');
      if (!s || !c || !seg) throw new Error('Indexing lookup failed');
    }
    const elapsed = performance.now() - t0;
    assert(elapsed < 1000, `100,000 O(1) multi-key lookups executed in ${elapsed.toFixed(2)}ms (< 1000ms)`);

    // Dangling foreign key test: corridor connecting to non-existent station
    const danglingSegment = {
      id: 'SEG_DANGLING',
      name: 'Dangling Corridor',
      originStationId: 'STN_GMR_GAMBIR',
      destinationStationId: 'STN_NONEXISTENT_STATION',
      distanceKm: 50.0,
      maxSpeedKmh: 100,
      isElectrified: false,
      isDoubleTrack: false,
      provenance: { source: 'Test', sourceDate: '2026-01-15', verified: true },
    };

    let danglingRejected = false;
    try {
      WorldDataCatalogLoader.loadSegments([danglingSegment], JAVA_STATION_CATALOG);
    } catch (e) {
      danglingRejected = e instanceof CatalogIntegrityError;
    }
    assert(danglingRejected, 'Catalog strictly rejects dangling station foreign keys in corridor segments');

    // Asymmetric/empty graph reachability
    let emptyGraphRejected = false;
    try {
      WorldDataCatalogLoader.validateGraphReachability([], []);
    } catch (e) {
      emptyGraphRejected = true;
    }
    assert(emptyGraphRejected, 'Graph reachability rejects empty station catalog');

  } catch (err) {
    assert(false, 'Catalog integrity testing', err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. REGULATORY DOMAIN & ARITHMETIC INVARIANTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. REGULATORY DOMAIN & ARITHMETIC INVARIANTS ---');
  try {
    const {
      calculateRouteOpeningCost,
      calculateRouteOpeningFee,
      calculateTrackAccessCharge,
      calculateEffectiveSpeed,
      DepotEntity,
      RouteEntity,
      InvalidSpeedConstraintError,
      InvalidRouteOpeningError,
      InvalidTrackAccessInputError,
    } = await import('@railway/network');

    // 3.1 Exact Reference Vectors
    const gmrBdOpening = calculateRouteOpeningCost({ stationCount: 5, distanceKm: 160.0 });
    assert(gmrBdOpening === 165_000_000, 'Gambir - Bandung route opening fee matches reference 165,000,000 IDR');

    const gmrBdTac = calculateTrackAccessCharge({ distanceKm: 160.0, consistWeightTons: 350.0 });
    assert(gmrBdTac === 6_800_000, 'Gambir - Bandung TAC matches reference 6,800,000 IDR');

    // 3.2 Speed Constraint Edge Matrix
    const eff1 = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 100,
      consistLimitKmh: 100,
      trackLimitKmh: 100,
      temporarySpeedRestriction: 100,
    });
    assert(eff1 === 100, 'All 4 speed constraints identical resolves to that speed');

    const effZero = calculateEffectiveSpeed({
      trainMaxSpeedKmh: 120,
      consistLimitKmh: 100,
      trackLimitKmh: 90,
      temporarySpeedRestriction: 0,
    });
    assert(effZero === 0, 'Zero speed restriction resolves to 0 km/h stop');

    let invalidSpeedThrew = false;
    try {
      calculateEffectiveSpeed({
        trainMaxSpeedKmh: 100,
        consistLimitKmh: 100,
        trackLimitKmh: -5,
      });
    } catch (e) {
      invalidSpeedThrew = e instanceof InvalidSpeedConstraintError;
    }
    assert(invalidSpeedThrew, 'Negative speed constraint strictly rejected');

    // 3.3 Depot Overflow and Capability Gating
    const dummyDepot = DepotEntity.createFromTier(
      'DEP_TEST_01',
      'CMP_KAI_01',
      'Test Depot',
      'STN_GMR_GAMBIR',
      1
    );
    assert(dummyDepot.fleetCapacity === 6, 'Tier 1 Depot fleet capacity = 6');
    dummyDepot.assignStabling(6);
    let overflowThrew = false;
    try {
      dummyDepot.assignStabling(1);
    } catch {
      overflowThrew = true;
    }
    assert(overflowThrew, 'Depot strictly rejects assignment exceeding physical fleet capacity');

  } catch (err) {
    assert(false, 'Domain arithmetic testing', err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. PRNG DETERMINISM & CANONICAL FIDELITY
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. PRNG DETERMINISM & CANONICAL FIDELITY ---');
  try {
    const { DeterministicPRNG } = await import('@railway/shared');

    // Step 4,917,758 Float Overflow Boundary
    const prng = new DeterministicPRNG(42);
    let state = 42 >>> 0;
    function canon() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    }

    let mismatch = -1;
    for (let i = 0; i < 5_000_000; i++) {
      const act = prng.nextUint32();
      const exp = canon();
      if (act !== exp) {
        mismatch = i;
        break;
      }
    }
    assert(mismatch === -1, 'PRNG exactly matches canonical Mulberry32 across 5,000,000 steps (step 4,917,758 boundary verified)');

    // Fork and State Serialization
    const origState = prng.getState();
    const restored = new DeterministicPRNG(0);
    restored.setState(origState);
    assert(prng.nextUint32() === restored.nextUint32(), 'PRNG state serialization and restoration produces identical sequence');

  } catch (err) {
    assert(false, 'PRNG determinism testing', err.message);
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY & VERDICT
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED, ${challenges.length} CHALLENGES IDENTIFIED`);
  console.log('================================================================\n');

  if (challenges.length > 0) {
    console.log('DETECTED CHALLENGES:');
    challenges.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.severity}] ${c.category}: ${c.description}`);
    });
  }

  return { results, challenges };
}

runAdversarialChallengerSuite().then(({ results, challenges }) => {
  if (results.failed > 0 || challenges.length > 0) {
    console.log('\nVERDICT: CHALLENGE_FOUND');
    process.exit(1);
  } else {
    console.log('\nVERDICT: APPROVE');
    process.exit(0);
  }
});
