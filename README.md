# Calculator

A full-stack calculator: a React + TypeScript frontend that consumes a Go REST API.

> **Status:** work in progress. This README grows with each feature branch; sections marked _TBD_ are filled in as the corresponding feature lands.

## Scope

| Operation | Priority |
|---|---|
| Addition, subtraction, multiplication, division | Required |
| Exponentiation, square root, percentage | Optional (designed for, built if time allows) |

## Repository layout

```
.
├── backend/     # Go REST API (Gin), independently buildable and runnable
├── frontend/    # React + TypeScript (Vite), independently buildable and runnable
├── .github/     # Pull request template
├── README.md
├── PROMPTS.md   # AI prompts used while building this project
└── TODO.md      # Working checklist: pending work and contract details not to forget
```

Backend layout:

```
backend/
├── cmd/server/          # entrypoint: configuration, wiring, graceful shutdown
└── internal/
    ├── calculator/      # pure domain logic (no HTTP, no Gin)
    └── api/             # Gin layer: routing, validation, error mapping
```

Each side has its own `Dockerfile`, so the frontend and the backend can be built and run separately or together.

## Tech stack

- **Backend:** Go, Gin, `shopspring/decimal` for exact decimal arithmetic
- **Frontend:** React, TypeScript, Vite, Vitest + Testing Library
- **Packaging:** Docker (one image per side, plus a compose file to run both)

## Getting started

_TBD_ — setup, running the backend, running the frontend, and running with Docker.

## API

Base path: `/api/v1`. Every operation is a `POST` with a JSON body. Operands are **strings** holding plain decimal numbers (`"12"`, `"-0.5"`; no exponent notation, max 64 characters) so no precision is lost on the wire.

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/v1/add` | `{"a": "0.1", "b": "0.2"}` | `a + b` |
| `POST /api/v1/subtract` | `{"a": "5", "b": "3"}` | `a - b` |
| `POST /api/v1/multiply` | `{"a": "4", "b": "3"}` | `a * b` |
| `POST /api/v1/divide` | `{"a": "1", "b": "3"}` | `a / b`, rounded to 16 decimal places |
| `GET /healthz` | - | `{"status": "ok"}` |

Success (`200`):

```json
{"result": "0.3"}
```

Errors always have the same shape:

```json
{"error": {"code": "division_by_zero", "message": "division by zero"}}
```

| Status | `code` | When |
|---|---|---|
| `400` | `invalid_request` | Body is not valid JSON, an operand is missing, or an operand is not a JSON string |
| `400` | `invalid_operand` | An operand is not a plain decimal number (or is too long) |
| `422` | `division_by_zero` | The request is well formed but mathematically impossible |
| `404` | - | Unknown operation |
| `500` | `internal_error` | Unexpected failure |

Examples:

```bash
curl -s -X POST localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' -d '{"a": "0.1", "b": "0.2"}'
# {"result":"0.3"}

curl -s -X POST localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' -d '{"a": "1", "b": "0"}'
# {"error":{"code":"division_by_zero","message":"division by zero"}}
```

Backend configuration (environment variables):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the server listens on |
| `CORS_ALLOWED_ORIGINS` | _(empty)_ | Comma-separated origins allowed by CORS. Empty means no CORS headers, which is correct behind a same-origin proxy |

Run the backend with `cd backend && go run ./cmd/server`.

### Backend with Docker

The backend builds and runs on its own; its build context is `backend/`.

```bash
docker build -t calculator-backend ./backend
docker run --rm -p 8080:8080 calculator-backend
curl localhost:8080/healthz
```

Configuration is passed as environment variables, for example `docker run -e PORT=9000 -e CORS_ALLOWED_ORIGINS=http://localhost:5173 -p 9000:9000 calculator-backend`.

The image is a multi-stage build: a `golang:1.23-alpine` stage compiles a static binary, and the final `alpine` image only contains that binary. It runs as a non-root user, declares a `HEALTHCHECK` on `/healthz`, and uses the exec form of `ENTRYPOINT` so `docker stop` delivers `SIGTERM` and triggers the server's graceful shutdown.

### Frontend with Docker

The frontend image serves the production build with nginx and forwards `/api` to the backend, so the browser only ever talks to one origin. Its build context is `frontend/`.

```bash
docker build -t calculator-frontend ./frontend
docker run --rm -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 calculator-frontend
```

`BACKEND_URL` is the address nginx proxies `/api` to (default `http://backend:8080`, the service name in the compose file). nginx resolves that host when it starts, so run on its own the container needs a `BACKEND_URL` that resolves, for example the backend published on the host as above; with the unresolvable default it refuses to start.

The image is a multi-stage build: a `node:22-alpine` stage runs `npm ci` and `npm run build`, and the final `nginxinc/nginx-unprivileged` image only contains the static files and the nginx config. It runs as a non-root user and listens on port 8080 inside the container. Hashed files under `/assets/` are cached for a year and `index.html` is never cached.

### Run everything with Docker Compose

```bash
docker compose up --build
```

Open http://localhost:3000. Compose starts the backend first and waits for its healthcheck before starting the frontend. Only the frontend is published (port 3000); the backend is reachable from it through the compose network. Stop everything with `docker compose down`.

## Testing and coverage

_TBD_ — how to run the tests and produce coverage reports for both layers.

## Design decisions

Decisions taken so far (more will be added as the remaining branches land).

### Architecture

- **Monorepo, independent deployables.** `backend/` and `frontend/` share nothing but the HTTP contract.
- **Domain separated from transport.** The calculation logic (`internal/calculator`) knows nothing about HTTP or Gin; the API layer (`internal/api`) only translates requests into domain calls and domain errors into HTTP responses. Gin is confined to the API layer.
- **Idiomatic Go, no framework ceremony.** No dependency injection container or repository layer: there is no state to manage. Dependencies are passed explicitly.
- **Same-origin first, CORS as a fallback.** In development the Vite dev server proxies `/api`, and in Docker the frontend's nginx proxies it, so the browser sees a single origin. CORS stays available through `CORS_ALLOWED_ORIGINS` for deployments where the two sides live on different origins, and is off by default.
- **Dependency pinning.** Gin `v1.10.1` and `gin-contrib/cors` `v1.7.3` are pinned because newer Gin releases raise the `go` directive in `go.mod` to `1.26`; the project targets Go 1.23.

### Numeric precision (the string contract)

- **Exact decimal arithmetic.** The backend computes with `shopspring/decimal`, so `0.1 + 0.2` is exactly `0.3`, which binary floating point cannot do.
- **Numbers travel as JSON strings, in both directions.** A JSON number would be parsed into a float64 by most clients (including `JSON.parse` in the browser) and the precision would be lost before it reaches the API. Sending a JSON number instead of a string is rejected with `400 invalid_request`.
- **Strict operand format.** Operands must match `^-?\d+(\.\d+)?$` and be at most 64 characters: no `+` sign, no `.5` or `5.`, no exponent notation. Exponent notation is rejected on purpose because `"1e999999999"` is tiny on the wire but can make the decimal library allocate huge numbers.
- **Division rounds to 16 decimal places.** `1/3` returns `0.3333333333333333`. Results are returned without trailing zeros.
- **Consequences for the frontend.** The frontend must never convert operands or results with `Number()`, `parseFloat` or arithmetic: values live as strings from the keypad to the display and the request. It also has to normalize what the user types into the accepted format (for example `.5` becomes `0.5`, `5.` becomes `5`) and cap the input length. Tracked in [TODO.md](TODO.md).

### API design

- **One endpoint per operation.** `POST /api/v1/add`, `/subtract`, `/multiply`, `/divide` (and later `/power`, `/sqrt`, `/percentage`). The URL states the intent, each operation has its own typed body (`{a, b}` for binary operations, `{value}` for unary ones), and unknown operations are a plain `404`. A calculator has no real resources, so this is RPC over HTTP either way; per-operation routes keep the contract explicit instead of hiding a `switch` behind a single `/calculate` endpoint.
- **`POST` with a JSON body, not `GET`.** Operands are decimal strings, which are cleaner in a body than in a query string.
- **Thin, explicit routing.** The domain exposes pure functions with the same shape per arity. The router maps each route to a generic handler, so adding an operation is one domain function plus one route line. Only the binary handler exists today; the unary one arrives with the first unary operation (`sqrt`).
- **Two classes of failure, two status codes.** `400` means the request itself is malformed (bad JSON, missing or invalid operand); `422` means it is well formed but mathematically impossible (division by zero). Every error has the same `{"error": {"code", "message"}}` body, and clients should branch on `code`, not on `message`.

## Workflow

Nothing goes straight to `main`. Every change lives in a `feat/*` branch with a single, explicit mission. A branch is ready for a pull request when its mission's "done" criteria are met.
