# Repository Guidelines for WebJamSocketCluster


## Cross-AI hard rules

The cross-AI hard rules that bind every agent on every surface are NOT duplicated here. They live
in exactly one file: `docs/cross-ai-rules.md` in the **`web-jam-tools` repository**, which normally
sits alongside this repository — `../web-jam-tools/docs/cross-ai-rules.md`, and on Josh's laptop
`/home/joshua/WebJamApps/web-jam-tools/docs/cross-ai-rules.md`.

Read that file before acting. If you cannot find it, STOP and say so — do not proceed without the
rules and do not reconstruct them from memory or from this file.

## TypeScript & Type Safety
- **No `any`**: `@typescript-eslint/no-explicit-any` is set to `'error'`. Do not disable this rule or use `: any` or `as any`.
- **Shared Domain Types**: Centralized types for socket connections, streams, payloads, and domain objects live in `src/types/index.ts`.
- **Mongoose Generic Facade**: Model facades extend `Facade<T>` defined in `src/lib/facade.ts`. When typing generic model methods, use double type assertions (e.g. `(await ... as unknown) as T[]`) to satisfy Mongoose generic method signatures without using `any`.
- **SocketCluster Mocks**: When mocking `AGServer` or `IClient` in tests, cast stub objects using `as unknown as socketClusterServer.AGServer` or `as unknown as IClient`. Ensure `receiver.next()` mocks return `{ value?: T; done?: boolean }`.

## Memory & Security Audits
- **Snyk Failures & Resolution via `npm audit fix`**: PR checks may report failure on `security/snyk` due to transitive dependency vulnerabilities. Running `npm audit fix` updates `package-lock.json` with non-breaking patches to resolve these vulnerabilities. Always run local tests afterwards to verify the test suite remains 100% green before committing and pushing `package-lock.json` to the PR branch.

## System & Environment
- **Runtime:** Node.js v24.18.1
- **Node Engine Version Bumps:** When bumping Node.js in `package.json` `engines.node`, run `npm install --package-lock-only --ignore-scripts` (or `npm install --ignore-scripts`) to update `package-lock.json` root engine definition without waiting on `postinstall` scripts so both files are committed together.
