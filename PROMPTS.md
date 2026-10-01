# Prompts

AI tooling (Claude Code) was used while building this project. This file records the prompts that shaped the work, grouped by the feature branch they belong to, in chronological order. It is updated as the project progresses.

## `feat/repo-scaffold`

- Project kickoff: shared the assignment brief and agreed on how to work (decisions first, code second).
- Decided stack and conventions: Go + Gin backend with exact decimal arithmetic, React + TypeScript + Vite frontend, one Dockerfile per side, everything written in English.
- Decided API shape: one `POST` endpoint per operation instead of a single `/calculate` endpoint.
- Decided workflow: one `feat/*` branch per mission, merged to `main` through a pull request once the mission's "done" criteria are met.
- Scaffolded the monorepo: `backend/` (Go module) and `frontend/` (Vite React-TS).

## `feat/backend-calculator-core`

- Implemented the pure calculator domain (add, subtract, multiply, divide) on top of `shopspring/decimal`, with table-driven tests covering exact decimals, negatives, large values and division by zero.

## `feat/backend-api`

- Implemented the Gin HTTP layer: one `POST` route per operation through a generic `binaryHandler`, JSON error contract (`400` malformed, `422` domain errors), configurable CORS, health check and graceful shutdown.
- Hardened operand parsing (plain decimals only, bounded length) after noticing exponent notation such as `1e999999999` could exhaust memory.
- Pinned Gin `v1.10.1` and `gin-contrib/cors` `v1.7.3` because the latest Gin forces `go 1.26` in `go.mod`.
- Review pass: documented the string-based numeric contract and its frontend implications, added `TODO.md`, removed an accidentally committed binary (`backend/server`) and ignored it.

## `feat/backend-docker`

- Planned the branch (mission, "done" criteria, verification steps) before writing code, and chose an Alpine final image over distroless to keep the healthcheck inside the image.
- Wrote a multi-stage `backend/Dockerfile` (static build, non-root user, `HEALTHCHECK`, exec-form `ENTRYPOINT`) and a `.dockerignore`.
- Verified the image end to end: build, 16 MB size, non-root user, endpoints, `healthy` status and a clean `docker stop` (exit code 0 in about 1 second).

## `feat/frontend-ui`

- Designed the calculator as a pure reducer (string-only state, `pending` request instead of side effects) and wrote it test-first with table-driven tests and a small key-sequence DSL (`'2+3='`).
- Decided the interaction rules: left-to-right chaining like iOS, `2 + =` computes `2 + 2`, keypad locked while a request is in flight (only AC cancels it), digit cap of 12, and an `operand_too_long` error for results above 64 characters.
- Accepted a deliberate simplification: `±` pressed right after choosing an operator only changes the display.
- Built the `useCalculator` hook (aborts the request on AC, ignores stale answers), the iOS-style keypad and display, display-only number formatting, and component tests with Testing Library.
- Parked square root: `shopspring/decimal` has no native `Sqrt`, so it stays out of scope unless time remains after `percentage` and `power`.

## `feat/frontend-api-integration`

- Planned the branch first: a thin `fetch` client behind the existing `CalculateFn`, so the reducer, hook and components stay untouched.
- Decided the error mapping: branch on the backend `error.code` (never the message), treat an unknown code as `internal_error`, and any response without the backend's error envelope (proxy 502, HTML, empty body) as `network_error`. No timeout or retries: AC already cancels a request.
- Wrote the client test-first over a mocked `fetch` (request shape, string operands, every error code, malformed bodies), plus component tests that run the real client end to end for `0.1 + 0.2`, `1 / 3`, `1 / 0` and a failed request.
- Added the Vite dev proxy for `/api` and removed the temporary stub.
- Verified against the real backend in the browser: results, chaining, division by zero, recovery, and "Cannot reach the server" with the backend stopped.
