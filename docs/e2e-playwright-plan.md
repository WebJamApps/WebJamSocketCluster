# Playwright e2e plan (parked)

This is a parked plan for automating the manual "create gig on the music page" smoke. It is **not implemented** — captured here so future-us can pick it up without rederiving the design.

## Why

There is no hosted dev environment; `master` deploys to Heroku. The current pre-merge safety net is a manual two-terminal smoke (see [`README.md`](../README.md) "Local smoke testing"). One automated end-to-end test that creates a gig would catch the highest-risk regressions on every PR — express route changes, the fetch-migrated auth call in `AgController.newTour`, mongoose CRUD, socketcluster publish, JaMmusic ↔ cluster wire format.

## Goal

A single Playwright test that mirrors the manual smoke: full stack up, page loads, new gig submitted, gig appears in the list. **One happy path, not a suite.**

## The 3 hard parts and their solutions

### 1. Stack startup (mongo + web-jam-back + cluster + JaMmusic)

A Node `globalSetup` script that:

- Boots `mongodb-memory-server` in-process (no docker; no service container in CI).
- Spawns `web-jam-back` as a child process with `MONGOLAB_URI` from the memory server.
- Spawns `WebJamSocketCluster` similarly, with `BackendUrl=http://127.0.0.1:<webjamback-port>`.
- Polls each port until ready.
- Stashes child PIDs for `globalTeardown` to kill.

JaMmusic is already built into `JaMmusic/dist/` by the cluster's `postinstall`, so it's served at `/` automatically — no separate JaMmusic process needed.

### 2. Auth — do NOT drive Google OAuth

Three options ranked:

- **(A, recommended)** Inject a forged JWT into `localStorage` before page load. Sign with the same `HashString` the cluster's `.env.test` uses. Use Playwright's `page.addInitScript` so JaMmusic boots already-authed. Zero production code changes.
- **(B)** Add a `NODE_ENV=test`-gated `/test-auth` endpoint to web-jam-back that returns a JWT for a fixed admin. Production-adjacent; avoid if (A) works.
- **(C)** Real Google OAuth with a service account. Not actually supported by Google for human OAuth flows. Ignore.

### 3. Database state

Memory-server gives a fresh mongo every run. In `globalSetup`, after services are up, seed via mongoose directly OR via web-jam-back's HTTP endpoints: one admin user matching the JWT's `sub` and `userType: 'admin'`, plus the `userRoles` env var pointing at `["admin"]`.

Seeding via web-jam-back's HTTP endpoints is preferred — fewer schema assumptions, more realistic.

## File layout

```
e2e/
  playwright.config.ts        # uses globalSetup + globalTeardown
  setup/
    global-setup.ts           # boots mongo-memory + web-jam-back + cluster, seeds admin
    global-teardown.ts        # kills children, stops mongo
    sign-jwt.ts               # helper to sign with HashString
  fixtures/
    auth.ts                   # Playwright fixture that runs page.addInitScript with the JWT
  smoke/
    create-gig.spec.ts        # the one happy-path test
```

## The test (sketch)

```ts
test('admin creates a gig and sees it appear', async ({ page }) => {
  // auth fixture has already injected JWT into localStorage
  await page.goto('http://localhost:8888/music');

  await page.getByRole('button', { name: /add gig/i }).click();
  await page.getByLabel('Venue').fill('Playwright Test Venue');
  await page.getByLabel('City').fill('Testville');
  await page.getByLabel('State').fill('TS');
  await page.getByLabel('Date').fill('2026-12-31T20:00');
  await page.getByRole('button', { name: /save|create/i }).click();

  await expect(page.getByText('Playwright Test Venue')).toBeVisible({ timeout: 5000 });
});
```

## Local target

- **Convention:** web-jam-back is a sibling dir `../web-jam-back` (configurable via `WEB_JAM_BACK_DIR`). Both repos must have `node_modules` already.
- **One-time browser download:** `npm run test:e2e:install`.
- **Run:** `npm run test:e2e`. globalSetup boots/tears down its own stack, so it doesn't conflict with the manual two-terminal setup *if those are stopped first* — port collision check in `globalSetup` should print a clear error.
- **Watching:** `npm run test:e2e -- --ui` for Playwright's UI mode while iterating.

New scripts in `package.json`:

```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts",
"test:e2e:install": "playwright install --with-deps chromium"
```

## CircleCI target

Existing config uses `cimg/node:lts-browsers` which already ships browsers, so the bulk of Playwright setup is paid. Add a second job:

```yaml
version: 2.1
jobs:
  build:
    # … existing job unchanged …

  e2e:
    docker:
      - image: cimg/node:lts-browsers
    working_directory: ~/repo
    steps:
      - checkout
      - run:
          name: Clone web-jam-back (sibling)
          command: git clone --depth=1 --branch dev https://github.com/WebJamApps/web-jam-back.git ~/web-jam-back
      - run:
          name: Install web-jam-back
          command: cd ~/web-jam-back && npm install
      - run:
          name: Install cluster (full, runs JaMmusic postinstall)
          command: npm install
      - run:
          name: Install Playwright browser
          command: npx playwright install --with-deps chromium
      - run:
          name: e2e
          command: WEB_JAM_BACK_DIR=~/web-jam-back npm run test:e2e
      - store_artifacts:
          path: e2e/test-results
      - store_artifacts:
          path: playwright-report

workflows:
  test:
    jobs:
      - build
      - e2e:
          requires:
            - build
```

CI notes:

- `--depth=1 --branch dev` keeps the web-jam-back clone fast.
- `requires: [build]` means e2e only runs after lint/unit/smoke pass — saves CircleCI minutes on broken PRs.
- Artifact uploads capture failure traces and the HTML report so failures are debuggable without re-running.
- No mongo container needed — `mongodb-memory-server` runs in-process. Saves ~30s vs. spinning a service.

## Brittleness — what to expect

- **JaMmusic selectors.** Tests live in WebJamSocketCluster but read JaMmusic markup. If JaMmusic renames a button, this test breaks. Mitigation: rely on accessible roles/labels, not CSS classes.
- **Port collisions.** Manual two-terminal setup uses the same ports. Mitigation: pick fixed test-only ports (e.g., 18888) via env, OR add a friendly `EADDRINUSE` error.
- **Mongo seed shape drift.** If user/tour schemas change, the seed must follow. Mitigation: seed via web-jam-back HTTP endpoints rather than direct mongoose writes.
- **Heavy test.** ~30s per run on top of `npm test`. Don't fan out into many tests; one happy path is the right scope.

## Out of scope

- Negative cases (missing token, wrong role, invalid gig data) — covered by unit tests in `test/AgController/index.spec.ts`.
- Edit/delete gig flows.
- JaMmusic UI rendering correctness — that's JaMmusic's repo's concern.

## Tradeoffs to decide before implementing

1. **web-jam-back branch in CI.** Default `dev` here means an unrelated breakage in web-jam-back's dev can red-light cluster PRs. Alternative: pin a SHA in `.e2e/web-jam-back.sha`. Recommendation: start with `dev`, switch to SHA-pinning if cross-repo flakes become a problem.
2. **CI runtime cost.** Adds ~3-5 min per PR. Acceptable for low-frequency PRs to this repo. Mitigation later: cache `node_modules` and `~/.cache/ms-playwright` between runs.
3. **Memory mongo vs. real local mongo.** Memory is faster + isolated; real (via local mongod) is closer to prod but bleeds state. Recommendation: memory-server for both targets.
4. **Where do tests live.** WebJamSocketCluster (the cluster is what's being upgraded most often) vs. a new e2e-only repo. Recommendation: WebJamSocketCluster.

## Order of work (one PR)

1. `e2e/setup/global-setup.ts` + `global-teardown.ts` (stack boot/tear).
2. `e2e/setup/sign-jwt.ts` + auth fixture.
3. `e2e/playwright.config.ts`.
4. `e2e/smoke/create-gig.spec.ts` (the one test).
5. `package.json` script additions + `@playwright/test` + `mongodb-memory-server` devDeps.
6. `.circleci/config.yml` e2e job + workflow.
7. README "Local smoke testing" section gets a paragraph pointing at `npm run test:e2e` as the automated alternative.

## Effort estimate

~half-day to wire up `globalSetup`/`globalTeardown` + JWT helper + the one test, assuming web-jam-back boots cleanly with env-only config.
