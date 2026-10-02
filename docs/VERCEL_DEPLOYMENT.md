# Deploy Railway Manager on Vercel

## Application layout

This repository has one runnable frontend, `apps/web`. The root `package.json` coordinates the pnpm/Turborepo workspace and includes Vite dependencies, which can make framework detection report an additional root application. There is no root `index.html`, independent root frontend, or backend application. The domain packages under `packages/` are libraries bundled into the browser app.

The proposed root `vercel.json` uses Services mode with one service named `web`. The catch-all public rewrite targets that service, so the game and its assets are served at `/`. There are no internal services or bindings. The application has no server-to-server calls; its OpenStreetMap tile requests are external browser requests, not service bindings.

Adding a second service named `app` at `.` would not create a useful second application. New API services and runtime bindings should be added only when that code exists. Do not put internal runtime binding URLs into Vite's browser environment.

## Import settings

After confirming the proposed service name and public route:

1. Import `algorivan/railway-manager` from GitHub and select the production branch `master`.
2. Set the Vercel project Root Directory to the repository root (`./`), because `vercel.json` is there. Keep the Application Preset as Services and ensure the detected configuration contains only `web` after the new file is available on GitHub.
3. Use Node.js **24.x**, matching the validated local runtime. No secret or application environment variable is needed for this browser-only build.
4. Enable access to source files outside the service root if Vercel presents that setting; the web service consumes workspace packages in `packages/`.
5. Keep build/install/output overrides in `services.web` rather than setting top-level overrides. Its commands move from `apps/web` to the repository root to install the entire workspace and build the web dependency graph. The `dist` output directory is relative to the web service root, so the result is `apps/web/dist`.

The commands pin pnpm to 11.10.0 through npm's `npx`, avoiding reliance on the build image's default pnpm or an optional Corepack switch. Installation uses the existing frozen lockfile. The dev command accepts Vercel's assigned `PORT`, with 3000 as a fallback for direct local use.

## Validate before publication

Run the configured installation and build commands from `apps/web`, then verify that `apps/web/dist/index.html`, its referenced JavaScript/CSS, and `apps/web/dist/vehicles/cc201.webp` exist. A fresh source checkout is preferable to validation that relies on retained build outputs.

With an authenticated Vercel CLI and the correct project linked:

```bash
vercel link
vercel dev
vercel build
vercel deploy --prebuilt
```

Check the deployed preview's app and asset requests, and complete the starter flow. After the requested service/routing confirmation and successful hosted validation, promote/deploy production with the linked project's settings. Never invent project IDs or publish to an inferred team.

## Persistence and later services

The current save remains browser-local. Moving from a local/cloud preview origin to the Vercel domain does not move the browser's save automatically; use Kantor → Ekspor save and Impor save if needed. This deployment does not add server saves, payments or a shared authenticated fuel API.

Hosting is independent from the cloud development environment's saved startup instructions. Vercel builds and serves the static output; it does not need the cloud Vite process to stay running.
