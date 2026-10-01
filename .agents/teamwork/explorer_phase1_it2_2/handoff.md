# Handoff Report: Investigation of Defect 2 (Native Node.js ESM Import Resolution Failures)

**Agent:** `explorer_phase1_it2_2`  
**Milestone:** Phase 1 Iteration 2  
**Parent:** `orchestrator_1` (`7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1`)  
**Status:** COMPLETE (Hard Handoff)  
**Date:** 2026-09-30T15:45:00Z  

---

## 1. Observation

### 1.1 Direct Reproduction of ESM Import Failures in Pure Node.js
When attempting to import the compiled workspace packages directly from Node.js (v22.23.1) without Vite, Vitest, or a bundler:

#### Test 1: Direct Entrypoint Import of `@railway/shared`
```bash
node -e 'import("./packages/shared/dist/index.js")'
```
**Verbatim Output:**
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/shared/dist/brand' imported from /home/synx/railway-manager/packages/shared/dist/index.js
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///home/synx/railway-manager/packages/shared/dist/brand'
```

#### Test 2: Direct Entrypoint Import of `@railway/game-data`
```bash
node -e 'import("./packages/game-data/dist/index.js")'
```
**Verbatim Output:**
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/game-data/dist/schemas/daop.schema' imported from /home/synx/railway-manager/packages/game-data/dist/index.js
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///home/synx/railway-manager/packages/game-data/dist/schemas/daop.schema'
```

#### Test 3: Direct Entrypoint Import of `@railway/network`
```bash
node -e 'import("./packages/network/dist/index.js")'
```
**Verbatim Output:**
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/network/dist/calculators/route-opening' imported from /home/synx/railway-manager/packages/network/dist/index.js
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///home/synx/railway-manager/packages/network/dist/calculators/route-opening'
```

#### Test 4: Deep Internal Relative Import in `@railway/game-data`
Even if `index.js` were patched, internal modules also fail:
```bash
node -e 'import("./packages/game-data/dist/loader/catalog-loader.js")'
```
**Verbatim Output:**
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/game-data/dist/schemas/bounds.schema' imported from /home/synx/railway-manager/packages/game-data/dist/loader/catalog-loader.js
```
Similarly:
```bash
node -e 'import("./packages/game-data/dist/schemas/station.schema.js")'
```
**Verbatim Output:**
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/synx/railway-manager/packages/game-data/dist/schemas/daop.schema' imported from /home/synx/railway-manager/packages/game-data/dist/schemas/station.schema.js
```

#### Test 5: Subpath Imports via Package Name
```bash
node -e 'import("@railway/shared/prng/mulberry32")'
```
(executed in `packages/network` where `@railway/shared` is a linked dependency)  
**Verbatim Output:**
```text
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './prng/mulberry32' is not defined by "exports" in /home/synx/railway-manager/packages/network/node_modules/@railway/shared/package.json
```

#### Test 6: Empirical Stress Suite Workaround in `scripts/empirical-stress-suite.mjs`
Inspection of `scripts/empirical-stress-suite.mjs` lines 4–17 reveals that `challenger_phase1_1` had to register an in-memory ESM loader hook to make pure Node execute at all:
```javascript
// Register hook to resolve extensionless imports in compiled packages
const loaderCode = `
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.endsWith(".js")) {
      return nextResolve(specifier + ".js", context);
    }
    throw err;
  }
}
`;
register('data:text/javascript,' + encodeURIComponent(loaderCode), pathToFileURL('./'));
```
Without this monkey-patch hook, `node scripts/empirical-stress-suite.mjs` fails immediately.

---

### 1.2 Configuration and Source Code Inspection

#### Root TypeScript Configuration (`tsconfig.base.json`)
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
...
```
- Line 5: `"module": "ESNext"`
- Line 6: `"moduleResolution": "bundler"`

#### Package Manifests (`packages/*/package.json`)
In all three packages (`shared`, `game-data`, `network`):
```json
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit -p tsconfig.test.json",
    "test": "vitest run"
  },
```
- `"type": "module"` signals to Node.js that all `.js` files are ECMAScript modules.
- `"exports"` only exposes the root specifier `"."`. No subpaths (`"./*"`) are exported.
- `"build"` is `tsc` (TypeScript compiler) producing unbundled individual `.js` files.

#### Source Re-Exports and Relative Imports
- `packages/shared/src/index.ts`:
  ```typescript
  export * from './brand';
  export * from './units';
  export * from './time';
  export * from './prng/mulberry32';
  export * from './provenance/provenance';
  export * from './result/result';
  export * from './identifiers/ids';
  ```
- `packages/game-data/src/index.ts`:
  ```typescript
  export * from './schemas/daop.schema';
  export * from './schemas/coordinates.schema';
  export * from './schemas/catchment.schema';
  export * from './schemas/facilities.schema';
  export * from './schemas/station.schema';
  export * from './schemas/track.schema';
  export * from './schemas/bounds.schema';
  export * from './catalog/stations';
  export * from './catalog/tracks';
  export * from './loader/catalog-loader';
  ```
- `packages/network/src/index.ts`:
  ```typescript
  export * from './calculators/route-opening';
  export * from './calculators/track-access';
  export * from './calculators/speed';
  export * from './entities/station.entity';
  export * from './entities/route.entity';
  export * from './entities/depot.entity';
  ```
All relative specifiers omit `.js` extensions.

#### Emitted Build Output (`packages/*/dist/index.js`)
Inspection of `packages/shared/dist/index.js`:
```javascript
export * from './brand';
export * from './units';
export * from './time';
export * from './prng/mulberry32';
export * from './provenance/provenance';
export * from './result/result';
export * from './identifiers/ids';
//# sourceMappingURL=index.js.map
```
The specifiers in the emitted `.js` files remain verbatim extensionless (`'./brand'`).

---

## 2. Logic Chain

1. **Node.js ESM Specification Enforcement**:
   - According to the official Node.js ECMAScript Modules specification (Node.js 20/22):
     > *"A file extension must be provided when using the `import` keyword to resolve relative or absolute specifiers. Directory indexes (e.g. `'./startup/index.js'`) must also be fully specified."*
   - Node's native ESM resolver does NOT perform automatic file extension probing (`.js`, `.mjs`, `.ts`) or directory index probing (`index.js`).
   - When Node encounters `export * from './brand'`, it looks strictly for a file named `brand` without an extension. Because the file on disk is `brand.js`, Node immediately terminates module linkage with `ERR_MODULE_NOT_FOUND` (Observation 1.1, Tests 1–4).

2. **Root Cause in TypeScript Build Configuration**:
   - `tsconfig.base.json` sets `"moduleResolution": "bundler"`.
   - The `"bundler"` resolution mode was designed for workflows where a downstream bundler (Vite, Webpack, esbuild, Rollup) processes the code and resolves extensionless imports.
   - However, the monorepo build command is pure `tsc` (`"build": "tsc"` in `package.json`). `tsc` does not bundle code, nor does it rewrite module specifiers upon emit.
   - Consequently, `tsc` emits individual `.js` files preserving the exact extensionless specifiers written in `.ts` source files.
   - Because `package.json` sets `"type": "module"`, Node.js executes these emitted files in native ESM mode, triggering the spec mismatch.

3. **Why Vitest and Turborepo Previously Passed**:
   - Vitest runs tests against TypeScript source code through Vite's pipeline using `esbuild`. Vite resolves extensionless imports dynamically during on-the-fly compilation.
   - Turborepo only executes the scripts defined in `package.json` (`tsc` and `vitest run`). Because `tsc` accepts extensionless imports under `moduleResolution: "bundler"`, `turbo build`, `turbo typecheck`, and `turbo test` all exited with code 0.
   - Thus, the defect was invisible to Vitest unit tests, but completely broken for any pure Node.js runtime, CLI tool, or external ESM consumer.

4. **Depth of the Defect (Not Just `index.ts`)**:
   - As observed in Observation 1.1 Test 4, the missing `.js` extension exists across the entire internal module dependency tree:
     - `game-data/src/loader/catalog-loader.ts` imports `../schemas/bounds.schema` and `../catalog/stations`.
     - `game-data/src/schemas/station.schema.ts` imports `./daop.schema`, `./coordinates.schema`, etc.
     - `game-data/src/catalog/stations.ts` imports `../schemas/station.schema`.
     - `game-data/src/catalog/tracks.ts` imports `../schemas/track.schema`.
     - `shared/src/identifiers/ids.ts` imports `../brand` and `../prng/mulberry32`.
   - A fix that only updates `index.ts` is incomplete; any internal execution of `catalog-loader` or `station.schema` in Node ESM still throws `ERR_MODULE_NOT_FOUND`.

5. **Package Exports Configuration Gap**:
   - In `packages/*/package.json`, the `"exports"` map only exposes `"."`.
   - When consumers attempt to import subpaths (e.g. `import "@railway/shared/prng/mulberry32"` or `import "@railway/network/calculators/route-opening"`), Node's package resolution rejects the request with `ERR_PACKAGE_PATH_NOT_EXPORTED` (Observation 1.1 Test 5).
   - Adding a wildcard subpath export (`"./*": "./dist/*.js"`) resolves this constraint while keeping package boundaries intact.

---

## 3. Caveats

1. **TypeScript Source Import Syntax**:
   - In TypeScript under `NodeNext`, imports in `.ts` files must explicitly end in `.js` (e.g. `import { Brand } from './brand.js'`), even though the author writes `.ts` files on disk. This is standard modern TypeScript behavior (TS 4.7+) but frequently surprises developers unfamiliar with native Node ESM.
2. **Vitest Compatibility with `.js` Extensions**:
   - Vite and Vitest natively support `.js` extensions in TypeScript source files. Esbuild strips the `.js` and maps to `.ts` automatically. No Vitest configuration changes are necessary.
3. **Downstream Typecheck Dependencies**:
   - Under `moduleResolution: "NodeNext"`, downstream packages (`game-data`, `network`) resolve upstream package types from emitted declaration files (`dist/index.d.ts`).
   - Because `turbo.json` already enforces `"dependsOn": ["^build"]` for `build` and `typecheck`, upstream packages are always built before downstream compilation, ensuring zero pipeline races.
4. **Implementation Scope**:
   - Per explorer role constraints, this report provides the full architectural blueprint and exact file changes; no source code or configuration files were modified during this investigation.

---

## 4. Conclusion & Recommended Strategy

### Recommended Strategy: Native TypeScript NodeNext Architecture
Adopt TypeScript's official modern Node ESM standard:
1. Switch `tsconfig.base.json` to `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`.
2. Add explicit `.js` extensions to all relative imports and re-exports in `.ts` source files and test suites.
3. Add wildcard subpath exports (`"./*"`) to `package.json` in all packages.
4. Add workspace package dependencies to root `package.json` `devDependencies` so root scripts can import workspace packages as bare specifiers.
5. Remove the custom `node:module.register` hook from `scripts/empirical-stress-suite.mjs`.

### Why This Strategy Is Superior:
- **Zero New Dependencies**: Requires no extra bundlers (`tsup`, `esbuild`, `unbuild`) or post-processors (`tsc-alias`).
- **Compile-Time Safeguard**: TypeScript under `moduleResolution: "NodeNext"` strictly enforces explicit `.js` extensions at compile time (error `TS2835`). Developers cannot accidentally commit broken extensionless imports.
- **Universal Compatibility**:
  - Pure Node.js ESM: 100% compliant (no flags, no loaders).
  - Vitest: 100% compliant (Vite automatically resolves `.js` to `.ts`).
  - Turborepo: 100% compliant (pure `tsc` build cacheable in Turbo).
  - External consumers: `.d.ts` declaration files contain matching `.js` specifiers.

---

### Concrete Implementation Checklist for Implementer

#### 1. Update `tsconfig.base.json`
Change lines 5–6:
```diff
--- a/tsconfig.base.json
+++ b/tsconfig.base.json
@@ -4,4 +4,4 @@
   "compilerOptions": {
     "target": "ES2022",
-    "module": "ESNext",
-    "moduleResolution": "bundler",
+    "module": "NodeNext",
+    "moduleResolution": "NodeNext",
```

#### 2. Update `packages/shared/src/index.ts`
```diff
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -1,7 +1,7 @@
-export * from './brand';
-export * from './units';
-export * from './time';
-export * from './prng/mulberry32';
-export * from './provenance/provenance';
-export * from './result/result';
-export * from './identifiers/ids';
+export * from './brand.js';
+export * from './units.js';
+export * from './time.js';
+export * from './prng/mulberry32.js';
+export * from './provenance/provenance.js';
+export * from './result/result.js';
+export * from './identifiers/ids.js';
```

#### 3. Update `packages/shared/src/units.ts` & `identifiers/ids.ts`
- `packages/shared/src/units.ts`:
  - Line 1: `import { Brand } from './brand.js';`
- `packages/shared/src/identifiers/ids.ts`:
  - Line 1: `import { Brand } from '../brand.js';`
  - Line 2: `import { DeterministicPRNG } from '../prng/mulberry32.js';`

#### 4. Update `packages/game-data/src/index.ts`
```diff
--- a/packages/game-data/src/index.ts
+++ b/packages/game-data/src/index.ts
@@ -1,13 +1,13 @@
-export * from './schemas/daop.schema';
-export * from './schemas/coordinates.schema';
-export * from './schemas/catchment.schema';
-export * from './schemas/facilities.schema';
-export * from './schemas/station.schema';
-export * from './schemas/track.schema';
-export * from './schemas/bounds.schema';
+export * from './schemas/daop.schema.js';
+export * from './schemas/coordinates.schema.js';
+export * from './schemas/catchment.schema.js';
+export * from './schemas/facilities.schema.js';
+export * from './schemas/station.schema.js';
+export * from './schemas/track.schema.js';
+export * from './schemas/bounds.schema.js';
 
-export * from './catalog/stations';
-export * from './catalog/tracks';
+export * from './catalog/stations.js';
+export * from './catalog/tracks.js';
 
-export * from './loader/catalog-loader';
+export * from './loader/catalog-loader.js';
```

#### 5. Update Internal Modules in `packages/game-data/src/`
- `packages/game-data/src/schemas/station.schema.ts`:
  ```typescript
  import { DaopRegionSchema } from './daop.schema.js';
  import { CoordinatesSchema } from './coordinates.schema.js';
  import { CatchmentProfileSchema } from './catchment.schema.js';
  import { StationFacilitiesSchema } from './facilities.schema.js';
  ```
- `packages/game-data/src/catalog/stations.ts`:
  ```typescript
  import { StationCatalogEntry } from '../schemas/station.schema.js';
  ```
- `packages/game-data/src/catalog/tracks.ts`:
  ```typescript
  import { TrackCorridorSegment } from '../schemas/track.schema.js';
  ```
- `packages/game-data/src/loader/catalog-loader.ts`:
  ```typescript
  import { CoordinateBounds, JAVA_COORDINATE_BOUNDS, isWithinJavaBounds } from '../schemas/bounds.schema.js';
  import { StationCatalogEntry, StationCatalogEntrySchema } from '../schemas/station.schema.js';
  import { TrackCorridorSegment, TrackCorridorSegmentSchema } from '../schemas/track.schema.js';
  import { JAVA_STATION_CATALOG } from '../catalog/stations.js';
  import { JAVA_TRACK_CORRIDOR_SEGMENTS } from '../catalog/tracks.js';
  ```

#### 6. Update `packages/network/src/index.ts`
```diff
--- a/packages/network/src/index.ts
+++ b/packages/network/src/index.ts
@@ -1,8 +1,8 @@
-export * from './calculators/route-opening';
-export * from './calculators/track-access';
-export * from './calculators/speed';
+export * from './calculators/route-opening.js';
+export * from './calculators/track-access.js';
+export * from './calculators/speed.js';
 
-export * from './entities/station.entity';
-export * from './entities/route.entity';
-export * from './entities/depot.entity';
+export * from './entities/station.entity.js';
+export * from './entities/route.entity.js';
+export * from './entities/depot.entity.js';
```

#### 7. Update Test Files in `packages/*/test/*.ts`
Update all relative imports from `../src/...` to append `.js`:
- `packages/shared/test/*.ts` (`units.test.ts`, `brand.test.ts`, `time.test.ts`, `prng.test.ts`, `result.test.ts`, `provenance.test.ts`, `ids.test.ts`)
- `packages/game-data/test/*.ts` (`schemas.test.ts`, `catalog.test.ts`, `bounds.test.ts`, `loader.test.ts`, `adversarial-catalog.test.ts`)
- `packages/network/test/*.ts` (`route-opening.test.ts`, `track-access.test.ts`, `speed.test.ts`, `entities.test.ts`, `depot.test.ts`, `adversarial-domain.test.ts`)

#### 8. Configure Wildcard Package Exports in `packages/*/package.json`
In `packages/shared/package.json`, `packages/game-data/package.json`, and `packages/network/package.json`:
```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "import": "./dist/*.js",
      "default": "./dist/*.js"
    }
  },
```

#### 9. Link Workspace Packages in Root `package.json`
In `/home/synx/railway-manager/package.json`:
```json
  "devDependencies": {
    "@railway/game-data": "workspace:*",
    "@railway/network": "workspace:*",
    "@railway/shared": "workspace:*",
    "@types/node": "^20.14.0",
    "turbo": "^2.1.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "zod": "^3.23.8"
  }
```

#### 10. Clean Up `scripts/empirical-stress-suite.mjs`
Remove lines 4–17 (the `loaderCode` and `register(...)` workaround) once native resolution works cleanly.

---

## 5. Verification Method

To independently verify this strategy after implementation:

### 1. Build and Typecheck Verification
```bash
pnpm turbo build
pnpm turbo typecheck
```
*Expected Result:* Zero TypeScript errors. Emitted `dist/**/*.js` and `dist/**/*.d.ts` contain explicit `.js` extensions.

### 2. Pure Node.js Direct Import Verification (Zero Bundlers / Zero Loaders)
Run pure Node directly against compiled packages:
```bash
node -e '
async function verify() {
  const s = await import("./packages/shared/dist/index.js");
  const g = await import("./packages/game-data/dist/index.js");
  const n = await import("./packages/network/dist/index.js");
  const loader = await import("./packages/game-data/dist/loader/catalog-loader.js");
  console.log("Shared exports:", Object.keys(s).length);
  console.log("Game-data exports:", Object.keys(g).length);
  console.log("Network exports:", Object.keys(n).length);
  console.log("SUCCESS: All packages loaded natively in pure Node.js ESM!");
}
verify();
'
```
*Expected Result:* Prints SUCCESS without any `ERR_MODULE_NOT_FOUND` errors.

### 3. Package Name Resolution Verification
From within `packages/network` or root (after root devDependencies are linked):
```bash
node -e 'import("@railway/shared").then(m => console.log("Imported @railway/shared successfully, keys:", Object.keys(m).length))'
```
*Expected Result:* Prints 39 exported keys.

### 4. Vitest Unit Test Verification
```bash
pnpm turbo test
```
*Expected Result:* 100% of test suites across all 3 packages pass.

### 5. Empirical Stress Harness Verification
Run the stress harness without loader hooks:
```bash
node scripts/empirical-stress-suite.mjs
```
*Expected Result:* Executes cleanly without module resolution failure.
