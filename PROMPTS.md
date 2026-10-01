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
