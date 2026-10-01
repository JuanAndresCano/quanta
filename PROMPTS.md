# Prompts

AI tooling (Claude Code) was used while building this project. This file records the prompts that shaped the work, grouped by the feature branch they belong to. It is updated as the project progresses.

## `feat/repo-scaffold`

- Project kickoff: shared the assignment brief and agreed on how to work (decisions first, code second).
- Decided stack and conventions: Go + Gin backend with exact decimal arithmetic, React + TypeScript + Vite frontend, one Dockerfile per side, everything written in English.
- Decided API shape: one `POST` endpoint per operation instead of a single `/calculate` endpoint.
- Decided workflow: one `feat/*` branch per mission, merged to `main` through a pull request once the mission's "done" criteria are met.
- Scaffolded the monorepo: `backend/` (Go module) and `frontend/` (Vite React-TS).
